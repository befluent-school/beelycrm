import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { handleWhatsApp, handleInstagram, handleMessenger } from "@/lib/wa-webhook-handlers";
import { logWebhookPayload } from "@/app/api/debug/webhook-log/route";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ provider: string }> };

/**
 * Rota LEGADA de webhook — instância única (sem SDR), comportamento
 * idêntico ao de antes do Inbox multi-SDR. Continua funcionando para
 * quem já tinha essa URL configurada no Z-API/Meta.
 *
 * Para o Inbox multi-SDR, cada SDR configura sua própria URL:
 * /api/webhooks/whatsapp/{sdrId} — ver src/app/api/webhooks/[provider]/[sdrId]/route.ts
 */

/* ── Helpers de verificação de assinatura ───────────────────── */

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

/* ── GET — verificação de webhook (Meta hub.challenge) ──────── */
export async function GET(request: Request, ctx: Ctx) {
  const { provider } = await ctx.params;
  const { searchParams } = new URL(request.url);

  const mode      = searchParams.get("hub.mode");
  const token     = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const envToken =
    provider === "whatsapp"  ? (process.env.WHATSAPP_VERIFY_TOKEN ?? "beely2024") :
    provider === "instagram" ? (process.env.INSTAGRAM_VERIFY_TOKEN ?? "beely2024") :
    provider === "messenger" ? (process.env.MESSENGER_VERIFY_TOKEN ?? "beely2024") :
    "beely2024";

  if (mode === "subscribe" && token === envToken) {
    console.log(`[webhook:${provider}] verificação OK`);
    return new NextResponse(challenge ?? "", { status: 200 });
  }

  console.warn(`[webhook:${provider}] verificação FALHOU — token: ${token}`);
  return NextResponse.json({ error: "verification_failed" }, { status: 403 });
}

/* ── POST — recebimento de eventos ─────────────────────────── */
export async function POST(request: Request, ctx: Ctx) {
  const { provider } = await ctx.params;
  const rawBody = await request.text();

  /* Verificação de assinatura para Meta Cloud API */
  if (["instagram", "messenger"].includes(provider)) {
    const appSecret =
      provider === "instagram" ? process.env.INSTAGRAM_APP_SECRET :
      process.env.MESSENGER_APP_SECRET;

    if (appSecret && process.env.NODE_ENV === "production") {
      const signature = request.headers.get("x-hub-signature-256");
      if (!verifyMetaSignature(rawBody, signature, appSecret)) {
        console.error(`[webhook:${provider}] assinatura inválida`);
        return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
      }
    }
  }

  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { payload = {}; }

  console.log(`[webhook:${provider}] payload:`, JSON.stringify(payload).slice(0, 500));
  // Salva de verdade no log visível em /debug (antes só ia para o console do Render).
  // Aguarda explicitamente — em "fire-and-forget" (void) o processo pode encerrar
  // a resposta HTTP antes do insert no Supabase terminar, perdendo o registro.
  try {
    await logWebhookPayload({ provider, ...(typeof payload === "object" && payload ? payload : {}) });
  } catch (e) {
    console.error(`[webhook:${provider}] falha ao salvar debug log:`, e);
  }

  try {
    if (provider === "whatsapp")  await handleWhatsApp(payload);
    if (provider === "instagram") await handleInstagram(payload);
    if (provider === "messenger") await handleMessenger(payload);
  } catch (err) {
    console.error(`[webhook:${provider}] erro no handler`, err);
  }

  return NextResponse.json({ received: true, provider }, { status: 200 });
}
