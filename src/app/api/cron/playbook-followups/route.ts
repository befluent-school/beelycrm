import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getPlaybookTemplates,
  logPlaybookFollowup,
  renderPlaybookMessage,
  SITUATION_LABELS,
  type FollowupSituation,
} from "@/lib/followup-playbook-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") ?? request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  }
  const supabase = createClient(url, key);

  const [{ data: openDeals, error: openErr }, { data: lostDeals }, { data: pipelines }, { data: contacts }] =
    await Promise.all([
      supabase.from("deals").select("*").eq("status", "open"),
      supabase.from("deals").select("*").eq("status", "lost"),
      supabase.from("pipelines").select("*"),
      supabase.from("contacts").select("id, name, phone, email"),
    ]);

  if (openErr) return NextResponse.json({ error: openErr.message }, { status: 500 });

  const templates = await getPlaybookTemplates();
  const byKey = new Map(templates.map((t) => [t.situationKey, t]));
  void contacts; // reservado para personalização futura do script por contato

  const todayKey = new Date().toISOString().slice(0, 10);
  const results: { dealId: string; contact: string; situation: string; label: string; action: string }[] = [];

  const daysSince = (iso?: string | null) => {
    if (!iso) return Infinity;
    return (Date.now() - new Date(iso).getTime()) / 86_400_000;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageName = (deal: any): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pipeline = (pipelines ?? []).find((p: any) => p.id === deal.pipeline_id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stage = (pipeline?.stages ?? []).find((s: any) => s.id === deal.stage_id);
    return (stage?.name ?? "").toLowerCase();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const haystack = (deal: any): string => {
    const notes = (deal.notes ?? "").toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hist = ((deal.history ?? []) as any[]).map((h) => (h.text ?? "").toLowerCase()).join(" ");
    return `${notes} ${hist}`;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function deriveSituation(deal: any, isLost: boolean): FollowupSituation | null {
    const sn = stageName(deal);
    const hay = haystack(deal);
    const idle = daysSince(deal.last_activity_at ?? deal.stage_entered_at ?? deal.created_at);

    if (isLost) {
      const lostDays = daysSince(deal.updated_at ?? deal.created_at);
      return lostDays >= 30 && lostDays <= 75 ? "reativacao_frio" : null;
    }

    const tProposta = byKey.get("proposta_sumiu");
    if (sn.includes("proposta enviada") && idle >= (tProposta?.dayOffset ?? 1)) {
      if (/contrato/.test(hay) && idle >= (byKey.get("contrato_sem_retorno")?.dayOffset ?? 8)) {
        return "contrato_sem_retorno";
      }
      if ((deal.refusal_count ?? 0) >= 1 && /(desconto|caro|valor|pre[çc]o)/.test(hay)) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function handle(deal: any, isLost: boolean) {
    const situation = deriveSituation(deal, isLost);
    if (!situation) return;
    const template = byKey.get(situation);
    if (!template || !template.active) return;

    // Anti-duplicação no mesmo dia (mesmo padrão do cron atual).
    const { data: already } = await supabase
      .from("followup_playbook_log")
      .select("id")
      .eq("deal_id", deal.id)
      .eq("situation_key", situation)
      .gte("triggered_at", `${todayKey}T00:00:00Z`)
      .limit(1);
    if (already && already.length > 0) return;

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
    await supabase.from("activities").insert({
      id: activityId,
      type: "task",
      title: `Follow-up Playbook: ${label}`,
      due: "Hoje",
      due_date: todayKey,
      due_time: template.suggestedTime || null,
      contact: deal.contact ?? null,
      done: false,
      deal_id: deal.id,
      notes: `Situação: ${label} (D+${template.dayOffset}, ${template.channel}).\n\nScript sugerido:\n${script}`,
    });

    await supabase
      .from("deals")
      .update({
        last_activity_at: now.toISOString(),
        history: [
          ...(deal.history ?? []),
          { ts: now.toISOString(), text: `Follow-up Playbook sugerido — ${label}` },
        ],
      })
      .eq("id", deal.id);

    await logPlaybookFollowup(deal.id, situation, template.channel, true);
    results.push({
      dealId: deal.id,
      contact: deal.contact ?? "",
      situation,
      label,
      action: "tarefa criada com script",
    });
  }

  for (const deal of openDeals ?? []) await handle(deal, false);
  for (const deal of lostDeals ?? []) await handle(deal, true);

  return NextResponse.json({ ok: true, processed: results.length, results });
}
