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
import {
  Mail, Plus, Send, Save, Loader2, Trash2, CheckCircle2, AlertCircle, ExternalLink, BarChart3,
} from "lucide-react";
import { AudiencePicker } from "@/components/app/audience-picker";
import { filterContacts, type AudienceFilter } from "@/lib/audience";
import { useStore, useHydrated } from "@/lib/store";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  createdAt: string;
}
interface EmailCampaign {
  id: string;
  name: string;
  templateId?: string | null;
  status: "draft" | "scheduled" | "running" | "paused" | "done";
  audienceFilter: AudienceFilter;
  stats: { sent: number; opened: number; clicked: number; bounced: number; failed: number };
  createdAt: string;
}
interface AccountInfo {
  account: {
    provider: string; fromEmail: string; fromName?: string; status: string;
    connected: boolean; lastError?: string | null; connectedAt?: string | null;
  } | null;
  canConnectGmail: boolean;
  resendConfigured: boolean;
  defaultFromEmail: string;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

export function RemarketingView() {
  const hydrated = useHydrated();
  const contacts = useStore((s) => s.contacts);

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    try {
      const [acc, tpls, camps] = await Promise.all([
        api<AccountInfo>("/api/remarketing/account"),
        api<EmailTemplate[]>("/api/remarketing/templates"),
        api<EmailCampaign[]>("/api/remarketing/campaigns"),
      ]);
      setAccount(acc);
      setTemplates(tpls);
      setCampaigns(camps);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar remarketing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // Feedback do retorno do OAuth do Gmail
    const q = new URLSearchParams(window.location.search);
    if (q.get("gmail") === "conectado") toast.success("Gmail conectado. Já é possível enviar campanhas.");
    if (q.get("gmail") === "erro") toast.error(`Não foi possível conectar o Gmail: ${q.get("detail") ?? "erro"}`);
    if (q.has("gmail")) window.history.replaceState({}, "", "/remarketing");
  }, []);

  if (!hydrated || loading) {
    return <div className="flex justify-center py-16"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="p-3 sm:p-6">
      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="account">Conta de envio</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignsTab
            campaigns={campaigns}
            templates={templates}
            contacts={contacts}
            accountConnected={!!account?.account?.connected || !!account?.resendConfigured}
            onChange={reload}
          />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesTab templates={templates} onChange={reload} />
        </TabsContent>

        <TabsContent value="account">
          <AccountTab info={account} onChange={reload} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Campanhas ─────────────────────────────────────────────── */
function CampaignsTab({
  campaigns, templates, contacts, accountConnected, onChange,
}: {
  campaigns: EmailCampaign[];
  templates: EmailTemplate[];
  contacts: ReturnType<typeof useStore.getState>["contacts"];
  accountConnected: boolean;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<EmailCampaign | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  async function handleSend(c: EmailCampaign, test: boolean) {
    if (!c.templateId) return toast.error("Associe um template à campanha antes de enviar.");
    const recipients = filterContacts(contacts, { ...c.audienceFilter, requireEmail: true })
      .map((ct) => ({ contactId: ct.id, name: ct.name, email: ct.email }));
    const list = test ? recipients.slice(0, 1) : recipients;
    if (list.length === 0) return toast.error("Nenhum contato com e-mail no filtro selecionado.");

    setSendingId(c.id);
    try {
      const r = await api<{ sent: number; failed: number; provider: string }>(
        `/api/remarketing/campaigns/${c.id}/send`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipients: list, test }) }
      );
      toast.success(`${test ? "Teste enviado" : "Campanha enviada"} via ${r.provider}: ${r.sent} ok, ${r.failed} falha(s).`);
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no envio.");
    } finally {
      setSendingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta campanha?")) return;
    await api(`/api/remarketing/campaigns/${id}`, { method: "DELETE" });
    toast.success("Campanha excluída.");
    onChange();
  }

  return (
    <div className="space-y-4">
      {!accountConnected && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Conecte a conta de envio (aba Conta de envio) para disparar campanhas.
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Campanhas de e-mail de remarketing para a base do CRM.</p>
        <Button size="sm" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="size-4" /> Nova campanha
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma campanha ainda.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => {
            const tpl = templates.find((t) => t.id === c.templateId);
            const openRate = c.stats.sent > 0 ? Math.round((c.stats.opened / c.stats.sent) * 100) : 0;
            const clickRate = c.stats.sent > 0 ? Math.round((c.stats.clicked / c.stats.sent) * 100) : 0;
            return (
              <Card key={c.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                      <Mail className="size-4.5" />
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge variant={c.status === "done" ? "success" : "secondary"}>{c.status}</Badge>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-primary"
                        onClick={() => { setEditing(c); setDialogOpen(true); }}>
                        <BarChart3 className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(c.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-3 font-display font-semibold">{c.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Template: {tpl?.name ?? "— nenhum —"}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <Stat label="Enviados" value={c.stats.sent} />
                    <Stat label="Abertura" value={`${openRate}%`} />
                    <Stat label="Clique" value={`${clickRate}%`} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" disabled={sendingId === c.id}
                      onClick={() => handleSend(c, true)}>
                      {sendingId === c.id ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                      Teste
                    </Button>
                    <Button size="sm" className="flex-1 text-xs" disabled={sendingId === c.id || !accountConnected}
                      onClick={() => handleSend(c, false)}>
                      {sendingId === c.id ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                      Disparar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CampaignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        templates={templates}
        onSaved={onChange}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border py-2">
      <p className="font-display text-sm font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function CampaignDialog({
  open, onOpenChange, initial, templates, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: EmailCampaign | null;
  templates: EmailTemplate[];
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <CampaignDialogBody
          key={initial?.id ?? "new"}
          initial={initial}
          templates={templates}
          onOpenChange={onOpenChange}
          onSaved={onSaved}
        />
      )}
    </Dialog>
  );
}

function CampaignDialogBody({
  initial, templates, onOpenChange, onSaved,
}: {
  initial: EmailCampaign | null;
  templates: EmailTemplate[];
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [templateId, setTemplateId] = useState<string>(initial?.templateId ?? "");
  const [filter, setFilter] = useState<AudienceFilter>(initial?.audienceFilter ?? {});
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Dê um nome à campanha.");
    setSaving(true);
    try {
      const method = initial ? "PATCH" : "POST";
      const url = initial ? `/api/remarketing/campaigns/${initial.id}` : "/api/remarketing/campaigns";
      await api(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, templateId: templateId || null, audienceFilter: filter }),
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
        <DialogTitle>{initial ? "Editar campanha" : "Nova campanha"}</DialogTitle>
        <DialogDescription>Escolha o template e o público-alvo na base do CRM.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Reativação — leads frios de julho" />
        </div>
        <div className="space-y-1.5">
          <Label>Template</Label>
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— selecione —</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {templates.length === 0 && (
            <p className="text-xs text-muted-foreground">Crie um template na aba Templates primeiro.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Público-alvo</Label>
          <AudiencePicker value={filter} onChange={setFilter} channel="email" />
        </div>
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {initial ? "Salvar alterações" : "Criar campanha"}
        </Button>
      </div>
    </DialogContent>
  );
}

/* ── Templates ────────────────────────────────────────────── */
function TemplatesTab({ templates, onChange }: { templates: EmailTemplate[]; onChange: () => void }) {
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [open, setOpen] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Excluir este template?")) return;
    await api(`/api/remarketing/templates?id=${id}`, { method: "DELETE" });
    toast.success("Template excluído.");
    onChange();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Use <code className="rounded bg-white/10 px-1">{"{{primeiroNome}}"}</code> para personalizar assunto e corpo.
        </p>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="size-4" /> Novo template
        </Button>
      </div>

      {templates.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum template ainda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
                    <Mail className="size-4.5" />
                  </span>
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(t.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <p className="mt-3 font-display font-semibold">{t.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.subject}</p>
                <Button variant="outline" size="sm" className="mt-3 w-full text-xs"
                  onClick={() => { setEditing(t); setOpen(true); }}>
                  Editar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateDialog open={open} onOpenChange={setOpen} initial={editing} onSaved={onChange} />
    </div>
  );
}

function TemplateDialog({
  open, onOpenChange, initial, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: EmailTemplate | null;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <TemplateDialogBody key={initial?.id ?? "new"} initial={initial} onOpenChange={onOpenChange} onSaved={onSaved} />
      )}
    </Dialog>
  );
}

function TemplateDialogBody({
  initial, onOpenChange, onSaved,
}: {
  initial: EmailTemplate | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.bodyHtml ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || !subject.trim() || !body.trim()) return toast.error("Preencha nome, assunto e corpo.");
    setSaving(true);
    try {
      await api("/api/remarketing/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initial?.id, name, subject, bodyHtml: body }),
      });
      toast.success(initial ? "Template atualizado." : "Template criado.");
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
        <DialogTitle>{initial ? "Editar template" : "Novo template"}</DialogTitle>
        <DialogDescription>O corpo aceita HTML. Links http(s) são rastreados automaticamente.</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Nome interno</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Reativação v1" />
        </div>
        <div className="space-y-1.5">
          <Label>Assunto</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="{{primeiroNome}}, ainda dá tempo de retomar" />
        </div>
        <div className="space-y-1.5">
          <Label>Corpo (HTML)</Label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full rounded-lg border border-input bg-background/50 p-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 resize-none"
            placeholder={"<p>Olá {{primeiroNome}},</p>\n<p>...</p>"}
          />
        </div>
        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {initial ? "Salvar alterações" : "Criar template"}
        </Button>
      </div>
    </DialogContent>
  );
}

/* ── Conta de envio ──────────────────────────────────────── */
function AccountTab({ info, onChange }: { info: AccountInfo | null; onChange: () => void }) {
  const connected = !!info?.account?.connected;
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    if (!confirm("Desconectar a conta Gmail?")) return;
    setBusy(true);
    try {
      await api("/api/remarketing/account", { method: "DELETE" });
      toast.success("Conta desconectada.");
      onChange();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-4 text-primary" /> Gmail API
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Envia como <strong>{info?.defaultFromEmail ?? "befluentschooll@gmail.com"}</strong> via Gmail API (limite aproximado de 500 envios/dia na conta gratuita).
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {connected ? (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
                <CheckCircle2 className="size-4" />
                Conectado{info?.account?.connectedAt ? ` em ${new Date(info.account.connectedAt).toLocaleDateString("pt-BR")}` : ""}.
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href="/api/remarketing/oauth/start">Reconectar</a>
                </Button>
                <Button variant="destructive" size="sm" onClick={disconnect} disabled={busy}>
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                  Desconectar
                </Button>
              </div>
            </>
          ) : info?.canConnectGmail ? (
            <>
              {info?.account?.lastError && (
                <p className="flex items-start gap-1.5 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {info.account.lastError}
                </p>
              )}
              <Button asChild>
                <a href="/api/remarketing/oauth/start">Conectar com Google</a>
              </Button>
            </>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                Defina <code className="rounded bg-white/10 px-1">GOOGLE_OAUTH_CLIENT_ID</code> e{" "}
                <code className="rounded bg-white/10 px-1">GOOGLE_OAUTH_CLIENT_SECRET</code> no ambiente.
                Passo a passo em Integrações {">"} Gmail.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {info?.resendConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Resend (fallback ativo)</CardTitle>
            <p className="text-xs text-muted-foreground">
              RESEND_API_KEY configurada. Usada automaticamente se o Gmail não estiver conectado.
            </p>
          </CardHeader>
        </Card>
      )}

      <a href="/docs/integracoes#remarketing" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
        <ExternalLink className="size-3" /> Documentação de remarketing
      </a>
    </div>
  );
}
