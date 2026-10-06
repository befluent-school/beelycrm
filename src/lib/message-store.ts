/**
 * Message store do Inbox — persistido no Postgres local via Drizzle.
 * Webhook POST → Postgres → frontend polling GET.
 */

import { and, desc, eq, gt } from "drizzle-orm";
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

export async function pushMessage(msg: Omit<InboxMessage, "id">): Promise<InboxMessage> {
  // threadKey default: agrupa por SDR+telefone (multi-SDR) ou só telefone (legado).
  const threadKey = msg.threadKey ?? (msg.sdrId ? `${msg.sdrId}:${msg.from}` : msg.from);
  const full: InboxMessage = {
    ...msg,
    threadKey,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    raw: undefined,
  };

  if (!client) {
    console.warn("[message-store] DATABASE_URL não configurado — mensagem apenas em memória");
    memFallback.push(full);
    if (memFallback.length > 200) memFallback = memFallback.slice(-200);
    return full;
  }

  try {
    await client.insert(schema.inboxMessages).values({
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
    });
    console.log(`[message-store] +1 msg de ${full.fromName} (${full.channel}) salva no Postgres`);
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

export async function getRecentMessages(since?: number): Promise<InboxMessage[]> {
  if (!client) {
    if (since == null || since === 0) return memFallback.slice(-100);
    return memFallback.filter((m) => m.timestamp > since);
  }

  try {
    const rows = since && since > 0
      ? await client.select().from(schema.inboxMessages)
          .where(gt(schema.inboxMessages.timestamp, since))
          .orderBy(desc(schema.inboxMessages.timestamp))
          .limit(200)
      : await client.select().from(schema.inboxMessages)
          .orderBy(desc(schema.inboxMessages.timestamp))
          .limit(200);

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
 * Conversas agrupadas por thread (sdrId+telefone), com resumo da última
 * mensagem — usado pela lista do Inbox. Agrega client-side sobre
 * getRecentMessages() para reaproveitar o caminho de leitura já validado
 * em vez de duplicar a lógica em SQL.
 */
export async function getThreads(): Promise<ThreadSummary[]> {
  const messages = await getAllMessages();
  const byThread = new Map<string, ThreadSummary>();

  for (const m of messages) {
    const key = m.threadKey ?? (m.sdrId ? `${m.sdrId}:${m.from}` : m.from);
    const existing = byThread.get(key);
    if (!existing || m.timestamp >= existing.lastTimestamp) {
      byThread.set(key, {
        threadKey: key,
        sdrId: m.sdrId,
        phone: m.from,
        contactName: m.fromName || m.from,
        lastText: m.text,
        lastTimestamp: m.timestamp,
        lastFromMe: m.fromMe ?? false,
        unread: existing?.unread ?? 0,
      });
    }
  }

  // Não lidas: mensagens recebidas (fromMe=false) mais recentes que a última enviada por nós.
  const lastOutByThread = new Map<string, number>();
  for (const m of messages) {
    if (!m.fromMe) continue;
    const key = m.threadKey ?? (m.sdrId ? `${m.sdrId}:${m.from}` : m.from);
    lastOutByThread.set(key, Math.max(lastOutByThread.get(key) ?? 0, m.timestamp));
  }
  for (const m of messages) {
    if (m.fromMe) continue;
    const key = m.threadKey ?? (m.sdrId ? `${m.sdrId}:${m.from}` : m.from);
    const lastOut = lastOutByThread.get(key) ?? 0;
    if (m.timestamp > lastOut) {
      const t = byThread.get(key);
      if (t) t.unread += 1;
    }
  }

  return [...byThread.values()].sort((a, b) => b.lastTimestamp - a.lastTimestamp);
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

