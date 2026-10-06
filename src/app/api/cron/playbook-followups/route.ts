import { NextResponse } from "next/server";
import { and, eq, gte } from "drizzle-orm";
import { db as client, schema } from "@/db";
import {
  getPlaybookTemplates,
  logPlaybookFollowup,
  renderPlaybookMessage,
  SITUATION_LABELS,
  type FollowupSituation,
} from "@/lib/followup-playbook-store";
import { cronGateOrResponse } from "@/lib/cron-gate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type DealRow = typeof schema.deals.$inferSelect;
type PipelineRow = typeof schema.pipelines.$inferSelect;

/**
 * GET /api/cron/playbook-followups
 *
 * SISTEMA PARALELO ao /api/cron/followups (5 templates sequenciais), que NÃO é
 * tocado. Aqui o disparo é por GATILHO DE SITUAÇÃO — Playbook Comercial Be
 * Fluent v3, Seções 7.2 e 7.3:
 *
 *   - "Proposta enviada" parada há ≥ D+1 sem atividade  → proposta_sumiu
 *   - "Diagnóstico realizado" + nota "levar pro time"    → levar_pro_time (D+3)
 *   - deal perdido/frio há 30-60 dias                    → reativacao_frio
 *   - refusalCount ≥ 1 + objeção de preço no histórico   → pediu_desconto_sumiu (D+5)
 *   - nota/histórico com "contrato" e sem atividade ≥8d  → contrato_sem_retorno (D+8)
 *   - nota/histórico com "material"/"informação" parado  → pediu_info_sumiu (D+1)
 *   - Proposta/Negociação sem movimento há ≥15d          → ultima_tentativa (D+15)
 *
 * Ação: NÃO envia mensagem automática (não há canal de WhatsApp ligado nesta
 * fase). Em vez disso cria uma ATIVIDADE (tarefa) no deal, com o script pronto
 * nas notas e vencimento hoje, e registra em followup_playbook_log para não
 * duplicar no mesmo dia.
 *
 * Protegido por CRON_SECRET opcional (query ?secret= ou header x-cron-secret).
 */
export async function GET(request: Request) {
  const gated = cronGateOrResponse(request);
  if (gated) return gated;

  if (!client) {
    return NextResponse.json({ error: "db_not_configured" }, { status: 500 });
  }

  const [openDeals, lostDeals, pipelines] = await Promise.all([
    client.select().from(schema.deals).where(eq(schema.deals.status, "open")),
    client.select().from(schema.deals).where(eq(schema.deals.status, "lost")),
    client.select().from(schema.pipelines),
  ]);

  const templates = await getPlaybookTemplates();
  const byKey = new Map(templates.map((t) => [t.situationKey, t]));

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(`${todayKey}T00:00:00Z`);
  const results: { dealId: string; contact: string; situation: string; label: string; action: string }[] = [];

  const daysSince = (d?: Date | string | null) => {
    if (!d) return Infinity;
    const ms = d instanceof Date ? d.getTime() : new Date(d).getTime();
    return (Date.now() - ms) / 86_400_000;
  };

  const stageName = (deal: DealRow): string => {
    const pipeline = pipelines.find((p: PipelineRow) => p.id === deal.pipelineId);
    const stage = (pipeline?.stages ?? []).find((s) => s.id === deal.stageId);
    return (stage?.name ?? "").toLowerCase();
  };

  const haystack = (deal: DealRow): string => {
    const notes = (deal.notes ?? "").toLowerCase();
    const hist = (deal.history ?? []).map((h) => (h.text ?? "").toLowerCase()).join(" ");
    return `${notes} ${hist}`;
  };

  function deriveSituation(deal: DealRow, isLost: boolean): FollowupSituation | null {
    const sn = stageName(deal);
    const hay = haystack(deal);
    const idle = daysSince(deal.lastActivityAt ?? deal.stageEnteredAt ?? deal.createdAt);

    if (isLost) {
      const lostDays = daysSince(deal.updatedAt ?? deal.createdAt);
      return lostDays >= 30 && lostDays <= 75 ? "reativacao_frio" : null;
    }

    const tProposta = byKey.get("proposta_sumiu");
    if (sn.includes("proposta enviada") && idle >= (tProposta?.dayOffset ?? 1)) {
      if (/contrato/.test(hay) && idle >= (byKey.get("contrato_sem_retorno")?.dayOffset ?? 8)) {
        return "contrato_sem_retorno";
      }
      if ((deal.refusalCount ?? 0) >= 1 && /(desconto|caro|valor|pre[çc]o)/.test(hay)) {
        return "pediu_desconto_sumiu";
      }
      if (idle >= (byKey.get("ultima_tentativa")?.dayOffset ?? 15)) return "ultima_tentativa";
      return "proposta_sumiu";
    }

    if (sn.includes("diagn") && /(levar pro time|levo pro time|falar com o time|levar para o time)/.test(hay)) {
      if (idle >= (byKey.get("levar_pro_time")?.dayOffset ?? 3)) return "levar_pro_time";
    }

    if (/(mais informa|material|mandei o material|te mando|enviei o link)/.test(hay) &&
        idle >= (byKey.get("pediu_info_sumiu")?.dayOffset ?? 1)) {
      return "pediu_info_sumiu";
    }

    if (sn.includes("negocia") && idle >= (byKey.get("ultima_tentativa")?.dayOffset ?? 15)) {
      return "ultima_tentativa";
    }

    return null;
  }

  async function handle(deal: DealRow, isLost: boolean) {
    if (!client) return;
    const situation = deriveSituation(deal, isLost);
    if (!situation) return;
    const template = byKey.get(situation);
    if (!template || !template.active) return;

    // Anti-duplicação no mesmo dia (mesmo padrão do cron atual).
    const already = await client.select({ id: schema.followupPlaybookLog.id }).from(schema.followupPlaybookLog)
      .where(and(
        eq(schema.followupPlaybookLog.dealId, deal.id),
        eq(schema.followupPlaybookLog.situationKey, situation),
        gte(schema.followupPlaybookLog.triggeredAt, todayStart),
      ))
      .limit(1);
    if (already.length > 0) return;

    const firstName = String(deal.contact ?? "").split(" ")[0] || "tudo bem";
    const now = new Date();
    const script = renderPlaybookMessage(template.message, {
      primeiroNome: firstName,
      dia: now.toLocaleDateString("pt-BR"),
      mes: now.toLocaleDateString("pt-BR", { month: "long" }),
    });

    // Cria uma tarefa no deal com o script pronto (não envia mensagem automática).
    const activityId =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const label = SITUATION_LABELS[situation];
    await client.insert(schema.activities).values({
      id: activityId,
      type: "task",
      title: `Follow-up Playbook: ${label}`,
      due: "Hoje",
      dueDate: todayKey,
      dueTime: template.suggestedTime || null,
      contact: deal.contact ?? null,
      done: false,
      dealId: deal.id,
      notes: `Situação: ${label} (D+${template.dayOffset}, ${template.channel}).\n\nScript sugerido:\n${script}`,
    });

    await client.update(schema.deals).set({
      lastActivityAt: now,
      history: [
        ...(deal.history ?? []),
        { ts: now.toISOString(), text: `Follow-up Playbook sugerido — ${label}` },
      ],
    }).where(eq(schema.deals.id, deal.id));

    await logPlaybookFollowup(deal.id, situation, template.channel, true);
    results.push({
      dealId: deal.id,
      contact: deal.contact ?? "",
      situation,
      label,
      action: "tarefa criada com script",
    });
  }

  for (const deal of openDeals) await handle(deal, false);
  for (const deal of lostDeals) await handle(deal, true);

  return NextResponse.json({ ok: true, processed: results.length, results });
}
