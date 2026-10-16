import { NextResponse } from "next/server";
import { pushMessage } from "@/lib/message-store";
import { getWaAdapter, type MediaType } from "@/lib/wa-providers";
import { fetchSdrWithSecrets } from "@/lib/sdrs-server";

/**
 * POST /api/inbox/send
 * Envia mensagem (texto OU mídia) via WhatsApp e registra no Postgres.
 *
 * Body JSON:
 *   { sdrId?, phone, text?, contactName?,
 *     mediaUrl?, mediaType?, fileName?, caption? }
 *
 * Para texto simples: apenas `text`.
 * Para mídia: `mediaUrl` + `mediaType` ("image"|"audio"|"video"|"document")
 *   + opcionalmente `fileName` e `caption`.
 */
export async function POST(request: Request) {
  let body: {
    phone?: string;
    text?: string;
    contactName?: string;
    sdrId?: string;
    instanceId?: string;
    token?: string;
    // mídia
    mediaUrl?: string;
    mediaType?: MediaType;
    fileName?: string;
    caption?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { phone, text, contactName, sdrId, mediaUrl, mediaType, fileName, caption } = body;

  const isMedia = !!mediaUrl && !!mediaType;
  if (!phone || (!text && !isMedia)) {
    return NextResponse.json({ error: "phone e (text ou mediaUrl+mediaType) são obrigatórios" }, { status: 400 });
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
      let res;
      if (isMedia) {
        res = await adapter.sendMedia(sdr, phoneClean, { mediaUrl: mediaUrl!, mediaType: mediaType!, fileName, caption });
      } else {
        res = await adapter.send(sdr, phoneClean, text!);
      }
      sendOk = res.ok;
      sendError = res.error ?? "";
    }
  } else {
    /* ── Comportamento legado: env vars globais (Z-API, texto apenas) ── */
    const instanceId = body.instanceId ?? process.env.ZAPI_INSTANCE_ID ?? process.env.NEXT_PUBLIC_ZAPI_INSTANCE_ID;
    const token = body.token ?? process.env.ZAPI_TOKEN ?? process.env.NEXT_PUBLIC_ZAPI_TOKEN;
    const clientToken = process.env.ZAPI_CLIENT_TOKEN;

    if (instanceId && token && !isMedia) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (clientToken) headers["Client-Token"] = clientToken;
        const zapiRes = await fetch(
          `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
          { method: "POST", headers, body: JSON.stringify({ phone: phoneClean, message: text }) }
        );
        const zapiData = await zapiRes.json();
        sendOk = zapiRes.ok;
        if (!zapiRes.ok) sendError = JSON.stringify(zapiData);
      } catch (e) {
        sendError = String(e);
      }
    } else {
      sendError = isMedia
        ? "Envio de mídia via legado não suportado — configure um SDR."
        : `Vars ausentes: instanceId=${!!instanceId} token=${!!token}`;
    }
  }

  /* ── Persiste como fromMe=true ──────────────────────────────
   * WA Lite é exceção: o socket Baileys dispara messages.upsert (fromMe:true)
   * automaticamente para a mensagem que acabamos de enviar — gravar aqui
   * duplicaria. Para os demais providers (Z-API / Meta), que não têm esse
   * eco confiável, mantemos o registro imediato aqui.
   * Além disso, adicionamos a mensagem diretamente ao state do cliente via
   * campo `msg` na resposta para UI otimista instantânea. */
  const ts = Date.now();
  const threadKey = sdrId ? `${sdrId}:${phoneClean}` : phoneClean;
  const msgBase = {
    channel: "whatsapp" as const,
    from: phoneClean,
    fromName: contactName ?? phoneClean,
    text: isMedia ? (caption ?? `[${mediaType}]`) : text!,
    timestamp: ts,
    fromMe: true,
    msgType: isMedia ? mediaType! : ("text" as const),
    mediaUrl: isMedia ? mediaUrl : undefined,
    mediaCaption: isMedia ? caption : undefined,
    fileName: isMedia ? fileName : undefined,
    sdrId,
    threadKey,
  };

  const saved =
    providerName === "wa_lite"
      ? { ...msgBase, id: `pending-${ts}` }
      : await pushMessage(msgBase);

  return NextResponse.json({ ok: true, provider: providerName, sendOk, sendError: sendError || undefined, ts, msg: saved });
}
