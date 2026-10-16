/**
 * Adaptador de envio de WhatsApp por SDR — Z-API ou Meta Cloud API (oficial).
 * Cada SDR tem seu próprio número/instância; este módulo escolhe o provedor
 * certo a partir dos campos salvos no `Sdr` (src/lib/store.ts).
 */

import type { Sdr } from "@/lib/store";
import { getLiveSocket } from "@/lib/wa-lite/session-manager";

export interface SendResult {
  ok: boolean;
  error?: string;
  providerMessageId?: string;
}

export type MediaType = "image" | "audio" | "document" | "video";

export interface SendMediaOptions {
  /** URL pública acessível do arquivo (já hospedado). */
  mediaUrl: string;
  mediaType: MediaType;
  fileName?: string;
  caption?: string;
}

export interface WaProviderAdapter {
  readonly name: "zapi" | "meta_cloud" | "wa_lite";
  send(sdr: Sdr, toPhone: string, text: string): Promise<SendResult>;
  sendMedia(sdr: Sdr, toPhone: string, opts: SendMediaOptions): Promise<SendResult>;
}

/* ── Z-API ──────────────────────────────────────────────────── */
export const zapiAdapter: WaProviderAdapter = {
  name: "zapi",

  async send(sdr, toPhone, text) {
    const instanceId = sdr.zapiInstanceId;
    const token = sdr.zapiToken;
    if (!instanceId || !token) {
      return { ok: false, error: "SDR sem Instance ID/Token da Z-API configurados." };
    }
    const phoneClean = toPhone.replace(/\D/g, "");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (sdr.zapiClientToken) headers["Client-Token"] = sdr.zapiClientToken;
      const res = await fetch(
        `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
        { method: "POST", headers, body: JSON.stringify({ phone: phoneClean, message: text }) }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: JSON.stringify(data) };
      return { ok: true, providerMessageId: data?.messageId ?? data?.zaapId };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async sendMedia(sdr, toPhone, { mediaUrl, mediaType, fileName, caption }) {
    const instanceId = sdr.zapiInstanceId;
    const token = sdr.zapiToken;
    if (!instanceId || !token) {
      return { ok: false, error: "SDR sem Instance ID/Token da Z-API configurados." };
    }
    const phoneClean = toPhone.replace(/\D/g, "");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (sdr.zapiClientToken) headers["Client-Token"] = sdr.zapiClientToken;

    const endpointMap: Record<MediaType, string> = {
      image:    "send-image",
      audio:    "send-audio",
      video:    "send-video",
      document: "send-document",
    };
    const endpoint = endpointMap[mediaType] ?? "send-image";
    const bodyMap: Record<MediaType, Record<string, unknown>> = {
      image:    { phone: phoneClean, image: mediaUrl, caption: caption ?? "" },
      audio:    { phone: phoneClean, audio: mediaUrl },
      video:    { phone: phoneClean, video: mediaUrl, caption: caption ?? "" },
      document: { phone: phoneClean, document: mediaUrl, fileName: fileName ?? "arquivo" },
    };

    try {
      const res = await fetch(
        `https://api.z-api.io/instances/${instanceId}/token/${token}/${endpoint}`,
        { method: "POST", headers, body: JSON.stringify(bodyMap[mediaType]) }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: JSON.stringify(data) };
      return { ok: true, providerMessageId: data?.messageId ?? data?.zaapId };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};

/* ── Meta Cloud API ─────────────────────────────────────────── */
export const metaCloudAdapter: WaProviderAdapter = {
  name: "meta_cloud",

  async send(sdr, toPhone, text) {
    const phoneNumberId = sdr.metaPhoneNumberId;
    const accessToken = sdr.metaAccessToken;
    if (!phoneNumberId || !accessToken) {
      return { ok: false, error: "SDR sem Phone Number ID/Access Token da Meta Cloud API configurados." };
    }
    const phoneClean = toPhone.replace(/\D/g, "");
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneClean,
          type: "text",
          text: { body: text },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.error?.message ?? JSON.stringify(data) };
      return { ok: true, providerMessageId: data?.messages?.[0]?.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async sendMedia(sdr, toPhone, { mediaUrl, mediaType, fileName, caption }) {
    const phoneNumberId = sdr.metaPhoneNumberId;
    const accessToken = sdr.metaAccessToken;
    if (!phoneNumberId || !accessToken) {
      return { ok: false, error: "SDR sem Phone Number ID/Access Token da Meta Cloud API configurados." };
    }
    const phoneClean = toPhone.replace(/\D/g, "");
    const typeMap: Record<MediaType, string> = {
      image: "image", audio: "audio", video: "video", document: "document",
    };
    const mediaKey = typeMap[mediaType];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mediaObj: Record<string, any> = { link: mediaUrl };
    if (caption) mediaObj.caption = caption;
    if (fileName) mediaObj.filename = fileName;

    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneClean,
          type: mediaKey,
          [mediaKey]: mediaObj,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.error?.message ?? JSON.stringify(data) };
      return { ok: true, providerMessageId: data?.messages?.[0]?.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};

/* ── WhatsApp Lite (Baileys) ────────────────────────────────── */
export const waLiteAdapter: WaProviderAdapter = {
  name: "wa_lite",

  async send(sdr, toPhone, text) {
    const sock = getLiveSocket(sdr.id);
    if (!sock) {
      return { ok: false, error: "Sessão WA Lite não está conectada. Reconecte em Configurações → SDRs." };
    }
    const phoneClean = toPhone.replace(/\D/g, "");
    const jid = `${phoneClean}@s.whatsapp.net`;
    try {
      const result = await sock.sendMessage(jid, { text });
      return { ok: true, providerMessageId: result?.key?.id ?? undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  async sendMedia(sdr, toPhone, { mediaUrl, mediaType, fileName, caption }) {
    const sock = getLiveSocket(sdr.id);
    if (!sock) {
      return { ok: false, error: "Sessão WA Lite não está conectada. Reconecte em Configurações → SDRs." };
    }
    const phoneClean = toPhone.replace(/\D/g, "");
    const jid = `${phoneClean}@s.whatsapp.net`;

    // Baileys envia mídia por URL pública — baixa e re-envia internamente.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let content: Record<string, any>;
      if (mediaType === "image") {
        content = { image: { url: mediaUrl }, caption: caption ?? "" };
      } else if (mediaType === "audio") {
        content = { audio: { url: mediaUrl }, mimetype: "audio/ogg; codecs=opus", ptt: true };
      } else if (mediaType === "video") {
        content = { video: { url: mediaUrl }, caption: caption ?? "" };
      } else {
        content = { document: { url: mediaUrl }, fileName: fileName ?? "arquivo", mimetype: "application/octet-stream" };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await sock.sendMessage(jid, content as any);
      return { ok: true, providerMessageId: result?.key?.id ?? undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};

export function getWaAdapter(sdr: Sdr): WaProviderAdapter {
  if (sdr.waProvider === "meta_cloud") return metaCloudAdapter;
  if (sdr.waProvider === "wa_lite") return waLiteAdapter;
  return zapiAdapter;
}
