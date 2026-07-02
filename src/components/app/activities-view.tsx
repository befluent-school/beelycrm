"use client";

import { useStore, useHydrated } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QuickAdd } from "./quick-add";
import { Button } from "@/components/ui/button";
import { Plus, Phone, CalendarClock, Mail, CheckSquare, Check } from "lucide-react";

const ICONS = { call: Phone, meeting: CalendarClock, email: Mail, task: CheckSquare } as const;

export function ActivitiesView() {
  const hydrated = useHydrated();
  const { activities, toggleActivity } = useStore();
  const pending = activities.filter((a) => !a.done);
  const done = activities.filter((a) => a.done);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{hydrated ? pending.length : 0} atividades pendentes</p>
        <QuickAdd defaultTab="task" trigger={<Button size="sm"><Plus className="size-4" /> Nova atividade</Button>} />
      </div>

      <Card>
        <CardHeader><CardTitle>Pendentes</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {hydrated && pending.map((a) => <Row key={a.id} a={a} onToggle={() => toggleActivity(a.id)} />)}
          {hydrated && pending.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Tudo em dia! 🎉</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Concluídas</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {hydrated && done.map((a) => <Row key={a.id} a={a} onToggle={() => toggleActivity(a.id)} />)}
          {hydrated && done.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma ainda.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ a, onToggle }: { a: { id: string; type: keyof typeof ICONS; title: string; due: string; contact: string; done: boolean }; onToggle: () => void }) {
  const Icon = ICONS[a.type];
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.04]">
      <button onClick={onToggle} className={`flex size-5 items-center justify-center rounded border transition-colors ${a.done ? "border-success bg-success/20 text-success" : "border-border hover:border-primary"}`}>
        {a.done && <Check className="size-3" />}
      </button>
      <span className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground"><Icon className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${a.done ? "text-muted-foreground line-through" : ""}`}>{a.title}</p>
        <p className="text-xs text-muted-foreground">{a.contact}</p>
      </div>
      <Badge variant="outline" className="shrink-0">{a.due}</Badge>
    </div>
  );
}
