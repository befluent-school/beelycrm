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

type MsgType = "text" | "image" | "audio" | "document" | "video";

interface MediaInfo {
  msgType: MsgType;
  text: string;
  mediaUrl?: string;
  mediaCaption?: string;
  fileName?: string;
  /** true = esta mensagem não deve ser persistida (protocolo interno, reação, etc.) */
  skip?: boolean;
}

/**
 * Extrai conteúdo de qualquer tipo de mensagem do Baileys, incluindo
 * wrappers como ephemeralMessage, viewOnceMessage e editedMessage.
 * Mensagens de protocolo interno (revogação, reação, etc.) retornam skip=true.
 */
function extractMedia(rawMessage: WAMessage["message"]): MediaInfo {
  // normalizeMessageContent desempacota viewOnce, ephemeral, documentWithCaption, etc.
  const message = normalizeMessageContent(rawMessage);
  if (!message) return { msgType: "text", text: "", skip: true };

  // Mensagens de protocolo interno — não têm conteúdo visível para o usuário
  if (
    message.protocolMessage ||
    message.reactionMessage ||
    message.keepInChatMessage ||
    message.pollUpdateMessage
  ) {
    return { msgType: "text", text: "", skip: true };
  }

  // Mensagem editada — pega o conteúdo da edição
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const edited = (message as any).editedMessage?.message;
  if (edited) {
    const inner = normalizeMessageContent(edited);
    if (inner) {
      const editedText = inner.conversation ?? inner.extendedTextMessage?.text ?? "";
      if (editedText) return { msgType: "text", text: editedText };
    }
  }

  if (message.imageMessage) {
    const caption = message.imageMessage.caption ?? "";
    return {
      msgType: "image",
      text: caption || "[Imagem]",
      mediaCaption: caption || undefined,
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
  if (message.locationMessage) {
    const { degreesLatitude: lat, degreesLongitude: lng } = message.locationMessage;
    return { msgType: "text", text: `📍 Localização: ${lat?.toFixed(5)},${lng?.toFixed(5)}` };
  }
  if (message.contactMessage) {
    const name = message.contactMessage.displayName ?? "Contato";
    return { msgType: "text", text: `👤 Contato: ${name}` };
  }

  // Texto puro (conversation = mensagem simples sem formatação)
  const text =
    message.conversation ??
    message.extendedTextMessage?.text ??
    "";

  // Mensagem sem conteúdo reconhecível — não persiste
  if (!text) return { msgType: "text", text: "", skip: true };

  return { msgType: "text", text };
}

export async function ingestBaileysMessage(sdrId: string, msg: WAMessage): Promise<void> {
  if (!msg.message) return;

  const jid = msg.key.remoteJid;
  if (!jid || isJidGroup(jid) || isJidBroadcast(jid) || isJidStatusBroadcast(jid) || isJidNewsletter(jid)) return;

  const isLid = !!jid.endsWith("@lid");
  const phone = jidToPhone(jid);
  if (!phone) return;

  const { msgType, text, mediaUrl, mediaCaption, fileName, skip } = extractMedia(msg.message);

  // Ignora mensagens de protocolo sem conteúdo visível
  if (skip) return;

  const stableId = msg.key.id ? `wa-${sdrId}-${msg.key.id}` : undefined;

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
