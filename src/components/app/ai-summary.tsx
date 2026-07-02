"use client";

import { useState } from "react";
import { useStore, useHydrated, type Deal, type Contact } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { Sparkles, TrendingUp, AlertTriangle, Trophy, Target, RefreshCw } from "lucide-react";

interface Insight {
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "success" | "warning";
  title: string;
  body: string;
}

function generate(deals: Deal[], contacts: Contact[]): { headline: string; narrative: string; insights: Insight[] } {
  const open = deals.filter((d) => d.status === "open");
  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost");
  const closed = won.length + lost.length;
  const conversion = closed ? Math.round((won.length / closed) * 100) : 0;
  const openValue = open.reduce((s, d) => s + d.value, 0);
  const wonValue = won.reduce((s, d) => s + d.value, 0);

  // sources
  const bySource = new Map<string, { count: number; won: number; total: number }>();
  for (const c of contacts) {
    const entry = bySource.get(c.source) ?? { count: 0, won: 0, total: 0 };
    entry.count++;
    const cDeals = deals.filter((d) => d.contact === c.name);
    entry.total += cDeals.length;
    entry.won += cDeals.filter((d) => d.status === "won").length;
    bySource.set(c.source, entry);
  }
  const sources = [...bySource.entries()];
  const topVolume = [...sources].sort((a, b) => b[1].count - a[1].count)[0];
  const topConversion = [...sources]
    .filter(([, s]) => s.total > 0)
    .map(([k, s]) => ({ source: k, rate: s.won / s.total, won: s.won }))
    .sort((a, b) => b.rate - a.rate)[0];

  // top owner by won revenue
  const byOwner = new Map<string, number>();
  for (const d of won) byOwner.set(d.owner, (byOwner.get(d.owner) ?? 0) + d.value);
  const topOwner = [...byOwner.entries()].sort((a, b) => b[1] - a[1])[0];

  const insights: Insight[] = [];

  if (topVolume) {
    insights.push({
      icon: TrendingUp, tone: "primary",
      title: `${topVolume[0]} é seu maior canal de leads`,
      body: `${topVolume[1].count} contatos vieram por aqui — concentre orçamento e respostas rápidas neste canal para amplificar o resultado.`,
    });
  }
  if (topConversion && topConversion.won > 0) {
    insights.push({
      icon: Target, tone: "success",
      title: `${topConversion.source} converte melhor (${Math.round(topConversion.rate * 100)}%)`,
      body: `Os leads desta origem fecharam ${topConversion.won} negócios. Vale criar uma campanha dedicada e padronizar o discurso comercial usado aqui.`,
    });
  }
  if (topOwner) {
    insights.push({
      icon: Trophy, tone: "success",
      title: `${topOwner[0]} lidera as vendas`,
      body: `${formatCurrency(topOwner[1])} em receita ganha — vale documentar a abordagem para replicar com o time.`,
    });
  }
  if (open.length > 0 && openValue / open.length > 8000) {
    insights.push({
      icon: AlertTriangle, tone: "warning",
      title: `${open.length} negócios abertos com ticket médio de ${formatCurrency(Math.round(openValue / open.length))}`,
      body: `Concentre follow-ups esta semana — quanto mais tempo aberto, menor a taxa de conversão. Considere criar uma automação de alerta de inatividade.`,
    });
  }

  const headline =
    won.length === 0 ? "Ainda sem vendas registradas — foque em fechar os primeiros negócios"
    : conversion >= 50 ? `Excelente desempenho: ${conversion}% de conversão`
    : conversion >= 25 ? `Bom desempenho: ${conversion}% de conversão`
    : `Há espaço para melhorar: ${conversion}% de conversão`;

  const narrative =
    `Você tem ${contacts.length} contatos cadastrados e ${deals.length} negócios (${open.length} abertos, ${won.length} ganhos, ${lost.length} perdidos). ` +
    `O pipeline aberto soma ${formatCurrency(openValue)} e a receita já realizada chegou a ${formatCurrency(wonValue)}. ` +
    (topVolume ? `A maior fonte de leads é ${topVolume[0]} (${topVolume[1].count} contatos). ` : "") +
    (topConversion && topConversion.won > 0
      ? `Quem converte mais é ${topConversion.source}, com ${Math.round(topConversion.rate * 100)}% de fechamento.`
      : "Ainda não há dados suficientes para apontar a origem que mais converte.");

  return { headline, narrative, insights };
}

export function AiSummary() {
  const hydrated = useHydrated();
  const { deals, contacts } = useStore();
  const [, force] = useState(0);

  if (!hydrated) {
    return (
      <Card className="relative overflow-hidden border-primary/30">
        <CardContent className="relative p-6">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-primary/20 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-white/10 animate-pulse" />
              <div className="h-5 w-64 rounded bg-white/10 animate-pulse" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-white/10 animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }
  const { headline, narrative, insights } = generate(deals, contacts);

  return (
    <Card className="relative overflow-hidden border-primary/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_0%_0%,color-mix(in_srgb,var(--primary)_20%,transparent),transparent_70%)]" />
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg glow-orange">
              <Sparkles className="size-5" />
            </span>
            <div>
              <Badge variant="outline" className="mb-1">Assistente Beely IA</Badge>
              <h3 className="font-display text-lg font-bold">{headline}</h3>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => force((n) => n + 1)} title="Atualizar análise">
            <RefreshCw className="size-4" />
          </Button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{narrative}</p>

        {insights.length > 0 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {insights.map((ins, i) => {
              const Icon = ins.icon;
              return (
                <div key={i} className={cn(
                  "rounded-xl border p-3 transition-colors",
                  ins.tone === "primary" && "border-primary/30 bg-primary/[0.05]",
                  ins.tone === "success" && "border-success/30 bg-success/[0.05]",
                  ins.tone === "warning" && "border-warning/30 bg-warning/[0.05]",
                )}>
                  <div className="flex items-start gap-2">
                    <span className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                      ins.tone === "primary" && "bg-primary/20 text-primary",
                      ins.tone === "success" && "bg-success/20 text-success",
                      ins.tone === "warning" && "bg-warning/20 text-warning",
                    )}>
                      <Icon className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{ins.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{ins.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
