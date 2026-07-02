"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { REVENUE_SERIES, FUNNEL_SERIES } from "@/lib/demo-data";

const BRAND = "#E59313";
const META_LINE = "#8a7560";

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", style: "currency", currency: "BRL" }).format(v);
}

export function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={REVENUE_SERIES} margin={{ left: -10, right: 10, top: 10 }}>
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

export function FunnelChart() {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={FUNNEL_SERIES} layout="vertical" margin={{ left: 30, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="stage" stroke="var(--muted-foreground)" fontSize={12} width={90} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: "var(--secondary)" }}
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 13 }}
          formatter={(v, n) => (n === "value" ? brl(Number(v)) : v)}
        />
        <Bar dataKey="count" fill={BRAND} radius={[0, 6, 6, 0]} name="Negócios" />
      </BarChart>
    </ResponsiveContainer>
  );
}

