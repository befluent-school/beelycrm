"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useStore, type Deal, type Contact, dealTemperature, isBantQualified } from "@/lib/store";
import { slaMinutes, formatMinutes } from "@/lib/sla";
import { formatCurrency, formatDate, initials, cn } from "@/lib/utils";
import { TransferLeadDialog } from "@/components/app/transfer-lead-dialog";
import {
  Trophy, XCircle, Phone, Mail, MessageCircle,
  Plus, Check, Clock, X, Save, Trash2, Flame, Thermometer, Snowflake,
  ArrowRightLeft, Timer, ShieldCheck, ShieldAlert, Ban, Calculator, UserCog,
} from "lucide-react";

/* ── Temperatura ────────────────────────────────────────────── */
const TEMP = {
  hot:  { icon: Flame,       label: "Quente", class: "text-orange-400" },
  warm: { icon: Thermometer, label: "Morno",  class: "text-yellow-400" },
  cold: { icon: Snowflake,   label: "Frio",   class: "text-blue-400"   },
} as const;

/* ── Score bar ──────────────────────────────────────────────── */
function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-green-400" : score >= 50 ? "bg-yellow-400" : score >= 25 ? "bg-orange-400" : "bg-blue-400";
  const label = score >= 75 ? "Muito quente" : score >= 50 ? "Quente" : score >= 25 ? "Morno" : "Frio";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Lead Score</span>
        <span className="font-semibold">{score}/100 — {label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${score}%` }} />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {score >= 75 ? "Prioridade máxima — acione agora." :
         score >= 50 ? "Engajado — mantenha contato ativo." :
         score >= 25 ? "Morno — nutrir antes de avançar." :
                       "Baixo engajamento — qualificar antes de investir tempo."}
      </p>
    </div>
  );
}

/* ── Etapa de progresso do lead (funil comercial) ───────────── */
const STAGE_WEIGHTS: Record<string, number> = {
  "novo lead": 5, "primeiro contato": 15, "qualificacao": 25, "proposta": 45,
  "negociacao": 65, "fechamento": 85, "follow up": 30, "banho-maria": 20,
  "banho maria": 20, "perdido": 0,
};
function stageProgress(stageName: string): number {
  const key = stageName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const [k, v] of Object.entries(STAGE_WEIGHTS)) {
    if (key.includes(k)) return v;
  }
  return 50;
}

export function DealDrawer({ dealId, onClose }: { dealId: string | null; onClose: () => void }) {
  const deal = useStore((s) => s.deals.find((d) => d.id === dealId)) ?? null;
  if (!deal) return <Sheet open={false} onOpenChange={(o) => !o && onClose()} />;
  return <DealDrawerInner key={deal.id} deal={deal} onClose={onClose} />;
}

function DealDrawerInner({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const {
    pipelines, contacts, activities,
    winDeal, winDealAndOnboard, loseDeal, updateDeal, deleteDeal,
    addActivity, updateActivity, deleteActivity, toggleActivity, updateContact,
  } = useStore();

  const [lossMode,  setLossMode]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [form, setForm] = useState({
    title:    deal.title,
    value:    deal.value,
    contact:  deal.contact,
    owner:    deal.owner,
    stageId:  deal.stageId,
    pipelineId: deal.pipelineId,
  });
  const [tags,     setTags]     = useState<string[]>(deal.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [newTask,  setNewTask]  = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [newNote,  setNewNote]  = useState("");

  const selectedPipeline = pipelines.find((p) => p.id === form.pipelineId) ?? pipelines[0];
  const stage            = selectedPipeline?.stages.find((s) => s.id === form.stageId);
  const linkedContact    = contacts.find((c) => c.name === deal.contact || c.id === deal.contactId);
  const dealActivities   = activities.filter((a) => a.dealId === deal.id || a.contact === deal.contact);
  const isClosed         = deal.status !== "open";
  const temp             = dealTemperature(deal);
  const TempIcon         = TEMP[temp].icon;
  const progress         = stage ? stageProgress(stage.name) : 50;

  // Detecta se há funil de onboarding
  const onboardingPipeline = pipelines.find((p) =>
    p.name.toLowerCase().includes("onboard") ||
    p.name.toLowerCase().includes("d1") ||
    p.name.toLowerCase().includes("pos-venda") ||
    p.name.toLowerCase().includes("pos")
  );

  function save() {
    updateDeal(deal.id, {
      title:      form.title,
      value:      Number(form.value),
      contact:    form.contact,
      owner:      form.owner,
      stageId:    form.stageId,
      pipelineId: form.pipelineId,
      tags,
    });
    toast.success("Negócio atualizado.");
  }

  function handleAddTask() {
    const title = newTask.trim();
    if (!title) return;
    const dueDate = newTaskDate || undefined;
    const dueTime = newTaskTime || undefined;
    const dueLabel = dueDate
      ? new Date(dueDate + "T12:00:00").toLocaleDateString("pt-BR") + (dueTime ? ` às ${dueTime}` : "")
      : "Sem prazo";
    addActivity({
      type: "task", title, due: dueLabel, dueDate, dueTime,
      contact: deal.contact, dealId: deal.id,
    });
    setNewTask(""); setNewTaskDate(""); setNewTaskTime("");
    toast.success("Tarefa adicionada.");
  }

  function handleAddNote() {
    const text = newNote.trim();
    if (!text) return;
    const existing = deal.notes ?? "";
    const timestamp = new Date().toLocaleString("pt-BR");
    updateDeal(deal.id, { notes: existing ? `${existing}\n\n[${timestamp}] ${text}` : `[${timestamp}] ${text}` });
    setNewNote("");
    toast("Anotação salva.");
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-xl overflow-y-auto p-0">
        {/* Header */}
        <div className="border-b border-border/70 p-5">
          <div className="flex items-center gap-2 pr-8">
            <StatusBadge deal={deal} />
            {stage && <Badge variant="outline" className="font-medium">{stage.name}</Badge>}
            {selectedPipeline && <span className="text-xs text-muted-foreground">· {selectedPipeline.name}</span>}
            <span className={cn("flex items-center gap-1 text-xs font-medium", TEMP[temp].class)}>
              <TempIcon className="size-3.5" /> {TEMP[temp].label}
            </span>
            <button
              onClick={() => setTransferOpen(true)}
              disabled={!linkedContact}
              className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground/60"
              title={linkedContact ? "Transferir para outro SDR" : "Vincule um contato para transferir"}
            >
              <UserCog className="size-3.5" /> Transferir
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Excluir lead permanentemente"
            >
              <Trash2 className="size-3.5" /> Excluir
            </button>
          </div>

          {confirmDelete && (
            <div className="mt-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <p className="text-xs text-destructive">
                Excluir <strong>{deal.title}</strong> permanentemente? Essa ação não pode ser desfeita.
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  type="button" variant="destructive" size="sm" className="flex-1"
                  onClick={() => { deleteDeal(deal.id); toast.success("Lead excluído."); onClose(); }}
                >
                  Confirmar exclusão
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="-ml-2 mt-2 w-full rounded-md border border-transparent bg-transparent px-2 py-1 font-display text-xl font-bold outline-none transition-colors hover:border-border focus:border-primary/50 focus:bg-background/40"
          />
          <div className="-ml-2 mt-1 flex items-baseline gap-2 px-2">
            <span className="font-display text-2xl font-extrabold text-primary">{formatCurrency(Number(form.value) || 0)}</span>
            <input
              type="number"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
              className="h-7 w-28 rounded-md border border-border bg-background/40 px-2 text-xs outline-none focus:border-primary/50"
            />
          </div>

          {/* Barra de progresso do lead */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Progresso no funil</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  progress === 0 ? "bg-red-400" :
                  progress < 25  ? "bg-blue-400" :
                  progress < 50  ? "bg-yellow-400" :
                  progress < 75  ? "bg-orange-400" : "bg-green-400"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Ações */}
        {!isClosed && (
          <div className="border-b border-border/70 p-4">
            {!lossMode ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {onboardingPipeline ? (
                    <Button onClick={() => {
                      winDealAndOnboard(deal.id);
                      toast.success("Venda registrada! Lead movido para onboarding D1.");
                      onClose();
                    }}>
                      <Trophy className="size-4" /> Registrar venda
                    </Button>
                  ) : (
                    <Button onClick={() => { winDeal(deal.id); toast.success("Venda registrada!"); onClose(); }}>
                      <Trophy className="size-4" /> Registrar venda
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setLossMode(true)}>
                    <XCircle className="size-4" /> Descartar lead
                  </Button>
                </div>
                {onboardingPipeline && (
                  <p className="text-center text-[10px] text-muted-foreground">
                    Ao registrar venda, o aluno sera movido para o funil <strong>{onboardingPipeline.name}</strong> na etapa D1.
                  </p>
                )}
              </div>
            ) : (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const reason = String(new FormData(e.currentTarget).get("reason") || "Sem motivo");
                  loseDeal(deal.id, reason);
                  setLossMode(false);
                  toast("Negócio marcado como perdido.");
                  onClose();
                }}
              >
                <Input name="reason" placeholder="Motivo (preço, concorrente, sem fit, sem resposta...)" autoFocus />
                <div className="flex gap-2">
                  <Button type="submit" variant="destructive" size="sm" className="flex-1">Confirmar descarte</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLossMode(false)}>Cancelar</Button>
                </div>
              </form>
            )}
          </div>
        )}

        {deal.status === "lost" && deal.lostReason && (
          <div className="border-b border-border/70 bg-destructive/10 p-4 text-sm text-destructive">
            Descartado — motivo: {deal.lostReason}
          </div>
        )}
        {deal.status === "won" && (
          <div className="border-b border-border/70 bg-success/10 p-4 text-sm text-success">
            Venda registrada — {formatCurrency(deal.value)}
          </div>
        )}

        {/* Quick contact */}
        <div className="grid grid-cols-3 gap-2 border-b border-border/70 p-4">
          <QuickAction icon={Phone}         label="Ligar"    href={linkedContact?.phone ? `tel:${linkedContact.phone}` : undefined} />
          <QuickAction icon={Mail}          label="E-mail"   href={linkedContact?.email ? `mailto:${linkedContact.email}` : undefined} />
          <QuickAction icon={MessageCircle} label="WhatsApp" href={linkedContact?.phone ? `https://wa.me/${linkedContact.phone.replace(/\D/g, "")}` : undefined} accent />
        </div>

        {/* Score do contato */}
        {linkedContact && (
          <div className="border-b border-border/70 px-5 py-3">
            <ScoreBar score={linkedContact.score} />
          </div>
        )}

        {/* Tabs */}
        <div className="p-5">
          <Tabs defaultValue="detalhes">
            <TabsList className="w-full">
              <TabsTrigger value="detalhes" className="flex-1">Detalhes</TabsTrigger>
              <TabsTrigger value="qualificacao" className="flex-1">Qualificação</TabsTrigger>
              <TabsTrigger value="tarefas"  className="flex-1">Tarefas</TabsTrigger>
              <TabsTrigger value="notas"    className="flex-1">Anotacoes</TabsTrigger>
              <TabsTrigger value="historico" className="flex-1">Histórico</TabsTrigger>
            </TabsList>

            {/* ── DETALHES ─────────────────────────────────────────── */}
            <TabsContent value="detalhes" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Contato</Label>
                  <Input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Responsável</Label>
                  <Input value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
                </div>
              </div>

              {/* Seletor de funil */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><ArrowRightLeft className="size-3.5" /> Funil</Label>
                <select
                  value={form.pipelineId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const pipe = pipelines.find((p) => p.id === pid);
                    setForm((f) => ({ ...f, pipelineId: pid, stageId: pipe?.stages[0]?.id ?? f.stageId }));
                  }}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Seletor de etapa */}
              <div className="space-y-1.5">
                <Label>Etapa</Label>
                <select
                  value={form.stageId}
                  onChange={(e) => setForm((f) => ({ ...f, stageId: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {selectedPipeline?.stages.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} · {s.probability}%</option>
                  ))}
                </select>
              </div>

              {/* Etiquetas */}
              <div className="space-y-1.5">
                <Label>Etiquetas</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {t}
                      <button type="button" onClick={() => setTags((a) => a.filter((x) => x !== t))}><X className="size-3" /></button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const v = tagInput.trim();
                        if (v && !tags.includes(v)) setTags((a) => [...a, v]);
                        setTagInput("");
                      }
                    }}
                    placeholder="+ etiqueta (Enter)"
                    className="h-7 rounded-full border border-dashed border-border bg-transparent px-2 text-xs outline-none focus-visible:border-primary/50"
                  />
                </div>
              </div>

              {linkedContact && (
                <div className="rounded-lg border border-border bg-white/[0.02] p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">{initials(linkedContact.name)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{linkedContact.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{linkedContact.company} · {linkedContact.email || linkedContact.phone}</p>
                    </div>
                    <Badge variant="outline">{linkedContact.source}</Badge>
                  </div>
                </div>
              )}

              <Button onClick={save} className="w-full"><Save className="size-4" /> Salvar alteracoes</Button>
            </TabsContent>

            {/* ── QUALIFICAÇÃO / DIAGNÓSTICO (Playbook Comercial Be Fluent v3) ── */}
            <TabsContent value="qualificacao" className="space-y-4">
              <QualificacaoPanel
                deal={deal}
                contact={linkedContact}
                onUpdateDeal={(patch) => updateDeal(deal.id, patch)}
                onUpdateContact={(patch) => { if (linkedContact) updateContact(linkedContact.id, patch); }}
              />
            </TabsContent>

            {/* ── TAREFAS ──────────────────────────────────────────── */}
            <TabsContent value="tarefas" className="space-y-2">
              {/* Formulário nova tarefa */}
              <div className="rounded-lg border border-border bg-white/[0.02] p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nova tarefa</p>
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddTask(); }}
                  placeholder="Título da tarefa..."
                  className="h-9"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hora</Label>
                    <Input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className="h-8 text-sm" />
                  </div>
                </div>
                <Button size="sm" className="w-full gap-1.5" onClick={handleAddTask} disabled={!newTask.trim()}>
                  <Plus className="size-3.5" /> Adicionar tarefa
                </Button>
              </div>

              {/* Lista de tarefas */}
              {dealActivities.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma tarefa ainda.</p>
              ) : (
                <div className="space-y-1.5">
                  {dealActivities.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-2 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-white/[0.03]"
                    >
                      <button
                        onClick={() => toggleActivity(a.id)}
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                          a.done ? "border-success bg-success/20 text-success" : "border-border"
                        )}
                      >
                        {a.done && <Check className="size-3" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm", a.done && "text-muted-foreground line-through")}>{a.title}</p>
                        {a.due && (
                          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="size-3" /> {a.due}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteActivity(a.id)}
                        className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
                        title="Excluir tarefa"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── ANOTAÇÕES ────────────────────────────────────────── */}
            <TabsContent value="notas" className="space-y-3">
              {/* Nova anotação */}
              <div className="rounded-lg border border-border bg-white/[0.02] p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nova anotação</p>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Digite uma anotação..."
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background/50 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
                />
                <Button size="sm" className="w-full gap-1.5" onClick={handleAddNote} disabled={!newNote.trim()}>
                  <Plus className="size-3.5" /> Salvar anotação
                </Button>
              </div>

              {/* Anotações existentes */}
              {deal.notes ? (
                <div className="space-y-2">
                  {deal.notes.split("\n\n").filter(Boolean).map((block, i) => (
                    <div key={i} className="relative rounded-lg border border-border bg-white/[0.02] p-3">
                      <p className="whitespace-pre-wrap text-sm">{block}</p>
                      <button
                        onClick={() => {
                          const lines = deal.notes!.split("\n\n").filter(Boolean);
                          lines.splice(i, 1);
                          updateDeal(deal.id, { notes: lines.join("\n\n") });
                          toast("Anotação removida.");
                        }}
                        className="absolute right-2 top-2 rounded p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">Nenhuma anotação ainda.</p>
              )}
            </TabsContent>

            {/* ── HISTÓRICO ────────────────────────────────────────── */}
            <TabsContent value="historico">
              <ol className="relative space-y-3 border-l border-border pl-5">
                <li className="relative">
                  <span className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-background bg-primary" />
                  <p className="text-sm">Negócio criado</p>
                  <p className="text-xs text-muted-foreground">{formatDate(deal.createdAt)}</p>
                </li>
                {(deal.history ?? []).map((h, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-[27px] top-1.5 size-3 rounded-full border-2 border-background bg-muted-foreground" />
                    <p className="text-sm">{h.text}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" /> {formatDate(h.ts)}</p>
                  </li>
                ))}
                {(deal.history ?? []).length === 0 && (
                  <li className="text-sm text-muted-foreground">Sem movimentações ainda.</li>
                )}
              </ol>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>

      <TransferLeadDialog
        contactId={linkedContact?.id ?? null}
        contactName={linkedContact?.name ?? deal.contact}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
    </Sheet>
  );
}

function StatusBadge({ deal }: { deal: Deal }) {
  if (deal.status === "won")  return <Badge variant="success">Ganho</Badge>;
  if (deal.status === "lost") return <Badge variant="destructive">Perdido</Badge>;
  return <Badge variant="warning">Aberto</Badge>;
}

/* ── Painel de Qualificação / Diagnóstico — Playbook Comercial Be Fluent v3 ── */
const COI_PLACEHOLDER =
  "Registre o número/conclusão que o LEAD articulou na reunião (Playbook 5.3):\n" +
  '1) "Quantas oportunidades você deixou passar nos últimos 12 meses?"\n' +
  '2) "Se continuar assim por 1 ano, o que isso te custa?"\n' +
  '3) "Comparado a esse número, o investimento parece caro ou pequeno?"\n' +
  '4) "Faz sentido resolver agora, ou seguir pagando esse custo?"';

function QualificacaoPanel({
  deal, contact, onUpdateDeal, onUpdateContact,
}: {
  deal: Deal;
  contact: Contact | undefined;
  onUpdateDeal: (patch: Partial<Deal>) => void;
  onUpdateContact: (patch: Partial<Contact>) => void;
}) {
  // BANT — fonte de verdade = contato; espelha no deal.bant.
  const bant = {
    budget:    contact?.bantBudget ?? deal.bant?.budget ?? false,
    authority: contact?.bantAuthority ?? deal.bant?.authority ?? false,
    need:      contact?.bantNeed ?? deal.bant?.need ?? false,
    timing:    contact?.bantTiming ?? deal.bant?.timing ?? false,
  };
  const [note, setNote] = useState(contact?.bantNote ?? "");
  const [coi, setCoi] = useState(deal.costOfInactionNote ?? "");
  const refusalCount = deal.refusalCount ?? contact?.refusalCount ?? 0;

  const total = [bant.budget, bant.authority, bant.need, bant.timing].filter(Boolean).length;
  const qualified = isBantQualified({
    bantBudget: bant.budget, bantAuthority: bant.authority, bantNeed: bant.need, bantTiming: bant.timing,
  });
  const missingCore = !bant.budget || !bant.need;

  function toggleBant(key: keyof typeof bant) {
    const next = { ...bant, [key]: !bant[key] };
    onUpdateContact({
      bantBudget: next.budget, bantAuthority: next.authority, bantNeed: next.need, bantTiming: next.timing,
    });
    onUpdateDeal({ bant: next });
  }

  function saveNote() {
    onUpdateContact({ bantNote: note });
    toast.success("Qualificação salva.");
  }
  function saveCoi() {
    onUpdateDeal({ costOfInactionNote: coi });
    toast.success("Cost of Inaction salvo.");
  }
  function addRefusal() {
    const next = refusalCount + 1;
    onUpdateDeal({ refusalCount: next });
    onUpdateContact({ refusalCount: next });
    toast(next >= 2 ? "2ª recusa — parar de insistir (Playbook 6.4)." : "1ª recusa registrada.");
  }
  function resetRefusal() {
    onUpdateDeal({ refusalCount: 0 });
    onUpdateContact({ refusalCount: 0 });
  }

  const sla = slaMinutes(deal);

  const BantRow = ({ k, label, hint, core }: { k: keyof typeof bant; label: string; hint: string; core?: boolean }) => (
    <button
      type="button"
      onClick={() => toggleBant(k)}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        bant[k] ? "border-green-500/40 bg-green-500/[0.06]" : "border-border hover:bg-white/[0.03]"
      )}
    >
      <span className={cn(
        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
        bant[k] ? "border-green-500 bg-green-500/20 text-green-400" : "border-border"
      )}>
        {bant[k] && <Check className="size-3" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-sm font-medium">
          {label} {core && <span className="text-[10px] font-semibold text-primary">· inegociável</span>}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );

  return (
    <div className="space-y-5">
      {/* BANT 3-de-4 (Playbook 3.5) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qualificação BANT — regra 3-de-4</p>
          {qualified ? (
            <Badge variant="success" className="gap-1"><ShieldCheck className="size-3" /> Qualificado {total}/4</Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-muted-foreground"><ShieldAlert className="size-3" /> {total}/4</Badge>
          )}
        </div>
        <BantRow k="budget"    label="Budget"    core hint="Investimento compatível (R$357–1.697/mês) — perguntar SEMPRE depois da Implicação" />
        <BantRow k="need"      label="Need"      core hint="Dor genuína, já tentou resolver antes (coberto pelo SPIN)" />
        <BantRow k="authority" label="Authority" hint="Decisão individual ou compartilhada (RH, gestor, cônjuge)" />
        <BantRow k="timing"    label="Timing"    hint="Prazo real (viagem, entrevista, promoção)" />
        {!qualified && missingCore && (
          <p className="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
            Sem Budget e Need não há reunião de diagnóstico a marcar — só nutrição (Playbook 3.5).
          </p>
        )}
        <div className="space-y-1.5 pt-1">
          <Label className="text-xs">Contexto da qualificação</Label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Ex.: decide com a esposa; prazo = entrevista em março; orçamento até R$600/mês"
            className="w-full rounded-lg border border-input bg-background/50 p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
          />
          <Button size="sm" variant="outline" onClick={saveNote} className="gap-1.5"><Save className="size-3.5" /> Salvar contexto</Button>
        </div>
      </div>

      {/* Cost of Inaction (Playbook 5.3) */}
      <div className="space-y-1.5 border-t border-border/60 pt-4">
        <Label className="flex items-center gap-1.5 text-xs"><Calculator className="size-3.5 text-primary" /> Cost of Inaction — o número que o lead articulou</Label>
        <textarea
          value={coi}
          onChange={(e) => setCoi(e.target.value)}
          rows={4}
          placeholder={COI_PLACEHOLDER}
          className="w-full rounded-lg border border-input bg-background/50 p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
        />
        <Button size="sm" variant="outline" onClick={saveCoi} className="gap-1.5"><Save className="size-3.5" /> Salvar Cost of Inaction</Button>
        <p className="text-[10px] text-muted-foreground">Retomar este número na proposta (5.4) e nos follow-ups.</p>
      </div>

      {/* Avenida do Não (Playbook 6.4) */}
      <div className="space-y-2 border-t border-border/60 pt-4">
        <Label className="flex items-center gap-1.5 text-xs"><Ban className="size-3.5 text-red-400" /> Avenida do Não — recusas do lead</Label>
        <div className="flex items-center gap-3">
          <span className={cn(
            "flex size-9 items-center justify-center rounded-lg font-display text-lg font-bold",
            refusalCount === 0 ? "bg-secondary text-muted-foreground" :
            refusalCount === 1 ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"
          )}>{refusalCount}</span>
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">
            {refusalCount === 0 && "Nenhuma recusa registrada."}
            {refusalCount === 1 && "1ª recusa: fazer 1 pergunta de aprofundamento. Nunca insistir em fechamento na mesma mensagem."}
            {refusalCount >= 2 && "2ª recusa: PARAR de insistir. Só mensagem de encerramento + reativação distante (Follow 3). Nunca questionar a decisão."}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addRefusal} className="gap-1.5"><Plus className="size-3.5" /> +1 recusa</Button>
          {refusalCount > 0 && <Button size="sm" variant="ghost" onClick={resetRefusal}>Zerar</Button>}
        </div>
      </div>

      {/* SLA de resposta (Playbook 2) */}
      <div className="space-y-2 border-t border-border/60 pt-4">
        <Label className="flex items-center gap-1.5 text-xs"><Timer className="size-3.5 text-primary" /> SLA de resposta (meta: 4 min)</Label>
        {sla !== null ? (
          <p className={cn("text-sm font-semibold", sla <= 4 ? "text-green-400" : "text-red-400")}>
            1º contato em {formatMinutes(sla)} {sla <= 4 ? "· dentro da meta" : "· acima da meta de 4 min"}
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">1º contato humano ainda não registrado.</p>
            <Button
              size="sm"
              onClick={() => { onUpdateDeal({ slaRespondedAt: new Date().toISOString() }); toast.success("1º contato marcado agora."); }}
            >
              Marcar 1º contato agora
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, accent }: {
  icon: React.ComponentType<{ className?: string }>; label: string; href?: string; accent?: boolean;
}) {
  const inner = (
    <span className={cn(
      "flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs font-medium transition-colors",
      href ? "hover:border-primary/40 hover:text-primary" : "cursor-not-allowed opacity-40",
      accent && "border-success/40 text-success hover:bg-success/10"
    )}>
      <Icon className="size-4" /> {label}
    </span>
  );
  if (!href) return inner;
  return <a href={href} target="_blank" rel="noreferrer">{inner}</a>;
}
