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
  heartbeatTimer: ReturnType<typeof setInterval> | null;
  manualDisconnect: boolean;
  /** Geração do socket — incrementada a cada connect(), evita que eventos
   *  de sockets antigos processem mensagens após reconexão. */
  generation: number;
}

// globalThis — compartilhado entre todos os entrypoints Next.js no mesmo processo.
const globalForWaLite = globalThis as unknown as { __waLiteSessions?: Map<string, ManagedSession> };
const sessions = globalForWaLite.__waLiteSessions ?? (globalForWaLite.__waLiteSessions = new Map<string, ManagedSession>());

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
      heartbeatTimer: null,
      manualDisconnect: false,
      generation: 0,
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

// Backoff exponencial: 3s → 6s → 12s → 20s → 30s → mantém 30s
const RECONNECT_DELAYS_MS = [3000, 6000, 12000, 20000, 30000];
// Heartbeat a cada 25s — detecta sockets "zumbis" que parecem conectados mas pararam de receber
const HEARTBEAT_MS = 25_000;

/** Cancela heartbeat e reconnect timer sem alterar o estado da sessão. */
function clearTimers(session: ManagedSession) {
  if (session.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = null;
  }
  if (session.heartbeatTimer) {
    clearInterval(session.heartbeatTimer);
    session.heartbeatTimer = null;
  }
}

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
  // Cancela timers anteriores antes de criar novo socket
  clearTimers(session);

  const gen = ++session.generation;
  const { state, saveCreds } = await usePostgresAuthState(session.sdrId);

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys),
    },
    browser: Browsers.appropriate("Chrome"),
    syncFullHistory: false,
    // Keepalive nativo do Baileys: envia ping a cada 20s para manter o WS vivo
    keepAliveIntervalMs: 20_000,
    // Timeout para conectar — se o WS não abrir em 60s, o Baileys fecha sozinho
    connectTimeoutMs: 60_000,
    // Retry de decifração de mensagens (evita crash em chave Signal expirada)
    retryRequestDelayMs: 250,
  });

  session.sock = sock;
  session.state = "qr_pending";

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    // Ignora eventos de gerações anteriores (socket zumbi)
    if (session.generation !== gen) return;
    void handleConnectionUpdate(session, update);
  });

  sock.ev.on("messages.upsert", ({ messages, type }) => {
    if (session.generation !== gen) return;
    // "notify"  = mensagem nova em tempo real.
    // "append"  = histórico sincronizado ao reconectar.
    if (type !== "notify" && type !== "append") return;
    for (const msg of messages) {
      void ingestBaileysMessage(session.sdrId, msg);
    }
  });

  // Heartbeat: verifica se o socket ainda responde; se não, força reconexão.
  session.heartbeatTimer = setInterval(() => {
    if (session.generation !== gen || session.state !== "connected") return;
    const s = session.sock;
    if (!s) {
      console.warn(`[wa-lite] SDR ${session.sdrId} heartbeat: socket null com state=connected, forçando reconexão`);
      void scheduleReconnect(session, true);
      return;
    }
    // Testa se o socket WebSocket ainda está OPEN (readyState === 1)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ws = (s as any).ws;
    if (ws && typeof ws.readyState === "number" && ws.readyState !== 1 /* OPEN */) {
      console.warn(`[wa-lite] SDR ${session.sdrId} heartbeat: WS readyState=${ws.readyState}, forçando reconexão`);
      void scheduleReconnect(session, true);
    }
  }, HEARTBEAT_MS);
}

async function scheduleReconnect(session: ManagedSession, immediate = false): Promise<void> {
  clearTimers(session);
  session.sock = null;
  session.state = "disconnected";

  if (session.manualDisconnect) return;

  const delay = immediate ? 1000 : RECONNECT_DELAYS_MS[Math.min(session.reconnectAttempts, RECONNECT_DELAYS_MS.length - 1)];
  session.reconnectAttempts += 1;
  console.log(`[wa-lite] SDR ${session.sdrId} reconectando em ${delay}ms (tentativa ${session.reconnectAttempts})`);
  session.reconnectTimer = setTimeout(() => {
    void connect(session);
  }, delay);
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
    const err = lastDisconnect?.error as Boom | undefined;
    const statusCode = err?.output?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;
    // Conflito de sessão (outro dispositivo/browser abriu a mesma sessão WA)
    const isConflict = statusCode === DisconnectReason.connectionReplaced
      || statusCode === 440  // conflict
      || err?.message?.toLowerCase().includes("conflict");

    clearTimers(session);
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

    if (isConflict) {
      // Conflito de sessão: outro cliente WA Web assumiu o slot multi-device.
      // Aguarda mais tempo antes de tentar reconectar para não ficar em loop.
      console.warn(`[wa-lite] SDR ${session.sdrId} conflito de sessão (code=${statusCode}) — aguardando 15s antes de reconectar`);
      session.state = "disconnected";
      session.reconnectAttempts = Math.max(session.reconnectAttempts, 3); // pula para delay maior
      session.reconnectTimer = setTimeout(() => {
        void connect(session);
      }, 15_000);
      return;
    }

    // Queda não-intencional — reconecta com backoff exponencial
    console.log(`[wa-lite] SDR ${session.sdrId} conexão fechada (code=${statusCode}), reconectando...`);
    await scheduleReconnect(session);
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
  clearTimers(session);
  if (session.sock) {
    try {
      await session.sock.logout();
    } catch {
      // logout pode falhar se o socket já estiver morto — segue o fluxo.
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
