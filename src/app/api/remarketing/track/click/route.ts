import { NextResponse } from "next/server";
import { findSend, updateSend, bumpCampaignStat } from "@/lib/email/store";

export const dynamic = "force-dynamic";

/** GET /api/remarketing/track/click?s=<sendId>&u=<url> — registra clique e redireciona. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const s = searchParams.get("s");
  const u = searchParams.get("u");

  if (!u || !/^https?:\/\//i.test(u)) {
    return NextResponse.json({ error: "url inválida" }, { status: 400 });
  }

  if (s) {
    try {
      const send = await findSend(s);
      if (send && !send.clickedAt) {
        await updateSend(s, { status: "clicked", clickedAt: new Date().toISOString() });
        if (send.campaignId) await bumpCampaignStat(send.campaignId, "clicked");
      }
    } catch {
      /* rastreio nunca deve impedir o redirecionamento */
    }
  }

  return NextResponse.redirect(u);
}
