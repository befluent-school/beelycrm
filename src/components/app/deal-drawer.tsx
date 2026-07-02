"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useStore, type Deal } from "@/lib/store";
import { formatCurrency, formatDate, initials, cn } from "@/lib/utils";
import { Trophy, XCircle, Phone, Mail, MessageCircle, Plus, Check, Clock, X, Save } from "lucide-react";

export function DealDrawer({ dealId, onClose }: { dealId: string | null; onClose: () => void }) {
  const deal = useStore((s) => s.deals.find((d) => d.id === dealId)) ?? null;
  if (!deal) return <Sheet open={false} onOpenChange={(o) => !o && onClose()} />;
  return <DealDrawerInner key={deal.id} deal={deal} onClose={onClose} />;
}

function DealDrawerInner({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const { pipelines, contacts, activities, winDeal, loseDeal, updateDeal, addActivity, toggleActivity } = useStore();
  const [lossMode, setLossMode] = useState(false);
  const [form, setForm] = useState({ title: deal.title, value: deal.value, contact: deal.contact, owner: deal.owner, stageId: deal.stageId });
  const [tags, setTags] = useState<string[]>(deal.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const pipeline = pipelines.find((p) => p.id === deal.pipelineId);
  const stage = pipeline?.stages.find((s) => s.id === deal.stageId);
  const linkedContact = contacts.find((c) => c.name === deal.contact);

  const dealActivities = activities.filter((a) => a.dealId === deal.id || a.contact === deal.contact);
  const isClosed = deal.status !== "open";

  function save() {
    updateDeal(deal.id, {
      title: form.title,
      value: Number(form.value),
      contact: form.contact,
      owner: form.owner,
      stageId: form.stageId,
      tags,
    });
    toast.success("Negócio atualizado.");
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-xl p-0">
        {/* Header */}
        <div className="border-b border-border/70 p-5">
          <div className="flex items-center gap-2 pr-8">
            <StatusBadge deal={deal} />
            {stage && <Badge variant="outline" className="font-medium">{stage.name}</Badge>}
            {pipeline && <span className="text-xs text-muted-foreground">· {pipeline.name}</span>}
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="-ml-2 mt-2 w-full rounded-md border border-transparent bg-transparent px-2 py-1 font-display text-xl font-bold outline-none transition-colors hover:border-border focus:border-primary/50 focus:bg-background/40"
          />
          <div className="-ml-2 mt-1 flex items-baseline gap-2 px-2">
            <span className="font-display text-2xl font-extrabold text-primary text-glow">{formatCurrency(Number(form.value) || 0)}</span>
            <input
              type="number"
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
              className="h-7 w-28 rounded-md border border-border bg-background/40 px-2 text-xs outline-none focus:border-primary/50"
            />
          </div>
        </div>

        {/* Big actions (Oktto-style) */}
        {!isClosed && (
          <div className="grid grid-cols-2 gap-2 border-b border-border/70 p-4">
            {!lossMode ? (
              <>
                <Button onClick={() => { winDeal(deal.id); toast.success("Venda registrada! 🎉"); }}>
                  <Trophy className="size-4" /> Registrar venda
                </Button>
                <Button variant="outline" onClick={() => setLossMode(true)}>
                  <XCircle className="size-4" /> Descartar lead
                </Button>
              </>
            ) : (
              <form
                className="col-span-2 space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const reason = String(new FormData(e.currentTarget).get("reason") || "Sem motivo");
                  loseDeal(deal.id, reason);
                  setLossMode(false);
                  toast("Negócio marcado como perdido.");
                }}
              >
                <Input name="reason" placeholder="Motivo da perda (ex: preço, concorrente, sem fit)" autoFocus />
                <div className="flex gap-2">
                  <Button type="submit" variant="destructive" size="sm" className="flex-1">Confirmar perda</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLossMode(false)}>Cancelar</Button>
                </div>
              </form>
            )}
          </div>
        )}
        {deal.status === "lost" && deal.lostReason && (
          <div className="border-b border-border/70 bg-destructive/10 p-4 text-sm text-destructive">
            Perdido — motivo: {deal.lostReason}
          </div>
        )}
        {deal.status === "won" && (
          <div className="border-b border-border/70 bg-success/10 p-4 text-sm text-success">
            Negócio ganho — {formatCurrency(deal.value)} 🎉
          </div>
        )}

        {/* Quick contact actions */}
        <div className="grid grid-cols-3 gap-2 border-b border-border/70 p-4">
          <QuickAction icon={Phone} label="Ligar" href={linkedContact?.phone ? `tel:${linkedContact.phone}` : undefined} />
          <QuickAction icon={Mail} label="E-mail" href={linkedContact?.email ? `mailto:${linkedContact.email}` : undefined} />
          <QuickAction icon={MessageCircle} label="WhatsApp" href={linkedContact?.phone ? `https://wa.me/${linkedContact.phone.replace(/\D/g, "")}` : undefined} accent />
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-y-auto p-5">
          <Tabs defaultValue="detalhes">
            <TabsList className="w-full">
              <TabsTrigger value="detalhes" className="flex-1">Detalhes</TabsTrigger>
              <TabsTrigger value="tarefas" className="flex-1">Tarefas</TabsTrigger>
              <TabsTrigger value="notas" className="flex-1">Anotações</TabsTrigger>
              <TabsTrigger value="historico" className="flex-1">Histórico</TabsTrigger>
            </TabsList>

            {/* Detalhes */}
            <TabsContent value="detalhes" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Contato</Label><Input value={form.contact} onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Responsável</Label><Input value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} /></div>
              </div>
              <div className="space-y-1.5">
                <Label>Etapa</Label>
                <select
                  value={form.stageId}
                  onChange={(e) => setForm((f) => ({ ...f, stageId: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {pipeline?.stages.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.probability}%</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label>Etiquetas</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {t}
                      <button type="button" onClick={() => setTags((arr) => arr.filter((x) => x !== t))}><X className="size-3" /></button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const v = tagInput.trim(); if (v && !tags.includes(v)) setTags((arr) => [...arr, v]); setTagInput(""); } }}
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

              <Button onClick={save} className="w-full"><Save className="size-4" /> Salvar alterações</Button>
            </TabsContent>

            {/* Tarefas */}
            <TabsContent value="tarefas" className="space-y-2">
              {dealActivities.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa ainda.</p>}
              {dealActivities.map((a) => (
                <button key={a.id} onClick={() => toggleActivity(a.id)} className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-white/[0.04]">
                  <span className={`flex size-5 items-center justify-center rounded border ${a.done ? "border-success bg-success/20 text-success" : "border-border"}`}>
                    {a.done && <Check className="size-3" />}
                  </span>
                  <span className={`flex-1 text-sm ${a.done ? "text-muted-foreground line-through" : ""}`}>{a.title}</span>
                  <span className="text-xs text-muted-foreground">{a.due}</span>
                </button>
              ))}
              <form
                className="flex gap-2 pt-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.elements.namedItem("t") as HTMLInputElement;
                  if (!input.value.trim()) return;
                  addActivity({ type: "task", title: input.value, due: "Hoje", contact: deal.contact, dealId: deal.id });
                  input.value = "";
                  toast.success("Tarefa adicionada.");
                }}
              >
                <Input name="t" placeholder="Nova tarefa..." className="h-9" />
                <Button type="submit" size="icon" className="size-9 shrink-0"><Plus className="size-4" /></Button>
              </form>
            </TabsContent>

            {/* Notas */}
            <TabsContent value="notas">
              <textarea
                defaultValue={deal.notes ?? ""}
                onBlur={(e) => { updateDeal(deal.id, { notes: e.target.value }); toast("Anotação salva."); }}
                placeholder="Escreva anotações sobre este negócio... (salva ao sair do campo)"
                className="min-h-48 w-full rounded-lg border border-input bg-background/50 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </TabsContent>

            {/* Histórico */}
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
                  <li className="text-sm text-muted-foreground">Sem outras movimentações ainda.</li>
                )}
              </ol>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StatusBadge({ deal }: { deal: Deal }) {
  if (deal.status === "won") return <Badge variant="success">Ganho</Badge>;
  if (deal.status === "lost") return <Badge variant="destructive">Perdido</Badge>;
  return <Badge variant="warning">Aberto</Badge>;
}

function QuickAction({ icon: Icon, label, href, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; href?: string; accent?: boolean }) {
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
