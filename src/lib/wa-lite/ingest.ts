/**
 * Mapeia eventos `messages.upsert` do Baileys (WhatsApp Lite) para o Inbox
 * do Beely — seam de entrada separada de wa-webhook-handlers.ts porque
 * aquele é HTTP-POST-shaped (payload de terceiro, Z-API/Meta) e isto é um
 * evento interno de um socket vivo, sem payload HTTP nenhum. pushMessage()
 * já é 100% agnóstico de provider, não precisa de nenhuma mudança lá.
 */
import {
  normalizeMessageContent, isJidBroadcast, isJidGroup, isJidNewsletter, isJidStatusBroadcast,
  downloadMediaMessage,
  type WAMessage,
} from "@whiskeysockets/baileys";
import { pushMessage } from "@/lib/message-store";

function jidToPhone(jid: string | null | undefined): string {
  if (!jid) return "";
  return jid.replace(/@s\.whatsapp\.net$|@lid$/, "").replace(/\D/g, "");
}

function extractText(rawMessage: WAMessage["message"]): string {
  const message = normalizeMessageContent(rawMessage);
  if (!message) return "";
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    message.documentMessage?.caption ??
    (message.audioMessage ? "[Áudio]" : undefined) ??
    ""
  );
}

type MsgType = "text" | "image" | "audio" | "document" | "video";

interface MediaInfo {
  msgType: MsgType;
  text: string;
  mediaUrl?: string;
  mediaCaption?: string;
  fileName?: string;
}

function extractMedia(rawMessage: WAMessage["message"]): MediaInfo {
  const message = normalizeMessageContent(rawMessage);
  if (!message) return { msgType: "text", text: "" };

  if (message.imageMessage) {
    const caption = message.imageMessage.caption ?? "";
    return {
      msgType: "image",
      text: caption || "[Imagem]",
      mediaCaption: caption || undefined,
      // URL direta do WhatsApp CDN (válida por ~5 min) — suficiente para exibir
      mediaUrl: message.imageMessage.url ?? undefined,
    };
  }
  if (message.audioMessage) {
    return {
      msgType: "audio",
      text: "[Áudio]",
      mediaUrl: message.audioMessage.url ?? undefined,
    };
  }
  if (message.videoMessage) {
    const caption = message.videoMessage.caption ?? "";
    return {
      msgType: "video",
      text: caption || "[Vídeo]",
      mediaCaption: caption || undefined,
      mediaUrl: message.videoMessage.url ?? undefined,
    };
  }
  if (message.documentMessage) {
    const name = message.documentMessage.fileName ?? "arquivo";
    return {
      msgType: "document",
      text: `[Documento: ${name}]`,
      fileName: name,
      mediaUrl: message.documentMessage.url ?? undefined,
    };
  }
  if (message.stickerMessage) {
    return {
      msgType: "image",
      text: "[Sticker]",
      mediaUrl: message.stickerMessage.url ?? undefined,
    };
  }

  // Texto puro
  const text =
    message.conversation ??
    message.extendedTextMessage?.text ??
    "";
  return { msgType: "text", text };
}

export async function ingestBaileysMessage(sdrId: string, msg: WAMessage): Promise<void> {
  if (!msg.message) return;

  const jid = msg.key.remoteJid;
  if (!jid || isJidGroup(jid) || isJidBroadcast(jid) || isJidStatusBroadcast(jid) || isJidNewsletter(jid)) return;

  const isLid = !!jid.endsWith("@lid");
  const phone = jidToPhone(jid);
  if (!phone) return;

  const stableId = msg.key.id ? `wa-${sdrId}-${msg.key.id}` : undefined;
  const { msgType, text, mediaUrl, mediaCaption, fileName } = extractMedia(msg.message);

  await pushMessage({
    channel: "whatsapp",
    from: phone,
    fromName: msg.pushName || phone,
    text,
    timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now(),
    fromMe: !!msg.key.fromMe,
    msgType,
    mediaUrl,
    mediaCaption,
    fileName,
    isLid,
    sdrId,
    stableId,
  });
}
