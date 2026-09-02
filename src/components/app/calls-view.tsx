"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  PhoneCall, Plus, Play, Save, Loader2, Trash2, AlertCircle, Bot, Clock, DollarSign,
} from "lucide-react";
import { AudiencePicker } from "@/components/app/audience-picker";
import { filterContacts, type AudienceFilter } from "@/lib/audience";
import { useStore, useHydrated } from "@/lib/store";

interface AssistantConfig {
  systemPrompt?: string;
  firstMessage?: string;
  voice?: string;
  model?: string;
  language?: string;
}
interface CallCampaign {
  id: string;
  name: string;
  provider: "vapi" | "twilio";
  assistantConfig: AssistantConfig;
  audienceFilter: AudienceFilter;
  status: "draft" | "scheduled" | "running" | "paused" | "done";
  stats: { dialed: number; answered: number; completed: number; failed: number; totalCostCents: number; totalDurationSec: number };
  createdAt: string;
}
interface CallLog {
  id: string;
  campaignId?: string | null;
  contactId?: string | null;
  provider: string;
  toNumber: string;
  status: string;
  durationSec: number;
  costCents: number;
  recordingUrl?: string | null;
  transcript: { role: string; text: string; at?: number }[];
  summary?: string | null;
  endedReason?: string | null;
  createdAt: string;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

const fmtDuration = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;
const fmtCost = (cents: number) => `US$ ${(cents / 100).toFixed(2)}`;

export function CallsView() {
  const hydrated = useHydrated();
  const contacts = useStore((s) => s.contacts);

  const [campaigns, setCampaigns] = useState<CallCampaign[]>([]);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [vapiConfigured, setVapiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const [c, l] = await Promise.all([
        api<{ campaigns: CallCampaign[]; vapiConfigured: boolean }>("/api/calls/campaigns"),
        api<CallLog[]>("/api/calls/logs"),
      ]);
      setCampaigns(c.campaigns);
      setVapiConfigured(c.vapiConfigured);
      setLogs(l);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar ligações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  if (!hydrated || loading) {
    return <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-3 sm:p-6">
      {!vapiConfigured && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Vapi não configurado. Defina <code className="rounded bg-white/10 px-1">VAPI_PRIVATE_KEY</code> e{" "}
          <code className="rounded bg-white/10 px-1">VAPI_PHONE_NUMBER_ID</code> (passo a passo em Integrações {">"} Vapi).
        </div>
      )}

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campanhas de ligação</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignsTab campaigns={campaigns} contacts={contacts} canDial={vapiConfigured} onChange={reload} />
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab logs={logs} onRefresh={reload} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Campanhas ─────────────────────────────────────────────── */
function CampaignsTab({
  campaigns, contacts, canDial, onChange,
}: {
  campaigns: CallCampaign[];
  contacts: ReturnType<typeof useStore.getState>["contacts"];
  canDial: boolean;
  onChange: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CallCampaign | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  async function handleStart(c: CallCampaign) {
    const recipients = filterContacts(contacts, { ...c.audienceFilter, requirePhone: true })
      .map((ct) => ({ contactId: ct.id, name: ct.name, phone: ct.phone }));
    if (recipients.length === 0) return toast.error("Nenhum contato com telefone no filtro selecionado.");
    if (!confirm(`Disparar ${recipients.length} ligação(ões) com IA agora?`)) return;

    setStartingId(c.id);
    try {
      const r = await api<{ started: number; failed: number; provider: string }>(
        `/api/calls/campaigns/${c.id}/start`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipients }) }
      );
      toast.success(`${r.started} ligação(ões) iniciada(s) via ${r.provider}, ${r.failed} falha(s).`);
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao disparar.");
    } finally {
      setStartingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta campanha de ligação?")) return;
    await api(`/api/calls/campaigns/${id}`, { method: "DELETE" });
    toast.success("Campanha excluída.");
    onChange();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Cada campanha tem seu próprio agente de IA e público-alvo.</p>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="size-4" /> Nova campanha
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma campanha de ligação ainda.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => {
            const answerRate = c.stats.dialed > 0 ? Math.round((c.stats.answered / c.stats.dialed) * 100) : 0;
            const avgDur = c.stats.completed > 0 ? Math.round(c.stats.totalDurationSec / c.stats.completed) : 0;
            return (
              <Card key={c.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                      <PhoneCall className="size-4.5" />
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge variant={c.status === "running" ? "success" : "secondary"}>{c.status}</Badge>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"
                        onClick={() => { setEditing(c); setDialogOpen(true); }}>
                        <Bot className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(c.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 font-display font-semibold">{c.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Provedor: {c.provider}</p>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                    <MiniStat label="Discadas" value={c.stats.dialed} />
                    <MiniStat label="Atend." value={`${answerRate}%`} />
                    <MiniStat label="Dur. méd." value={avgDur > 0 ? fmtDuration(avgDur) : "—"} />
                    <MiniStat label="Custo" value={fmtCost(c.stats.totalCostCents)} />
                  </div>
                  <Button size="sm" className="mt-4 w-full text-xs" disabled={startingId === c.id || !canDial}
                    onClick={() => handleStart(c)}>
                    {startingId === c.id ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                    Disparar ligações
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CampaignDialog open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSaved={onChange} />
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border py-2">
      <p className="font-display text-xs font-bold">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

function CampaignDialog({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: CallCampaign | null;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CampaignDialogBody key={initial?.id ?? "new"} initial={initial} onOpenChange={onOpenChange} onSaved={onSaved} />
      )}
    </Dialog>
  );
}

function CampaignDialogBody({
  initial, onOpenChange, onSaved,
}: {
  initial: CallCampaign | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [firstMessage, setFirstMessage] = useState(initial?.assistantConfig?.firstMessage ?? "");
  const [systemPrompt, setSystemPrompt] = useState(initial?.assistantConfig?.systemPrompt ?? "");
  const [voice, setVoice] = useState(initial?.assistantConfig?.voice ?? "");
  const [language, setLanguage] = useState(initial?.assistantConfig?.language ?? "pt-BR");
  const [filter, setFilter] = useState<AudienceFilter>(initial?.audienceFilter ?? {});
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Dê um nome à campanha.");
    setSaving(true);
    try {
      const method = initial ? "PATCH" : "POST";
      const url = initial ? `/api/calls/campaigns/${initial.id}` : "/api/calls/campaigns";
      await api(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          provider: "vapi",
          assistantConfig: { firstMessage, systemPrompt, voice: voice || undefined, language },
          audienceFilter: filter,
        }),
      });
      toast.success(initial ? "Campanha atualizada." : "Campanha criada.");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initial ? "Editar campanha" : "Nova campanha de ligação"}</DialogTitle>
        <DialogDescription>Configure o agente de IA e o público-alvo.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Confirmação de reunião — semana" />
        </div>
        <div className="space-y-1.5">
          <Label>Primeira frase do agente</Label>
          <Input value={firstMessage} onChange={(e) => setFirstMessage(e.target.value)}
            placeholder="Olá, aqui é da Be Fluent. Tudo bem?" />
        </div>
        <div className="space-y-1.5">
          <Label>System prompt (comportamento do agente)</Label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-input bg-background/50 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
            placeholder="Você é um SDR da Be Fluent. Seu objetivo é confirmar o interesse do lead e agendar uma conversa..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Voz (id do provedor)</Label>
            <Input value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="ex.: voice id 11labs" className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Idioma</Label>
            <Input value={language} onChange={(e) => setLanguage(e.target.value)} className="h-9" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Público-alvo</Label>
          <AudiencePicker value={filter} onChange={setFilter} channel="phone" />
        </div>
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {initial ? "Salvar alterações" : "Criar campanha"}
        </Button>
      </div>
    </DialogContent>
  );
}

/* ── Histórico ────────────────────────────────────────────── */
function HistoryTab({ logs, onRefresh }: { logs: CallLog[]; onRefresh: () => void }) {
  const [open, setOpen] = useState<CallLog | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Ligações realizadas, transcrição e resumo gerado pela IA.</p>
        <Button size="sm" variant="outline" onClick={onRefresh}>Atualizar</Button>
      </div>

      {logs.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma ligação registrada ainda.</p>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {logs.map((l) => (
              <button
                key={l.id}
                onClick={() => setOpen(l)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <PhoneCall className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.toNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(l.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="size-3" />{fmtDuration(l.durationSec)}</span>
                  <span className="flex items-center gap-1"><DollarSign className="size-3" />{fmtCost(l.costCents)}</span>
                  <Badge variant={l.status === "completed" ? "success" : l.status === "failed" ? "destructive" : "secondary"}>
                    {l.status}
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Sheet open={!!open} onOpenChange={(o) => { if (!o) setOpen(null); }}>
        <SheetContent className="w-full max-w-md overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Ligação — {open?.toNumber}</SheetTitle>
          </SheetHeader>
          {open && (
            <div className="mt-4 space-y-4 px-1">
              <div className="grid grid-cols-3 gap-2 text-center">
                <MiniStat label="Status" value={open.status} />
                <MiniStat label="Duração" value={fmtDuration(open.durationSec)} />
                <MiniStat label="Custo" value={fmtCost(open.costCents)} />
              </div>

              {open.recordingUrl && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Gravação</Label>
                  <audio controls src={open.recordingUrl} className="w-full" />
                </div>
              )}

              {open.summary && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Resumo (IA)</Label>
                  <p className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">{open.summary}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Transcrição</Label>
                {open.transcript.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Transcrição ainda não disponível.</p>
                ) : (
                  <div className="space-y-2">
                    {open.transcript.map((m, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-semibold text-primary">{m.role === "assistant" || m.role === "bot" ? "Agente" : m.role === "user" ? "Cliente" : m.role}: </span>
                        <span className="text-muted-foreground">{m.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {open.endedReason && (
                <p className="text-xs text-muted-foreground">Motivo do encerramento: {open.endedReason}</p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
