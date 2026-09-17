import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushMessage } from "@/lib/message-store";
import { getWaAdapter } from "@/lib/wa-providers";
import type { Sdr } from "@/lib/store";

/**
 * POST /api/inbox/send
 * Envia mensagem via WhatsApp e registra no Supabase (aparece no chat).
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
  let providerName: "zapi" | "meta_cloud" | "legacy" = "legacy";

  if (sdrId) {
    const sdr = await fetchSdr(sdrId);
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

  /* ── Persiste no Supabase como fromMe=true ──────────────── */
  const ts = Date.now();
  const threadKey = sdrId ? `${sdrId}:${phoneClean}` : phoneClean;
  const saved = await pushMessage({
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

async function fetchSdr(id: string): Promise<Sdr | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key);
  const { data, error } = await supabase.from("sdrs").select("*").eq("id", id).limit(1);
  if (error || !data || data.length === 0) return null;
  const r = data[0];
  return {
    id: r.id,
    name: r.name,
    email: r.email ?? undefined,
    avatarColor: r.avatar_color ?? undefined,
    active: r.active ?? true,
    waProvider: r.wa_provider ?? undefined,
    zapiInstanceId: r.zapi_instance_id ?? undefined,
    zapiToken: r.zapi_token ?? undefined,
    zapiClientToken: r.zapi_client_token ?? undefined,
    metaPhoneNumberId: r.meta_phone_number_id ?? undefined,
    metaAccessToken: r.meta_access_token ?? undefined,
    metaWabaId: r.meta_waba_id ?? undefined,
    metaVerifyToken: r.meta_verify_token ?? undefined,
    phoneDisplay: r.phone_display ?? undefined,
    createdAt: r.created_at,
  };
}
