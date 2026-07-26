"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useStore, useHydrated, type Activity } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QuickAdd } from "./quick-add";
import { Button } from "@/components/ui/button";
import { Plus, Phone, CalendarClock, Mail, CheckSquare, Check, Pencil, Trash2, X, Save } from "lucide-react";

const ICONS = { call: Phone, meeting: CalendarClock, email: Mail, task: CheckSquare } as const;

export function ActivitiesView() {
  const hydrated = useHydrated();
  const { activities, toggleActivity, updateActivity, deleteActivity } = useStore();
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
          {hydrated && pending.map((a) => (
            <Row key={a.id} a={a} onToggle={() => toggleActivity(a.id)} onSave={(patch) => updateActivity(a.id, patch)} onDelete={() => { deleteActivity(a.id); toast("Atividade excluída."); }} />
          ))}
          {hydrated && pending.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Tudo em dia! 🎉</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Concluídas</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {hydrated && done.map((a) => (
            <Row key={a.id} a={a} onToggle={() => toggleActivity(a.id)} onSave={(patch) => updateActivity(a.id, patch)} onDelete={() => { deleteActivity(a.id); toast("Atividade excluída."); }} />
          ))}
          {hydrated && done.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma ainda.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ a, onToggle, onSave, onDelete }: {
  a: Activity;
  onToggle: () => void;
  onSave: (patch: Partial<Activity>) => void;
  onDelete: () => void;
}) {
  const Icon = ICONS[a.type];
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(a.title);
  const [due, setDue] = useState(a.due);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/[0.04] px-2 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground"><Icon className="size-4" /></span>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" placeholder="Título" />
          <Input value={due} onChange={(e) => setDue(e.target.value)} className="h-8 text-sm" placeholder="Prazo (ex: Hoje, 14:00)" />
        </div>
        <button
          onClick={() => { onSave({ title: title.trim() || a.title, due: due.trim() || a.due }); setEditing(false); toast.success("Atividade atualizada."); }}
          className="shrink-0 rounded p-1.5 text-success hover:bg-success/10"
          title="Salvar"
        >
          <Save className="size-4" />
        </button>
        <button
          onClick={() => { setTitle(a.title); setDue(a.due); setEditing(false); }}
          className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-white/10"
          title="Cancelar"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.04]">
      <button onClick={onToggle} className={`flex size-5 shrink-0 items-center justify-center rounded border transition-colors ${a.done ? "border-success bg-success/20 text-success" : "border-border hover:border-primary"}`}>
        {a.done && <Check className="size-3" />}
      </button>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground"><Icon className="size-4" /></span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${a.done ? "text-muted-foreground line-through" : ""}`}>{a.title}</p>
        <p className="text-xs text-muted-foreground">{a.contact}</p>
      </div>
      <Badge variant="outline" className="shrink-0">{a.due}</Badge>

      {!confirmDelete ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <button onClick={() => setEditing(true)} className="rounded p-1.5 text-muted-foreground/60 hover:bg-white/10 hover:text-foreground" title="Editar">
            <Pencil className="size-3.5" />
          </button>
          <button onClick={() => setConfirmDelete(true)} className="rounded p-1.5 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive" title="Excluir">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onDelete} className="rounded bg-destructive px-2 py-1 text-[10px] font-semibold text-destructive-foreground">Excluir</button>
          <button onClick={() => setConfirmDelete(false)} className="rounded px-2 py-1 text-[10px] text-muted-foreground hover:bg-white/10">Cancelar</button>
        </div>
      )}
    </div>
  );
}
