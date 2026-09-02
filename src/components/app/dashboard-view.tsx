"use client";

import { useMemo } from "react";
import {
  TrendingUp, Briefcase, Trophy, Target, UserPlus, Receipt,
  Phone, CalendarClock, Mail, Flame, Thermometer, Snowflake,
  Coins, Gauge, Timer, PieChart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RevenueChart, FunnelChartLive } from "@/components/app/dashboard-charts";
import { SourcesPanel } from "@/components/app/sources-panel";
import { AiSummary } from "@/components/app/ai-summary";
import { useStore, useHydrated, dealTemperature } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";

interface Kpi {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}

export function DashboardView() {
  const hydrated   = useHydrated();
  const { deals, contacts, activities, pipelines, financialConfig } = useStore();

  /* ── Blocos de indicadores executivos ──────────────────── */
  const bi = useMemo(() => {
    if (!hydrated) return null;

    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const open   = deals.filter((d) => d.status === "open");
    const won    = deals.filter((d) => d.status === "won");
    const lost   = deals.filter((d) => d.status === "lost");
    const closed = won.length + lost.length;

    const pipelineValue  = open.reduce((s, d) => s + d.value, 0);
    const wonThisMonth   = won.filter((d) => d.createdAt >= monthStart).reduce((s, d) => s + d.value, 0);
    const conversionRate = closed > 0 ? Math.round((won.length / closed) * 100) : 0;
    const newLeads       = contacts.filter((c) => !c.registeredAt || c.registeredAt >= monthStart.slice(0, 10)).length;
    const avgTicket      = won.length > 0 ? Math.round(won.reduce((s, d) => s + d.value, 0) / won.length) : 0;

    // Custo por lead (BI real, usa configuração financeira)
    const costPerLead = financialConfig.leadsPerMonth > 0
      ? Math.round(financialConfig.monthlyMarketingSpend / financialConfig.leadsPerMonth)
      : 0;

    // Forecast ponderado: Σ(valor × probabilidade da etapa)
    const pipeline0 = pipelines[0];
    const stageProb = new Map<string, number>();
    for (const p of pipelines) for (const s of p.stages) stageProb.set(s.id, s.probability);
    const weightedForecast = Math.round(
      open.reduce((s, d) => s + d.value * ((stageProb.get(d.stageId) ?? 0) / 100), 0)
    );

    // Velocidade: tempo médio (dias) dos negócios abertos na etapa atual
    const avgDaysInStage = open.length > 0
      ? Math.round(
          open.reduce((s, d) => {
            const ref = d.stageEnteredAt ?? d.createdAt;
            return s + (Date.now() - new Date(ref).getTime()) / 86_400_000;
          }, 0) / open.length
        )
      : 0;

    // Win rate por etapa do funil principal (avanço relativo)
    const funnel = pipeline0
      ? pipeline0.stages.map((st) => {
          const inStage = open.filter((d) => d.stageId === st.id);
          return {
            stage: st.name,
            count: inStage.length,
            value: inStage.reduce((sum, d) => sum + d.value, 0),
          };
        })
      : [];

    const acquisition: Kpi[] = [
      { label: "Novos leads no mês", value: String(newLeads), icon: UserPlus },
      { label: "Custo por lead",     value: costPerLead > 0 ? formatCurrency(costPerLead) : "—", icon: Coins, hint: costPerLead > 0 ? undefined : "Configure marketing e leads/mês em Configurações" },
      { label: "Leads por mês (meta)", value: financialConfig.leadsPerMonth > 0 ? String(financialConfig.leadsPerMonth) : "—", icon: Target },
    ];
    const conversion: Kpi[] = [
      { label: "Taxa de conversão", value: `${conversionRate}%`, icon: Target },
      { label: "Negócios abertos",  value: String(open.length),  icon: Briefcase },
      { label: "Negócios ganhos",   value: String(won.length),   icon: Trophy },
    ];
    const revenue: Kpi[] = [
      { label: "Valor do pipeline",   value: formatCurrency(pipelineValue),    icon: TrendingUp },
      { label: "Forecast ponderado",  value: formatCurrency(weightedForecast), icon: PieChart, hint: "Valor esperado por probabilidade de etapa" },
      { label: "Ganhos no mês",       value: formatCurrency(wonThisMonth),     icon: Trophy },
      { label: "Ticket médio",        value: formatCurrency(avgTicket),        icon: Receipt },
    ];
    const velocity: Kpi[] = [
      { label: "Dias médios na etapa", value: `${avgDaysInStage} d`, icon: Timer },
      { label: "Meta de receita/mês",  value: financialConfig.revenueGoalMonthly > 0 ? formatCurrency(financialConfig.revenueGoalMonthly) : "—", icon: Gauge },
      { label: "Contrato médio",       value: `${financialConfig.avgContractMonths} meses`, icon: CalendarClock },
    ];

    return { acquisition, conversion, revenue, velocity, funnel, pipeline0 };
  }, [deals, contacts, pipelines, financialConfig, hydrated]);

  /* Atividades de hoje */
  const todayActivities = useMemo(() => {
    if (!hydrated) return [];
    const today = new Date().toLocaleDateString("pt-BR");
    return activities
      .filter((a) => !a.done && (a.due === "Hoje" || a.due === today))
      .slice(0, 6);
  }, [activities, hydrated]);

  /* Ranking de vendedores */
  const ranking = useMemo(() => {
    if (!hydrated) return [];
    const map = new Map<string, { won: number; deals: number; revenue: number }>();
    for (const d of deals) {
      const e = map.get(d.owner) ?? { won: 0, deals: 0, revenue: 0 };
      e.deals++;
      if (d.status === "won") { e.won++; e.revenue += d.value; }
      map.set(d.owner, e);
    }
    return [...map.entries()]
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [deals, hydrated]);

  /* Leads por temperatura */
  const tempCounts = useMemo(() => {
    if (!hydrated) return { hot: 0, warm: 0, cold: 0 };
    const open = deals.filter((d) => d.status === "open");
    return {
      hot:  open.filter((d) => dealTemperature(d) === "hot").length,
      warm: open.filter((d) => dealTemperature(d) === "warm").length,
      cold: open.filter((d) => dealTemperature(d) === "cold").length,
    };
  }, [deals, hydrated]);

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={cn("animate-pulse rounded bg-white/10", className)} />
  );

  return (
    <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
      <AiSummary />

      {/* Temperatura da carteira */}
      {hydrated && (
        <div className="flex flex-wrap items-center gap-2">
          <TempChip icon={Flame}        label="Quente" count={tempCounts.hot}  color="text-orange-400" bg="bg-orange-400/10 border-orange-400/30" />
          <TempChip icon={Thermometer}  label="Morno"  count={tempCounts.warm} color="text-yellow-400" bg="bg-yellow-400/10 border-yellow-400/30" />
          <TempChip icon={Snowflake}    label="Frio"   count={tempCounts.cold} color="text-blue-400"   bg="bg-blue-400/10 border-blue-400/30"     />
          <p className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto">
            Temperatura dos negócios abertos por tempo na etapa atual
          </p>
        </div>
      )}

      {/* Indicadores executivos agrupados */}
      {!hydrated ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-9 w-9 rounded-lg" /><Skeleton className="mt-3 h-7 w-24" /><Skeleton className="mt-1 h-3 w-20" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <KpiSection title="Aquisição"  subtitle="Geração e custo de demanda"        kpis={bi!.acquisition} />
          <KpiSection title="Conversão"  subtitle="Eficiência do funil comercial"      kpis={bi!.conversion} />
          <KpiSection title="Receita"    subtitle="Previsibilidade e valor de carteira" kpis={bi!.revenue} />
          <KpiSection title="Velocidade" subtitle="Ritmo do ciclo de vendas"            kpis={bi!.velocity} />
        </div>
      )}

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Receita vs. Meta</CardTitle></CardHeader>
          <CardContent><RevenueChart /></CardContent>
        </Card>
        <SourcesPanel />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Funil de vendas</CardTitle>
              {hydrated && bi?.pipeline0 && (
                <Badge variant="outline" className="text-[10px]">{bi.pipeline0.name}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!hydrated ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
            ) : !bi || bi.funnel.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum negócio aberto.</p>
            ) : (
              <FunnelChartLive data={bi.funnel} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Atividades de hoje</CardTitle>
              {hydrated && <Badge variant="secondary">{todayActivities.length}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {!hydrated ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
            ) : todayActivities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade pendente para hoje.</p>
            ) : todayActivities.map((a) => {
              const Icon = a.type === "call" ? Phone : a.type === "meeting" ? CalendarClock : a.type === "email" ? Mail : CalendarClock;
              return (
                <div key={a.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.contact} · {a.due}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Ranking de vendedores</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!hydrated ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
            ) : ranking.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p>
            ) : ranking.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.won} de {m.deals} negócios ganhos</p>
                </div>
                <span className="font-display text-sm font-bold">{formatCurrency(m.revenue)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiSection({ title, subtitle, kpis }: { title: string; subtitle: string; kpis: Kpi[] }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-foreground">{title}</h2>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                <Icon className="size-4" />
              </span>
              <p className="mt-3 font-display text-xl font-bold tracking-tight">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
              {hint && <p className="mt-1 text-[10px] leading-tight text-muted-foreground/70">{hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function TempChip({
  icon: Icon, label, count, color, bg,
}: {
  icon: React.ComponentType<{ className?: string }>; label: string; count: number; color: string; bg: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5", bg)}>
      <Icon className={cn("size-4", color)} />
      <span className={cn("text-sm font-semibold", color)}>{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
