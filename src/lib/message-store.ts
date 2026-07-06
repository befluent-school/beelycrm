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
  msgType?: "text" | "image" | "audio" | "document" | "video";
  mediaUrl?: string;
  mediaCaption?: string;
  fileName?: string;
  raw?: unknown;
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Cache em memória para reduzir leituras do banco dentro da mesma instância
let memCache: InboxMessage[] = [];
let cacheLoadedAt = 0;
const CACHE_TTL = 5_000; // 5s

export async function pushMessage(msg: Omit<InboxMessage, "id">): Promise<InboxMessage> {
  const full: InboxMessage = {
    ...msg,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    raw: undefined,
  };

  // Atualiza cache em memória
  memCache.push(full);
  if (memCache.length > 200) memCache = memCache.slice(-200);

  const client = getClient();
  if (client) {
    const { error } = await client.from("inbox_messages").insert({
      id:            full.id,
      channel:       full.channel,
      from:          full.from,
      from_name:     full.fromName,
      text:          full.text,
      timestamp:     full.timestamp,
      from_me:       full.fromMe ?? false,
      msg_type:      full.msgType ?? "text",
      media_url:     full.mediaUrl ?? null,
      media_caption: full.mediaCaption ?? null,
      file_name:     full.fileName ?? null,
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
  // Tenta cache em memória primeiro (dentro da mesma instância)
  const now = Date.now();
  if (memCache.length > 0 && now - cacheLoadedAt < CACHE_TTL) {
    if (since == null || since === 0) return memCache.slice(-100);
    return memCache.filter((m) => m.timestamp > since);
  }

  const client = getClient();
  if (!client) {
    // Sem Supabase: retorna apenas cache em memória
    if (since == null || since === 0) return memCache.slice(-100);
    return memCache.filter((m) => m.timestamp > since);
  }

  try {
    let query = client
      .from("inbox_messages")
      .select("id, channel, from, from_name, text, timestamp")
      .order("timestamp", { ascending: false })
      .limit(200);

    if (since && since > 0) {
      query = query.gt("timestamp", since);
    }

    const { data, error } = await query;
    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgs: InboxMessage[] = (data ?? []).map((r: any) => ({
      id:           r.id,
      channel:      r.channel,
      from:         r.from,
      fromName:     r.from_name ?? r.from,
      text:         r.text ?? "",
      timestamp:    Number(r.timestamp),
      fromMe:       r.from_me ?? false,
      msgType:      r.msg_type ?? "text",
      mediaUrl:     r.media_url ?? undefined,
      mediaCaption: r.media_caption ?? undefined,
      fileName:     r.file_name ?? undefined,
    })).reverse(); // mais antigo primeiro

    // Atualiza cache
    memCache = msgs;
    cacheLoadedAt = now;

    return msgs;
  } catch (e) {
    console.error("[message-store] erro ao ler do Supabase:", e);
    return memCache;
  }
}

export async function getAllMessages(): Promise<InboxMessage[]> {
  return getRecentMessages();
}
