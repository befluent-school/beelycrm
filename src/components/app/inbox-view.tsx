"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { type DemoConversation } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials, cn } from "@/lib/utils";
import {
  Send, Phone, ExternalLink, Sparkles, ChevronDown, ChevronUp,
  X, TrendingUp, AlertTriangle, MessageSquare,
  Lightbulb, Target, Zap, PlugZap, MessageCircleMore,
} from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { analyzeConversation, type SalesInsight, type InsightType } from "@/lib/sales-ai";
import Link from "next/link";

type Channel = DemoConversation["channel"];

/* ── Logos SVG com cores oficiais ───────────────────────────── */
function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#25D366"/>
      <path d="M24 8C15.16 8 8 15.16 8 24c0 2.84.74 5.5 2.04 7.8L8 40l8.4-2.04A15.94 15.94 0 0024 40c8.84 0 16-7.16 16-16S32.84 8 24 8zm7.8 22.2c-.4 1-1.9 1.8-2.84 1.94-.76.12-1.72.16-2.78-.18-.64-.2-1.46-.48-2.5-.94-4.4-1.9-7.28-6.32-7.5-6.6-.2-.28-1.7-2.26-1.7-4.32s1.08-3.06 1.46-3.48c.4-.4.86-.5 1.14-.5h.82c.26 0 .62.1.94.72.34.66 1.16 2.82 1.26 3.02.1.2.18.44.04.7-.14.26-.2.42-.4.64-.2.22-.42.48-.6.64-.2.2-.4.4-.18.78.22.4 1 1.64 2.14 2.66 1.46 1.3 2.7 1.7 3.08 1.9.4.2.62.16.86-.1.22-.26 1-1.16 1.26-1.56.26-.4.52-.34.88-.2.36.14 2.28 1.08 2.68 1.26.4.2.66.28.76.44.1.2.1 1.1-.3 2.1z" fill="white"/>
    </svg>
  );
}
function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="ig-bg" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#ig-bg)"/>
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
        <linearGradient id="msg-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00B2FF"/>
          <stop offset="100%" stopColor="#006AFF"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#msg-bg)"/>
      <path d="M24 10C16.27 10 10 15.9 10 23.2c0 4.18 2.08 7.9 5.34 10.38V38l4.84-2.66c1.28.36 2.66.56 4.08.56 7.73 0 14-5.9 14-13.2S31.73 10 24 10zm1.44 17.74l-3.56-3.8-6.94 3.8 7.64-8.1 3.64 3.8 6.86-3.8-7.64 8.1z" fill="white"/>
    </svg>
  );
}

const CHANNEL_META: Record<Channel, {
  label: string;
  chip: string;
  ringBg: string;
  Logo: React.ComponentType<{ className?: string }>;
  IconSmall: React.ComponentType<{ className?: string }>;
}> = {
  whatsapp: {
    label: "WhatsApp",
    chip: "bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30",
    ringBg: "bg-[#25D366]",
    Logo: WhatsAppLogo,
    IconSmall: ({ className }) => (
      <svg className={className} viewBox="0 0 20 20" fill="#25D366">
        <path d="M10 2C5.58 2 2 5.58 2 10c0 1.42.37 2.75 1.02 3.9L2 18l4.23-1A7.96 7.96 0 0010 18c4.42 0 8-3.58 8-8s-3.58-8-8-8zm3.9 11.1c-.2.5-.95.9-1.42.97-.38.06-.86.08-1.39-.09-.32-.1-.73-.24-1.25-.47-2.2-.95-3.64-3.16-3.75-3.3-.1-.14-.85-1.13-.85-2.16s.54-1.53.73-1.74c.2-.2.43-.25.57-.25h.41c.13 0 .31.05.47.36.17.33.58 1.41.63 1.51.05.1.09.22.02.35-.07.13-.1.21-.2.32-.1.11-.21.24-.3.32-.1.1-.2.2-.09.39.11.2.5.82 1.07 1.33.73.65 1.35.85 1.54.95.2.1.31.08.43-.05.11-.13.5-.58.63-.78.13-.2.26-.17.44-.1.18.07 1.14.54 1.34.63.2.1.33.14.38.22.05.1.05.55-.15 1.05z"/>
      </svg>
    ),
  },
  instagram: {
    label: "Instagram",
    chip: "bg-[#E1306C]/15 text-[#E1306C] border-[#E1306C]/30",
    ringBg: "bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
    Logo: InstagramLogo,
    IconSmall: ({ className }) => (
      <svg className={className} viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="4" stroke="#E1306C" strokeWidth="1.5"/>
        <circle cx="10" cy="10" r="3.5" stroke="#E1306C" strokeWidth="1.5"/>
        <circle cx="14" cy="6" r="1" fill="#E1306C"/>
      </svg>
    ),
  },
  messenger: {
    label: "Messenger",
    chip: "bg-[#0084FF]/15 text-[#0084FF] border-[#0084FF]/30",
    ringBg: "bg-gradient-to-br from-[#00B2FF] to-[#006AFF]",
    Logo: MessengerLogo,
    IconSmall: ({ className }) => (
      <svg className={className} viewBox="0 0 20 20" fill="#0084FF">
        <path d="M10 2C5.59 2 2 5.31 2 9.43c0 2.15.93 4.07 2.44 5.4V17l2.41-1.33c.65.18 1.33.27 2.05.27 4.41 0 8-3.31 8-7.43C18 5.31 14.41 2 10 2zm.82 9.96l-2.04-2.18L4.98 12l4.13-4.38 2.09 2.18 3.74-2.18-4.12 4.34z"/>
      </svg>
    ),
  },
};

const CHANNEL_ORDER: Channel[] = ["whatsapp", "instagram", "messenger"];

/* ── Conversa em memória (tipo local, sem importar demo-data) ── */
interface LocalConv {
  id: string;
  contact: string;
  channel: Channel;
  preview: string;
  unread: number;
  time: string;
}
type Thread = { from: "in" | "out"; text: string; time: string };

/* ── Insight icons/colors ───────────────────────────────────── */
const INSIGHT_ICONS: Record<InsightType, React.ComponentType<{ className?: string }>> = {
  interest:   TrendingUp,
  suggestion: MessageSquare,
  objection:  Lightbulb,
  warning:    AlertTriangle,
  strategy:   Target,
  closing:    Zap,
};
const INSIGHT_COLORS: Record<InsightType, { bg: string; text: string; border: string }> = {
  interest:   { bg: "bg-green-400/8",   text: "text-green-400",  border: "border-green-400/20" },
  suggestion: { bg: "bg-primary/8",     text: "text-primary",    border: "border-primary/20" },
  objection:  { bg: "bg-yellow-400/8",  text: "text-yellow-400", border: "border-yellow-400/20" },
  warning:    { bg: "bg-orange-400/8",  text: "text-orange-400", border: "border-orange-400/20" },
  strategy:   { bg: "bg-blue-400/8",    text: "text-blue-400",   border: "border-blue-400/20" },
  closing:    { bg: "bg-purple-400/8",  text: "text-purple-400", border: "border-purple-400/20" },
};
const PRIORITY_DOT: Record<SalesInsight["priority"], string> = {
  high: "bg-red-400", medium: "bg-yellow-400", low: "bg-muted-foreground",
};

/* ── IA Assistente ──────────────────────────────────────────── */
function AiAssistantPanel({ conv, thread, onUseSuggestion }: {
  conv: LocalConv;
  thread: Thread[];
  onUseSuggestion: (text: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const { contacts, deals, pipelines } = useStore();

  const contact = contacts.find((c) => c.name === conv.contact);
  const deal    = deals.find((d) => d.contact === conv.contact && d.status === "open");
  const stage   = deal ? pipelines[0]?.stages.find((s) => s.id === deal.stageId)?.name : undefined;

  const inMsgs  = thread.filter((m) => m.from === "in");
  const outMsgs = thread.filter((m) => m.from === "out");

  const insights = analyzeConversation({
    contactName:   conv.contact,
    contactScore:  contact?.score ?? 50,
    contactSource: contact?.source ?? conv.channel,
    contactTags:   contact?.tags ?? [],
    dealStage:     stage,
    dealValue:     deal?.value,
    totalMessages: thread.length,
    inMessages:    inMsgs,
    outMessages:   outMsgs,
    lastInText:    inMsgs[inMsgs.length - 1]?.text ?? "",
    lastOutText:   outMsgs[outMsgs.length - 1]?.text ?? "",
    channel:       conv.channel,
  });

  const highCount = insights.filter((i) => i.priority === "high").length;

  return (
    <div className="border-t border-border bg-[#16162a]/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-primary transition-colors hover:bg-white/[0.03]"
      >
        <Sparkles className="size-3.5" />
        <span>IA Assistente de Vendas</span>
        {highCount > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
            {highCount} urgente{highCount > 1 ? "s" : ""}
          </span>
        )}
        <span className="ml-1 flex size-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
          {insights.length}
        </span>
        <span className="ml-auto">
          {open ? <ChevronDown className="size-3.5 text-muted-foreground" /> : <ChevronUp className="size-3.5 text-muted-foreground" />}
        </span>
      </button>

      {open && (
        <div className="space-y-2 px-4 pb-3">
          {insights.map((ins, i) => {
            const Icon   = INSIGHT_ICONS[ins.type];
            const colors = INSIGHT_COLORS[ins.type];
            return (
              <div key={i} className={cn("rounded-lg border p-3 text-xs", colors.bg, colors.border)}>
                <div className="flex items-start gap-2">
                  <Icon className={cn("mt-0.5 size-3.5 shrink-0", colors.text)} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p className={cn("text-[11px] font-semibold", colors.text)}>{ins.title}</p>
                      <span className={cn("size-1.5 shrink-0 rounded-full", PRIORITY_DOT[ins.priority])} />
                      {ins.tag && (
                        <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-muted-foreground">{ins.tag}</span>
                      )}
                    </div>
                    <p className="leading-relaxed text-foreground/80">{ins.body}</p>
                    {ins.cta && (
                      <div className="mt-2 rounded-md border border-white/10 bg-white/[0.04] p-2 text-[11px] italic text-foreground/70">
                        &ldquo;{ins.cta}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
                {ins.cta && (
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => { onUseSuggestion(ins.cta!); toast.success("Sugestao copiada para o campo de mensagem"); }}
                      className="rounded bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary transition-colors hover:bg-primary/25"
                    >
                      Usar esta mensagem
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {insights.length === 0 && (
            <p className="py-2 text-center text-xs text-muted-foreground">Nenhuma sugestao no momento.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Modal de lead ──────────────────────────────────────────── */
function LeadDetailModal({ contact, onClose }: { contact: string; onClose: () => void }) {
  const { contacts, deals } = useStore();
  const c           = contacts.find((x) => x.name === contact);
  const contactDeals = deals.filter((d) => d.contact === contact);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-[#262626] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Detalhes do Lead</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-white/10">
            <X className="size-4" />
          </button>
        </div>
        {c ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-accent text-lg font-bold text-primary">{initials(c.name)}</span>
              <div>
                <p className="font-display font-semibold">{c.name}</p>
                <p className="text-sm text-muted-foreground">{c.company}</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1">
                <span className="text-xs font-bold text-primary">Score</span>
                <span className="font-display text-base font-extrabold text-primary">{c.score}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">E-mail</p><p className="truncate font-medium">{c.email}</p></div>
              <div><p className="text-xs text-muted-foreground">Telefone</p><p className="font-medium">{c.phone}</p></div>
              <div><p className="text-xs text-muted-foreground">Origem</p><p className="font-medium">{c.source}</p></div>
              <div><p className="text-xs text-muted-foreground">Responsavel</p><p className="font-medium">{c.owner}</p></div>
            </div>
            {c.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {c.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
              </div>
            )}
            {contactDeals.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Negocios</p>
                <div className="space-y-1.5">
                  {contactDeals.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                      <span className="text-sm">{d.title}</span>
                      <span className="font-display text-sm font-bold text-primary">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Contato nao encontrado no CRM.</p>
        )}
      </div>
    </div>
  );
}

/* ── Tela vazia de canal desconectado ───────────────────────── */
function ChannelDisconnected({ channel }: { channel: Channel }) {
  const meta = CHANNEL_META[channel];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <meta.Logo className="size-16 opacity-60" />
      <div>
        <p className="font-display text-base font-bold">{meta.label} nao conectado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Conecte o {meta.label} nas configuracoes para ver as conversas aqui.
        </p>
      </div>
      <Link href="/configuracoes?tab=canais">
        <Button variant="outline" size="sm" className="gap-2">
          <PlugZap className="size-4" /> Conectar agora
        </Button>
      </Link>
    </div>
  );
}

/* ── Tela vazia de inbox sem conversas ──────────────────────── */
function ChannelEmpty({ channel }: { channel: Channel }) {
  const meta = CHANNEL_META[channel];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <MessageCircleMore className="size-10 text-muted-foreground/30" />
      <div>
        <p className="font-display text-sm font-bold">Nenhuma conversa no {meta.label}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          As mensagens recebidas aparecao aqui assim que chegarem.
        </p>
      </div>
    </div>
  );
}

/* ── Painel de chat ─────────────────────────────────────────── */
function ChatPanel({ conv, thread, onSend }: {
  conv: LocalConv;
  thread: Thread[];
  onSend: (convId: string, text: string) => void;
}) {
  const [draft, setDraft]       = useState("");
  const [showLead, setShowLead] = useState(false);
  const messagesEndRef          = useRef<HTMLDivElement>(null);
  const meta                    = CHANNEL_META[conv.channel];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.length]);

  function handleCall() {
    const c = useStore.getState().contacts.find((x) => x.name === conv.contact);
    toast.success(c?.phone ? `Ligando para ${c.phone}` : `Ligar para ${conv.contact} via ${meta.label}`);
  }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    onSend(conv.id, draft.trim());
    setDraft("");
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="relative flex size-11 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary">
            {initials(conv.contact)}
            <span className={cn("absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-card", meta.ringBg)}>
              <meta.IconSmall className="size-2.5" />
            </span>
          </span>
          <div>
            <p className="font-display text-base font-bold">{conv.contact}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", meta.chip)}>
                <meta.IconSmall className="size-3" /> via {meta.label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCall}><Phone className="size-3.5" /> Ligar</Button>
          <Button variant="outline" size="sm" onClick={() => setShowLead(true)}><ExternalLink className="size-3.5" /> Ver lead</Button>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 space-y-3 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(229,147,19,0.04),transparent_55%)] p-5">
        {thread.map((m, i) => (
          <div key={i} className={cn("flex", m.from === "out" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[70%] rounded-2xl px-3.5 py-2 text-sm shadow-sm", m.from === "out" ? "bg-primary text-primary-foreground" : "bg-card")}>
              <p>{m.text}</p>
              <p className={cn("mt-1 text-[10px]", m.from === "out" ? "text-primary-foreground/70" : "text-muted-foreground")}>{m.time}</p>
            </div>
          </div>
        ))}
        {thread.length === 0 && <p className="pt-10 text-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>}
        <div ref={messagesEndRef} />
      </div>

      {/* IA */}
      <AiAssistantPanel conv={conv} thread={thread} onUseSuggestion={(t) => setDraft(t)} />

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Escreva uma mensagem para ${conv.contact}...`}
          className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" size="icon" disabled={!draft.trim()}><Send className="size-4" /></Button>
      </form>

      {showLead && <LeadDetailModal contact={conv.contact} onClose={() => setShowLead(false)} />}
    </div>
  );
}

/* ── InboxView principal ────────────────────────────────────── */
export function InboxView() {
  const hydrated          = useHydrated();
  const connectedChannels = useStore((s) => s.connectedChannels);

  const [activeChannel, setActiveChannel] = useState<Channel>("whatsapp");
  const [activeConvId, setActiveConvId]   = useState<string>("");
  // Conversas locais em memória (começam vazias — substituídas pelas reais via webhook)
  const [convs, setConvs]     = useState<LocalConv[]>([]);
  const [threads, setThreads] = useState<Record<string, Thread[]>>({});

  const isConnected = (ch: Channel) =>
    !hydrated || connectedChannels.some((c) => c.type === ch);

  const channelConvs = convs.filter((c) => c.channel === activeChannel);
  const activeConv   = channelConvs.find((c) => c.id === activeConvId) ?? channelConvs[0] ?? null;

  // Sincroniza activeConvId quando muda de aba
  useEffect(() => {
    const first = convs.find((c) => c.channel === activeChannel);
    setActiveConvId(first?.id ?? "");
  }, [activeChannel, convs]);

  function handleSend(convId: string, text: string) {
    const now  = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    setThreads((t) => ({ ...t, [convId]: [...(t[convId] ?? []), { from: "out", text, time }] }));
    // Atualiza preview
    setConvs((cs) => cs.map((c) => c.id === convId ? { ...c, preview: text, time: "agora" } : c));
  }

  // Simula uma mensagem chegando quando canal é conectado (apenas para demonstração)
  useEffect(() => {
    if (!hydrated) return;
    connectedChannels.forEach((ch) => {
      const alreadyHas = convs.some((c) => c.channel === ch.type);
      if (!alreadyHas) {
        const demoId = `demo-${ch.type}`;
        const demoName = ch.type === "whatsapp" ? "Primeiro contato WA" : ch.type === "instagram" ? "Primeiro contato IG" : "Primeiro contato MSG";
        setConvs((cs) => [
          ...cs,
          { id: demoId, contact: demoName, channel: ch.type, preview: "Mensagem de demonstracao", unread: 1, time: "agora" },
        ]);
        setThreads((t) => ({
          ...t,
          [demoId]: [{ from: "in", text: `Oi! Vim pelo ${ch.type === "whatsapp" ? "WhatsApp" : ch.type === "instagram" ? "Instagram" : "Messenger"}.`, time: "agora" }],
        }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, connectedChannels.length]);

  const unreadByChannel = (ch: Channel) => convs.filter((c) => c.channel === ch && c.unread > 0).length;

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-xl border border-border bg-card/40">
      {/* Abas */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border bg-card/60 px-3 pt-2">
        {CHANNEL_ORDER.map((ch) => {
          const meta   = CHANNEL_META[ch];
          const active = activeChannel === ch;
          const unread = unreadByChannel(ch);
          const linked = isConnected(ch);
          return (
            <button
              key={ch}
              onClick={() => setActiveChannel(ch)}
              className={cn(
                "relative flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-xs font-semibold transition-all",
                active
                  ? "border-primary bg-primary/[0.05] text-primary"
                  : "border-transparent text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
              )}
            >
              <meta.Logo className="size-4 rounded" />
              {meta.label}
              {unread > 0 && linked && (
                <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {unread}
                </span>
              )}
              {!linked && (
                <span className="rounded-full border border-border px-1 text-[8px] text-muted-foreground">off</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 overflow-hidden">
        {!isConnected(activeChannel) ? (
          <ChannelDisconnected channel={activeChannel} />
        ) : (
          <>
            {/* Lista */}
            <div className="flex w-72 shrink-0 flex-col border-r border-border">
              <div className="border-b border-border p-3">
                <input
                  placeholder={`Buscar em ${CHANNEL_META[activeChannel].label}...`}
                  className="h-9 w-full rounded-lg border border-input bg-secondary/50 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {channelConvs.length === 0 && <ChannelEmpty channel={activeChannel} />}
                {channelConvs.map((c) => {
                  const m = CHANNEL_META[c.channel];
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setActiveConvId(c.id); setConvs((cs) => cs.map((x) => x.id === c.id ? { ...x, unread: 0 } : x)); }}
                      className={cn(
                        "flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left transition-colors hover:bg-white/[0.04]",
                        activeConvId === c.id && "bg-white/[0.06]"
                      )}
                    >
                      <span className="relative flex size-10 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                        {initials(c.contact)}
                        <span className={cn("absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-background", m.ringBg)}>
                          <m.IconSmall className="size-2" />
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-semibold">{c.contact}</p>
                          <span className="text-[10px] text-muted-foreground">{c.time}</span>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{c.preview}</p>
                      </div>
                      {c.unread > 0 && <Badge className="h-5 px-1.5 text-[10px]">{c.unread}</Badge>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat ou placeholder */}
            {activeConv ? (
              <ChatPanel
                conv={activeConv}
                thread={threads[activeConv.id] ?? []}
                onSend={handleSend}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <MessageCircleMore className="size-12 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Selecione uma conversa para comecar</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
