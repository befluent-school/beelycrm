import { NextResponse } from "next/server";
import { pushMessage } from "@/lib/message-store";

/**
 * POST /api/inbox/send
 * Envia mensagem via Z-API e registra no Supabase (aparece no chat).
 *
 * Body: { phone, text, instanceId?, token? }
 */
export async function POST(request: Request) {
  let body: { phone?: string; text?: string; instanceId?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { phone, text } = body;
  if (!phone || !text) {
    return NextResponse.json({ error: "phone e text são obrigatórios" }, { status: 400 });
  }

  const instanceId = body.instanceId
    ?? process.env.ZAPI_INSTANCE_ID
    ?? process.env.NEXT_PUBLIC_ZAPI_INSTANCE_ID;
  const token      = body.token
    ?? process.env.ZAPI_TOKEN
    ?? process.env.NEXT_PUBLIC_ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  /* ── Envia via Z-API ─────────────────────────────────────── */
  let zapiOk = false;
  if (instanceId && token) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (clientToken) headers["Client-Token"] = clientToken;

      const zapiRes = await fetch(
        `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ phone, message: text }),
        }
      );
      const zapiData = await zapiRes.json();
      zapiOk = zapiRes.ok;
      if (!zapiRes.ok) {
        console.error("[inbox/send] Z-API error:", zapiData);
      } else {
        console.log("[inbox/send] Z-API enviou para", phone);
      }
    } catch (e) {
      console.error("[inbox/send] Falha ao chamar Z-API:", e);
    }
  } else {
    console.warn("[inbox/send] Z-API não configurado — mensagem salva apenas localmente");
  }

  /* ── Persiste no Supabase como fromMe=true ──────────────── */
  const convPhone = phone.replace(/\D/g, "");
  const ts        = Date.now();
  const saved = await pushMessage({
    channel:   "whatsapp",
    from:      convPhone,
    fromName:  "Eu",
    text,
    timestamp: ts,
    fromMe:    true,
    msgType:   "text",
  });

  return NextResponse.json({ ok: true, zapiOk, ts, msg: saved });
}
