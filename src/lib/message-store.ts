/**
 * Message store persistido no Supabase.
 * Resolve o problema do Render free tier (hibernação apaga /tmp).
 * Webhook POST → Supabase → frontend polling GET
 */

import { createClient } from "@supabase/supabase-js";

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

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Fallback apenas para quando o Supabase não está configurado (não usado em produção).
// NUNCA usar como cache de leitura: em produção há múltiplas instâncias do processo
// (Render pode escalar horizontalmente), e o processo que recebe o webhook não é
// necessariamente o mesmo que atende o polling do frontend — um cache em memória
// compartilhado entre "instâncias" lógicas do processo causava mensagens que
// apareciam e sumiam (o poll batia num processo que nunca viu o push do webhook).
let memFallback: InboxMessage[] = [];

// Garante que colunas extras existam (roda uma vez por instância)
let schemaMigrated = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSchema(client: any) {
  if (schemaMigrated) return;
  schemaMigrated = true;
  const cols = [
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS sender_photo TEXT",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS from_me BOOLEAN DEFAULT FALSE",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS msg_type TEXT DEFAULT 'text'",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS media_url TEXT",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS media_caption TEXT",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS file_name TEXT",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS is_lid BOOLEAN DEFAULT FALSE",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS sdr_id TEXT",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS thread_key TEXT",
  ];
  for (const sql of cols) {
    await client.rpc("exec_sql", { sql }).catch(() => null);
  }
}

export async function pushMessage(msg: Omit<InboxMessage, "id">): Promise<InboxMessage> {
  // threadKey default: agrupa por SDR+telefone (multi-SDR) ou só telefone (legado).
  const threadKey = msg.threadKey ?? (msg.sdrId ? `${msg.sdrId}:${msg.from}` : msg.from);
  const full: InboxMessage = {
    ...msg,
    threadKey,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    raw: undefined,
  };

  const client = getClient();
  if (!client) {
    // Sem Supabase configurado: guarda só localmente (dev/demo)
    memFallback.push(full);
    if (memFallback.length > 200) memFallback = memFallback.slice(-200);
  }
  if (client) {
    void ensureSchema(client);
    const { error } = await client.from("inbox_messages").insert({
      id:            full.id,
      channel:       full.channel,
      from:          full.from,
      from_name:     full.fromName,
      text:          full.text,
      timestamp:     full.timestamp,
      from_me:       full.fromMe ?? false,
      sender_photo:  full.senderPhoto ?? null,
      msg_type:      full.msgType ?? "text",
      media_url:     full.mediaUrl ?? null,
      media_caption: full.mediaCaption ?? null,
      file_name:     full.fileName ?? null,
      is_lid:        full.isLid ?? false,
      sdr_id:        full.sdrId ?? null,
      thread_key:    full.threadKey ?? null,
    });
    if (error) {
      console.error("[message-store] erro ao salvar no Supabase:", error.message);
    } else {
      console.log(`[message-store] +1 msg de ${full.fromName} (${full.channel}) salva no Supabase`);
    }
  } else {
    console.warn("[message-store] Supabase não configurado — mensagem apenas em memória");
  }

  return full;
}

export async function getRecentMessages(since?: number): Promise<InboxMessage[]> {
  const client = getClient();
  if (!client) {
    if (since == null || since === 0) return memFallback.slice(-100);
    return memFallback.filter((m) => m.timestamp > since);
  }

  // Garante que a coluna is_lid (e demais) existam antes de selecioná-las —
  // sem isso, o SELECT falha com "column does not exist" em bancos que
  // ainda não receberam nenhum pushMessage() desde a última migração,
  // fazendo TODAS as conversas desaparecerem (o catch abaixo retornava []).
  await ensureSchema(client);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mapRow(r: any): InboxMessage {
    return {
      id:           r.id,
      channel:      r.channel,
      from:         r.from,
      fromName:     r.from_name ?? r.from,
      text:         r.text ?? "",
      timestamp:    Number(r.timestamp),
      fromMe:       r.from_me ?? false,
      senderPhoto:  r.sender_photo ?? undefined,
      msgType:      r.msg_type ?? "text",
      mediaUrl:     r.media_url ?? undefined,
      mediaCaption: r.media_caption ?? undefined,
      fileName:     r.file_name ?? undefined,
      isLid:        r.is_lid ?? false,
      sdrId:        r.sdr_id ?? undefined,
      threadKey:    r.thread_key ?? (r.sdr_id ? `${r.sdr_id}:${r.from}` : r.from),
    };
  }

  try {
    let query = client
      .from("inbox_messages")
      .select("id, channel, from, from_name, text, timestamp, from_me, sender_photo, msg_type, media_url, media_caption, file_name, is_lid, sdr_id, thread_key")
      .order("timestamp", { ascending: false })
      .limit(200);
    if (since && since > 0) query = query.gt("timestamp", since);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map(mapRow).reverse(); // mais antigo primeiro
  } catch (e) {
    // Fallback: se a coluna is_lid ainda não existir por qualquer motivo
    // (ex: permissão insuficiente para rodar o ALTER TABLE via RPC), tenta
    // de novo sem ela em vez de deixar o Inbox inteiro vazio.
    console.warn("[message-store] retry sem is_lid após erro:", e);
    try {
      let query = client
        .from("inbox_messages")
        .select("id, channel, from, from_name, text, timestamp, from_me, sender_photo, msg_type, media_url, media_caption, file_name")
        .order("timestamp", { ascending: false })
        .limit(200);
      if (since && since > 0) query = query.gt("timestamp", since);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map(mapRow).reverse();
    } catch (e2) {
      console.error("[message-store] erro ao ler do Supabase (fallback também falhou):", e2);
      return [];
    }
  }
}

export async function getAllMessages(): Promise<InboxMessage[]> {
  return getRecentMessages();
}

/**
 * Conversas agrupadas por thread (sdrId+telefone), com resumo da última
 * mensagem — usado pela lista do Inbox. Agrega client-side sobre
 * getRecentMessages() para reaproveitar o caminho de leitura já validado
 * (com seus fallbacks de schema) em vez de duplicar a lógica em SQL.
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
  const client = getClient();
  if (!client) {
    const since = Date.now() - windowMs;
    return memFallback.some((m) => m.fromMe && m.text === text && m.timestamp > since);
  }

  try {
    const since = Date.now() - windowMs;
    const { data, error } = await client
      .from("inbox_messages")
      .select("id")
      .eq("from_me", true)
      .eq("text", text)
      .gt("timestamp", since)
      .limit(1);
    if (error) throw error;
    return (data ?? []).length > 0;
  } catch (e) {
    console.error("[message-store] erro ao checar duplicata:", e);
    return false;
  }
}
