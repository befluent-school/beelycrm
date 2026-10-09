/**
 * Mapeia eventos `messages.upsert` do Baileys (WhatsApp Lite) para o Inbox
 * do Beely — seam de entrada separada de wa-webhook-handlers.ts porque
 * aquele é HTTP-POST-shaped (payload de terceiro, Z-API/Meta) e isto é um
 * evento interno de um socket vivo, sem payload HTTP nenhum. pushMessage()
 * já é 100% agnóstico de provider, não precisa de nenhuma mudança lá.
 */
import {
  normalizeMessageContent, isJidBroadcast, isJidGroup, isJidNewsletter, isJidStatusBroadcast,
  type WAMessage,
} from "@whiskeysockets/baileys";
import { pushMessage } from "@/lib/message-store";

function jidToPhone(jid: string | null | undefined): string {
  if (!jid) return "";
  return jid.replace(/@s\.whatsapp\.net$|@lid$/, "").replace(/\D/g, "");
}

function extractText(rawMessage: WAMessage["message"]): string {
  // normalizeMessageContent desembrulha ephemeralMessage/viewOnceMessage
  // (comuns em conversas reais do WhatsApp moderno) — sem isso, o texto
  // real fica um nível mais fundo e extractText nunca encontrava nada.
  const message = normalizeMessageContent(rawMessage);
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

function extractMsgType(rawMessage: WAMessage["message"]): "text" | "image" | "audio" | "document" | "video" {
  const message = normalizeMessageContent(rawMessage);
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

  const jid = msg.key.remoteJid;
  // Só conversas 1:1 reais — grupo, status (stories), listas de transmissão
  // e newsletters não são tratados pelo Inbox hoje (foco 1:1 com leads), e
  // sem esse filtro o JID de status ("status@broadcast") virava um
  // "contato" com número sem sentido no Inbox.
  if (!jid || isJidGroup(jid) || isJidBroadcast(jid) || isJidStatusBroadcast(jid) || isJidNewsletter(jid)) return;

  const isLid = !!jid.endsWith("@lid");
  const phone = jidToPhone(jid);
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
