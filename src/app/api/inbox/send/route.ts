import { NextResponse } from "next/server";
import { pushMessage } from "@/lib/message-store";

/**
 * POST /api/inbox/send
 * Envia mensagem via Z-API e registra no Supabase (aparece no chat).
 *
 * Body: { phone, text, instanceId?, token? }
 */
export async function POST(request: Request) {
  let body: { phone?: string; text?: string; contactName?: string; instanceId?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { phone, text, contactName } = body;
  if (!phone || !text) {
    return NextResponse.json({ error: "phone e text são obrigatórios" }, { status: 400 });
  }

  // Normaliza o phone: apenas dígitos, sem espaços/hífens
  // Z-API aceita: 5511999999999 (DDI+DDD+número)
  const phoneClean = phone.replace(/\D/g, "");

  const instanceId = body.instanceId
    ?? process.env.ZAPI_INSTANCE_ID
    ?? process.env.NEXT_PUBLIC_ZAPI_INSTANCE_ID;
  const token      = body.token
    ?? process.env.ZAPI_TOKEN
    ?? process.env.NEXT_PUBLIC_ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  /* ── Envia via Z-API ─────────────────────────────────────── */
  let zapiOk = false;
  let zapiError = "";

  if (instanceId && token) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (clientToken) headers["Client-Token"] = clientToken;

      const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
      console.log(`[inbox/send] Z-API → ${zapiUrl} | phone: ${phoneClean}`);

      const zapiRes = await fetch(zapiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: phoneClean, message: text }),
      });

      const zapiData = await zapiRes.json();
      zapiOk = zapiRes.ok;

      if (!zapiRes.ok) {
        zapiError = JSON.stringify(zapiData);
        console.error("[inbox/send] Z-API error:", zapiData);
      } else {
        console.log("[inbox/send] Z-API ok para", phoneClean, zapiData);
      }
    } catch (e) {
      zapiError = String(e);
      console.error("[inbox/send] Falha ao chamar Z-API:", e);
    }
  } else {
    zapiError = `Vars ausentes: instanceId=${!!instanceId} token=${!!token}`;
    console.warn("[inbox/send]", zapiError);
  }

  /* ── Persiste no Supabase como fromMe=true ──────────────── */
  const ts = Date.now();
  const saved = await pushMessage({
    channel:   "whatsapp",
    from:      phoneClean,
    // Usa o nome real do contato — evita sobrescrever nome na conversa
    fromName:  contactName ?? phoneClean,
    text,
    timestamp: ts,
    fromMe:    true,
    msgType:   "text",
  });

  return NextResponse.json({ ok: true, zapiOk, zapiError: zapiError || undefined, ts, msg: saved });
}
