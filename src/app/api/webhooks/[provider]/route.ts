import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

type Ctx = { params: Promise<{ provider: string }> };

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

  // O verify_token configurado nas variáveis de ambiente ou fallback de dev
  const envToken =
    provider === "whatsapp"  ? (process.env.WHATSAPP_VERIFY_TOKEN ?? "beely-verify") :
    provider === "instagram" ? (process.env.INSTAGRAM_VERIFY_TOKEN ?? "beely-verify") :
    provider === "messenger" ? (process.env.MESSENGER_VERIFY_TOKEN ?? "beely-verify") :
    "beely-verify";

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

  /* Verificação de assinatura para Meta (WhatsApp, Instagram, Messenger) */
  if (["whatsapp", "instagram", "messenger"].includes(provider)) {
    const appSecret =
      provider === "whatsapp"  ? process.env.WHATSAPP_APP_SECRET :
      provider === "instagram" ? process.env.INSTAGRAM_APP_SECRET :
      process.env.MESSENGER_APP_SECRET;

    // Em produção, rejeite se o App Secret não estiver configurado
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

  /* Roteamento por provider */
  try {
    if (provider === "whatsapp")  await handleWhatsApp(payload);
    if (provider === "instagram") await handleInstagram(payload);
    if (provider === "messenger") await handleMessenger(payload);
  } catch (err) {
    console.error(`[webhook:${provider}] erro no handler`, err);
  }

  // Meta exige resposta 200 rápida
  return NextResponse.json({ received: true, provider }, { status: 200 });
}

/* ── Handlers por canal ─────────────────────────────────────── */

interface MetaTextMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: { body: string };
  type: string;
}

async function handleWhatsApp(payload: unknown) {
  const p = payload as {
    object?: string;
    entry?: { changes?: { value?: { messages?: MetaTextMessage[]; contacts?: { profile?: { name?: string } }[] } }[] }[];
  };
  if (p.object !== "whatsapp_business_account") return;

  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value    = change.value ?? {};
      const messages = value.messages ?? [];
      for (const msg of messages) {
        const from  = msg.from;
        const text  = msg.text?.body ?? "";
        const name  = value.contacts?.[0]?.profile?.name ?? from;
        console.log(`[WhatsApp] de ${name} (${from}): ${text}`);
        // TODO em produção: persistir no banco, notificar via WebSocket, criar lead se não existir
      }
    }
  }
}

async function handleInstagram(payload: unknown) {
  const p = payload as {
    object?: string;
    entry?: { messaging?: { sender?: { id?: string }; message?: { text?: string } }[] }[];
  };
  if (p.object !== "instagram") return;

  for (const entry of p.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      const from = ev.sender?.id ?? "desconhecido";
      const text = ev.message?.text ?? "";
      console.log(`[Instagram DM] de ${from}: ${text}`);
    }
  }
}

async function handleMessenger(payload: unknown) {
  const p = payload as {
    object?: string;
    entry?: { messaging?: { sender?: { id?: string }; message?: { text?: string } }[] }[];
  };
  if (p.object !== "page") return;

  for (const entry of p.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      const from = ev.sender?.id ?? "desconhecido";
      const text = ev.message?.text ?? "";
      console.log(`[Messenger] de ${from}: ${text}`);
    }
  }
}
