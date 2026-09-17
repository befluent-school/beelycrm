"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, Zap, ArrowRight, Webhook, Trash2, Pencil, X, TrendingUp, TrendingDown, Star, Clock, MessageCircle, Mail, MousePointer, UserCheck, Save, Loader2, Repeat, CalendarClock, BookOpen, Phone, Copy, ShieldQuestion, Handshake, Flame as FlameIcon, Megaphone } from "lucide-react";
import { useStore, useHydrated, type Automation, type AutomationTrigger, type AutomationAction } from "@/lib/store";
import { SITUATION_LABELS, type FollowupSituation } from "@/lib/followup-playbook-labels";
import { SCRIPT_CATEGORY_LABELS, type Script, type ScriptCategory } from "@/lib/scripts-store";
import { cn } from "@/lib/utils";


/* ── Tipos de evento para scoring automático ──────────────── */
interface ScoringEvent {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  defaultPoints: number;
  category: "positivo" | "negativo" | "neutro";
}

const SCORING_EVENTS: ScoringEvent[] = [
  { id: "ev_wa_reply",    icon: MessageCircle, label: "Respondeu no WhatsApp",        description: "Lead respondeu uma mensagem",                    defaultPoints: 15, category: "positivo" },
  { id: "ev_email_open",  icon: Mail,          label: "Abriu e-mail de proposta",      description: "Lead abriu um e-mail enviado",                   defaultPoints: 10, category: "positivo" },
  { id: "ev_meeting_ok",  icon: UserCheck,     label: "Reunião confirmada",            description: "Lead confirmou uma reunião no calendário",        defaultPoints: 25, category: "positivo" },
  { id: "ev_form",        icon: MousePointer,  label: "Preencheu formulário",          description: "Lead enviou um formulário de captura",            defaultPoints: 20, category: "positivo" },
  { id: "ev_referral",    icon: Star,          label: "Origem: Indicação",             description: "Lead veio por indicação de cliente",              defaultPoints: 20, category: "positivo" },
  { id: "ev_page_visit",  icon: MousePointer,  label: "Visitou página de planos",      description: "Lead acessou a página de preços",                 defaultPoints: 12, category: "positivo" },
  { id: "ev_purchase",    icon: TrendingUp,    label: "Realizou compra",               description: "Lead comprou um produto ou assinou plano",        defaultPoints: 50, category: "positivo" },
  { id: "ev_noshow",      icon: Clock,         label: "No-show em reunião",            description: "Lead não compareceu a uma reunião agendada",     defaultPoints: -20, category: "negativo" },
  { id: "ev_no_reply14",  icon: TrendingDown,  label: "Sem resposta há 14 dias",       description: "Lead não interagiu nos últimos 14 dias",          defaultPoints: -10, category: "negativo" },
  { id: "ev_unsubscribe", icon: TrendingDown,  label: "Descadastrou de e-mails",       description: "Lead cancelou inscrição em lista de e-mail",     defaultPoints: -15, category: "negativo" },
];

/* ── Construtor de formulários ─────────────────────────────── */
interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "select" | "textarea";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface FormDef {
  id: string;
  name: string;
  fields: FormField[];
  leads: number;
}

const INITIAL_FORMS: FormDef[] = [
  {
    id: "f1", name: "Captura — Landing Black Friday", leads: 128,
    fields: [
      { id: "ff1", type: "text",  label: "Nome completo", placeholder: "Seu nome", required: true },
      { id: "ff2", type: "email", label: "E-mail",        placeholder: "seu@email.com", required: true },
      { id: "ff3", type: "phone", label: "WhatsApp",      placeholder: "(11) 99999-9999", required: true },
      { id: "ff4", type: "select", label: "Interesse", required: false, options: ["Inglês", "Espanhol", "Francês", "Outro"] },
    ],
  },
  {
    id: "f2", name: "Contato do site", leads: 76,
    fields: [
      { id: "ff5", type: "text",     label: "Nome",     required: true },
      { id: "ff6", type: "email",    label: "E-mail",   required: true },
      { id: "ff7", type: "textarea", label: "Mensagem", required: false },
    ],
  },
  {
    id: "f3", name: "Webinar — Inscrição", leads: 213,
    fields: [
      { id: "ff8",  type: "text",   label: "Nome completo", required: true },
      { id: "ff9",  type: "email",  label: "E-mail",        required: true },
      { id: "ff10", type: "phone",  label: "WhatsApp",      required: true },
      { id: "ff11", type: "select", label: "Como nos conheceu", required: false, options: ["Instagram", "WhatsApp", "Google", "Indicação"] },
      { id: "ff12", type: "textarea", label: "Expectativa do webinar", required: false },
    ],
  },
];

const FIELD_TYPE_LABELS: Record<FormField["type"], string> = {
  text: "Texto", email: "E-mail", phone: "Telefone", select: "Seleção", textarea: "Área de texto",
};

/* ── Rótulos e opções dos gatilhos/ações estruturados do motor real ── */
const TRIGGER_TYPE_LABELS: Record<Exclude<AutomationTrigger["type"], "legacy">, string> = {
  deal_won: "Negócio ganho",
  deal_stage_changed: "Negócio mudou de etapa",
  contact_created: "Novo lead / contato criado",
  deal_stale: "Sem atividade há N dias",
};
const ACTION_TYPE_LABELS: Record<Exclude<AutomationAction["type"], "legacy">, string> = {
  schedule_meeting: "Agendar reunião no Google Calendar + Meet",
  move_deal_stage: "Mover negócio de etapa",
  send_whatsapp: "Enviar WhatsApp (via SDR)",
  send_email: "Enviar e-mail (Remarketing)",
  add_tag: "Adicionar tag",
  add_score: "Adicionar pontos de score",
};

function describeTrigger(t: AutomationTrigger, pipelines: { id: string; name: string; stages: { id: string; name: string }[] }[]): string {
  switch (t.type) {
    case "deal_won": return "Negócio ganho";
    case "deal_stage_changed": {
      const p = pipelines.find((p) => p.id === t.pipelineId);
      const s = p?.stages.find((s) => s.id === t.stageId);
      return `Entrou em "${s?.name ?? t.stageId}"${p ? ` (${p.name})` : ""}`;
    }
    case "contact_created": return "Novo lead criado";
    case "deal_stale": return `Sem atividade há ${t.days} dias`;
    case "legacy": return t.label;
  }
}
function describeAction(a: AutomationAction, pipelines: { id: string; name: string; stages: { id: string; name: string }[] }[], scripts: Script[]): string {
  switch (a.type) {
    case "schedule_meeting": return `Agendar reunião (${a.durationMinutes} min) no Google Calendar`;
    case "move_deal_stage": {
      const p = pipelines.find((p) => p.id === a.pipelineId);
      const s = p?.stages.find((s) => s.id === a.stageId);
      return `Mover para "${s?.name ?? a.stageId}"`;
    }
    case "send_whatsapp": return `Enviar WhatsApp: ${scripts.find((s) => s.id === a.scriptId)?.title ?? "script"}`;
    case "send_email": return `Enviar e-mail: ${scripts.find((s) => s.id === a.scriptId)?.title ?? "script"}`;
    case "add_tag": return `Adicionar tag "${a.tag}"`;
    case "add_score": return `${a.points >= 0 ? "+" : ""}${a.points} pontos de score`;
    case "legacy": return a.label;
  }
}

/* ── Dialog de automação (criar / editar) — motor real, gatilho/ação estruturados ── */
function AutomationDialog({
  initial,
  open,
  onOpenChange,
  onSave,
}: {
  initial?: Automation | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (a: { name: string; trigger: AutomationTrigger; action: AutomationAction }) => void;
}) {
  const pipelines = useStore((s) => s.pipelines);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [triggerType, setTriggerType] = useState<AutomationTrigger["type"]>(
    initial && initial.trigger.type !== "legacy" ? initial.trigger.type : "deal_won"
  );
  const [actionType, setActionType] = useState<AutomationAction["type"]>(
    initial && initial.action.type !== "legacy" ? initial.action.type : "move_deal_stage"
  );

  useEffect(() => {
    if (open) fetch("/api/scripts").then((r) => r.json()).then(setScripts).catch(() => setScripts([]));
  }, [open]);

  const t0 = initial?.trigger;
  const a0 = initial?.action;
  const defaultPipeline = pipelines[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar automação" : "Nova automação"}</DialogTitle>
          <DialogDescription>Motor real: quando o gatilho acontece, a ação é executada automaticamente.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4 max-h-[65vh] overflow-y-auto pr-1"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const name = String(f.get("name"));

            let trigger: AutomationTrigger;
            if (triggerType === "deal_stage_changed") {
              trigger = { type: "deal_stage_changed", pipelineId: String(f.get("trigger_pipelineId")), stageId: String(f.get("trigger_stageId")) };
            } else if (triggerType === "deal_stale") {
              trigger = { type: "deal_stale", days: Number(f.get("trigger_days")) || 7 };
            } else {
              trigger = { type: triggerType } as AutomationTrigger;
            }

            let action: AutomationAction;
            if (actionType === "move_deal_stage") {
              action = { type: "move_deal_stage", pipelineId: String(f.get("action_pipelineId")), stageId: String(f.get("action_stageId")) };
            } else if (actionType === "schedule_meeting") {
              action = { type: "schedule_meeting", durationMinutes: Number(f.get("action_duration")) || 30, title: String(f.get("action_title") || "Reunião — {{primeiroNome}}") };
            } else if (actionType === "send_whatsapp") {
              action = { type: "send_whatsapp", scriptId: String(f.get("action_scriptId")) };
            } else if (actionType === "send_email") {
              action = { type: "send_email", scriptId: String(f.get("action_scriptId")) };
            } else if (actionType === "add_tag") {
              action = { type: "add_tag", tag: String(f.get("action_tag") || "") };
            } else {
              action = { type: "add_score", points: Number(f.get("action_points")) || 10 };
            }

            onSave({ name, trigger, action });
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input name="name" required placeholder="Ex: Agendar onboarding ao ganhar negócio" defaultValue={initial?.name} />
          </div>

          <div className="space-y-1.5 rounded-lg border border-border p-3">
            <Label>Quando (gatilho)</Label>
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as AutomationTrigger["type"])}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(Object.keys(TRIGGER_TYPE_LABELS) as (keyof typeof TRIGGER_TYPE_LABELS)[]).map((t) => (
                <option key={t} value={t}>{TRIGGER_TYPE_LABELS[t]}</option>
              ))}
            </select>

            {triggerType === "deal_stage_changed" && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <select name="trigger_pipelineId" defaultValue={t0?.type === "deal_stage_changed" ? t0.pipelineId : defaultPipeline?.id} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select name="trigger_stageId" defaultValue={t0?.type === "deal_stage_changed" ? t0.stageId : defaultPipeline?.stages[0]?.id} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                  {(pipelines.find((p) => p.id === (t0?.type === "deal_stage_changed" ? t0.pipelineId : defaultPipeline?.id))?.stages ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            {triggerType === "deal_stale" && (
              <Input name="trigger_days" type="number" min={1} defaultValue={t0?.type === "deal_stale" ? t0.days : 7} placeholder="Dias sem atividade" className="h-9" />
            )}
          </div>

          <div className="space-y-1.5 rounded-lg border border-border p-3">
            <Label>Então (ação)</Label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as AutomationAction["type"])}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(Object.keys(ACTION_TYPE_LABELS) as (keyof typeof ACTION_TYPE_LABELS)[]).map((a) => (
                <option key={a} value={a}>{ACTION_TYPE_LABELS[a]}</option>
              ))}
            </select>

            {actionType === "move_deal_stage" && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <select name="action_pipelineId" defaultValue={a0?.type === "move_deal_stage" ? a0.pipelineId : defaultPipeline?.id} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select name="action_stageId" defaultValue={a0?.type === "move_deal_stage" ? a0.stageId : defaultPipeline?.stages[0]?.id} className="h-9 rounded-md border border-input bg-background px-2 text-xs">
                  {(pipelines.find((p) => p.id === (a0?.type === "move_deal_stage" ? a0.pipelineId : defaultPipeline?.id))?.stages ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            {actionType === "schedule_meeting" && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Input name="action_title" placeholder="Título — use {{primeiroNome}}" defaultValue={a0?.type === "schedule_meeting" ? a0.title : "Reunião — {{primeiroNome}}"} className="h-9" />
                <Input name="action_duration" type="number" min={15} step={15} placeholder="Minutos" defaultValue={a0?.type === "schedule_meeting" ? a0.durationMinutes : 30} className="h-9" />
              </div>
            )}
            {(actionType === "send_whatsapp" || actionType === "send_email") && (
              <select name="action_scriptId" defaultValue={(a0?.type === "send_whatsapp" || a0?.type === "send_email") ? a0.scriptId : scripts[0]?.id} className="h-9 w-full rounded-md border border-input bg-background px-2 text-xs">
                {scripts.length === 0 && <option value="">Nenhum script na biblioteca — crie um na aba Playbook</option>}
                {scripts.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            )}
            {actionType === "add_tag" && (
              <Input name="action_tag" placeholder="Ex: onboarding-agendado" defaultValue={a0?.type === "add_tag" ? a0.tag : ""} className="h-9" />
            )}
            {actionType === "add_score" && (
              <Input name="action_points" type="number" placeholder="Pontos (negativo para subtrair)" defaultValue={a0?.type === "add_score" ? a0.points : 10} className="h-9" />
            )}
          </div>

          <Button type="submit" className="w-full">{initial ? "Salvar alterações" : "Criar automação"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Dialog de regra de scoring ────────────────────────────── */
function ScoringRuleDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (r: { label: string; points: number }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova regra de pontuação</DialogTitle>
          <DialogDescription>Defina como cada comportamento afeta o score do lead.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onSave({ label: String(f.get("label")), points: Number(f.get("points") || 0) });
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input name="label" required placeholder="Ex: Visitou a página de planos" />
          </div>
          <div className="space-y-1.5">
            <Label>Pontos (use negativo para subtrair)</Label>
            <Input name="points" type="number" required defaultValue="10" />
          </div>
          <Button type="submit" className="w-full">Adicionar regra</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Editor de formulário ──────────────────────────────────── */
function FormEditorDialog({
  form,
  open,
  onOpenChange,
  onSave,
}: {
  form: FormDef | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (f: FormDef) => void;
}) {
  const [name, setName]     = useState(form?.name ?? "Novo formulário");
  const [fields, setFields] = useState<FormField[]>(form?.fields ?? []);

  function addField() {
    setFields((prev) => [
      ...prev,
      { id: `ff_${Date.now()}`, type: "text", label: "Novo campo", required: false },
    ]);
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form ? "Editar formulário" : "Novo formulário"}</DialogTitle>
          <DialogDescription>Configure os campos e conecte ao seu funil.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label>Nome do formulário</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Captura Landing Page" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Campos</Label>
              <Button type="button" variant="outline" size="sm" onClick={addField}>
                <Plus className="size-3.5" /> Adicionar campo
              </Button>
            </div>

            {fields.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhum campo ainda. Clique em "Adicionar campo".</p>
            )}

            {fields.map((field) => (
              <div key={field.id} className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    placeholder="Nome do campo"
                    className="flex-1 h-8 text-sm"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, { type: e.target.value as FormField["type"] })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {(Object.keys(FIELD_TYPE_LABELS) as FormField["type"][]).map((t) => (
                      <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                      className="accent-primary"
                    />
                    Obrigatório
                  </label>
                  <button onClick={() => removeField(field.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="size-3.5" />
                  </button>
                </div>
                {field.type === "select" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Opções (uma por linha)</Label>
                    <textarea
                      value={(field.options ?? []).join("\n")}
                      onChange={(e) => updateField(field.id, { options: e.target.value.split("\n").filter(Boolean) })}
                      rows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs resize-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder={"Opção 1\nOpção 2\nOpção 3"}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <Button
            className="w-full"
            onClick={() => {
              onSave({
                id: form?.id ?? `form_${Date.now()}`,
                name,
                fields,
                leads: form?.leads ?? 0,
              });
              onOpenChange(false);
            }}
          >
            {form ? "Salvar alterações" : "Criar formulário"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── View principal ────────────────────────────────────────── */
export function AutomationsView() {
  const hydrated = useHydrated();
  const { automations, scoringRules, pipelines, addAutomation, updateAutomation, toggleAutomation, deleteAutomation, updateDeal, addScoringRule, deleteScoringRule } = useStore();
  const [autoScripts, setAutoScripts] = useState<Script[]>([]);
  useEffect(() => { fetch("/api/scripts").then((r) => r.json()).then(setAutoScripts).catch(() => setAutoScripts([])); }, []);

  // Automações
  const [autoDialog, setAutoDialog]     = useState(false);
  const [editingAuto, setEditingAuto]   = useState<Automation | null>(null);

  // Scoring
  const [scoreDialog, setScoreDialog]   = useState(false);
  const [eventPoints, setEventPoints]   = useState<Record<string, number>>(
    Object.fromEntries(SCORING_EVENTS.map((e) => [e.id, e.defaultPoints]))
  );

  // Formulários
  const [forms, setForms]               = useState<FormDef[]>(INITIAL_FORMS);
  const [formDialog, setFormDialog]     = useState(false);
  const [editingForm, setEditingForm]   = useState<FormDef | null>(null);

  function handleSaveAuto(data: { name: string; trigger: AutomationTrigger; action: AutomationAction }) {
    if (editingAuto) {
      updateAutomation(editingAuto.id, data);
      toast.success("Automação atualizada!");
    } else {
      addAutomation(data);
      toast.success("Automação criada!");
    }
    setEditingAuto(null);
  }

  function handleSaveForm(f: FormDef) {
    setForms((prev) => {
      const idx = prev.findIndex((x) => x.id === f.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = f;
        return next;
      }
      return [...prev, f];
    });
    toast.success(editingForm ? "Formulário atualizado!" : "Formulário criado!");
    setEditingForm(null);
  }

  return (
    <Tabs defaultValue="automations">
      <TabsList>
        <TabsTrigger value="automations">Automações</TabsTrigger>
        <TabsTrigger value="followups">Follow-up</TabsTrigger>
        <TabsTrigger value="playbook-followups">Playbook</TabsTrigger>
        <TabsTrigger value="scoring">Lead Scoring</TabsTrigger>
        <TabsTrigger value="forms">Formulários</TabsTrigger>
      </TabsList>

      {/* ── Automações ─────────────────────────────────────── */}
      <TabsContent value="automations">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Fluxos que trabalham por você 24/7.</p>
          <Button size="sm" onClick={() => { setEditingAuto(null); setAutoDialog(true); }}>
            <Plus className="size-4" /> Nova automação
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {hydrated && automations.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <Zap className="size-4.5" />
                  </span>
                  <div className="flex items-center gap-1">
                    <Switch checked={a.active} onCheckedChange={() => toggleAutomation(a.id)} />
                    <Button
                      variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"
                      onClick={() => { setEditingAuto(a); setAutoDialog(true); }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => { if (confirm(`Excluir "${a.name}"?`)) deleteAutomation(a.id); }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 font-display font-semibold">{a.name}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">{describeTrigger(a.trigger, pipelines)}</Badge>
                  <ArrowRight className="size-3" />
                  <Badge variant="outline">{describeAction(a.action, pipelines, autoScripts)}</Badge>
                  {(a.trigger.type === "legacy" || a.action.type === "legacy") && (
                    <Badge variant="outline" className="text-[10px] opacity-70">não executa (formato antigo)</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* ── Follow-up automático ──────────────────────────────── */}
      <TabsContent value="followups">
        <FollowupEditor />
      </TabsContent>

      {/* ── Playbook: follow-up por situação + biblioteca de scripts ── */}
      <TabsContent value="playbook-followups">
        <PlaybookLibrary />
      </TabsContent>

      {/* ── Lead Scoring ───────────────────────────────────── */}
      <TabsContent value="scoring">
        <div className="space-y-6">
          {/* Eventos automáticos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Pontuação automática por evento
              </CardTitle>
              <p className="text-sm text-muted-foreground">O score é calculado automaticamente conforme o comportamento do lead. Ajuste os pontos de cada evento.</p>
            </CardHeader>
            <CardContent className="space-y-1">
              {(["positivo", "negativo"] as const).map((cat) => (
                <div key={cat} className="mb-4">
                  <p className={cn(
                    "mb-2 text-xs font-semibold uppercase tracking-wide",
                    cat === "positivo" ? "text-green-400" : "text-red-400"
                  )}>
                    {cat === "positivo" ? "Eventos positivos" : "Eventos negativos"}
                  </p>
                  <div className="space-y-1.5">
                    {SCORING_EVENTS.filter((e) => e.category === cat).map((ev) => {
                      const Icon = ev.icon;
                      const pts  = eventPoints[ev.id] ?? ev.defaultPoints;
                      return (
                        <div key={ev.id} className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5">
                          <Icon className="size-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{ev.label}</p>
                            <p className="text-xs text-muted-foreground">{ev.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={pts}
                              onChange={(e) => setEventPoints((prev) => ({ ...prev, [ev.id]: Number(e.target.value) }))}
                              className={cn(
                                "w-16 rounded-md border px-2 py-1 text-center text-sm font-bold bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                pts >= 0 ? "border-green-500/40 text-green-400" : "border-red-500/40 text-red-400"
                              )}
                            />
                            <span className="text-xs text-muted-foreground">pts</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              <Button
                className="mt-2 w-full"
                onClick={() => toast.success("Regras de scoring salvas! Os scores serão recalculados automaticamente.")}
              >
                Salvar configuração de scoring
              </Button>
            </CardContent>
          </Card>

          {/* Regras manuais customizadas */}
          <Card>
            <CardHeader>
              <CardTitle>Regras customizadas</CardTitle>
              <p className="text-sm text-muted-foreground">Adicione regras específicas do seu negócio.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {hydrated && scoringRules.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <span className="text-sm">{r.label}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.points >= 0 ? "success" : "destructive"}>
                      {r.points >= 0 ? `+${r.points}` : r.points} pts
                    </Badge>
                    <Button
                      variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteScoringRule(r.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setScoreDialog(true)}>
                <Plus className="size-4" /> Nova regra customizada
              </Button>
            </CardContent>
          </Card>

          {/* Faixas de classificação */}
          <Card>
            <CardHeader><CardTitle>Classificação de leads por score</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Quente",   range: "75 – 100", color: "bg-red-500/20 text-red-400 border-red-500/30",    desc: "Prioridade máxima — contatar imediatamente" },
                { label: "Morno",    range: "40 – 74",  color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", desc: "Em qualificação — nutrir com conteúdo" },
                { label: "Frio",     range: "10 – 39",  color: "bg-blue-500/20 text-blue-400 border-blue-500/30",  desc: "Lead novo — iniciar sequência automática" },
                { label: "Inativo",  range: "< 10",     color: "bg-secondary/50 text-muted-foreground border-border", desc: "Sem interação — reativar ou arquivar" },
              ].map((tier) => (
                <div key={tier.label} className={cn("flex items-center justify-between rounded-lg border px-4 py-3", tier.color)}>
                  <div>
                    <p className="text-sm font-semibold">{tier.label}</p>
                    <p className="text-xs opacity-80">{tier.desc}</p>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">{tier.range}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ── Formulários ────────────────────────────────────── */}
      <TabsContent value="forms">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Formulários de captura conectados ao seu funil.</p>
          <Button size="sm" onClick={() => { setEditingForm(null); setFormDialog(true); }}>
            <Plus className="size-4" /> Novo formulário
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => (
            <Card key={f.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <Webhook className="size-4.5" />
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"
                      onClick={() => { setEditingForm(f); setFormDialog(true); }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => { if (confirm(`Excluir "${f.name}"?`)) setForms((prev) => prev.filter((x) => x.id !== f.id)); }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="mt-3 font-display font-semibold">{f.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{f.fields.length} campo{f.fields.length !== 1 ? "s" : ""}</p>
                <p className="mt-3 text-sm">
                  <strong className="text-primary">{f.leads}</strong> leads capturados
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { setEditingForm(f); setFormDialog(true); }}>
                    <Pencil className="size-3" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => toast.success("Link do formulário copiado!")}>
                    Copiar link
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* Dialogs */}
      <AutomationDialog
        open={autoDialog}
        onOpenChange={(o) => { setAutoDialog(o); if (!o) setEditingAuto(null); }}
        initial={editingAuto ?? undefined}
        onSave={handleSaveAuto}
      />

      <ScoringRuleDialog
        open={scoreDialog}
        onOpenChange={setScoreDialog}
        onSave={(r) => { addScoringRule(r); toast.success("Regra adicionada!"); }}
      />

      <FormEditorDialog
        form={editingForm}
        open={formDialog}
        onOpenChange={(o) => { setFormDialog(o); if (!o) setEditingForm(null); }}
        onSave={handleSaveForm}
      />
    </Tabs>
  );
}

/* ── Editor de Follow-up automático ───────────────────────── */
interface FollowupTemplateUI {
  step: number;
  channel: "whatsapp" | "email";
  message: string;
  subject?: string;
}

interface FollowupRunResult {
  ok: boolean;
  processed: number;
  results: { dealId: string; contact: string; step: number; action: string }[];
}

function FollowupEditor() {
  const [templates, setTemplates] = useState<FollowupTemplateUI[] | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<FollowupRunResult | null>(null);

  useEffect(() => {
    fetch("/api/followup-templates")
      .then((r) => r.json())
      .then((data) => setTemplates(data))
      .catch(() => setTemplates([]));
  }, []);

  function updateLocal(step: number, patch: Partial<FollowupTemplateUI>) {
    setTemplates((prev) => prev?.map((t) => (t.step === step ? { ...t, ...patch } : t)) ?? prev);
  }

  async function save(t: FollowupTemplateUI) {
    setSaving(t.step);
    try {
      const res = await fetch("/api/followup-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t),
      });
      if (res.ok) toast.success(`Follow-up ${t.step} salvo!`);
      else toast.error("Erro ao salvar template.");
    } catch {
      toast.error("Falha de conexão ao salvar.");
    } finally {
      setSaving(null);
    }
  }

  async function runNow() {
    setRunning(true);
    setLastRun(null);
    try {
      const res = await fetch("/api/cron/followups");
      const data = await res.json();
      if (res.ok) {
        setLastRun(data);
        toast.success(data.processed > 0 ? `${data.processed} lead${data.processed > 1 ? "s" : ""} processado${data.processed > 1 ? "s" : ""}!` : "Nenhum lead pendente de follow-up hoje.");
      } else {
        toast.error(data.error ?? "Erro ao disparar follow-ups.");
      }
    } catch {
      toast.error("Falha de conexão ao disparar follow-ups.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Repeat className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-semibold">Como funciona</p>
              <p className="mt-1 text-muted-foreground">
                Leads parados nas etapas <strong>Follow-up 1 a 5</strong> do funil de vendas recebem a mensagem da etapa atual quando você clica em disparar (recomendado: 1x por dia).
                Se o lead não respondeu desde o último disparo, ele avança para a próxima etapa.
                No Follow-up 5, se ainda não houver resposta, o lead é descartado automaticamente.
                Se o lead responder a qualquer momento, ele volta direto para a etapa de <strong>Qualificação</strong>.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Nomeie as etapas do seu funil exatamente como <code className="rounded bg-white/10 px-1">Follow-up 1</code>, <code className="rounded bg-white/10 px-1">Follow-up 2</code> … <code className="rounded bg-white/10 px-1">Follow-up 5</code> para o sistema reconhecê-las.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-4">
            <Button onClick={runNow} disabled={running} className="gap-1.5">
              {running ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              {running ? "Disparando..." : "Disparar follow-ups de hoje"}
            </Button>
            {lastRun && (
              <p className="text-xs text-muted-foreground">
                Último disparo: <strong className="text-foreground">{lastRun.processed}</strong> lead{lastRun.processed !== 1 ? "s" : ""} processado{lastRun.processed !== 1 ? "s" : ""}.
              </p>
            )}
          </div>
          {lastRun && lastRun.results.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-border/60 pt-3">
              {lastRun.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{r.contact}</span>
                  <span className="text-muted-foreground">Follow-up {r.step} → {r.action}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {templates === null && (
        <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      )}

      {templates?.map((t) => (
        <Card key={t.step}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{t.step}</Badge> Follow-up {t.step}
              </CardTitle>
              <select
                value={t.channel}
                onChange={(e) => updateLocal(t.step, { channel: e.target.value as "whatsapp" | "email" })}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
              </select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {t.channel === "email" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Assunto do e-mail</Label>
                <Input
                  value={t.subject ?? ""}
                  onChange={(e) => updateLocal(t.step, { subject: e.target.value })}
                  placeholder="Assunto do e-mail"
                  className="h-9"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Mensagem — use <code className="rounded bg-white/10 px-1">{"{{primeiroNome}}"}</code> para personalizar</Label>
              <textarea
                value={t.message}
                onChange={(e) => updateLocal(t.step, { message: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-input bg-background/50 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
              />
            </div>
            <Button size="sm" onClick={() => save(t)} disabled={saving === t.step} className="gap-1.5">
              {saving === t.step ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Salvar Follow-up {t.step}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Editor dos 7 follow-ups por situação — Playbook Comercial Be Fluent v3 (7.2 / 7.3) ── */
interface PlaybookTemplateUI {
  situationKey: FollowupSituation;
  channel: "whatsapp" | "email";
  message: string;
  dayOffset: number;
  suggestedTime: string;
  active: boolean;
}

interface PlaybookRunResult {
  ok: boolean;
  processed: number;
  results: { dealId: string; contact: string; situation: string; label: string; action: string }[];
}

function PlaybookFollowupEditor() {
  const [templates, setTemplates] = useState<PlaybookTemplateUI[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<PlaybookRunResult | null>(null);

  useEffect(() => {
    fetch("/api/playbook-followups")
      .then((r) => r.json())
      .then((data) => setTemplates(data))
      .catch(() => setTemplates([]));
  }, []);

  function updateLocal(key: string, patch: Partial<PlaybookTemplateUI>) {
    setTemplates((prev) => prev?.map((t) => (t.situationKey === key ? { ...t, ...patch } : t)) ?? prev);
  }

  async function save(t: PlaybookTemplateUI) {
    setSaving(t.situationKey);
    try {
      const res = await fetch("/api/playbook-followups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t),
      });
      if (res.ok) toast.success("Modelo salvo!");
      else toast.error("Erro ao salvar modelo.");
    } catch {
      toast.error("Falha de conexão ao salvar.");
    } finally {
      setSaving(null);
    }
  }

  async function runNow() {
    setRunning(true);
    setLastRun(null);
    try {
      const res = await fetch("/api/cron/playbook-followups");
      const data = await res.json();
      if (res.ok) {
        setLastRun(data);
        toast.success(
          data.processed > 0
            ? `${data.processed} follow-up${data.processed > 1 ? "s" : ""} sugerido${data.processed > 1 ? "s" : ""} (tarefa criada com o script).`
            : "Nenhum lead com gatilho de follow-up hoje."
        );
      } else {
        toast.error(data.error ?? "Erro ao gerar follow-ups.");
      }
    } catch {
      toast.error("Falha de conexão ao gerar follow-ups.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-semibold">Como funciona</p>
              <p className="mt-1 text-muted-foreground">
                São os <strong>7 modelos oficiais por situação</strong> do Playbook (Seção 7.2), disparados por
                <strong> gatilho de situação</strong> — não por número de tentativa. Ex.: &quot;Proposta enviada&quot; parada há
                D+1 sem atividade → modelo &quot;Lead sumiu depois da proposta&quot;. O calendário D+1/D+3/D+5/D+8/D+15/D+30-60
                é a Seção 7.3. Este sistema é <strong>paralelo</strong> à aba &quot;Follow-up&quot; (5 templates sequenciais), que
                continua funcionando.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Ao gerar, o sistema cria uma <strong>tarefa no negócio</strong> com o script pronto e a data de hoje —
                não envia mensagem automática (sem canal de WhatsApp conectado nesta fase).
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-4">
            <Button onClick={runNow} disabled={running} className="gap-1.5">
              {running ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              {running ? "Gerando..." : "Gerar follow-ups sugeridos do dia"}
            </Button>
            {lastRun && (
              <p className="text-xs text-muted-foreground">
                Último: <strong className="text-foreground">{lastRun.processed}</strong> follow-up{lastRun.processed !== 1 ? "s" : ""} sugerido{lastRun.processed !== 1 ? "s" : ""}.
              </p>
            )}
          </div>
          {lastRun && lastRun.results.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-border/60 pt-3">
              {lastRun.results.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{r.contact || r.dealId}</span>
                  <span className="text-muted-foreground">{r.label} → {r.action}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {templates === null && (
        <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      )}

      {templates
        ?.slice()
        .sort((a, b) => a.dayOffset - b.dayOffset)
        .map((t) => (
          <Card key={t.situationKey} className={cn(!t.active && "opacity-60")}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">D+{t.dayOffset}</Badge>
                  {SITUATION_LABELS[t.situationKey]}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch checked={t.active} onCheckedChange={(v) => updateLocal(t.situationKey, { active: v })} />
                    Ativo
                  </label>
                  <select
                    value={t.channel}
                    onChange={(e) => updateLocal(t.situationKey, { channel: e.target.value as "whatsapp" | "email" })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Dia após o gatilho (D+N)</Label>
                  <Input
                    type="number" min={1}
                    value={t.dayOffset}
                    onChange={(e) => updateLocal(t.situationKey, { dayOffset: Number(e.target.value) || 1 })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Horário sugerido</Label>
                  <Input
                    type="time"
                    value={t.suggestedTime}
                    onChange={(e) => updateLocal(t.situationKey, { suggestedTime: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Script — use <code className="rounded bg-white/10 px-1">{"{{primeiroNome}}"}</code>, <code className="rounded bg-white/10 px-1">{"{{dia}}"}</code>, <code className="rounded bg-white/10 px-1">{"{{mes}}"}</code></Label>
                <textarea
                  value={t.message}
                  onChange={(e) => updateLocal(t.situationKey, { message: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background/50 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
                />
              </div>
              <Button size="sm" onClick={() => save(t)} disabled={saving === t.situationKey} className="gap-1.5">
                {saving === t.situationKey ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Salvar modelo
              </Button>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

/* ── Biblioteca de Playbook — follow-up + scripts livres por categoria ── */

const SCRIPT_CATEGORY_ICONS: Record<ScriptCategory, React.ComponentType<{ className?: string }>> = {
  followup:    Repeat,
  remarketing: Megaphone,
  reativacao:  FlameIcon,
  objecao:     ShieldQuestion,
  fechamento:  Handshake,
  vendas:      BookOpen,
};

const CHANNEL_LABELS: Record<Script["channel"], string> = {
  whatsapp: "WhatsApp",
  email:    "E-mail",
  call:     "Ligação",
};

const CHANNEL_ICONS: Record<Script["channel"], React.ComponentType<{ className?: string }>> = {
  whatsapp: MessageCircle,
  email:    Mail,
  call:     Phone,
};

function ScriptDialog({
  script,
  defaultCategory,
  open,
  onOpenChange,
  onSave,
}: {
  script: Script | null;
  defaultCategory: ScriptCategory;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (data: { category: ScriptCategory; title: string; channel: Script["channel"]; body: string }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{script ? "Editar script" : "Novo script"}</DialogTitle>
          <DialogDescription>Fica salvo na biblioteca do Playbook para toda a equipe consultar e usar.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onSave({
              category: (String(f.get("category")) || defaultCategory) as ScriptCategory,
              title: String(f.get("title") || "").trim(),
              channel: String(f.get("channel")) as Script["channel"],
              body: String(f.get("body") || ""),
            });
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input name="title" required defaultValue={script?.title ?? ""} placeholder="Ex: Objeção de preço — reformula valor" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <select
                name="category"
                defaultValue={script?.category ?? defaultCategory}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
              >
                {(Object.keys(SCRIPT_CATEGORY_LABELS) as ScriptCategory[]).map((c) => (
                  <option key={c} value={c}>{SCRIPT_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Canal</Label>
              <select
                name="channel"
                defaultValue={script?.channel ?? "whatsapp"}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
                <option value="call">Ligação</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>
              Script — use <code className="rounded bg-white/10 px-1">{"{{primeiroNome}}"}</code>,{" "}
              <code className="rounded bg-white/10 px-1">{"{{dia}}"}</code>,{" "}
              <code className="rounded bg-white/10 px-1">{"{{mes}}"}</code> para personalizar
            </Label>
            <textarea
              name="body"
              required
              defaultValue={script?.body ?? ""}
              rows={5}
              className="w-full rounded-lg border border-input bg-background/50 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
            />
          </div>
          <Button type="submit" className="w-full">{script ? "Salvar alterações" : "Criar script"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PlaybookLibrary() {
  const [scripts, setScripts] = useState<Script[] | null>(null);
  const [category, setCategory] = useState<ScriptCategory | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);

  function loadScripts() {
    fetch("/api/scripts")
      .then((r) => r.json())
      .then((data) => setScripts(data))
      .catch(() => setScripts([]));
  }

  useEffect(loadScripts, []);

  async function handleSave(data: { category: ScriptCategory; title: string; channel: Script["channel"]; body: string }) {
    try {
      const res = await fetch("/api/scripts", {
        method: editingScript ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingScript ? { id: editingScript.id, ...data } : data),
      });
      if (res.ok) {
        toast.success(editingScript ? "Script atualizado!" : "Script criado!");
        loadScripts();
      } else {
        toast.error("Erro ao salvar script.");
      }
    } catch {
      toast.error("Falha de conexão ao salvar script.");
    } finally {
      setEditingScript(null);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Excluir o script "${title}"?`)) return;
    try {
      const res = await fetch(`/api/scripts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Script excluído.");
        setScripts((prev) => prev?.filter((s) => s.id !== id) ?? prev);
      } else {
        toast.error("Erro ao excluir script.");
      }
    } catch {
      toast.error("Falha de conexão ao excluir script.");
    }
  }

  function copyToClipboard(body: string) {
    navigator.clipboard.writeText(body).then(
      () => toast.success("Script copiado — cole na conversa."),
      () => toast.error("Não foi possível copiar.")
    );
  }

  const filtered = category === "all" ? scripts ?? [] : (scripts ?? []).filter((s) => s.category === category);
  const grouped = new Map<ScriptCategory, Script[]>();
  for (const s of filtered) {
    grouped.set(s.category, [...(grouped.get(s.category) ?? []), s]);
  }

  return (
    <div className="space-y-6">
      {/* Follow-up por situação (7 modelos oficiais, gatilho automático) */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Repeat className="size-4 text-primary" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wide">Follow-up por situação</h3>
          <Badge variant="outline" className="text-[10px]">disparo automático</Badge>
        </div>
        <PlaybookFollowupEditor />
      </div>

      {/* Biblioteca livre de scripts — reativação, objeção, fechamento, vendas, remarketing */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <h3 className="font-display text-sm font-bold uppercase tracking-wide">Biblioteca de scripts</h3>
            <Badge variant="outline" className="text-[10px]">consulta manual</Badge>
          </div>
          <Button
            size="sm"
            onClick={() => { setEditingScript(null); setDialogOpen(true); }}
          >
            <Plus className="size-4" /> Novo script
          </Button>
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategory("all")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              category === "all" ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-white/[0.05]"
            )}
          >
            Todas
          </button>
          {(Object.keys(SCRIPT_CATEGORY_LABELS) as ScriptCategory[])
            .filter((c) => c !== "followup")
            .map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  category === c ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:bg-white/[0.05]"
                )}
              >
                {SCRIPT_CATEGORY_LABELS[c]}
              </button>
            ))}
        </div>

        {scripts === null ? (
          <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhum script nessa categoria ainda.</p>
        ) : (
          <div className="space-y-5">
            {[...grouped.entries()].map(([cat, list]) => {
              const CatIcon = SCRIPT_CATEGORY_ICONS[cat];
              return (
                <div key={cat}>
                  {category === "all" && (
                    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <CatIcon className="size-3.5" /> {SCRIPT_CATEGORY_LABELS[cat]}
                    </div>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    {list.map((s) => {
                      const ChIcon = CHANNEL_ICONS[s.channel];
                      return (
                        <Card key={s.id} className={cn(!s.active && "opacity-60")}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <ChIcon className="size-3.5" /> {CHANNEL_LABELS[s.channel]}
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-primary"
                                  onClick={() => copyToClipboard(s.body)}
                                  title="Copiar script"
                                >
                                  <Copy className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-primary"
                                  onClick={() => { setEditingScript(s); setDialogOpen(true); }}
                                  title="Editar"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDelete(s.id, s.title)}
                                  title="Excluir"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </div>
                            <p className="mt-2 text-sm font-semibold">{s.title}</p>
                            <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground line-clamp-4">{s.body}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ScriptDialog
        script={editingScript}
        defaultCategory={category === "all" ? "vendas" : category}
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingScript(null); }}
        onSave={handleSave}
      />
    </div>
  );
}
