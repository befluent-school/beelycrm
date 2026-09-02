import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCampaign, saveCampaign, deleteCampaign } from "@/lib/email/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/remarketing/campaigns/:id */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const campaign = await getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  return NextResponse.json(campaign);
}

/** PATCH /api/remarketing/campaigns/:id */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await getCampaign(id);
  if (!existing) return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const saved = await saveCampaign({ ...existing, ...body, id, name: body.name ?? existing.name });
  return NextResponse.json(saved);
}

/** DELETE /api/remarketing/campaigns/:id */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await deleteCampaign(id);
  return NextResponse.json({ ok: true });
}
