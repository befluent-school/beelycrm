/**
 * WhatsApp Lite (Baileys) — gerenciador de sessões vivas em memória, uma
 * por SDR, no processo único do beely-web (PM2). Diferente de Z-API/Meta
 * Cloud API (stateless, uma chamada HTTP por envio), aqui a conexão é um
 * socket WebSocket persistente — este módulo é a única parte do sistema
 * que sabe falar com esse socket.
 *
 * Funciona hoje porque o Beely roda 1 instância PM2 só (sem load balancer
 * entre múltiplos processos Node) — não escala horizontalmente sem
 * replanejar esse acoplamento (o socket vive só no processo que o abriu).
 */
import makeWASocket, {
  DisconnectReason,
  Browsers,
  makeCacheableSignalKeyStore,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { eq } from "drizzle-orm";
import { db as client, schema } from "@/db";
import { usePostgresAuthState } from "./pg-auth-state";
import { ingestBaileysMessage } from "./ingest";

type SessionState = "disconnected" | "qr_pending" | "connected";

interface ManagedSession {
  sdrId: string;
  sock: WASocket | null;
  state: SessionState;
  lastQr: string | null;
  connectedPhone: string | null;
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  manualDisconnect: boolean;
}

const sessions = new Map<string, ManagedSession>();

function getOrCreate(sdrId: string): ManagedSession {
  let s = sessions.get(sdrId);
  if (!s) {
    s = {
      sdrId,
      sock: null,
      state: "disconnected",
      lastQr: null,
      connectedPhone: null,
      reconnectAttempts: 0,
      reconnectTimer: null,
      manualDisconnect: false,
    };
    sessions.set(sdrId, s);
  }
  return s;
}

async function persistStatus(
  sdrId: string,
  status: SessionState,
  phone: string | null,
  touchConnectedAt: boolean,
) {
  if (!client) return;
  await client
    .update(schema.sdrs)
    .set({
      waLiteStatus: status,
      waLiteConnectedPhone: phone,
      ...(touchConnectedAt ? { waLiteLastConnectedAt: new Date() } : {}),
    })
    .where(eq(schema.sdrs.id, sdrId));
}

const RECONNECT_DELAYS_MS = [2000, 4000, 8000, 16000, 30000];

/** Inicia (ou reusa, se já em andamento/conectada) a sessão de um SDR. */
export async function startSession(sdrId: string): Promise<void> {
  const session = getOrCreate(sdrId);
  if (session.sock && (session.state === "connected" || session.state === "qr_pending")) {
    return; // já em andamento — idempotente
  }
  session.manualDisconnect = false;
  await connect(session);
}

async function connect(session: ManagedSession): Promise<void> {
  const { state, saveCreds } = await usePostgresAuthState(session.sdrId);

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys),
    },
    browser: Browsers.appropriate("Chrome"),
    syncFullHistory: false,
  });

  session.sock = sock;
  session.state = "qr_pending";

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    void handleConnectionUpdate(session, update);
  });

  sock.ev.on("messages.upsert", ({ messages }) => {
    for (const msg of messages) {
      void ingestBaileysMessage(session.sdrId, msg);
    }
  });
}

async function handleConnectionUpdate(
  session: ManagedSession,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: any,
): Promise<void> {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    session.lastQr = qr;
    session.state = "qr_pending";
    await persistStatus(session.sdrId, "qr_pending", null, false);
  }

  if (connection === "open") {
    session.state = "connected";
    session.lastQr = null;
    session.reconnectAttempts = 0;
    const phone = session.sock?.user?.id?.split(":")[0]?.split("@")[0] ?? null;
    session.connectedPhone = phone;
    await persistStatus(session.sdrId, "connected", phone, true);
    console.log(`[wa-lite] SDR ${session.sdrId} conectado (${phone})`);
  }

  if (connection === "close") {
    const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;

    session.sock = null;

    if (session.manualDisconnect || loggedOut) {
      session.state = "disconnected";
      session.lastQr = null;
      session.connectedPhone = null;
      session.reconnectAttempts = 0;
      await persistStatus(session.sdrId, "disconnected", null, false);
      if (loggedOut) {
        const { clear } = await usePostgresAuthState(session.sdrId);
        await clear();
        console.log(`[wa-lite] SDR ${session.sdrId} deslogado pelo celular — sessão limpa, exige novo QR Code`);
      } else {
        console.log(`[wa-lite] SDR ${session.sdrId} desconectado manualmente`);
      }
      return;
    }

    // Queda não-intencional (rede, restart do WhatsApp, etc.) — reconecta
    // com backoff exponencial limitado, sem desistir de vez.
    const delay = RECONNECT_DELAYS_MS[Math.min(session.reconnectAttempts, RECONNECT_DELAYS_MS.length - 1)];
    session.reconnectAttempts += 1;
    console.log(`[wa-lite] SDR ${session.sdrId} caiu, reconectando em ${delay}ms (tentativa ${session.reconnectAttempts})`);
    session.reconnectTimer = setTimeout(() => {
      void connect(session);
    }, delay);
  }
}

export function getSessionStatus(sdrId: string): {
  status: SessionState;
  qr: string | null;
  phone: string | null;
} {
  const s = sessions.get(sdrId);
  if (!s) return { status: "disconnected", qr: null, phone: null };
  return { status: s.state, qr: s.lastQr, phone: s.connectedPhone };
}

export function getLiveSocket(sdrId: string): WASocket | null {
  const s = sessions.get(sdrId);
  return s?.state === "connected" ? s.sock : null;
}

/** Desconexão explícita — usuário clicou "Desconectar", ou SDR foi desativado. */
export async function stopSession(sdrId: string): Promise<void> {
  const session = sessions.get(sdrId);
  if (!session) return;
  session.manualDisconnect = true;
  if (session.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = null;
  }
  if (session.sock) {
    try {
      await session.sock.logout();
    } catch {
      // logout pode falhar se o socket já estiver morto — segue o fluxo,
      // o connection.update "close" (ou a limpeza manual abaixo) resolve.
    }
  }
  session.sock = null;
  session.state = "disconnected";
  session.lastQr = null;
  session.connectedPhone = null;
  const { clear } = await usePostgresAuthState(sdrId);
  await clear();
  await persistStatus(sdrId, "disconnected", null, false);
}

/**
 * Reconecta, no boot do processo, todos os SDRs wa_lite com sessão salva —
 * escalonado para não gerar um pico de handshakes simultâneos num restart
 * do PM2. Chamado uma vez em instrumentation.ts.
 */
export async function restoreAllSessions(): Promise<void> {
  if (!client) return;
  const rows = await client
    .select({ id: schema.sdrs.id })
    .from(schema.sdrs)
    .where(eq(schema.sdrs.waProvider, "wa_lite"));

  let delay = 0;
  for (const row of rows) {
    const hasSession = await client
      .select({ sdrId: schema.waLiteSessions.sdrId })
      .from(schema.waLiteSessions)
      .where(eq(schema.waLiteSessions.sdrId, row.id))
      .limit(1);
    if (hasSession.length === 0) continue;

    setTimeout(() => {
      void startSession(row.id);
    }, delay);
    delay += 250;
  }
}
