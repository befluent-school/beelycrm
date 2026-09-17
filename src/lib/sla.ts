/**
 * SLA de resposta ao lead — Playbook Comercial Be Fluent v3, Seção 2.
 * A métrica mais crítica da operação: 4 minutos entre o lead entrar e o
 * primeiro contato humano.
 *
 * Helpers puros (sem I/O) — derivam tudo dos deals já no store.
 */

import type { Deal } from "@/lib/store";

export const DEFAULT_SLA_TARGET_MINUTES = 4;

/** Minutos entre a criação do lead e o 1o contato humano; null se ainda não respondido. */
export function slaMinutes(deal: Pick<Deal, "createdAt" | "slaRespondedAt">): number | null {
  if (!deal.slaRespondedAt) return null;
  const start = new Date(deal.createdAt).getTime();
  const responded = new Date(deal.slaRespondedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(responded) || responded < start) return null;
  return (responded - start) / 60_000;
}

export function slaWithinTarget(
  deal: Pick<Deal, "createdAt" | "slaRespondedAt">,
  targetMinutes = DEFAULT_SLA_TARGET_MINUTES
): boolean {
  const m = slaMinutes(deal);
  return m !== null && m <= targetMinutes;
}

export interface SlaDailyStats {
  total: number;        // leads criados no dia
  responded: number;    // com 1o contato registrado
  withinTarget: number; // respondidos dentro da meta
  pct: number;          // % dentro da meta sobre o total do dia
  avgMinutes: number;   // média de minutos dos respondidos
}

function sameLocalDay(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

/** Agregado de SLA para os leads criados num dia (default: hoje). */
export function slaDailyStats(
  deals: Pick<Deal, "createdAt" | "slaRespondedAt">[],
  targetMinutes = DEFAULT_SLA_TARGET_MINUTES,
  day: Date = new Date()
): SlaDailyStats {
  const ofDay = deals.filter((d) => d.createdAt && sameLocalDay(d.createdAt, day));
  const responded = ofDay.filter((d) => d.slaRespondedAt);
  const withinTarget = responded.filter((d) => slaWithinTarget(d, targetMinutes)).length;
  const avgMinutes =
    responded.length > 0
      ? responded.reduce((s, d) => s + (slaMinutes(d) ?? 0), 0) / responded.length
      : 0;
  return {
    total: ofDay.length,
    responded: responded.length,
    withinTarget,
    pct: ofDay.length > 0 ? (withinTarget / ofDay.length) * 100 : 0,
    avgMinutes,
  };
}

/** Formata minutos em "Xm Ys" para exibição. */
export function formatMinutes(minutes: number): string {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}
