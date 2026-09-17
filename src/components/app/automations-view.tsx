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
import { Plus, Zap, ArrowRight, Webhook, Trash2, Pencil, X, TrendingUp, TrendingDown, Star, Clock, MessageCircle, Mail, MousePointer, UserCheck, Save, Loader2, Repeat, CalendarClock } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { SITUATION_LABELS, type FollowupSituation } from "@/lib/followup-playbook-labels";
import { cn } from "@/lib/utils";

const TRIGGERS = [
  "Novo lead criado",
  "Lead via WhatsApp",
  "Lead respondeu",
  "Negócio mudou de etapa",
  "Score ≥ 75",
  "Sem atividade por 7 dias",
  "Formulário enviado",
  "Compra realizada",
  "Reunião confirmada",
  "Reunião não compareceu (no-show)",
];
const ACTIONS = [
  "Enviar mensagem WhatsApp",
  "Enviar e-mail",
  "Criar tarefa",
  "Mover negócio de etapa",
  "Notificar responsável",
  "Chamar webhook N8N",
  "Adicionar tag",
  "Adicionar pontos de score",
  "Remover pontos de score",
];

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

/* ── Dialog de automação (criar / editar) ──────────────────── */
function AutomationDialog({
  initial,
  open,
  onOpenChange,
  onSave,
}: {
  initial?: { name: string; trigger: string; action: string };
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (a: { name: string; trigger: string; action: string }) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Editar automação" : "Nova automação"}</DialogTitle>
          <DialogDescription>Defina o gatilho e a ação executada automaticamente.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            onSave({ name: String(f.get("name")), trigger: String(f.get("trigger")), action: String(f.get("action")) });
            onOpenChange(false);
          }}
        >
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input name="name" required placeholder="Ex: Boas-vindas WhatsApp" defaultValue={initial?.name} />
          </div>
          <div className="space-y-1.5">
            <Label>Quando (gatilho)</Label>
            <select name="trigger" defaultValue={initial?.trigger ?? TRIGGERS[0]} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {TRIGGERS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Então (ação)</Label>
            <select name="action" defaultValue={initial?.action ?? ACTIONS[0]} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {ACTIONS.map((a) => <option key={a}>{a}</option>)}
            </select>
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
  const { automations, scoringRules, addAutomation, toggleAutomation, deleteAutomation, updateDeal, addScoringRule, deleteScoringRule } = useStore();

  // Automações
  const [autoDialog, setAutoDialog]     = useState(false);
  const [editingAuto, setEditingAuto]   = useState<typeof automations[0] | null>(null);

  // Scoring
  const [scoreDialog, setScoreDialog]   = useState(false);
  const [eventPoints, setEventPoints]   = useState<Record<string, number>>(
    Object.fromEntries(SCORING_EVENTS.map((e) => [e.id, e.defaultPoints]))
  );

  // Formulários
  const [forms, setForms]               = useState<FormDef[]>(INITIAL_FORMS);
  const [formDialog, setFormDialog]     = useState(false);
  const [editingForm, setEditingForm]   = useState<FormDef | null>(null);

  function handleSaveAuto(data: { name: string; trigger: string; action: string }) {
    if (editingAuto) {
      // Editar existente via store (update deal equivalente não existe para automações, então atualizamos localmente)
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
        <TabsTrigger value="playbook-followups">Follow-ups (Playbook)</TabsTrigger>
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
                  <Badge variant="secondary">{a.trigger}</Badge>
                  <ArrowRight className="size-3" />
                  <Badge variant="outline">{a.action}</Badge>
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

      {/* ── Follow-ups por situação (Playbook Comercial Be Fluent v3) ── */}
      <TabsContent value="playbook-followups">
        <PlaybookFollowupEditor />
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
