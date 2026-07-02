import type { Metadata } from "next";
import {
  TrendingUp,
  Briefcase,
  Trophy,
  Target,
  UserPlus,
  Receipt,
  Phone,
  CalendarClock,
  Mail,
} from "lucide-react";
import { Topbar } from "@/components/app/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RevenueChart, FunnelChart } from "@/components/app/dashboard-charts";
import { SourcesPanel } from "@/components/app/sources-panel";
import { AiSummary } from "@/components/app/ai-summary";
import { KPIS, ACTIVITIES, TEAM } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const kpis = [
    { label: "Valor do pipeline", value: formatCurrency(KPIS.pipelineValue), icon: TrendingUp, trend: "+12%" },
    { label: "Negócios abertos", value: String(KPIS.openDeals), icon: Briefcase, trend: "+3" },
    { label: "Ganhos no mês", value: formatCurrency(KPIS.wonThisMonth), icon: Trophy, trend: "+18%" },
    { label: "Taxa de conversão", value: `${KPIS.conversionRate}%`, icon: Target, trend: "+4pp" },
    { label: "Novos leads", value: String(KPIS.newLeads), icon: UserPlus, trend: "+9" },
    { label: "Ticket médio", value: formatCurrency(KPIS.avgTicket), icon: Receipt, trend: "+5%" },
  ];

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="space-y-6 p-6">
        {/* AI assistant */}
        <AiSummary />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map(({ label, value, icon: Icon, trend }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <Icon className="size-4.5" />
                  </span>
                  <Badge variant="success" className="text-[10px]">{trend}</Badge>
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
            <CardHeader>
              <CardTitle>Receita vs. Meta</CardTitle>
            </CardHeader>
            <CardContent><RevenueChart /></CardContent>
          </Card>
          <SourcesPanel />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Funil de vendas</CardTitle>
            </CardHeader>
            <CardContent><FunnelChart /></CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>Atividades de hoje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ACTIVITIES.map((a) => {
                const Icon = a.type === "call" ? Phone : a.type === "meeting" ? CalendarClock : a.type === "email" ? Mail : CalendarClock;
                return (
                  <div key={a.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${a.done ? "text-muted-foreground line-through" : ""}`}>{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.contact} · {a.due}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Ranking */}
          <Card>
            <CardHeader>
              <CardTitle>Ranking de vendedores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[...TEAM].sort((a, b) => b.revenue - a.revenue).map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
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
    </>
  );
}
