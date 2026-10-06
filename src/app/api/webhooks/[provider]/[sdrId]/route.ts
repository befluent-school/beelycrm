import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { handleWhatsApp, handleInstagram, handleMessenger } from "@/lib/wa-webhook-handlers";
import { logWebhookPayload } from "@/app/api/debug/webhook-log/route";
import { fetchSdrWithSecrets } from "@/lib/sdrs-server";
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

const fetchSdr = fetchSdrWithSecrets;

/**
 * Z-API não assina os payloads do webhook (sem equivalente ao
 * X-Hub-Signature-256 da Meta) — sem isso, qualquer pessoa que descubra a
 * URL /api/webhooks/whatsapp/{sdrId} pode forjar uma mensagem "recebida"
 * falsa (poluindo o Inbox, disparando follow-ups automáticos para um
 * contato inventado). Exige o segredo gerado na criação do SDR via query
 * string (?secret=...), comparado em tempo constante. SDRs criados antes
 * desta mudança não têm webhookSecret salvo — para não quebrar webhooks já
 * configurados, a checagem só bloqueia quando o SDR TEM um secret salvo.
 */
function verifyWebhookSecret(request: Request, sdr: Sdr): boolean {
  if (!sdr.webhookSecret) return true; // SDR legado sem secret — não bloqueia (ver nota acima)
  const provided = new URL(request.url).searchParams.get("secret") ?? "";
  const expectedBuf = Buffer.from(sdr.webhookSecret);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  try {
    return timingSafeEqual(expectedBuf, providedBuf);
  } catch {
    return false;
  }
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
        hint: "O SDR informado na URL do webhook não existe no banco.",
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

  /* Z-API (whatsapp) não assina payloads — exige o secret por SDR na query string. */
  if (provider === "whatsapp" && !verifyWebhookSecret(request, sdr)) {
    console.error(`[webhook:${provider}/${sdrId}] secret inválido ou ausente`);
    return NextResponse.json({ error: "invalid_secret" }, { status: 401 });
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
