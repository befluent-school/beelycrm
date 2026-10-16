/**
 * Estado de autenticação do Baileys (WhatsApp Lite) persistido no Postgres
 * — substitui o `useMultiFileAuthState` padrão da lib (que grava em pasta),
 * para sobreviver a restart do PM2 (deploy, crash, OOM) sem exigir escanear
 * o QR Code de novo. Mesmo princípio do multi-file: `creds` é um objeto
 * único, `keys` é um conjunto de chaves do protocolo Signal por categoria+id
 * — mas tudo guardado em duas colunas jsonb em vez de arquivos soltos.
 *
 * Buffers/Uint8Array dentro de creds/keys são serializados via BufferJSON
 * (mesmo helper que o Baileys usa internamente) antes de ir pro jsonb,
 * porque JSON não representa binário nativamente.
 */
import { eq } from "drizzle-orm";
import { initAuthCreds, BufferJSON } from "@whiskeysockets/baileys";
import type { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from "@whiskeysockets/baileys";
import { db as client, schema } from "@/db";

// Round-trip via BufferJSON pra reidratar Buffer/Uint8Array corretamente —
// jsonb guarda a árvore já "achatada" pelo replacer, então ao ler de volta
// aplicamos o reviver em cima do JSON.stringify/parse do próprio valor.
function serialize<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value, BufferJSON.replacer));
}
function deserialize<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value), BufferJSON.reviver) as T;
}

export async function usePostgresAuthState(sdrId: string) {
  if (!client) throw new Error("DATABASE_URL não configurado — WA Lite exige banco.");

  const existing = await client
    .select()
    .from(schema.waLiteSessions)
    .where(eq(schema.waLiteSessions.sdrId, sdrId))
    .limit(1);

  const row = existing[0];
  const creds = row?.creds ? deserialize<AuthenticationCreds>(row.creds) : initAuthCreds();
  const keysStore: Record<string, Record<string, unknown>> = row?.keys
    ? deserialize<Record<string, Record<string, unknown>>>(row.keys)
    : {};

  // Debounce das escritas de `keys` — rotaciona a quase toda mensagem,
  // martelar o Postgres a cada rotação de pré-chave seria desperdício.
  // Janela de 3s: balanceia entre perda mínima de chaves e carga no DB.
  // `creds` muda raro (só em re-pareamento) e é gravado na hora.
  let keysFlushTimer: ReturnType<typeof setTimeout> | null = null;
  const flushKeys = async () => {
    keysFlushTimer = null;
    await client!
      .insert(schema.waLiteSessions)
      .values({ sdrId, keys: serialize(keysStore) as Record<string, Record<string, unknown>>, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.waLiteSessions.sdrId,
        set: { keys: serialize(keysStore) as Record<string, Record<string, unknown>>, updatedAt: new Date() },
      });
  };
  const scheduleKeysFlush = () => {
    if (keysFlushTimer) clearTimeout(keysFlushTimer);
    // 3s de debounce — reduz risco de perda de chaves se o processo morrer
    keysFlushTimer = setTimeout(() => void flushKeys(), 3000);
  };

  const saveCreds = async () => {
    await client!
      .insert(schema.waLiteSessions)
      .values({ sdrId, creds: serialize(creds) as Record<string, unknown>, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.waLiteSessions.sdrId,
        set: { creds: serialize(creds) as Record<string, unknown>, updatedAt: new Date() },
      });
  };

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        const data: { [id: string]: SignalDataTypeMap[T] } = {};
        const bucket = keysStore[type] ?? {};
        for (const id of ids) {
          if (bucket[id] !== undefined) {
            data[id] = bucket[id] as SignalDataTypeMap[T];
          }
        }
        return data;
      },
      set: async (data) => {
        for (const category in data) {
          keysStore[category] ??= {};
          for (const id in data[category as keyof typeof data]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const value = (data as any)[category][id];
            if (value) keysStore[category][id] = value;
            else delete keysStore[category][id];
          }
        }
        scheduleKeysFlush();
      },
    },
  };

  /** Flush síncrono (antes de desligar de propósito) — não usar em SIGTERM. */
  const flushNow = async () => {
    if (keysFlushTimer) {
      clearTimeout(keysFlushTimer);
      keysFlushTimer = null;
    }
    await flushKeys();
  };

  /** Apaga a sessão salva (logout real, ou troca de número). */
  const clear = async () => {
    await client!.delete(schema.waLiteSessions).where(eq(schema.waLiteSessions.sdrId, sdrId));
  };

  return { state, saveCreds, flushNow, clear };
}
