import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCallLog } from "@/lib/calls/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/calls/logs/:id — detalhe (transcrição + resumo) para o drawer. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const log = await getCallLog(id);
  if (!log) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
  return NextResponse.json(log);
}
