/**
 * Message store do Inbox — persistido no Postgres local via Drizzle.
 * Webhook POST → Postgres → frontend polling GET.
 */

import { and, desc, eq, gt, gte, lte, sql, max } from "drizzle-orm";
import { db as client, schema } from "@/db";

export interface InboxMessage {
  id: string;
  channel: "whatsapp" | "instagram" | "messenger";
  from: string;
  fromName: string;
  text: string;
  timestamp: number;
  fromMe?: boolean;
  senderPhoto?: string;
  msgType?: "text" | "image" | "audio" | "document" | "video";
  mediaUrl?: string;
  mediaCaption?: string;
  fileName?: string;
  // true quando "from" é um LID do WhatsApp (número real não disponível —
  // contato com privacidade ativada). Não é possível enviar mensagem via
  // API para esse identificador, só visualizar o histórico recebido.
  isLid?: boolean;
  // Inbox multi-SDR: a que SDR/instância pertence esta conversa, e a chave
  // de agrupamento da thread (sdrId:phone, ou só phone no modo legado).
  sdrId?: string;
  threadKey?: string;
  raw?: unknown;
}

/** Resumo agregado de uma conversa — usado na lista do Inbox. */
export interface ThreadSummary {
  threadKey: string;
  sdrId?: string;
  phone: string;
  contactName: string;
  lastText: string;
  lastTimestamp: number;
  lastFromMe: boolean;
  unread: number;
}

// Fallback apenas para quando DATABASE_URL não está configurado (modo
// demo local). NUNCA usar como cache de leitura em produção com múltiplas
// instâncias — isso já causou o bug de mensagens "aparecendo e sumindo"
// quando o processo que recebia o webhook não era o mesmo que atendia o
// polling do frontend (Render escalado). Na VPS roda 1 instância PM2 só.
let memFallback: InboxMessage[] = [];

export async function pushMessage(
  msg: Omit<InboxMessage, "id"> & { stableId?: string }
): Promise<InboxMessage> {
  // threadKey default: agrupa por SDR+telefone (multi-SDR) ou só telefone (legado).
  const threadKey = msg.threadKey ?? (msg.sdrId ? `${msg.sdrId}:${msg.from}` : msg.from);
  const full: InboxMessage = {
    ...msg,
    threadKey,
    // stableId vem do Baileys (msg.key.id) — evita duplicatas no histórico.
    id: msg.stableId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    raw: undefined,
  };

  if (!client) {
    console.warn("[message-store] DATABASE_URL não configurado — mensagem apenas em memória");
    // Deduplicação em memória por id
    if (!memFallback.find((m) => m.id === full.id)) {
      memFallback.push(full);
    }
    return full;
  }

  try {
    const result = await client.insert(schema.inboxMessages).values({
      id:           full.id,
      channel:      full.channel,
      from:         full.from,
      fromName:     full.fromName,
      text:         full.text,
      timestamp:    full.timestamp,
      fromMe:       full.fromMe ?? false,
      senderPhoto:  full.senderPhoto ?? null,
      msgType:      full.msgType ?? "text",
      mediaUrl:     full.mediaUrl ?? null,
      mediaCaption: full.mediaCaption ?? null,
      fileName:     full.fileName ?? null,
      isLid:        full.isLid ?? false,
      sdrId:        full.sdrId ?? null,
      threadKey:    full.threadKey ?? null,
    // ON CONFLICT DO NOTHING: se o id já existe (histórico duplicado), silencia.
    }).onConflictDoNothing().returning({ id: schema.inboxMessages.id });

    if (result.length > 0) {
      // Notifica clientes SSE apenas para mensagens realmente novas (não duplicatas)
      try {
        const { notifySseClients } = await import("@/app/api/inbox/events/route");
        notifySseClients(JSON.stringify(full));
      } catch { /* SSE module pode não estar carregado no boot */ }
      console.log(`[message-store] +1 msg de ${full.fromName} (${full.channel}) salva no Postgres`);
    }
  } catch (e) {
    console.error("[message-store] erro ao salvar:", e);
  }

  return full;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(r: any): InboxMessage {
  return {
    id:           r.id,
    channel:      r.channel,
    from:         r.from,
    fromName:     r.fromName ?? r.from,
    text:         r.text ?? "",
    timestamp:    Number(r.timestamp),
    fromMe:       r.fromMe ?? false,
    senderPhoto:  r.senderPhoto ?? undefined,
    msgType:      r.msgType ?? "text",
    mediaUrl:     r.mediaUrl ?? undefined,
    mediaCaption: r.mediaCaption ?? undefined,
    fileName:     r.fileName ?? undefined,
    isLid:        r.isLid ?? false,
    sdrId:        r.sdrId ?? undefined,
    threadKey:    r.threadKey ?? (r.sdrId ? `${r.sdrId}:${r.from}` : r.from),
  };
}

export interface MessageFilter {
  /** Retornar apenas mensagens após este timestamp (ms). */
  since?: number;
  /** Retornar apenas mensagens a partir deste timestamp (ms) — início do período. */
  from?: number;
  /** Retornar apenas mensagens até este timestamp (ms) — fim do período. */
  to?: number;
}

export async function getRecentMessages(sinceOrFilter?: number | MessageFilter): Promise<InboxMessage[]> {
  const filter: MessageFilter =
    typeof sinceOrFilter === "number"
      ? { since: sinceOrFilter }
      : sinceOrFilter ?? {};

  const { since, from, to } = filter;

  if (!client) {
    let msgs = memFallback;
    if (since && since > 0) msgs = msgs.filter((m) => m.timestamp > since);
    if (from) msgs = msgs.filter((m) => m.timestamp >= from);
    if (to)   msgs = msgs.filter((m) => m.timestamp <= to);
    return msgs;
  }

  try {
    const conditions = [];
    if (since && since > 0) conditions.push(gt(schema.inboxMessages.timestamp, since));
    if (from) conditions.push(gte(schema.inboxMessages.timestamp, from));
    if (to)   conditions.push(lte(schema.inboxMessages.timestamp, to));

    const rows = await client.select().from(schema.inboxMessages)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.inboxMessages.timestamp));

    return rows.map(mapRow).reverse(); // mais antigo primeiro
  } catch (e) {
    console.error("[message-store] erro ao ler mensagens:", e);
    return [];
  }
}

export async function getAllMessages(): Promise<InboxMessage[]> {
  return getRecentMessages();
}

/**
 * Retorna o timestamp (ms) da primeira mensagem de cada thread.
 * Usado pelo filtro "data da primeira mensagem" na inbox.
 */
export async function getThreadFirstTimestamps(): Promise<Record<string, number>> {
  if (!client) {
    const map: Record<string, number> = {};
    for (const m of memFallback) {
      const key = m.threadKey ?? m.from;
      if (!map[key] || m.timestamp < map[key]) map[key] = m.timestamp;
    }
    return map;
  }
  try {
    const rows = await client
      .select({
        threadKey: schema.inboxMessages.threadKey,
        firstTs: sql<number>`min(${schema.inboxMessages.timestamp})`,
      })
      .from(schema.inboxMessages)
      .groupBy(schema.inboxMessages.threadKey);
    return Object.fromEntries(
      rows
        .filter((r) => r.threadKey != null)
        .map((r) => [r.threadKey as string, Number(r.firstTs)])
    );
  } catch (e) {
    console.error("[message-store] erro ao ler firstTimestamps:", e);
    return {};
  }
}

/**
 * Conversas agrupadas por thread — uma única query SQL via CTE.
 * Evita N+1 queries e carregamento de todas as mensagens em memória.
 */
export async function getThreads(): Promise<ThreadSummary[]> {
  if (!client) {
    // Fallback em memória para ambiente sem banco
    const messages = memFallback;
    const byThread = new Map<string, ThreadSummary>();
    for (const m of messages) {
      const key = m.threadKey ?? (m.sdrId ? `${m.sdrId}:${m.from}` : m.from);
      const existing = byThread.get(key);
      if (!existing || m.timestamp >= existing.lastTimestamp) {
        byThread.set(key, {
          threadKey: key, sdrId: m.sdrId, phone: m.from,
          contactName: m.fromName || m.from, lastText: m.text,
          lastTimestamp: m.timestamp, lastFromMe: m.fromMe ?? false, unread: 0,
        });
      }
    }
    return [...byThread.values()].sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }

  try {
    // Query única via CTE para evitar N+1 queries
    const rows = await client.execute(sql`
      WITH
      -- Agrega por thread: timestamp máximo, último timestamp enviado por nós
      agg AS (
        SELECT
          thread_key,
          sdr_id,
          "from",
          MAX(timestamp)                                                        AS last_ts,
          MAX(CASE WHEN from_me = true  THEN timestamp ELSE 0 END)             AS last_out_ts,
          COUNT(CASE WHEN from_me = false THEN 1 ELSE NULL END)                AS total_received,
          COUNT(CASE WHEN from_me = true  THEN 1 ELSE NULL END)                AS total_sent
        FROM inbox_messages
        WHERE thread_key IS NOT NULL AND sdr_id IS NOT NULL
        GROUP BY thread_key, sdr_id, "from"
      ),
      -- Última mensagem de cada thread (texto + fromMe)
      last_msg AS (
        SELECT DISTINCT ON (thread_key)
          thread_key, text, from_me
        FROM inbox_messages
        WHERE thread_key IS NOT NULL AND sdr_id IS NOT NULL
        ORDER BY thread_key, timestamp DESC
      ),
      -- Nome do contato: mensagem mais recente de fromMe=false
      contact_name AS (
        SELECT DISTINCT ON (thread_key)
          thread_key, from_name
        FROM inbox_messages
        WHERE thread_key IS NOT NULL AND sdr_id IS NOT NULL AND from_me = false
        ORDER BY thread_key, timestamp DESC
      ),
      -- Não lidas: mensagens recebidas após o último envio nosso
      unread AS (
        SELECT
          i.thread_key,
          COUNT(*) AS unread_count
        FROM inbox_messages i
        JOIN agg a ON a.thread_key = i.thread_key
        WHERE i.from_me = false AND i.timestamp > a.last_out_ts
          AND i.thread_key IS NOT NULL
        GROUP BY i.thread_key
      )
      SELECT
        a.thread_key,
        a.sdr_id,
        a."from",
        a.last_ts,
        COALESCE(u.unread_count, 0)  AS unread_count,
        lm.text                       AS last_text,
        lm.from_me                    AS last_from_me,
        COALESCE(cn.from_name, a."from") AS contact_name
      FROM agg a
      LEFT JOIN last_msg     lm ON lm.thread_key = a.thread_key
      LEFT JOIN contact_name cn ON cn.thread_key = a.thread_key
      LEFT JOIN unread        u ON  u.thread_key = a.thread_key
      ORDER BY a.last_ts DESC
    `);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows as any[]).map((r) => ({
      threadKey:     String(r.thread_key),
      sdrId:         r.sdr_id ?? undefined,
      phone:         r.from ?? r.thread_key,
      contactName:   r.contact_name || r.from || r.thread_key,
      lastText:      r.last_text ?? "",
      lastTimestamp: Number(r.last_ts),
      lastFromMe:    r.last_from_me ?? false,
      unread:        Number(r.unread_count ?? 0),
    }));
  } catch (e) {
    console.error("[message-store] erro em getThreads:", e);
    return [];
  }
}

/**
 * Verifica se já existe uma mensagem fromMe=true com o mesmo texto
 * enviada recentemente (janela padrão: 30s). Usado para detectar o eco
 * do webhook "Ao enviar" da Z-API — o /api/inbox/send já persiste a
 * mensagem no momento do envio pelo sistema, então esse eco chega
 * segundos depois com o mesmo conteúdo e deve ser ignorado (não é uma
 * mensagem nova enviada pelo celular).
 */
export async function wasRecentlySentByUs(text: string, windowMs = 30_000): Promise<boolean> {
  const since = Date.now() - windowMs;

  if (!client) {
    return memFallback.some((m) => m.fromMe && m.text === text && m.timestamp > since);
  }

  try {
    const rows = await client.select({ id: schema.inboxMessages.id }).from(schema.inboxMessages)
      .where(and(
        eq(schema.inboxMessages.fromMe, true),
        eq(schema.inboxMessages.text, text),
        gt(schema.inboxMessages.timestamp, since),
      ))
      .limit(1);
    return rows.length > 0;
  } catch (e) {
    console.error("[message-store] erro ao checar duplicata:", e);
    return false;
  }
}

