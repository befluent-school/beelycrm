import { NextResponse } from "next/server";
import { pushMessage } from "@/lib/message-store";
import { getWaAdapter } from "@/lib/wa-providers";
import { fetchSdrWithSecrets } from "@/lib/sdrs-server";

/**
 * POST /api/inbox/send
 * Envia mensagem via WhatsApp e registra no Postgres (aparece no chat).
 *
 * Body: { sdrId?, phone, text, contactName?, instanceId?, token? }
 *
 * Se `sdrId` for informado, busca o SDR no Supabase e envia pelo provedor
 * dele (Z-API ou Meta Cloud API). Sem `sdrId`, cai no comportamento legado
 * (env vars globais ZAPI_*) para não quebrar integrações já configuradas
 * antes do Inbox multi-SDR existir.
 */
export async function POST(request: Request) {
  let body: {
    phone?: string; text?: string; contactName?: string;
    sdrId?: string; instanceId?: string; token?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { phone, text, contactName, sdrId } = body;
  if (!phone || !text) {
    return NextResponse.json({ error: "phone e text são obrigatórios" }, { status: 400 });
  }

  const phoneClean = phone.replace(/\D/g, "");

  let sendOk = false;
  let sendError = "";
  let providerName: "zapi" | "meta_cloud" | "wa_lite" | "legacy" = "legacy";

  if (sdrId) {
    const sdr = await fetchSdrWithSecrets(sdrId);
    if (!sdr) {
      sendError = `SDR ${sdrId} não encontrado`;
    } else {
      const adapter = getWaAdapter(sdr);
      providerName = adapter.name;
      const res = await adapter.send(sdr, phoneClean, text);
      sendOk = res.ok;
      sendError = res.error ?? "";
    }
  } else {
    /* ── Comportamento legado: env vars globais (Z-API única instância) ── */
    const instanceId = body.instanceId
      ?? process.env.ZAPI_INSTANCE_ID
      ?? process.env.NEXT_PUBLIC_ZAPI_INSTANCE_ID;
    const token = body.token
      ?? process.env.ZAPI_TOKEN
      ?? process.env.NEXT_PUBLIC_ZAPI_TOKEN;
    const clientToken = process.env.ZAPI_CLIENT_TOKEN;

    if (instanceId && token) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (clientToken) headers["Client-Token"] = clientToken;
        const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
        const zapiRes = await fetch(zapiUrl, {
          method: "POST", headers,
          body: JSON.stringify({ phone: phoneClean, message: text }),
        });
        const zapiData = await zapiRes.json();
        sendOk = zapiRes.ok;
        if (!zapiRes.ok) sendError = JSON.stringify(zapiData);
      } catch (e) {
        sendError = String(e);
      }
    } else {
      sendError = `Vars ausentes: instanceId=${!!instanceId} token=${!!token}`;
    }
  }

  /* ── Persiste como fromMe=true ────────────────────────────
   * WA Lite é exceção: o próprio socket Baileys dispara messages.upsert
   * (fromMe: true) pra mensagem que ACABAMOS de enviar por ele — gravar
   * aqui também duplicava toda mensagem enviada (ver ingest.ts). Pros
   * outros providers (Z-API/Meta), que não têm esse eco automático
   * confiável, mantém o comportamento de sempre gravar aqui. */
  const ts = Date.now();
  const threadKey = sdrId ? `${sdrId}:${phoneClean}` : phoneClean;
  const saved = providerName === "wa_lite"
    ? { channel: "whatsapp" as const, from: phoneClean, fromName: contactName ?? phoneClean, text, timestamp: ts, fromMe: true, msgType: "text" as const, sdrId, threadKey, id: `pending-${ts}` }
    : await pushMessage({
        channel:   "whatsapp",
        from:      phoneClean,
        fromName:  contactName ?? phoneClean,
        text,
        timestamp: ts,
        fromMe:    true,
        msgType:   "text",
        sdrId,
        threadKey,
      });

  return NextResponse.json({
    ok: true,
    provider: providerName,
    sendOk,
    sendError: sendError || undefined,
    ts,
    msg: saved,
  });
}
