/**
 * Handlers de webhook de mensageria — WhatsApp (Z-API e Meta Cloud API),
 * Instagram e Messenger.
 *
 * `sdr` é opcional: quando presente (Inbox multi-SDR), as mensagens são
 * gravadas com sdrId/threadKey e a resolução de LID usa as credenciais
 * daquele SDR; quando ausente, mantém o comportamento legado 100% igual
 * (env vars globais ZAPI_*, threadKey = telefone).
 */

import { pushMessage, wasRecentlySentByUs } from "@/lib/message-store";
import { exitFollowupOnReply } from "@/lib/followup-exit";
import { resolveRecentChatPhone } from "@/lib/zapi-resolve";
import type { Sdr } from "@/lib/store";

/* ── Z-API payload types ─────────────────────────────────────── */
interface ZApiMessage {
  phone?: string;
  connectedPhone?: string;
  fromMe?: boolean;
  momment?: number;
  timestamp?: number;
  text?: { message?: string };
  audio?: { audioUrl?: string; mimeType?: string };
  image?: { imageUrl?: string; caption?: string; mimeType?: string };
  video?: { videoUrl?: string; caption?: string };
  document?: { documentUrl?: string; fileName?: string; mimeType?: string };
  sticker?: { stickerUrl?: string };
  senderName?: string;
  chatName?: string;
  senderPhoto?: string;
  photo?: string;
  instanceId?: string;
  messageId?: string;
  type?: string;
  value?: {
    phone?: string;
    fromMe?: boolean;
    text?: { message?: string };
    image?: { imageUrl?: string; caption?: string };
    audio?: { audioUrl?: string };
    video?: { videoUrl?: string; caption?: string };
    document?: { documentUrl?: string; fileName?: string };
    senderName?: string;
    momment?: number;
  };
}

interface MetaMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id?: string; link?: string; caption?: string; mime_type?: string };
  audio?: { id?: string; link?: string; mime_type?: string };
  video?: { id?: string; link?: string; caption?: string };
  document?: { id?: string; link?: string; filename?: string; caption?: string; mime_type?: string };
  sticker?: { id?: string; link?: string };
}

/* ── Extrai tipo e dados de mídia de um payload Z-API ────────── */
function extractZApiMedia(p: ZApiMessage): {
  msgType: "text" | "image" | "audio" | "document" | "video";
  text: string; mediaUrl?: string; mediaCaption?: string; fileName?: string;
} {
  if (p.text?.message) return { msgType: "text", text: p.text.message };
  if (p.image) return { msgType: "image", mediaUrl: p.image.imageUrl, mediaCaption: p.image.caption, text: p.image.caption ?? "[Imagem]" };
  if (p.audio) return { msgType: "audio", mediaUrl: p.audio.audioUrl, text: "[Áudio]" };
  if (p.video) return { msgType: "video", mediaUrl: p.video.videoUrl, mediaCaption: p.video.caption, text: p.video.caption ?? "[Vídeo]" };
  if (p.document) return { msgType: "document", mediaUrl: p.document.documentUrl, fileName: p.document.fileName, text: `[Documento: ${p.document.fileName ?? "arquivo"}]` };
  if (p.sticker) return { msgType: "image", mediaUrl: p.sticker.stickerUrl, text: "[Sticker]" };
  return { msgType: "text", text: "(mensagem sem texto)" };
}

/* ── WhatsApp — Z-API e Meta Cloud API ──────────────────────── */
export async function handleWhatsApp(payload: unknown, sdr?: Sdr | null) {
  const p = payload as ZApiMessage & {
    object?: string;
    entry?: { changes?: { value?: { messages?: MetaMessage[]; contacts?: { profile?: { name?: string } }[] } }[] }[];
  };
  const sdrId = sdr?.id;

  /* Z-API: ignora callbacks de entrega/leitura (não são mensagens reais) */
  if (p.type && p.type !== "ReceivedCallback") {
    console.log(`[WhatsApp/Z-API] evento ignorado: ${p.type}`);
    return;
  }

  /* ── Z-API v1 (root) ── */
  if (p.phone && !p.object) {
    const fromMe = p.fromMe ?? false;
    const ts = p.momment ?? p.timestamp ?? Date.now();
    const senderPhoto = p.senderPhoto ?? p.photo ?? undefined;
    const { msgType, text, mediaUrl, mediaCaption, fileName } = extractZApiMedia(p);

    if (fromMe) {
      // Deduplicação: eco de mensagem já enviada pelo sistema (texto OU mídia).
      // Para texto: compara conteúdo. Para mídia: compara URL.
      const isDup =
        msgType === "text"
          ? await wasRecentlySentByUs(text)
          : mediaUrl ? await wasRecentlySentByUs(mediaUrl) : false;

      if (isDup) {
        console.log("[WhatsApp/Z-API] eco já enviado pelo sistema — ignorado");
        return;
      }

      const resolved = await resolveRecentChatPhone(sdr);
      if (!resolved) {
        console.warn("[WhatsApp/Z-API] fromMe sem telefone resolvido — descartado");
        return;
      }
      console.log(`[WhatsApp/Z-API] → celular para ${resolved.name ?? resolved.phone}: ${text}`);
      await pushMessage({
        channel: "whatsapp", from: resolved.phone, fromName: resolved.name ?? resolved.phone,
        text, timestamp: typeof ts === "number" && ts > 1e12 ? ts : ts * 1000,
        fromMe: true, senderPhoto, msgType, mediaUrl, mediaCaption, fileName, sdrId, raw: payload,
      });
      return;
    }

    const phone = p.phone ?? "desconhecido";
    const name = p.senderName ?? phone;
    console.log(`[WhatsApp/Z-API] ← ${name} (${phone}): ${text}`);
    await pushMessage({
      channel: "whatsapp", from: phone, fromName: name,
      text, timestamp: typeof ts === "number" && ts > 1e12 ? ts : ts * 1000,
      fromMe: false, senderPhoto, msgType, mediaUrl, mediaCaption, fileName, sdrId, raw: payload,
    });
    void exitFollowupOnReply(phone);
    return;
  }

  /* ── Z-API v2 (envelope "value") ── */
  if (p.value?.phone) {
    if (p.value.fromMe) return;
    const phone = p.value.phone;
    const name = p.value.senderName ?? phone;
    const ts = p.value.momment ?? Date.now();

    // v2 agora parseia mídia também
    let msgType: "text" | "image" | "audio" | "document" | "video" = "text";
    let text = "(mensagem)";
    let mediaUrl: string | undefined;
    let mediaCaption: string | undefined;
    let fileName: string | undefined;

    if (p.value.text?.message) { text = p.value.text.message; }
    else if (p.value.image) { msgType = "image"; mediaUrl = p.value.image.imageUrl; mediaCaption = p.value.image.caption; text = p.value.image.caption ?? "[Imagem]"; }
    else if (p.value.audio) { msgType = "audio"; mediaUrl = p.value.audio.audioUrl; text = "[Áudio]"; }
    else if (p.value.video) { msgType = "video"; mediaUrl = p.value.video.videoUrl; mediaCaption = p.value.video.caption; text = p.value.video.caption ?? "[Vídeo]"; }
    else if (p.value.document) { msgType = "document"; mediaUrl = p.value.document.documentUrl; fileName = p.value.document.fileName; text = `[Documento: ${p.value.document.fileName ?? "arquivo"}]`; }

    await pushMessage({
      channel: "whatsapp", from: phone, fromName: name,
      text, timestamp: typeof ts === "number" && ts > 1e12 ? ts : ts * 1000,
      msgType, mediaUrl, mediaCaption, fileName, sdrId, raw: payload,
    });
    void exitFollowupOnReply(phone);
    return;
  }

  /* ── Meta Cloud API ── */
  if (p.object === "whatsapp_business_account") {
    for (const entry of p.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        const messages: MetaMessage[] = (value as { messages?: MetaMessage[] }).messages ?? [];
        const contactName = (value as { contacts?: { profile?: { name?: string } }[] }).contacts?.[0]?.profile?.name;

        for (const msg of messages) {
          const ts = Number(msg.timestamp) * 1000;
          let msgType: "text" | "image" | "audio" | "document" | "video" = "text";
          let text = "(mensagem)";
          let mediaUrl: string | undefined;
          let mediaCaption: string | undefined;
          let fileName: string | undefined;

          if (msg.text?.body) { text = msg.text.body; }
          else if (msg.image) { msgType = "image"; mediaUrl = msg.image.link; mediaCaption = msg.image.caption; text = msg.image.caption ?? "[Imagem]"; }
          else if (msg.audio) { msgType = "audio"; mediaUrl = msg.audio.link; text = "[Áudio]"; }
          else if (msg.video) { msgType = "video"; mediaUrl = msg.video.link; mediaCaption = msg.video.caption; text = msg.video.caption ?? "[Vídeo]"; }
          else if (msg.document) { msgType = "document"; mediaUrl = msg.document.link; fileName = msg.document.filename; text = `[Documento: ${msg.document.filename ?? "arquivo"}]`; }
          else if (msg.sticker) { msgType = "image"; mediaUrl = (msg.sticker as { link?: string }).link; text = "[Sticker]"; }

          await pushMessage({
            channel: "whatsapp", from: msg.from, fromName: contactName ?? msg.from,
            text, timestamp: ts, fromMe: false,
            msgType, mediaUrl, mediaCaption, fileName, sdrId, raw: payload,
          });
          void exitFollowupOnReply(msg.from);
        }
      }
    }
  }
}

/* ── Instagram Graph API ────────────────────────────────────── */
export async function handleInstagram(payload: unknown, sdr?: Sdr | null) {
  const p = payload as {
    object?: string;
    entry?: {
      id?: string;
      messaging?: {
        sender?: { id?: string };
        recipient?: { id?: string };
        timestamp?: number;
        message?: {
          mid?: string;
          text?: string;
          attachments?: { type?: string; payload?: { url?: string } }[];
        };
      }[];
    }[];
  };
  if (p.object !== "instagram") return;
  const sdrId = sdr?.id;

  for (const entry of p.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      const senderId = ev.sender?.id ?? "desconhecido";
      const ts = ev.timestamp ?? Date.now();

      let text = ev.message?.text ?? "";
      let msgType: "text" | "image" | "audio" | "document" | "video" = "text";
      let mediaUrl: string | undefined;

      // Anexos (imagens, áudios, vídeos via Instagram)
      const att = ev.message?.attachments?.[0];
      if (!text && att) {
        msgType = att.type === "audio" ? "audio" : att.type === "video" ? "video" : "image";
        mediaUrl = att.payload?.url;
        text = att.type === "audio" ? "[Áudio]" : att.type === "video" ? "[Vídeo]" : "[Imagem]";
      }
      if (!text) text = "(mensagem)";

      await pushMessage({
        channel: "instagram",
        from: senderId,
        fromName: `IG:${senderId}`,
        text,
        timestamp: ts > 1e12 ? ts : ts * 1000,
        msgType, mediaUrl,
        // sdrId obrigatório para aparecer no Inbox (filtro `!!m.sdrId`)
        sdrId: sdrId ?? `ig-${entry.id ?? "default"}`,
        raw: payload,
      });

      if (!ev.message?.mid?.startsWith("echo_")) {
        void exitFollowupOnReply(senderId);
      }
    }
  }
}

/* ── Messenger (Facebook) ───────────────────────────────────── */
export async function handleMessenger(payload: unknown, sdr?: Sdr | null) {
  const p = payload as {
    object?: string;
    entry?: {
      id?: string;
      messaging?: {
        sender?: { id?: string };
        recipient?: { id?: string };
        timestamp?: number;
        message?: { mid?: string; text?: string; attachments?: { type?: string; payload?: { url?: string } }[] };
      }[];
    }[];
  };
  if (p.object !== "page") return;
  const sdrId = sdr?.id;

  for (const entry of p.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      const from = ev.sender?.id ?? "desconhecido";
      const ts = ev.timestamp ?? Date.now();
      let text = ev.message?.text ?? "";
      let msgType: "text" | "image" | "audio" | "document" | "video" = "text";
      let mediaUrl: string | undefined;

      const att = ev.message?.attachments?.[0];
      if (!text && att) {
        msgType = att.type === "audio" ? "audio" : att.type === "video" ? "video" : "image";
        mediaUrl = att.payload?.url;
        text = att.type === "audio" ? "[Áudio]" : att.type === "video" ? "[Vídeo]" : "[Imagem]";
      }
      if (!text) text = "(mensagem)";

      await pushMessage({
        channel: "messenger", from, fromName: `FB:${from}`,
        text, timestamp: ts > 1e12 ? ts : ts * 1000,
        msgType, mediaUrl,
        sdrId: sdrId ?? `fb-${entry.id ?? "default"}`,
        raw: payload,
      });
    }
  }
}
