"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Deal } from "@/lib/store";

const BRAND = "#E59313";
const META_LINE = "#8a7560";

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", style: "currency", currency: "BRL" }).format(v);
}

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Receita ganha por mês (últimos 6 meses corridos, terminando no mês atual)
 * vs. meta mensal configurada — antes era um array estático (REVENUE_SERIES em
 * demo-data.ts) que nunca refletia negócio nenhum, daí o gráfico "nunca mudar".
 */
function buildRevenueSeries(deals: Deal[], monthlyGoal: number) {
  const now = new Date();
  const months: { key: string; month: string; receita: number; meta: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: MONTH_LABELS[d.getMonth()], receita: 0, meta: monthlyGoal });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const deal of deals) {
    if (deal.status !== "won") continue;
    const d = new Date(deal.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const entry = byKey.get(key);
    if (entry) entry.receita += deal.value;
  }
  return months;
}

export function RevenueChart({ deals = [], monthlyGoal = 0 }: { deals?: Deal[]; monthlyGoal?: number }) {
  const data = useMemo(() => buildRevenueSeries(deals, monthlyGoal), [deals, monthlyGoal]);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -10, right: 10, top: 10 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={BRAND} stopOpacity={0.35} />
            <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={brl} />
        <Tooltip
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 13 }}
          formatter={(v) => brl(Number(v))}
        />
        <Area type="monotone" dataKey="receita" stroke={BRAND} strokeWidth={2.5} fill="url(#rev)" name="Receita" />
        <Area type="monotone" dataKey="meta" stroke={META_LINE} strokeWidth={1.5} strokeDasharray="5 5" fill="transparent" name="Meta" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Taxa de conversão por etapa vs. benchmark — Playbook Comercial Be Fluent v3, Seção 8.1.
 * Cada barra é a % que avança de uma etapa para a próxima; vermelho quando abaixo do piso.
 */
export function StageConversionChart({
  data,
}: {
  data: { label: string; conversionPct: number; expectedPct: number; floorPct: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 46, 160)}>
      <BarChart data={data} layout="vertical" margin={{ left: 40, right: 24, top: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} unit="%" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" stroke="var(--muted-foreground)" fontSize={11} width={130} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: "var(--secondary)" }}
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
          formatter={(v) => `${Math.round(Number(v))}%`}
        />
        <ReferenceLine x={50} stroke={META_LINE} strokeDasharray="4 4" ifOverflow="extendDomain" />
        <Bar dataKey="conversionPct" radius={[0, 6, 6, 0]} name="Conversão">
          {data.map((d, i) => (
            <Cell key={i} fill={d.conversionPct < d.floorPct ? "#ef4444" : d.conversionPct < d.expectedPct ? "#f59e0b" : "#22c55e"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FunnelChartLive({ data }: { data: { stage: string; count: number; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 44, 180)}>
      <BarChart data={data} layout="vertical" margin={{ left: 30, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="stage" stroke="var(--muted-foreground)" fontSize={12} width={110} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: "var(--secondary)" }}
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 13 }}
          formatter={(v, n) => (n === "Valor" ? brl(Number(v)) : v)}
        />
        <Bar dataKey="count" fill={BRAND} radius={[0, 6, 6, 0]} name="Negócios" />
      </BarChart>
    </ResponsiveContainer>
  );
}

