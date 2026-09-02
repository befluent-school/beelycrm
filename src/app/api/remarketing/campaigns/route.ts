import { NextResponse } from "next/server";
import { listCampaigns, saveCampaign } from "@/lib/email/store";

export const dynamic = "force-dynamic";

/** GET /api/remarketing/campaigns */
export async function GET() {
  return NextResponse.json(await listCampaigns());
}

/** POST /api/remarketing/campaigns — cria/atualiza campanha. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });
  const saved = await saveCampaign({
    id: body.id,
    name: String(body.name),
    templateId: body.templateId ?? null,
    status: body.status,
    audienceFilter: body.audienceFilter ?? {},
    scheduledAt: body.scheduledAt ?? null,
  });
  return NextResponse.json(saved);
}
