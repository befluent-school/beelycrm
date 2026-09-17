/**
 * Regra dos 3 dias parados — Playbook Comercial Be Fluent v3, Seção 10.2.
 *
 * Qualquer negociação em "Negociação" ou "Proposta enviada" sem movimento
 * (atividade/mensagem/nota) há 3 dias corridos vira alerta visual vermelho.
 *
 * Helpers puros (sem I/O) — derivam dos deals + pipelines do store.
 */

import type { Deal, Pipeline } from "@/lib/store";

export const STALE_DAYS = 3;

/** Normaliza nome de etapa (sem acento, minúsculo). */
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * A etapa é elegível para a regra dos 3 dias?
 * Cobre os rótulos do funil de 5 ("Negociação", "Proposta") e do funil
 * comercial Be Fluent de 8 ("Proposta enviada", "Negociação" n/a mas coberto).
 */
export function isStaleEligibleStage(stageName: string): boolean {
  const n = norm(stageName);
  return n.includes("negocia") || n.includes("proposta");
}

function daysSince(iso?: string | null): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / 86_400_000;
}

/** Referência de "última movimentação" do deal para a regra dos 3 dias. */
export function lastMovementAt(deal: Pick<Deal, "lastActivityAt" | "stageEnteredAt" | "createdAt">): string {
  return deal.lastActivityAt ?? deal.stageEnteredAt ?? deal.createdAt;
}

/**
 * O deal está "parado há 3 dias"?
 * @param stages etapas do pipeline ao qual o deal pertence (para achar o nome da etapa).
 */
export function isStale(
  deal: Pick<Deal, "status" | "stageId" | "lastActivityAt" | "stageEnteredAt" | "createdAt">,
  stages: { id: string; name: string }[],
  days = STALE_DAYS
): boolean {
  if (deal.status !== "open") return false;
  const stage = stages.find((s) => s.id === deal.stageId);
  if (!stage || !isStaleEligibleStage(stage.name)) return false;
  return daysSince(lastMovementAt(deal)) >= days;
}

export interface StaleDeal {
  deal: Deal;
  pipelineName: string;
  stageName: string;
  daysStalled: number;
}

/** Lista agregada de deals parados há 3+ dias, para o dashboard e relatórios. */
export function staleDeals(deals: Deal[], pipelines: Pipeline[], days = STALE_DAYS): StaleDeal[] {
  const out: StaleDeal[] = [];
  for (const deal of deals) {
    const pipeline = pipelines.find((p) => p.id === deal.pipelineId);
    if (!pipeline) continue;
    if (!isStale(deal, pipeline.stages, days)) continue;
    const stage = pipeline.stages.find((s) => s.id === deal.stageId);
    out.push({
      deal,
      pipelineName: pipeline.name,
      stageName: stage?.name ?? "—",
      daysStalled: Math.floor(daysSince(lastMovementAt(deal))),
    });
  }
  return out.sort((a, b) => b.daysStalled - a.daysStalled);
}
