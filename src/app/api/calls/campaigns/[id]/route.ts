import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCallCampaign, saveCallCampaign, deleteCallCampaign } from "@/lib/calls/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const campaign = await getCallCampaign(id);
  if (!campaign) return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  return NextResponse.json(campaign);
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const existing = await getCallCampaign(id);
  if (!existing) return NextResponse.json({ error: "não encontrada" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const saved = await saveCallCampaign({ ...existing, ...body, id, name: body.name ?? existing.name });
  return NextResponse.json(saved);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await deleteCallCampaign(id);
  return NextResponse.json({ ok: true });
}
