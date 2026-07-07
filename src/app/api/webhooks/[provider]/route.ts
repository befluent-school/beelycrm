import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { pushMessage } from "@/lib/message-store";

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

  // Log sempre — salva no Supabase para debug em /debug
  console.log(`[webhook:${provider}] payload:`, JSON.stringify(payload).slice(0, 500));

  try {
    if (provider === "whatsapp")  await handleWhatsApp(payload);
    if (provider === "instagram") await handleInstagram(payload);
    if (provider === "messenger") await handleMessenger(payload);
  } catch (err) {
    console.error(`[webhook:${provider}] erro no handler`, err);
  }

  return NextResponse.json({ received: true, provider }, { status: 200 });
}

/* ── Z-API payload types ─────────────────────────────────────── */

interface ZApiMessage {
  phone?: string;
  fromMe?: boolean;
  momment?: number;
  timestamp?: number;
  text?: { message?: string };
  audio?: { audioUrl?: string; mimeType?: string };
  image?: { imageUrl?: string; caption?: string; mimeType?: string };
  video?: { videoUrl?: string; caption?: string };
  document?: { documentUrl?: string; fileName?: string; mimeType?: string };
  sticker?: { stickerUrl?: string };
  senderName?: string;
  senderPhoto?: string;
  instanceId?: string;
  messageId?: string;
  type?: string;
  value?: {
    phone?: string;
    fromMe?: boolean;
    text?: { message?: string };
    senderName?: string;
    momment?: number;
  };
}

interface MetaTextMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: { body: string };
  type: string;
}

/* ── WhatsApp — suporta Z-API e Meta Cloud API ──────────────── */

async function handleWhatsApp(payload: unknown) {
  const p = payload as ZApiMessage & {
    object?: string;
    entry?: { changes?: { value?: { messages?: MetaTextMessage[]; contacts?: { profile?: { name?: string } }[] } }[] }[];
  };

  /* Z-API: mensagem recebida diretamente no root do payload */
  if (p.phone && !p.object) {
    const phone  = p.phone ?? "desconhecido";
    const name   = p.senderName ?? phone;
    const ts     = p.momment ?? p.timestamp ?? Date.now();
    const fromMe = p.fromMe ?? false;

    // Detecta tipo de mídia e extrai dados
    let msgType: "text" | "image" | "audio" | "document" | "video" = "text";
    let text = "(mensagem sem texto)";
    let mediaUrl: string | undefined;
    let mediaCaption: string | undefined;
    let fileName: string | undefined;

    if (p.text?.message) {
      text = p.text.message;
      msgType = "text";
    } else if (p.image) {
      msgType = "image";
      mediaUrl = p.image.imageUrl;
      mediaCaption = p.image.caption;
      text = p.image.caption ?? "[Imagem]";
    } else if (p.audio) {
      msgType = "audio";
      mediaUrl = p.audio.audioUrl;
      text = "[Áudio]";
    } else if (p.video) {
      msgType = "video";
      mediaUrl = p.video.videoUrl;
      mediaCaption = p.video.caption;
      text = p.video.caption ?? "[Vídeo]";
    } else if (p.document) {
      msgType = "document";
      mediaUrl = p.document.documentUrl;
      fileName = p.document.fileName;
      text = `[Documento: ${p.document.fileName ?? "arquivo"}]`;
    } else if (p.sticker) {
      msgType = "image";
      mediaUrl = p.sticker.stickerUrl;
      text = "[Sticker]";
    }

    const senderPhoto = p.senderPhoto ?? undefined;
    console.log(`[WhatsApp/Z-API] ${fromMe ? "→ enviado" : "← recebido"} ${name} (${phone}): ${text}`);

    await pushMessage({
      channel:      "whatsapp",
      from:         phone,
      fromName:     name,
      text,
      timestamp:    typeof ts === "number" && ts > 1e12 ? ts : ts * 1000,
      fromMe,
      senderPhoto,
      msgType,
      mediaUrl,
      mediaCaption,
      fileName,
      raw:          payload,
    });
    return;
  }

  /* Z-API v2 com envelope "value" */
  if (p.value?.phone) {
    if (p.value.fromMe) return;
    const phone = p.value.phone;
    const name  = p.value.senderName ?? phone;
    const text  = p.value.text?.message ?? "(mensagem)";
    const ts    = p.value.momment ?? Date.now();

    await pushMessage({
      channel:   "whatsapp",
      from:      phone,
      fromName:  name,
      text,
      timestamp: typeof ts === "number" && ts > 1e12 ? ts : ts * 1000,
      raw:       payload,
    });
    return;
  }

  /* Meta Cloud API (WhatsApp Business API oficial) */
  if (p.object === "whatsapp_business_account") {
    for (const entry of p.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value    = change.value ?? {};
        const messages = value.messages ?? [];
        for (const msg of messages) {
          const text = msg.text?.body ?? "(mensagem)";
          const name = value.contacts?.[0]?.profile?.name ?? msg.from;
          await pushMessage({
            channel:   "whatsapp",
            from:      msg.from,
            fromName:  name,
            text,
            timestamp: Number(msg.timestamp) * 1000,
            raw:       payload,
          });
        }
      }
    }
  }
}

/* ── Instagram Graph API ────────────────────────────────────── */

async function handleInstagram(payload: unknown) {
  const p = payload as {
    object?: string;
    entry?: {
      id?: string;
      messaging?: {
        sender?: { id?: string };
        recipient?: { id?: string };
        timestamp?: number;
        message?: { mid?: string; text?: string };
      }[];
    }[];
  };
  if (p.object !== "instagram") return;

  for (const entry of p.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      const from = ev.sender?.id ?? "desconhecido";
      const text = ev.message?.text ?? "(mensagem)";
      const ts   = ev.timestamp ?? Date.now();
      await pushMessage({
        channel:   "instagram",
        from,
        fromName:  `IG:${from}`,
        text,
        timestamp: ts > 1e12 ? ts : ts * 1000,
        raw:       payload,
      });
    }
  }
}

/* ── Messenger (Facebook) ───────────────────────────────────── */

async function handleMessenger(payload: unknown) {
  const p = payload as {
    object?: string;
    entry?: {
      id?: string;
      messaging?: {
        sender?: { id?: string };
        recipient?: { id?: string };
        timestamp?: number;
        message?: { mid?: string; text?: string };
      }[];
    }[];
  };
  if (p.object !== "page") return;

  for (const entry of p.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      const from = ev.sender?.id ?? "desconhecido";
      const text = ev.message?.text ?? "(mensagem)";
      const ts   = ev.timestamp ?? Date.now();
      await pushMessage({
        channel:   "messenger",
        from,
        fromName:  `FB:${from}`,
        text,
        timestamp: ts > 1e12 ? ts : ts * 1000,
        raw:       payload,
      });
    }
  }
}
