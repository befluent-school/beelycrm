"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CopyField } from "./copy-field";
import { ChannelConnect } from "./channel-connect";
import { Webhook, KeyRound, Plus, Trash2, RefreshCw, Eye, EyeOff, UserPlus, Mail, Shield, Crown, MoreHorizontal, Pencil, UserMinus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/* ── Logos SVG oficiais dos canais ──────────────────────────── */
function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="10" fill="#25D366"/>
      <path d="M24 8C15.16 8 8 15.16 8 24c0 2.84.74 5.5 2.04 7.8L8 40l8.4-2.04A15.94 15.94 0 0024 40c8.84 0 16-7.16 16-16S32.84 8 24 8zm7.8 22.2c-.4 1-1.9 1.8-2.84 1.94-.76.12-1.72.16-2.78-.18-.64-.2-1.46-.48-2.5-.94-4.4-1.9-7.28-6.32-7.5-6.6-.2-.28-1.7-2.26-1.7-4.32s1.08-3.06 1.46-3.48c.4-.4.86-.5 1.14-.5h.82c.26 0 .62.1.94.72.34.66 1.16 2.82 1.26 3.02.1.2.18.44.04.7-.14.26-.2.42-.4.64-.2.22-.42.48-.6.64-.2.2-.4.4-.18.78.22.4 1 1.64 2.14 2.66 1.46 1.3 2.7 1.7 3.08 1.9.4.2.62.16.86-.1.22-.26 1-1.16 1.26-1.56.26-.4.52-.34.88-.2.36.14 2.28 1.08 2.68 1.26.4.2.66.28.76.44.1.2.1 1.1-.3 2.1z" fill="white"/>
    </svg>
  );
}
function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="sigs-ig" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="10" fill="url(#sigs-ig)"/>
      <rect x="14" y="14" width="20" height="20" rx="6" stroke="white" strokeWidth="2.5" fill="none"/>
      <circle cx="24" cy="24" r="5" stroke="white" strokeWidth="2.5" fill="none"/>
      <circle cx="30.5" cy="17.5" r="1.5" fill="white"/>
    </svg>
  );
}
function MessengerLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient id="sigs-msg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00B2FF"/>
          <stop offset="100%" stopColor="#006AFF"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="10" fill="url(#sigs-msg)"/>
      <path d="M24 10C16.27 10 10 15.9 10 23.2c0 4.18 2.08 7.9 5.34 10.38V38l4.84-2.66c1.28.36 2.66.56 4.08.56 7.73 0 14-5.9 14-13.2S31.73 10 24 10zm1.44 17.74l-3.56-3.8-6.94 3.8 7.64-8.1 3.64 3.8 6.86-3.8-7.64 8.1z" fill="white"/>
    </svg>
  );
}
import { PLANS } from "@/lib/site";
import { formatCurrency } from "@/lib/utils";
import { useStore, useHydrated } from "@/lib/store";

/* ── Tipos de perfil / membro ──────────────────────────────── */
type MemberRole =
  | "owner" | "gestor" | "supervisor"
  | "closer" | "sdr" | "analista"
  | "gestor_trafego" | "suporte" | "financeiro";

const ROLE_LABELS: Record<MemberRole, string> = {
  owner:          "Owner",
  gestor:         "Gestor",
  supervisor:     "Supervisor",
  closer:         "Closer",
  sdr:            "SDR",
  analista:       "Analista",
  gestor_trafego: "Gestor de Tráfego",
  suporte:        "Suporte",
  financeiro:     "Financeiro",
};

const ROLE_COLORS: Record<MemberRole, string> = {
  owner:          "bg-primary/20 text-primary",
  gestor:         "bg-purple-500/20 text-purple-400",
  supervisor:     "bg-blue-500/20 text-blue-400",
  closer:         "bg-green-500/20 text-green-400",
  sdr:            "bg-cyan-500/20 text-cyan-400",
  analista:       "bg-orange-500/20 text-orange-400",
  gestor_trafego: "bg-pink-500/20 text-pink-400",
  suporte:        "bg-yellow-500/20 text-yellow-400",
  financeiro:     "bg-teal-500/20 text-teal-400",
};

const ROLE_PERMS: Record<MemberRole, string> = {
  owner:          "Acesso total · gerencia plano e membros",
  gestor:         "Acesso total exceto plano · pode convidar membros",
  supervisor:     "Visualiza todos os leads e conversas · relatórios completos",
  closer:         "Pipeline próprio · Inbox · proposta e fechamento",
  sdr:            "Adicionar leads · Inbox · agenda de reuniões",
  analista:       "Relatórios · Dashboard · somente leitura",
  gestor_trafego: "Integrações de anúncios · fontes de lead · relatórios",
  suporte:        "Inbox · atividades · sem acesso a pipeline",
  financeiro:     "Relatórios financeiros · planos · somente leitura",
};

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: "ativo" | "pendente";
  avatar?: string;
}

/* ── Modal de convite ───────────────────────────────────────── */
function InviteMemberModal({
  open, onClose, onInvite,
}: {
  open: boolean;
  onClose: () => void;
  onInvite: (m: TeamMember) => void;
}) {
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [role,  setRole]  = useState<MemberRole>("sdr");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { toast.error("Informe o e-mail do membro."); return; }
    if (!email.includes("@")) { toast.error("E-mail inválido."); return; }

    onInvite({
      id:     `m-${Date.now()}`,
      name:   name.trim() || email.split("@")[0],
      email:  email.trim().toLowerCase(),
      role,
      status: "pendente",
    });

    toast.success(`Convite enviado para ${email.trim()}.`);
    setName(""); setEmail(""); setRole("sdr");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-4 text-primary" /> Convidar membro
          </DialogTitle>
          <DialogDescription>
            O membro receberá um convite por e-mail e terá acesso conforme o perfil selecionado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Nome (opcional)</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: João Silva"
            />
          </div>

          <div className="space-y-1.5">
            <Label>E-mail <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colaborador@empresa.com"
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Perfil de acesso <span className="text-destructive">*</span></Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {(Object.keys(ROLE_LABELS) as MemberRole[])
                .filter((r) => r !== "owner")
                .map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
            </select>

            {/* Preview de permissões do perfil selecionado */}
            <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Shield className="size-3" /> Permissões do perfil
              </p>
              <p className="mt-0.5 text-[11px] text-foreground/80">{ROLE_PERMS[role]}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 gap-1.5">
              <UserPlus className="size-4" /> Enviar convite
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Linha de membro ────────────────────────────────────────── */
function MemberRow({
  member, isOwner, onChangeRole, onRemove,
}: {
  member: TeamMember;
  isOwner: boolean;
  onChangeRole: (id: string, role: MemberRole) => void;
  onRemove: (id: string) => void;
}) {
  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
      {/* Avatar */}
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
        {initials}
      </span>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{member.name}</p>
          {member.status === "pendente" && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-yellow-400 border-yellow-500/30">
              pendente
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>

      {/* Role badge */}
      <span className={`hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:inline-flex ${ROLE_COLORS[member.role]}`}>
        {ROLE_LABELS[member.role]}
      </span>

      {/* Ações */}
      {member.role === "owner" ? (
        <Crown className="size-4 shrink-0 text-primary" />
      ) : isOwner ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 shrink-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <p className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wide">Alterar perfil</p>
            {(Object.keys(ROLE_LABELS) as MemberRole[])
              .filter((r) => r !== "owner" && r !== member.role)
              .map((r) => (
                <DropdownMenuItem key={r} onClick={() => onChangeRole(member.id, r)}>
                  <Pencil className="size-3.5 mr-2 text-muted-foreground" />
                  {ROLE_LABELS[r]}
                </DropdownMenuItem>
              ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                if (confirm(`Remover ${member.name} da equipe?`)) onRemove(member.id);
              }}
            >
              <UserMinus className="size-3.5 mr-2" /> Remover membro
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}

/* ── Tipos de API / Webhook ─────────────────────────────────── */
interface ApiKey {
  prefix: string;
  name: string;
  created: string;
  lastUsed: string;
  environment: "live" | "test";
}
interface WebhookDef {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

const INITIAL_KEYS: ApiKey[] = [
  { prefix: "bly_live_8Kd2xY7p", name: "Produção",        created: "12 mai 2026", lastUsed: "Hoje",   environment: "live" },
  { prefix: "bly_live_Qa91mB3n", name: "N8N — Automação",  created: "03 mai 2026", lastUsed: "Ontem",  environment: "live" },
];
const INITIAL_WEBHOOKS: WebhookDef[] = [
  { id: "wh1", url: "https://n8n.minhaempresa.com/webhook/lead",  events: ["lead.created", "deal.won"],     active: true  },
  { id: "wh2", url: "https://hooks.zapier.com/abc123",            events: ["message.received"],             active: false },
];

const CHANNEL_DEFS = [
  { name: "WhatsApp",         Logo: WhatsAppLogo,   type: "whatsapp"  as const, providers: "Meta Cloud API · Z-API · Evolution" },
  { name: "Instagram Direct", Logo: InstagramLogo,  type: "instagram" as const, providers: "Instagram Graph API" },
  { name: "Messenger",        Logo: MessengerLogo,  type: "messenger" as const, providers: "Meta Messenger API" },
];

/* ── Componente de chave gerada ─────────────────────────────── */
function NewKeyBanner({ value, onDismiss }: { value: string; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  const display = visible ? value : value.slice(0, 16) + "•".repeat(20);
  return (
    <div className="rounded-lg border border-primary/40 bg-primary/[0.06] p-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold text-primary">Nova chave gerada — copie agora, não será exibida novamente</p>
        <button onClick={onDismiss} className="text-[10px] text-muted-foreground hover:text-foreground">Fechar</button>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded bg-background/60 p-2 font-mono text-xs">{display}</code>
        <button onClick={() => setVisible((v) => !v)} className="text-muted-foreground hover:text-foreground">
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <CopyField value={value} />
    </div>
  );
}

/* ── Formulário de novo Webhook ─────────────────────────────── */
function NewWebhookForm({ onAdd }: { onAdd: (w: WebhookDef) => void }) {
  const [url, setUrl]       = useState("");
  const [events, setEvents] = useState("lead.created");

  function handleAdd() {
    if (!url.trim()) { toast.error("Informe a URL do webhook."); return; }
    onAdd({ id: `wh-${Date.now()}`, url: url.trim(), events: events.split(",").map((e) => e.trim()).filter(Boolean), active: true });
    setUrl(""); setEvents("lead.created");
    toast.success("Webhook adicionado!");
  }
  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-semibold">Novo webhook</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">URL destino</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://n8n.suaempresa.com/webhook/..." className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Eventos (separados por vírgula)</Label>
          <Input value={events} onChange={(e) => setEvents(e.target.value)} placeholder="lead.created, deal.won" className="h-8 text-xs" />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Eventos disponíveis: lead.created · lead.updated · deal.won · deal.lost · message.received · contact.created
      </p>
      <Button size="sm" onClick={handleAdd}>Adicionar webhook</Button>
    </div>
  );
}

const SEED_MEMBERS: TeamMember[] = [
  { id: "owner-bf", name: "Be Fluent", email: "befluentschooll@gmail.com", role: "owner", status: "ativo" },
];

/* ── View principal ─────────────────────────────────────────── */
export function SettingsView({ defaultTab = "geral" }: { defaultTab?: string }) {
  const hydrated          = useHydrated();
  const connectedChannels = useStore((s) => s.connectedChannels);

  const [apiKeys, setApiKeys]           = useState<ApiKey[]>(INITIAL_KEYS);
  const [newKey, setNewKey]             = useState<string | null>(null);
  const [generatingKey, setGenerating]  = useState(false);
  const [webhooks, setWebhooks]         = useState<WebhookDef[]>(INITIAL_WEBHOOKS);
  const [showNewWH, setShowNewWH]       = useState(false);

  /* Equipe */
  const [members, setMembers]           = useState<TeamMember[]>(SEED_MEMBERS);
  const [inviteOpen, setInviteOpen]     = useState(false);

  function handleInvite(m: TeamMember) {
    setMembers((prev) => [...prev, m]);
  }
  function handleChangeRole(id: string, role: MemberRole) {
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role } : m));
    toast.success("Perfil atualizado.");
  }
  function handleRemove(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    toast("Membro removido.");
  }

  /* Geração real via API route */
  const generateKey = useCallback(async () => {
    setGenerating(true);
    try {
      const res  = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer bly_live_demo" },
        body: JSON.stringify({ name: `Chave ${apiKeys.length + 1}`, env: "live" }),
      });
      const data = await res.json() as { key?: string; prefix?: string; name?: string; created_at?: string };
      if (data.key) {
        setNewKey(data.key);
        setApiKeys((prev) => [
          { prefix: data.prefix ?? data.key!.slice(0, 16), name: data.name ?? "Nova chave", created: "Agora", lastUsed: "—", environment: "live" },
          ...prev,
        ]);
        toast.success("Chave gerada! Copie agora — não será exibida novamente.");
      }
    } catch {
      toast.error("Erro ao gerar chave. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  }, [apiKeys.length]);

  function deleteKey(prefix: string) {
    if (!confirm("Revogar esta chave? Qualquer integração que a usa irá parar de funcionar.")) return;
    setApiKeys((k) => k.filter((x) => x.prefix !== prefix));
    toast("Chave revogada.");
  }

  function toggleWebhook(id: string) {
    setWebhooks((w) => w.map((x) => (x.id === id ? { ...x, active: !x.active } : x)));
  }
  function deleteWebhook(id: string) {
    setWebhooks((w) => w.filter((x) => x.id !== id));
    toast("Webhook removido.");
  }

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="geral">Geral</TabsTrigger>
        <TabsTrigger value="integracoes">Integrações</TabsTrigger>
        <TabsTrigger value="canais">Canais</TabsTrigger>
        <TabsTrigger value="equipe">Equipe</TabsTrigger>
        <TabsTrigger value="planos">Planos</TabsTrigger>
      </TabsList>

      {/* ─── Geral ─────────────────────────────────────────────── */}
      <TabsContent value="geral">
        <div className="space-y-4 max-w-lg">
          <Card>
            <CardHeader><CardTitle>Dados da empresa</CardTitle><CardDescription>Preencha com as informações reais da Be Fluent.</CardDescription></CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-1.5">
                <Label>Nome da empresa</Label>
                <Input defaultValue="Be Fluent Idiomas & Ensino LTDA" />
              </div>
              <div className="space-y-1.5">
                <Label>CNPJ</Label>
                <Input placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail principal</Label>
                <Input defaultValue="befluentschooll@gmail.com" type="email" />
              </div>
              <div className="space-y-1.5">
                <Label>Site</Label>
                <Input placeholder="https://befluent.com.br" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone / WhatsApp comercial</Label>
                <Input placeholder="+55 (XX) 9XXXX-XXXX" />
              </div>
              <div className="space-y-1.5">
                <Label>Endereço</Label>
                <Input placeholder="Rua, número, bairro — Cidade/UF" />
              </div>
              <div className="space-y-1.5">
                <Label>Fuso horário</Label>
                <Input defaultValue="America/Sao_Paulo (GMT-3)" />
              </div>
              <div><Button onClick={() => toast.success("Dados salvos!")}>Salvar alterações</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Plano atual</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg font-bold text-primary">Enterprise</p>
                <p className="text-sm text-muted-foreground">Todos os recursos desbloqueados · Usuários ilimitados</p>
              </div>
              <span className="rounded-full bg-primary/15 px-3 py-1 text-sm font-bold text-primary">ATIVO</span>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ─── Integrações (API Keys + Webhooks) ─────────────────── */}
      <TabsContent value="integracoes" className="space-y-6">
        {/* API Keys */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><KeyRound className="size-4 text-primary" /> Chaves de API</CardTitle>
                <CardDescription>Autentique requisições à API REST com Bearer token. A chave é exibida apenas no momento da criação.</CardDescription>
              </div>
              <Button size="sm" onClick={generateKey} disabled={generatingKey}>
                {generatingKey ? <><RefreshCw className="size-4 animate-spin" /> Gerando...</> : <><Plus className="size-4" /> Gerar chave</>}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {newKey && <NewKeyBanner value={newKey} onDismiss={() => setNewKey(null)} />}
            {apiKeys.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhuma chave de API criada ainda.</p>
            )}
            {apiKeys.map((k) => (
              <div key={k.prefix} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{k.name}</p>
                    <Badge variant={k.environment === "live" ? "default" : "secondary"} className="text-[9px] px-1.5">
                      {k.environment === "live" ? "produção" : "teste"}
                    </Badge>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {k.prefix}•••••••• · criada {k.created} · usada {k.lastUsed}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteKey(k.prefix)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <div className="rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Como usar:</p>
              <code className="block rounded bg-background px-2 py-1 font-mono text-[11px]">
                curl -H &quot;Authorization: Bearer bly_live_...&quot; {typeof window !== "undefined" ? window.location.origin : "https://app.beely.com.br"}/api/v1/contacts
              </code>
              <p>Endpoints disponíveis: <code>/api/v1/contacts</code> · <code>/api/v1/deals</code> · <code>/api/v1/activities</code></p>
            </div>
          </CardContent>
        </Card>

        {/* Webhooks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><Webhook className="size-4 text-primary" /> Webhooks & N8N</CardTitle>
                <CardDescription>Receba eventos em tempo real: lead.created, deal.won, message.received, contact.created...</CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowNewWH((v) => !v)}>
                <Plus className="size-4" /> Novo webhook
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showNewWH && (
              <NewWebhookForm onAdd={(w) => { setWebhooks((prev) => [w, ...prev]); setShowNewWH(false); }} />
            )}
            {webhooks.map((w) => (
              <div key={w.id} className="flex items-center gap-3 justify-between rounded-lg border border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{w.url}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {w.events.map((e) => <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={w.active} onCheckedChange={() => toggleWebhook(w.id)} />
                  <Button variant="ghost" size="icon" className="text-destructive size-7" onClick={() => deleteWebhook(w.id)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Cole a URL do seu fluxo N8N, Zapier ou Make para acionar automações externas a cada evento.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Canais ────────────────────────────────────────────── */}
      <TabsContent value="canais">
        <div className="mb-3">
          <p className="text-sm text-muted-foreground">
            Conecte seus canais de mensagem. Após emparelhamento, as conversas aparecerão no Inbox separadas por canal.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {CHANNEL_DEFS.map(({ name, Logo, type, providers }) => {
            const connected = hydrated && connectedChannels.some((c) => c.type === type);
            const ch        = connectedChannels.find((c) => c.type === type);
            return (
              <Card key={name} className={connected ? "border-success/30 bg-success/[0.03]" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <Logo className="size-11 rounded-xl" />
                    {connected ? <Badge variant="success">Conectado</Badge> : <Badge variant="outline">Desconectado</Badge>}
                  </div>
                  <p className="mt-3 font-display font-semibold">{name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{providers}</p>
                  {connected && ch && (
                    <p className="mt-1 text-[10px] text-success/80">via {ch.provider} · {new Date(ch.connectedAt).toLocaleDateString("pt-BR")}</p>
                  )}
                  <ChannelConnect
                    channel={name}
                    connected={connected}
                    trigger={
                      <Button variant={connected ? "outline" : "default"} size="sm" className="mt-4 w-full">
                        {connected ? "Gerenciar" : "Conectar"}
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TabsContent>

      {/* ─── Equipe ────────────────────────────────────────────── */}
      <TabsContent value="equipe" className="space-y-4">
        <InviteMemberModal
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onInvite={handleInvite}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Membros da equipe</CardTitle>
                <CardDescription>
                  {members.length} membro{members.length !== 1 ? "s" : ""} ·{" "}
                  {members.filter((m) => m.status === "pendente").length} convite{members.filter((m) => m.status === "pendente").length !== 1 ? "s" : ""} pendente{members.filter((m) => m.status === "pendente").length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
                <UserPlus className="size-4" /> Convidar membro
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                isOwner={true}
                onChangeRole={handleChangeRole}
                onRemove={handleRemove}
              />
            ))}
          </CardContent>
        </Card>

        {/* Legenda de perfis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4 text-primary" /> Perfis de acesso disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(ROLE_LABELS) as MemberRole[]).filter((r) => r !== "owner").map((r) => (
                <div key={r} className="flex items-start gap-2.5 rounded-lg border border-border bg-secondary/20 p-3">
                  <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${ROLE_COLORS[r]}`}>
                    {ROLE_LABELS[r]}
                  </span>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{ROLE_PERMS[r]}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ─── Planos ────────────────────────────────────────────── */}
      <TabsContent value="planos">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <Card key={p.id} className={p.highlight === "featured" ? "border-primary ring-1 ring-primary" : ""}>
              <CardContent className="p-5">
                <p className="font-display font-bold">{p.name}</p>
                <p className="mt-1 font-display text-2xl font-extrabold">
                  {formatCurrency(p.price)}<span className="text-sm font-normal text-muted-foreground">/mês</span>
                </p>
                <Button
                  variant={p.id === "enterprise" ? "default" : "outline"}
                  size="sm" className="mt-4 w-full"
                  onClick={() => toast(p.id === "enterprise" ? "Você já está no plano Enterprise!" : "Em breve: upgrade de plano.")}
                >
                  {p.id === "enterprise" ? "Plano atual ✓" : "Fazer upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
