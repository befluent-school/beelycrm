import { NextResponse } from "next/server";
import { HAS_VAPI } from "@/lib/env";
import { listCallCampaigns, saveCallCampaign } from "@/lib/calls/store";

export const dynamic = "force-dynamic";

/** GET /api/calls/campaigns */
export async function GET() {
  return NextResponse.json({
    campaigns: await listCallCampaigns(),
    vapiConfigured: HAS_VAPI,
  });
}

/** POST /api/calls/campaigns — cria/atualiza campanha de ligação. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });
  const saved = await saveCallCampaign({
    id: body.id,
    name: String(body.name),
    provider: body.provider === "twilio" ? "twilio" : "vapi",
    assistantConfig: body.assistantConfig ?? {},
    audienceFilter: body.audienceFilter ?? {},
    status: body.status,
  });
  return NextResponse.json(saved);
}
