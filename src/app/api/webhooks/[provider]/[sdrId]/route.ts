import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";
import { handleWhatsApp, handleInstagram, handleMessenger } from "@/lib/wa-webhook-handlers";
import { logWebhookPayload } from "@/app/api/debug/webhook-log/route";
import type { Sdr } from "@/lib/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ provider: string; sdrId: string }> };

/**
 * Webhook multi-SDR: cada SDR configura sua própria URL no Z-API/Meta
 * apontando para /api/webhooks/{provider}/{sdrId} — as mensagens chegam
 * já associadas ao SDR/número correto (sdr_id/thread_key em inbox_messages).
 */

function verifyMetaSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const [algo, hash] = signature.split("=");
  if (algo !== "sha256") return false;
  const expected = createHmac("sha256", secret).update(body, "utf8").digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
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

/* ── GET — verificação de webhook (Meta hub.challenge) ──────── */
export async function GET(request: Request, ctx: Ctx) {
  const { provider, sdrId } = await ctx.params;
  const { searchParams } = new URL(request.url);

  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const sdr = await fetchSdr(sdrId);
  const envToken = sdr?.metaVerifyToken || "beely2024";

  if (mode === "subscribe" && token === envToken) {
    console.log(`[webhook:${provider}/${sdrId}] verificação OK`);
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  console.warn(`[webhook:${provider}/${sdrId}] verificação FALHOU — token: ${token}`);
  return NextResponse.json({ error: "verification_failed" }, { status: 403 });
}

/* ── POST — recebimento de eventos ─────────────────────────── */
export async function POST(request: Request, ctx: Ctx) {
  const { provider, sdrId } = await ctx.params;
  const rawBody = await request.text();

  const sdr = await fetchSdr(sdrId);
  if (!sdr) {
    console.warn(`[webhook:${provider}/${sdrId}] SDR não encontrado — evento descartado`);
    // Loga mesmo assim (visível em /debug) — sem isso, uma mensagem de teste que
    // chega aqui e é rejeitada por SDR ausente desaparecia sem nenhum rastro,
    // parecendo que a Z-API nunca chamou o webhook.
    try {
      let payload: unknown;
      try { payload = JSON.parse(rawBody); } catch { payload = { raw: rawBody.slice(0, 500) }; }
      await logWebhookPayload({
        provider, sdrId, error: "sdr_not_found",
        hint: "O SDR informado na URL do webhook não existe no Supabase (ou a tabela sdrs não foi criada — veja /api/debug/supabase-status).",
        ...(typeof payload === "object" && payload ? payload : {}),
      });
    } catch (e) {
      console.error(`[webhook:${provider}/${sdrId}] falha ao logar evento sdr_not_found:`, e);
    }
    return NextResponse.json({ error: "sdr_not_found" }, { status: 404 });
  }

  /* Verificação de assinatura para Meta Cloud API */
  if (["instagram", "messenger"].includes(provider)) {
    const appSecret = process.env.INSTAGRAM_APP_SECRET ?? process.env.MESSENGER_APP_SECRET;
    if (appSecret && process.env.NODE_ENV === "production") {
      const signature = request.headers.get("x-hub-signature-256");
      if (!verifyMetaSignature(rawBody, signature, appSecret)) {
        console.error(`[webhook:${provider}/${sdrId}] assinatura inválida`);
        return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
      }
    }
  }

  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { payload = {}; }

  console.log(`[webhook:${provider}/${sdrId}] payload:`, JSON.stringify(payload).slice(0, 500));
  try {
    await logWebhookPayload({ provider, sdrId, ...(typeof payload === "object" && payload ? payload : {}) });
  } catch (e) {
    console.error(`[webhook:${provider}/${sdrId}] falha ao salvar debug log:`, e);
  }

  try {
    if (provider === "whatsapp")  await handleWhatsApp(payload, sdr);
    if (provider === "instagram") await handleInstagram(payload);
    if (provider === "messenger") await handleMessenger(payload);
  } catch (err) {
    console.error(`[webhook:${provider}/${sdrId}] erro no handler`, err);
  }

  return NextResponse.json({ received: true, provider, sdrId }, { status: 200 });
}
