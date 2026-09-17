/**
 * Adaptador de envio de WhatsApp por SDR — Z-API ou Meta Cloud API (oficial).
 * Cada SDR tem seu próprio número/instância; este módulo escolhe o provedor
 * certo a partir dos campos salvos no `Sdr` (src/lib/store.ts).
 */

import type { Sdr } from "@/lib/store";

export interface SendResult {
  ok: boolean;
  error?: string;
  providerMessageId?: string;
}

export interface WaProviderAdapter {
  readonly name: "zapi" | "meta_cloud";
  send(sdr: Sdr, toPhone: string, text: string): Promise<SendResult>;
}

/** Z-API — mesma chamada usada hoje em /api/inbox/send, agora parametrizada por SDR. */
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
};

/**
 * Meta Cloud API (WhatsApp Business Platform oficial).
 * POST https://graph.facebook.com/v21.0/{phoneNumberId}/messages
 * https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */
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
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
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
};

export function getWaAdapter(sdr: Sdr): WaProviderAdapter {
  return sdr.waProvider === "meta_cloud" ? metaCloudAdapter : zapiAdapter;
}
