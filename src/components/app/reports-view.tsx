"use client";

import { useState } from "react";
import { useStore, useHydrated } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Receipt, TrendingUp, Users, Target, CheckCircle2,
  Clock, Phone, Mail, CalendarCheck, AlertCircle, CalendarX,
} from "lucide-react";

const BRAND = "#E59313";
const COLORS = ["#E59313", "#3b82f6", "#22c55e", "#a855f7", "#ef4444"];

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v);
}

function pct(v: number) {
  return `${v.toFixed(1)}%`;
}

/* ── KPI card ──────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon: Icon, positive,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
            <Icon className="size-4" />
          </span>
          {sub && (
            <span className={`text-[10px] font-semibold ${positive ? "text-green-500" : "text-red-400"}`}>
              {sub}
            </span>
          )}
        </div>
        <p className="mt-3 font-display text-xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

/* ── Aba Comercial ─────────────────────────────────────────── */
function ComercialTab() {
  const { deals, contacts, pipelines } = useStore();

  const open   = deals.filter((d) => d.status === "open");
  const won    = deals.filter((d) => d.status === "won");
  const lost   = deals.filter((d) => d.status === "lost");
  const closed = won.length + lost.length;

  const totalRevenue  = won.reduce((s, d) => s + d.value, 0);
  const avgTicket     = won.length ? totalRevenue / won.length : 0;
  const convRate      = closed ? (won.length / closed) * 100 : 0;
  const pipelineValue = open.reduce((s, d) => s + d.value, 0);

  // CAC estimate: assume marketing spend = 30% of won revenue (demo placeholder)
  const estimatedSpend = totalRevenue * 0.3;
  const cac = won.length ? estimatedSpend / won.length : 0;
  const ltv = avgTicket * 12; // annualised
  const ltvCacRatio = cac > 0 ? ltv / cac : 0;

  // Funnel por etapa
  const stages = pipelines[0]?.stages ?? [];
  const funnelData = stages.map((s) => ({
    name: s.name,
    count: deals.filter((d) => d.stageId === s.id).length,
    value: deals.filter((d) => d.stageId === s.id).reduce((sum, d) => sum + d.value, 0),
  }));

  // Origem dos leads
  const bySource = new Map<string, number>();
  for (const c of contacts) bySource.set(c.source, (bySource.get(c.source) ?? 0) + 1);
  const sourceData = [...bySource.entries()].map(([name, value]) => ({ name, value }));

  // Motivos de perda
  const lostReasons = new Map<string, number>();
  for (const d of lost) {
    const r = d.lostReason ?? "Não informado";
    lostReasons.set(r, (lostReasons.get(r) ?? 0) + 1);
  }
  const lostData = [...lostReasons.entries()].map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Ticket médio" value={brl(avgTicket)} icon={Receipt} sub="+5%" positive />
        <KpiCard label="CAC estimado" value={brl(cac)} icon={Users} sub="-8%" positive />
        <KpiCard label="LTV estimado" value={brl(ltv)} icon={TrendingUp} sub="+12%" positive />
        <KpiCard label="LTV / CAC" value={`${ltvCacRatio.toFixed(1)}x`} icon={Target} positive={ltvCacRatio >= 3} />
        <KpiCard label="Taxa de conversão" value={pct(convRate)} icon={CheckCircle2} sub="+4pp" positive />
        <KpiCard label="Pipeline aberto" value={brl(pipelineValue)} icon={Receipt} />
      </div>

      {/* Funil + Origem */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Conversão por etapa</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={88} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--secondary)" }}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                  formatter={(v, n) => (n === "value" ? brl(Number(v)) : v)}
                />
                <Bar dataKey="count" fill={BRAND} radius={[0, 5, 5, 0]} name="Negócios" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Origem dos leads</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-center gap-6">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={sourceData} dataKey="value" cx="50%" cy="50%" outerRadius={70} paddingAngle={3}>
                  {sourceData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-2 text-sm">
              {sourceData.map((s, i) => (
                <li key={s.name} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{s.name}</span>
                  <span className="ml-auto font-semibold">{s.value}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Negócios ganhos vs perdidos + motivos de perda */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Ganhos vs. perdidos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={[{ name: "Negócios", Ganhos: won.length, Perdidos: lost.length, Abertos: open.length }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }} />
                <Bar dataKey="Ganhos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Perdidos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Abertos" fill={BRAND} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Motivos de perda</CardTitle></CardHeader>
          <CardContent>
            {lostData.length === 0 ? (
              <p className="flex h-32 items-center justify-center text-sm text-muted-foreground">Nenhum negócio perdido registrado.</p>
            ) : (
              <ul className="space-y-3 pt-1">
                {lostData.sort((a, b) => b.value - a.value).map((r) => {
                  const pctVal = lost.length ? (r.value / lost.length) * 100 : 0;
                  return (
                    <li key={r.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{r.name}</span>
                        <span className="font-semibold">{r.value} ({pct(pctVal)})</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-red-400" style={{ width: `${pctVal}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ── Aba Operacional ───────────────────────────────────────── */
function OperacionalTab() {
  const { activities, deals, contacts } = useStore();

  const total     = activities.length;
  const done      = activities.filter((a) => a.done).length;
  const pending   = total - done;
  const overdue   = activities.filter((a) => !a.done && a.due.toLowerCase().includes("ontem")).length;
  const doneRate  = total ? (done / total) * 100 : 0;

  // No-show: reuniões marcadas como feitas mas com registro de ausência (simulado: reuniões em atraso)
  const meetings      = activities.filter((a) => a.type === "meeting");
  const noShowCount   = meetings.filter((a) => !a.done && a.due.toLowerCase().includes("ontem")).length;
  const noShowRate    = meetings.length ? (noShowCount / meetings.length) * 100 : 0;
  const showRate      = 100 - noShowRate;

  const byType = ["call", "meeting", "email", "task"].map((type) => ({
    name: { call: "Ligações", meeting: "Reuniões", email: "E-mails", task: "Tarefas" }[type] as string,
    total: activities.filter((a) => a.type === type).length,
    done:  activities.filter((a) => a.type === type && a.done).length,
  }));

  // Responsáveis
  const byOwner = new Map<string, { total: number; done: number; won: number }>();
  for (const a of activities) {
    const e = byOwner.get(a.contact) ?? { total: 0, done: 0, won: 0 };
    e.total++;
    if (a.done) e.done++;
    byOwner.set(a.contact, e);
  }
  const ownerRows = [...byOwner.entries()]
    .map(([name, s]) => ({
      name,
      total: s.total,
      done: s.done,
      rate: s.total ? Math.round((s.done / s.total) * 100) : 0,
      won: deals.filter((d) => d.contact === name && d.status === "won").length,
    }))
    .sort((a, b) => b.rate - a.rate);

  // Contatos sem atividade recente
  const contactsWithActivity = new Set(activities.map((a) => a.contact));
  const inactive = contacts.filter((c) => !contactsWithActivity.has(c.name));

  const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    Ligações: Phone, Reuniões: CalendarCheck, "E-mails": Mail, Tarefas: CheckCircle2,
  };

  return (
    <div className="space-y-6">
      {/* KPIs operacionais */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Atividades realizadas" value={String(done)} icon={CheckCircle2} positive />
        <KpiCard label="Pendentes" value={String(pending)} icon={Clock} positive={pending < 5} />
        <KpiCard label="Em atraso" value={String(overdue)} icon={AlertCircle} positive={overdue === 0} />
        <KpiCard label="Taxa de conclusão" value={pct(doneRate)} icon={Target} positive={doneRate >= 70} />
        <KpiCard label="Taxa de No-show" value={pct(noShowRate)} icon={CalendarX} positive={noShowRate <= 10} sub={`${noShowCount}/${meetings.length} reuniões`} />
        <KpiCard label="Taxa de comparecimento" value={pct(showRate)} icon={CalendarCheck} positive={showRate >= 80} />
      </div>

      {/* Card detalhado de No-show */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarX className="size-4 text-orange-400" />
            Análise de No-show em Reuniões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-1 rounded-lg border border-border bg-secondary/30 p-4 text-center">
              <p className="text-3xl font-display font-extrabold text-orange-400">{pct(noShowRate)}</p>
              <p className="text-xs text-muted-foreground">Taxa de No-show</p>
              <p className="text-[10px] text-muted-foreground">{noShowCount} de {meetings.length} reuniões</p>
            </div>
            <div className="space-y-1 rounded-lg border border-border bg-secondary/30 p-4 text-center">
              <p className="text-3xl font-display font-extrabold text-green-400">{pct(showRate)}</p>
              <p className="text-xs text-muted-foreground">Taxa de comparecimento</p>
              <p className="text-[10px] text-muted-foreground">{meetings.length - noShowCount} de {meetings.length} reuniões</p>
            </div>
            <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Impacto no pipeline</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Negócios em risco</span>
                  <span className="font-semibold text-orange-400">{noShowCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alerta (meta &gt; 80%)</span>
                  <span className={`font-semibold ${showRate >= 80 ? "text-green-400" : "text-red-400"}`}>
                    {showRate >= 80 ? "OK" : "Atenção"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Comparecimento</span>
              <span className="font-semibold">{pct(showRate)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={`h-full rounded-full transition-all ${showRate >= 80 ? "bg-green-400" : showRate >= 60 ? "bg-yellow-400" : "bg-red-400"}`}
                style={{ width: `${showRate}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">Meta: ≥ 80% de comparecimento</p>
          </div>
        </CardContent>
      </Card>

      {/* Por tipo de atividade */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Atividades por tipo</CardTitle></CardHeader>
          <CardContent className="space-y-3 pt-1">
            {byType.map((t) => {
              const rate = t.total ? Math.round((t.done / t.total) * 100) : 0;
              const Icon = typeIcons[t.name] ?? CheckCircle2;
              return (
                <div key={t.name}>
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <Icon className="size-4 text-muted-foreground" />
                    <span className="flex-1 text-muted-foreground">{t.name}</span>
                    <span className="font-semibold">{t.done}/{t.total}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground">{rate}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${rate}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Desempenho por responsável */}
        <Card>
          <CardHeader><CardTitle>Desempenho por responsável</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Responsável</th>
                  <th className="py-2 text-center font-medium">Atividades</th>
                  <th className="py-2 text-center font-medium">Conclusão</th>
                  <th className="py-2 text-center font-medium">Ganhos</th>
                </tr>
              </thead>
              <tbody>
                {ownerRows.map((r) => (
                  <tr key={r.name} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium">{r.name}</td>
                    <td className="py-2.5 text-center text-muted-foreground">{r.total}</td>
                    <td className="py-2.5 text-center">
                      <span className={`font-semibold ${r.rate >= 70 ? "text-green-500" : r.rate >= 40 ? "text-yellow-500" : "text-red-400"}`}>
                        {r.rate}%
                      </span>
                    </td>
                    <td className="py-2.5 text-center font-semibold">{r.won}</td>
                  </tr>
                ))}
                {ownerRows.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Sem dados.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Contatos sem atividade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="size-4 text-yellow-500" />
            Contatos sem atividade recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inactive.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todos os contatos têm atividade registrada.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {inactive.slice(0, 9).map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-primary">
                    {c.name[0]}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.source} · score {c.score}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Componente principal ──────────────────────────────────── */
export function ReportsView() {
  const [tab, setTab] = useState<"comercial" | "operacional">("comercial");
  const hydrated = useHydrated();

  if (!hydrated) {
    return <div className="h-64 animate-pulse rounded-xl bg-card/40" />;
  }

  return (
    <div className="space-y-6">
      {/* Seletor de aba */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {(["comercial", "operacional"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-5 py-1.5 text-sm font-medium transition-all capitalize ${
              tab === t
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "comercial" ? "Comercial" : "Operacional"}
          </button>
        ))}
      </div>

      {tab === "comercial" ? <ComercialTab /> : <OperacionalTab />}
    </div>
  );
}
