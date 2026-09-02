import { findSend, updateSend, bumpCampaignStat } from "@/lib/email/store";

export const dynamic = "force-dynamic";

// GIF transparente 1x1
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

/** GET /api/remarketing/track/open?s=<sendId> — registra abertura e devolve o pixel. */
export async function GET(request: Request) {
  const s = new URL(request.url).searchParams.get("s");
  if (s) {
    try {
      const send = await findSend(s);
      if (send && !send.openedAt) {
        await updateSend(s, { status: send.status === "clicked" ? "clicked" : "opened", openedAt: new Date().toISOString() });
        if (send.campaignId) await bumpCampaignStat(send.campaignId, "opened");
      }
    } catch {
      /* rastreio nunca deve quebrar a renderização do e-mail */
    }
  }
  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Content-Length": String(PIXEL.length),
    },
  });
}
