import { NextResponse } from "next/server";
import * as q from "@/db/queries";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ entity: string }> };

/**
 * POST /api/data/[entity] — upsert de uma linha (ou lote, só para
 * "contacts", que aceita um array no body).
 * DELETE /api/data/[entity]?id=... — exclusão por id (ou ?type= para
 * connected_channels, cuja chave é "type" e não "id").
 *
 * Único ponto de escrita no Postgres a partir de chamadas vindas do
 * navegador (via src/lib/db.ts) — substitui as ~20 chamadas diretas
 * supabase.from(...) que existiam antes.
 */
const UPSERT_HANDLERS: Record<string, (body: unknown) => Promise<void>> = {
  pipelines: (b) => q.upsertPipeline(b as Parameters<typeof q.upsertPipeline>[0]),
  deals: (b) => q.upsertDeal(b as Parameters<typeof q.upsertDeal>[0]),
  contacts: (b) => {
    if (Array.isArray(b)) return q.upsertContacts(b as Parameters<typeof q.upsertContacts>[0]);
    return q.upsertContact(b as Parameters<typeof q.upsertContact>[0]);
  },
  activities: (b) => q.upsertActivity(b as Parameters<typeof q.upsertActivity>[0]),
  companies: (b) => q.upsertCompany(b as Parameters<typeof q.upsertCompany>[0]),
  automations: (b) => q.upsertAutomation(b as Parameters<typeof q.upsertAutomation>[0]),
  "scoring-rules": (b) => q.upsertScoringRule(b as Parameters<typeof q.upsertScoringRule>[0]),
  "connected-channels": (b) => q.upsertConnectedChannel(b as Parameters<typeof q.upsertConnectedChannel>[0]),
  integrations: (b) => q.upsertIntegration(b as Parameters<typeof q.upsertIntegration>[0]),
  "financial-config": (b) => q.upsertFinancialConfig(b as Parameters<typeof q.upsertFinancialConfig>[0]),
  sdrs: (b) => q.upsertSdr(b as Parameters<typeof q.upsertSdr>[0]),
};

const DELETE_HANDLERS: Record<string, (id: string) => Promise<void>> = {
  pipelines: q.deletePipeline,
  deals: q.deleteDeal,
  contacts: q.deleteContact,
  activities: q.deleteActivity,
  companies: q.deleteCompany,
  automations: q.deleteAutomation,
  "scoring-rules": q.deleteScoringRule,
  "connected-channels": q.deleteConnectedChannel,
  integrations: q.deleteIntegration,
  sdrs: q.deleteSdr,
};

export async function POST(request: Request, ctx: Ctx) {
  const { entity } = await ctx.params;
  const handler = UPSERT_HANDLERS[entity];
  if (!handler) return NextResponse.json({ error: "entidade_desconhecida" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    await handler(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(`[api/data/${entity}] upsert falhou:`, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request, ctx: Ctx) {
  const { entity } = await ctx.params;
  const handler = DELETE_HANDLERS[entity];
  if (!handler) return NextResponse.json({ error: "entidade_desconhecida" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  // connected_channels usa "type" como chave primária, não "id".
  const id = searchParams.get("id") ?? searchParams.get("type");
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  try {
    await handler(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(`[api/data/${entity}] delete falhou:`, e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
