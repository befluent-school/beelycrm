import { NextResponse } from "next/server";
import * as q from "@/db/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/data — equivalente ao antigo loadAll() direto no Supabase.
 * Chamado por src/lib/db.ts (client-safe) via fetch — nunca Drizzle direto
 * no navegador. Mesmo contrato de antes: se não há pipelines, o banco está
 * "vazio" e o client usa o seed local (ok: false sinaliza isso).
 */
export async function GET() {
  try {
    const [
      pipelines, deals, contacts, activities, companies,
      automations, scoringRules, connectedChannels, integrations,
      financialConfig, sdrs,
    ] = await Promise.all([
      q.listPipelines(),
      q.listDeals(),
      q.listContacts(),
      q.listActivities(),
      q.listCompanies(),
      q.listAutomations(),
      q.listScoringRules(),
      q.listConnectedChannels(),
      q.listIntegrations(),
      q.getFinancialConfig(),
      q.listSdrs(),
    ]);

    if (pipelines.length === 0) {
      return NextResponse.json({ ok: false, reason: "empty" });
    }

    return NextResponse.json({
      ok: true,
      pipelines, deals, contacts, activities, companies,
      automations, scoringRules, connectedChannels, integrations,
      financialConfig, sdrs,
    });
  } catch (e) {
    console.error("[api/data] falha ao carregar:", e);
    return NextResponse.json({ ok: false, reason: "error", error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
