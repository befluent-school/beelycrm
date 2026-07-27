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
  raw?: unknown;
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
  ];
  for (const sql of cols) {
    await client.rpc("exec_sql", { sql }).catch(() => null);
  }
}

export async function pushMessage(msg: Omit<InboxMessage, "id">): Promise<InboxMessage> {
  const full: InboxMessage = {
    ...msg,
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
    };
  }

  try {
    let query = client
      .from("inbox_messages")
      .select("id, channel, from, from_name, text, timestamp, from_me, sender_photo, msg_type, media_url, media_caption, file_name, is_lid")
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
