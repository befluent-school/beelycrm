"use client";

import { useMemo } from "react";
import {
  TrendingUp, Briefcase, Trophy, Target, UserPlus, Receipt,
  Phone, CalendarClock, Mail, Flame, Thermometer, Snowflake,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RevenueChart, FunnelChartLive } from "@/components/app/dashboard-charts";
import { SourcesPanel } from "@/components/app/sources-panel";
import { AiSummary } from "@/components/app/ai-summary";
import { useStore, useHydrated, dealTemperature } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";

export function DashboardView() {
  const hydrated   = useHydrated();
  const { deals, contacts, activities, pipelines } = useStore();

  const kpis = useMemo(() => {
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

    return [
      { label: "Valor do pipeline",  value: formatCurrency(pipelineValue),  icon: TrendingUp, raw: pipelineValue  },
      { label: "Negócios abertos",   value: String(open.length),            icon: Briefcase,  raw: open.length    },
      { label: "Ganhos no mês",      value: formatCurrency(wonThisMonth),   icon: Trophy,     raw: wonThisMonth   },
      { label: "Taxa de conversão",  value: `${conversionRate}%`,           icon: Target,     raw: conversionRate },
      { label: "Novos leads",        value: String(newLeads),               icon: UserPlus,   raw: newLeads       },
      { label: "Ticket médio",       value: formatCurrency(avgTicket),      icon: Receipt,    raw: avgTicket      },
    ];
  }, [deals, contacts, hydrated]);

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

  /* Funil: contagem real por etapa */
  const funnelData = useMemo(() => {
    if (!hydrated || !pipelines[0]) return [];
    const pipeline = pipelines[0];
    const open = deals.filter((d) => d.pipelineId === pipeline.id && d.status === "open");
    return pipeline.stages.map((s) => ({
      stage: s.name,
      count: open.filter((d) => d.stageId === s.id).length,
      value: open.filter((d) => d.stageId === s.id).reduce((sum, d) => sum + d.value, 0),
    }));
  }, [deals, pipelines, hydrated]);

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={cn("animate-pulse rounded bg-white/10", className)} />
  );

  return (
    <div className="space-y-6 p-6">
      {/* AI summary */}
      <AiSummary />

      {/* Temperatura */}
      {hydrated && (
        <div className="flex gap-3">
          <TempChip icon={Flame}        label="Quente" count={tempCounts.hot}  color="text-orange-400" bg="bg-orange-400/10 border-orange-400/30" />
          <TempChip icon={Thermometer}  label="Morno"  count={tempCounts.warm} color="text-yellow-400" bg="bg-yellow-400/10 border-yellow-400/30" />
          <TempChip icon={Snowflake}    label="Frio"   count={tempCounts.cold} color="text-blue-400"   bg="bg-blue-400/10 border-blue-400/30"     />
          <div className="ml-auto flex items-center text-xs text-muted-foreground">
            Temperatura dos leads abertos por tempo na etapa atual
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {!hydrated
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-9 w-9 rounded-lg" /><Skeleton className="mt-3 h-7 w-24" /><Skeleton className="mt-1 h-3 w-20" /></CardContent></Card>
            ))
          : kpis!.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                      <Icon className="size-4" />
                    </span>
                  </div>
                  <p className="mt-3 font-display text-xl font-bold tracking-tight">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Receita vs. Meta</CardTitle></CardHeader>
          <CardContent><RevenueChart /></CardContent>
        </Card>
        <SourcesPanel />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Funil real */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Funil de vendas</CardTitle>
              {hydrated && pipelines[0] && (
                <Badge variant="outline" className="text-[10px]">{pipelines[0].name}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!hydrated ? (
              <div className="space-y-3 py-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
            ) : funnelData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum deal aberto.</p>
            ) : (
              <FunnelChartLive data={funnelData} />
            )}
          </CardContent>
        </Card>

        {/* Atividades de hoje */}
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

        {/* Ranking */}
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
