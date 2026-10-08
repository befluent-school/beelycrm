/**
 * Mapeia eventos `messages.upsert` do Baileys (WhatsApp Lite) para o Inbox
 * do Beely — seam de entrada separada de wa-webhook-handlers.ts porque
 * aquele é HTTP-POST-shaped (payload de terceiro, Z-API/Meta) e isto é um
 * evento interno de um socket vivo, sem payload HTTP nenhum. pushMessage()
 * já é 100% agnóstico de provider, não precisa de nenhuma mudança lá.
 */
import type { WAMessage } from "@whiskeysockets/baileys";
import { pushMessage } from "@/lib/message-store";

function jidToPhone(jid: string | null | undefined): string {
  if (!jid) return "";
  return jid.replace(/@s\.whatsapp\.net$|@lid$/, "").replace(/\D/g, "");
}

function extractText(message: WAMessage["message"]): string {
  if (!message) return "";
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    message.documentMessage?.caption ??
    ""
  );
}

function extractMsgType(message: WAMessage["message"]): "text" | "image" | "audio" | "document" | "video" {
  if (!message) return "text";
  if (message.imageMessage) return "image";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  if (message.videoMessage) return "video";
  return "text";
}

export async function ingestBaileysMessage(sdrId: string, msg: WAMessage): Promise<void> {
  // Mensagens de sistema/protocolo (sem conteúdo real) — ignora.
  if (!msg.message) return;
  // Mensagens de grupo não são tratadas pelo Inbox hoje (foco 1:1 com leads).
  if (msg.key.remoteJid?.endsWith("@g.us")) return;

  const isLid = !!msg.key.remoteJid?.endsWith("@lid");
  const phone = jidToPhone(msg.key.remoteJid);
  if (!phone) return;

  await pushMessage({
    channel: "whatsapp",
    from: phone,
    fromName: msg.pushName || phone,
    text: extractText(msg.message),
    timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now(),
    fromMe: !!msg.key.fromMe,
    msgType: extractMsgType(msg.message),
    isLid,
    sdrId,
  });
}
