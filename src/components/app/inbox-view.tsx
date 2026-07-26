"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { initials, cn } from "@/lib/utils";
import {
  Send, Phone, ExternalLink, Sparkles, ChevronDown, ChevronUp,
  X, TrendingUp, AlertTriangle, MessageSquare, Lightbulb, Target, Zap,
  PlugZap, MessageCircleMore, PanelRightClose, PanelRightOpen,
  Search, ImageIcon, FileText, Mic, Video, CheckCheck, Loader2,
} from "lucide-react";
import { useStore, useHydrated, DEFAULT_OWNER } from "@/lib/store";
import { analyzeConversation, type SalesInsight, type InsightType } from "@/lib/sales-ai";
import Link from "next/link";

type Channel = "whatsapp" | "instagram" | "messenger";
type MsgType = "text" | "image" | "audio" | "document" | "video";

/* ── Logos ───────────────────────────────────────────────────── */
function WhatsAppLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" fill="#25D366"/>
      <path d="M24 8C15.16 8 8 15.16 8 24c0 2.84.74 5.5 2.04 7.8L8 40l8.4-2.04A15.94 15.94 0 0024 40c8.84 0 16-7.16 16-16S32.84 8 24 8zm7.8 22.2c-.4 1-1.9 1.8-2.84 1.94-.76.12-1.72.16-2.78-.18-.64-.2-1.46-.48-2.5-.94-4.4-1.9-7.28-6.32-7.5-6.6-.2-.28-1.7-2.26-1.7-4.32s1.08-3.06 1.46-3.48c.4-.4.86-.5 1.14-.5h.82c.26 0 .62.1.94.72.34.66 1.16 2.82 1.26 3.02.1.2.18.44.02.35-.14.26-.1.21-.2.32-.1.11-.21.24-.3.32-.1.1-.2.2-.09.39.11.2.5.82 1.07 1.33.73.65 1.35.85 1.54.95.2.1.31.08.43-.05.11-.13.5-.58.63-.78.13-.2.26-.17.44-.1.18.07 1.14.54 1.34.63.2.1.33.14.38.22.05.1.05.55-.15 1.05z" fill="white"/>
    </svg>
  );
}
function InstagramLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <defs>
        <radialGradient id="ig-bgi" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497"/><stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/><stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#ig-bgi)"/>
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
        <linearGradient id="msg-bgi" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00B2FF"/><stop offset="100%" stopColor="#006AFF"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#msg-bgi)"/>
      <path d="M24 10C16.27 10 10 15.9 10 23.2c0 4.18 2.08 7.9 5.34 10.38V38l4.84-2.66c1.28.36 2.66.56 4.08.56 7.73 0 14-5.9 14-13.2S31.73 10 24 10zm1.44 17.74l-3.56-3.8-6.94 3.8 7.64-8.1 3.64 3.8 6.86-3.8-7.64 8.1z" fill="white"/>
    </svg>
  );
}

const CH: Record<Channel, {
  label: string; chip: string; ring: string;
  Logo: React.FC<{ className?: string }>;
  Icon: React.FC<{ className?: string }>;
}> = {
  whatsapp: {
    label: "WhatsApp", chip: "bg-[#25D366]/15 text-[#25D366] border-[#25D366]/30", ring: "bg-[#25D366]",
    Logo: WhatsAppLogo,
    Icon: ({ className }) => <svg className={className} viewBox="0 0 20 20" fill="#25D366"><path d="M10 2C5.58 2 2 5.58 2 10c0 1.42.37 2.75 1.02 3.9L2 18l4.23-1A7.96 7.96 0 0010 18c4.42 0 8-3.58 8-8s-3.58-8-8-8z"/></svg>,
  },
  instagram: {
    label: "Instagram", chip: "bg-[#E1306C]/15 text-[#E1306C] border-[#E1306C]/30", ring: "bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
    Logo: InstagramLogo,
    Icon: ({ className }) => <svg className={className} viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="14" height="14" rx="4" stroke="#E1306C" strokeWidth="1.5"/><circle cx="10" cy="10" r="3.5" stroke="#E1306C" strokeWidth="1.5"/><circle cx="14" cy="6" r="1" fill="#E1306C"/></svg>,
  },
  messenger: {
    label: "Messenger", chip: "bg-[#0084FF]/15 text-[#0084FF] border-[#0084FF]/30", ring: "bg-gradient-to-br from-[#00B2FF] to-[#006AFF]",
    Logo: MessengerLogo,
    Icon: ({ className }) => <svg className={className} viewBox="0 0 20 20" fill="#0084FF"><path d="M10 2C5.59 2 2 5.31 2 9.43c0 2.15.93 4.07 2.44 5.4V17l2.41-1.33c.65.18 1.33.27 2.05.27 4.41 0 8-3.31 8-7.43C18 5.31 14.41 2 10 2z"/></svg>,
  },
};
const CH_ORDER: Channel[] = ["whatsapp", "instagram", "messenger"];

/* ── Tipos ───────────────────────────────────────────────────── */
interface RawMsg {
  id: string;
  channel: Channel;
  from: string;
  fromName: string;
  text: string;
  timestamp: number;
  fromMe: boolean;
  senderPhoto?: string;
  msgType: MsgType;
  mediaUrl?: string;
  mediaCaption?: string;
  fileName?: string;
}

interface Conv {
  id: string;       // `${channel}-${phone}`
  phone: string;
  contact: string;
  channel: Channel;
  lastText: string;
  lastTime: number;
  unread: number;
  photo?: string;
}

/* ── Insight UI ──────────────────────────────────────────────── */
const INSIGHT_ICONS: Record<InsightType, React.FC<{ className?: string }>> = {
  interest: TrendingUp, suggestion: MessageSquare, objection: Lightbulb,
  warning: AlertTriangle, strategy: Target, closing: Zap,
};
const INSIGHT_COLORS: Record<InsightType, { bg: string; text: string; border: string }> = {
  interest:   { bg: "bg-green-400/8",  text: "text-green-400",  border: "border-green-400/20" },
  suggestion: { bg: "bg-primary/8",    text: "text-primary",    border: "border-primary/20" },
  objection:  { bg: "bg-yellow-400/8", text: "text-yellow-400", border: "border-yellow-400/20" },
  warning:    { bg: "bg-orange-400/8", text: "text-orange-400", border: "border-orange-400/20" },
  strategy:   { bg: "bg-blue-400/8",   text: "text-blue-400",   border: "border-blue-400/20" },
  closing:    { bg: "bg-purple-400/8", text: "text-purple-400", border: "border-purple-400/20" },
};
const PRIO: Record<SalesInsight["priority"], string> = {
  high: "bg-red-400", medium: "bg-yellow-400", low: "bg-muted-foreground",
};

/* ── Avatar ──────────────────────────────────────────────────── */
function Avatar({ name, photo, size = 10 }: { name: string; photo?: string; size?: number }) {
  const sz = `size-${size}`;
  if (photo) {
    return <img src={photo} alt={name} className={cn(sz, "shrink-0 rounded-full object-cover")} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  return (
    <span className={cn(sz, "shrink-0 flex items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary")}>
      {initials(name)}
    </span>
  );
}

/* ── Bolha de mensagem ───────────────────────────────────────── */
function Bubble({ msg }: { msg: RawMsg }) {
  const isOut = msg.fromMe;
  const type  = msg.msgType ?? "text";
  return (
    <div className={cn("flex w-full", isOut ? "justify-end" : "justify-start")}>
      <div className={cn(
        "relative max-w-[72%] min-w-[80px] rounded-2xl shadow-sm overflow-hidden",
        isOut ? "rounded-tr-sm bg-[#005c4b] text-white" : "rounded-tl-sm bg-[#1e2c35] text-white",
      )}>
        {/* Imagem */}
        {type === "image" && (
          msg.mediaUrl
            ? <img src={msg.mediaUrl} alt={msg.mediaCaption ?? "img"} className="w-full max-w-[260px] block object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            : <div className="flex items-center gap-2 px-3.5 py-2.5 opacity-70"><ImageIcon className="size-5" /><span className="text-sm italic">Imagem</span></div>
        )}
        {/* Áudio */}
        {type === "audio" && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 min-w-[180px]">
            <div className="flex size-9 items-center justify-center rounded-full bg-white/20 shrink-0"><Mic className="size-4" /></div>
            {msg.mediaUrl ? <audio controls src={msg.mediaUrl} className="h-8 flex-1 min-w-0" /> : <span className="text-sm italic opacity-70">Áudio</span>}
          </div>
        )}
        {/* Documento */}
        {type === "document" && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
            <div className="flex size-9 items-center justify-center rounded-full bg-white/20 shrink-0"><FileText className="size-4" /></div>
            <div className="min-w-0"><p className="truncate text-sm font-medium">{msg.fileName ?? "Documento"}</p><p className="text-[10px] opacity-60">Arquivo</p></div>
          </div>
        )}
        {/* Vídeo */}
        {type === "video" && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5">
            <div className="flex size-9 items-center justify-center rounded-full bg-white/20 shrink-0"><Video className="size-4" /></div>
            <span className="text-sm italic opacity-80">{msg.mediaCaption ?? "Vídeo"}</span>
          </div>
        )}
        {/* Texto */}
        {type === "text" && (
          <p className="px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
        )}
        {/* Caption de imagem */}
        {type === "image" && msg.mediaCaption && (
          <p className="px-3.5 pb-2 pt-1 text-sm">{msg.mediaCaption}</p>
        )}
        {/* Rodapé */}
        <div className="flex items-center justify-end gap-1 px-3 pb-1.5 -mt-1">
          <span className="text-[10px] text-white/50">
            {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isOut && <CheckCheck className="size-3.5 text-[#53bdeb]" />}
        </div>
      </div>
    </div>
  );
}

/* ── Painel IA ───────────────────────────────────────────────── */
function AiPanel({ conv, msgs, onUseSuggestion }: { conv: Conv; msgs: RawMsg[]; onUseSuggestion: (t: string) => void }) {
  const [expanded, setExpanded] = useState<number | null>(0);
  const { contacts, deals, pipelines } = useStore();

  const contact = contacts.find((c) => c.name === conv.contact);
  const deal    = deals.find((d) => d.contact === conv.contact && d.status === "open");
  const stage   = deal ? pipelines[0]?.stages.find((s) => s.id === deal.stageId)?.name : undefined;
  const inMsgs  = msgs.filter((m) => !m.fromMe).map((m) => ({ text: m.text, time: new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }));
  const outMsgs = msgs.filter((m) => m.fromMe).map((m) => ({ text: m.text, time: new Date(m.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }));

  const insights = analyzeConversation({
    contactName: conv.contact, contactScore: contact?.score ?? 50,
    contactSource: contact?.source ?? conv.channel, contactTags: contact?.tags ?? [],
    dealStage: stage, dealValue: deal?.value, totalMessages: msgs.length,
    inMessages: inMsgs, outMessages: outMsgs,
    lastInText: inMsgs[inMsgs.length - 1]?.text ?? "",
    lastOutText: outMsgs[outMsgs.length - 1]?.text ?? "",
    channel: conv.channel,
  });

  const highCount = insights.filter((i) => i.priority === "high").length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-[#16162a]/80 px-4 py-3">
        <Sparkles className="size-3.5 text-primary" />
        <span className="text-xs font-bold text-primary">IA Closer Sênior</span>
        {highCount > 0 && <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">{highCount} urgente{highCount > 1 ? "s" : ""}</span>}
        <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">{insights.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {insights.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Sparkles className="size-8 text-muted-foreground/20" />
            <p className="text-xs text-muted-foreground">Aguardando mensagens para análise.</p>
          </div>
        )}
        {insights.map((ins, i) => {
          const Icon = INSIGHT_ICONS[ins.type];
          const col  = INSIGHT_COLORS[ins.type];
          const open = expanded === i;
          return (
            <div key={i} className={cn("rounded-xl border text-xs transition-all", col.bg, col.border)}>
              <button className="flex w-full items-start gap-2 p-3 text-left" onClick={() => setExpanded(open ? null : i)}>
                <Icon className={cn("mt-0.5 size-3.5 shrink-0", col.text)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className={cn("text-[11px] font-semibold leading-tight", col.text)}>{ins.title}</p>
                    <span className={cn("size-1.5 shrink-0 rounded-full", PRIO[ins.priority])} />
                  </div>
                  {ins.tag && <span className="mt-0.5 block rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-muted-foreground w-fit">{ins.tag}</span>}
                </div>
                {open ? <ChevronUp className="size-3 mt-0.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-3 mt-0.5 shrink-0 text-muted-foreground" />}
              </button>
              {open && (
                <div className="border-t border-white/10 px-3 pb-3 pt-2 space-y-2">
                  <p className="leading-relaxed text-foreground/80">{ins.body}</p>
                  {ins.framework && <p className="text-[9px] text-muted-foreground/60 italic">📚 {ins.framework}</p>}
                  {ins.cta && (
                    <>
                      <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5 text-[11px] italic text-foreground/70 leading-relaxed">&ldquo;{ins.cta}&rdquo;</div>
                      <button onClick={() => { onUseSuggestion(ins.cta!); toast.success("Sugestão copiada para o campo de mensagem"); }} className="w-full rounded-lg bg-primary/15 px-2.5 py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/25">
                        Usar esta mensagem →
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Modal lead ──────────────────────────────────────────────── */
function LeadModal({ name, onClose }: { name: string; onClose: () => void }) {
  const { contacts, deals } = useStore();
  const c = contacts.find((x) => x.name === name);
  const ds = deals.filter((d) => d.contact === name);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-[#1a1a2e] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Detalhes do Lead</h2>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-white/10"><X className="size-4" /></button>
        </div>
        {c ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">{initials(c.name)}</span>
              <div className="min-w-0 flex-1"><p className="font-semibold truncate">{c.name}</p><p className="text-sm text-muted-foreground truncate">{c.company || "—"}</p></div>
              <div className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 shrink-0">
                <span className="text-xs font-bold text-primary">Score</span>
                <span className="font-display text-base font-extrabold text-primary">{c.score}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-muted-foreground">E-mail</p><p className="truncate">{c.email || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Telefone</p><p>{c.phone || "—"}</p></div>
              <div><p className="text-xs text-muted-foreground">Origem</p><p>{c.source}</p></div>
              <div><p className="text-xs text-muted-foreground">Responsável</p><p>{c.owner}</p></div>
            </div>
            {c.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{c.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>}
            {ds.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Negócios</p>
                {ds.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-sm truncate mr-2">{d.title}</span>
                    <span className="font-display text-sm font-bold text-primary shrink-0">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(d.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : <p className="text-sm text-muted-foreground">Contato não encontrado no CRM.</p>}
      </div>
    </div>
  );
}

/* ── Chat panel ──────────────────────────────────────────────── */
function ChatPanel({ conv, msgs, sending, onSend, showAi, onToggleAi, draft, setDraft }: {
  conv: Conv; msgs: RawMsg[]; sending: boolean;
  onSend: (text: string) => void;
  showAi: boolean; onToggleAi: () => void;
  draft: string; setDraft: (v: string) => void;
}) {
  const [showLead, setShowLead] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const meta      = CH[conv.channel];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  useEffect(() => { if (draft) inputRef.current?.focus(); }, [draft]);

  function handleCall() {
    const c = useStore.getState().contacts.find((x) => x.name === conv.contact);
    toast.info(c?.phone ? `Ligar: ${c.phone}` : `Ligar para ${conv.contact}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    onSend(draft.trim());
    setDraft("");
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border bg-[#111827]/60 px-4 py-3">
        <span className="relative shrink-0">
          <Avatar name={conv.contact} photo={conv.photo} size={10} />
          <span className={cn("absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background", meta.ring)}>
            <meta.Icon className="size-2.5" />
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold truncate">{conv.contact}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{conv.phone}</span>
            <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", meta.chip)}>
              <meta.Icon className="size-2.5" /> {meta.label}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={handleCall}><Phone className="size-3.5" /></Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={() => setShowLead(true)}><ExternalLink className="size-3.5" /></Button>
          <Button variant={showAi ? "default" : "ghost"} size="sm" onClick={onToggleAi} className="h-8 gap-1 px-2.5">
            {showAi ? <PanelRightClose className="size-3.5" /> : <PanelRightOpen className="size-3.5" />}
            <Sparkles className="size-3" />
          </Button>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto space-y-1 p-4" style={{ background: "radial-gradient(ellipse at top, rgba(229,147,19,0.03), transparent 60%)" }}>
        {msgs.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
          </div>
        )}
        {msgs.map((m) => <Bubble key={m.id} msg={m} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-border bg-[#111827]/60 p-3">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Mensagem para ${conv.contact.split(" ")[0]}...`}
          className="h-10 flex-1 min-w-0 rounded-xl border border-input bg-background/80 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (draft.trim() && !sending) { onSend(draft.trim()); setDraft(""); } } }}
          disabled={sending}
        />
        <Button type="submit" size="icon" className="size-10 shrink-0 rounded-xl" disabled={!draft.trim() || sending}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>

      {showLead && <LeadModal name={conv.contact} onClose={() => setShowLead(false)} />}
    </div>
  );
}

/* ── InboxView principal ─────────────────────────────────────── */
export function InboxView() {
  const hydrated          = useHydrated();
  const connectedChannels = useStore((s) => s.connectedChannels);

  const [activeCh, setActiveCh]         = useState<Channel>("whatsapp");
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [showAi, setShowAi]             = useState(true);
  const [draft, setDraft]               = useState("");
  const [search, setSearch]             = useState("");
  const [sending, setSending]           = useState(false);

  // Fonte de verdade: todas as mensagens do Supabase, indexadas por id
  const [msgMap, setMsgMap]   = useState<Map<string, RawMsg>>(new Map());
  // Conversas derivadas das mensagens
  const [convMap, setConvMap] = useState<Map<string, Conv>>(new Map());
  // Controle do polling
  const lastTsRef  = useRef(0);
  const loadedRef  = useRef(false);

  const isConnected = (ch: Channel) =>
    !hydrated || connectedChannels.some((c) => c.type === ch);

  /* ── Processa mensagens recebidas e atualiza maps ────────── */
  const processmsgs = useCallback((incoming: RawMsg[], isInitial: boolean) => {
    if (incoming.length === 0) return;

    setMsgMap((prev) => {
      const next = new Map(prev);
      for (const m of incoming) next.set(m.id, m);
      return next;
    });

    setConvMap((prev) => {
      const next = new Map(prev);
      for (const m of incoming) {
        const convId = `${m.channel}-${m.from}`;
        const existing = next.get(convId);
        const isNewer  = !existing || m.timestamp > existing.lastTime;
        next.set(convId, {
          id:       convId,
          phone:    m.from,
          // Preserva o nome real do contato — não sobrescreve com "Eu" de mensagens fromMe
          contact:  m.fromMe ? (existing?.contact ?? m.fromName) : m.fromName,
          channel:  m.channel,
          lastText: isNewer ? m.text : existing!.lastText,
          lastTime: isNewer ? m.timestamp : existing!.lastTime,
          unread:   existing
            ? (!m.fromMe && !isInitial ? existing.unread + 1 : existing.unread)
            : 1,
          photo: m.senderPhoto ?? existing?.photo,
        });
      }
      return next;
    });

    // Atualiza lastTs
    const maxTs = Math.max(...incoming.map((m) => m.timestamp));
    if (maxTs > lastTsRef.current) lastTsRef.current = maxTs;
  }, []);

  /* ── Carga inicial e polling ─────────────────────────────── */
  useEffect(() => {
    async function load(since: number) {
      try {
        const res = await fetch(`/api/inbox/messages?since=${since}`);
        if (!res.ok) return;
        const data = await res.json() as RawMsg[];
        if (data.length === 0) return;
        processmsgs(data, !loadedRef.current);
        if (!loadedRef.current) {
          loadedRef.current = true;
          // Seleciona primeira conversa do canal ativo
          const first = data.find((m) => m.channel === activeCh && !m.fromMe);
          if (first) setActiveConvId(`${first.channel}-${first.from}`);
        }
      } catch { /* offline */ }
    }

    load(0); // carga inicial
    const interval = setInterval(() => load(lastTsRef.current), 4000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Seleciona primeira conversa ao trocar canal ─────────── */
  useEffect(() => {
    const first = [...convMap.values()].find((c) => c.channel === activeCh);
    if (first && activeConvId !== first.id) {
      const currentConv = convMap.get(activeConvId);
      if (!currentConv || currentConv.channel !== activeCh) {
        setActiveConvId(first.id);
      }
    }
  }, [activeCh, convMap, activeConvId]);

  /* ── Registra lead no CRM ────────────────────────────────── */
  function registerLead(conv: Conv, firstMsg: string) {
    const state = useStore.getState();
    const exists = state.contacts.find((c) => c.name.toLowerCase() === conv.contact.toLowerCase());
    if (!exists) {
      state.addContact({ name: conv.contact, email: "", phone: conv.phone, company: "", source: CH[conv.channel].label, score: 10, owner: DEFAULT_OWNER, tags: [conv.channel] });
    }
    const dealExists = state.deals.find((d) => d.contact === conv.contact && d.status === "open");
    if (!dealExists && state.pipelines.length > 0) {
      const pipeline = state.pipelines[0];
      const stage    = pipeline.stages.find((s) => s.name.toLowerCase().includes("novo") || s.name.toLowerCase().includes("new")) ?? pipeline.stages[0];
      if (stage) state.addDeal({ title: `${conv.contact} — ${CH[conv.channel].label}`, value: 0, pipelineId: pipeline.id, stageId: stage.id, contact: conv.contact, owner: DEFAULT_OWNER, tags: [conv.channel], notes: `Primeira mensagem: "${firstMsg.slice(0, 120)}"` });
    }
  }

  /* ── Envio de mensagem ───────────────────────────────────── */
  async function handleSend(text: string) {
    const conv = convMap.get(activeConvId);
    if (!conv) return;
    setSending(true);

    // Mensagem otimista com ID estável — fica no map até o poll substituir
    const optimisticId = `opt-${Date.now()}`;
    const tsNow = Date.now();
    const optimistic: RawMsg = {
      id: optimisticId, channel: conv.channel, from: conv.phone,
      // fromName igual ao da conversa — evita criar conversa duplicada no processmsgs
      fromName: conv.contact, text, timestamp: tsNow,
      fromMe: true, msgType: "text",
    };
    setMsgMap((prev) => new Map(prev).set(optimisticId, optimistic));
    // Avança o lastTs para que o próximo poll busque a partir daqui
    if (tsNow > lastTsRef.current) lastTsRef.current = tsNow - 1;

    try {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: conv.phone, text, contactName: conv.contact }),
      });
      const data = await res.json();

      if (data.ok) {
        // Substitui otimista pelo registro real do Supabase
        setMsgMap((prev) => {
          const next = new Map(prev);
          next.delete(optimisticId);
          if (data.msg) {
            next.set(data.msg.id, {
              ...optimistic,
              id: data.msg.id,
              timestamp: data.msg.timestamp ?? tsNow,
            });
          }
          return next;
        });
        if (data.zapiOk) {
          toast.success("Mensagem enviada pelo WhatsApp");
        } else {
          toast.warning("Salvo no sistema, mas Z-API retornou erro — verifique os logs");
        }
      } else {
        // Remove otimista se falhou
        setMsgMap((prev) => { const next = new Map(prev); next.delete(optimisticId); return next; });
        toast.error(data.error ?? "Erro ao enviar mensagem");
      }
    } catch {
      setMsgMap((prev) => { const next = new Map(prev); next.delete(optimisticId); return next; });
      toast.error("Falha de conexão ao enviar");
    } finally {
      setSending(false);
    }

    // Avança deal no funil
    const state = useStore.getState();
    const deal  = state.deals.find((d) => d.contact === conv.contact && d.status === "open");
    if (deal) {
      const pipeline  = state.pipelines.find((p) => p.id === deal.pipelineId);
      const msgs      = [...msgMap.values()].filter((m) => `${m.channel}-${m.from}` === activeConvId);
      const isFirst   = pipeline?.stages[0]?.id === deal.stageId;
      if (isFirst && msgs.length >= 1 && pipeline && pipeline.stages.length > 1) {
        state.moveDeal(deal.id, pipeline.stages[1].id);
      }
    }
  }

  /* ── Dados derivados ─────────────────────────────────────── */
  const allConvs = [...convMap.values()].sort((a, b) => b.lastTime - a.lastTime);
  const chConvs  = allConvs
    .filter((c) => c.channel === activeCh)
    .filter((c) => !search || c.contact.toLowerCase().includes(search.toLowerCase()));
  const activeConv = convMap.get(activeConvId) ?? null;
  const activeMsgs = activeConv
    ? [...msgMap.values()]
        .filter((m) => `${m.channel}-${m.from}` === activeConvId)
        .sort((a, b) => a.timestamp - b.timestamp)
    : [];

  const unread = (ch: Channel) => allConvs.filter((c) => c.channel === ch && c.unread > 0).length;
  const totalUnread = allConvs.reduce((s, c) => s + c.unread, 0);

  // Mobile: controla se mostra lista ou chat
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  function openConv(convId: string) {
    setActiveConvId(convId);
    setConvMap((prev) => {
      const next = new Map(prev);
      const conv = next.get(convId);
      if (conv) next.set(convId, { ...conv, unread: 0 });
      return next;
    });
    const conv = convMap.get(convId);
    if (conv) {
      const msgs = [...msgMap.values()].filter((m) => `${m.channel}-${m.from}` === convId);
      const first = msgs.sort((a, b) => a.timestamp - b.timestamp)[0];
      if (first) registerLead(conv, first.text);
    }
    setMobileView("chat");
  }

  // Lista de conversas — compartilhada entre mobile e desktop
  const ConvList = () => (
    <div className="flex h-full flex-col bg-[#0d1117]">
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversa..." className="h-9 w-full rounded-xl border border-input bg-secondary/40 pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chConvs.length === 0 && (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <MessageCircleMore className="size-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">{search ? `Nenhum resultado para "${search}"` : "Nenhuma conversa ainda"}</p>
          </div>
        )}
        {chConvs.map((c) => {
          const meta   = CH[c.channel];
          const active = activeConvId === c.id;
          return (
            <button
              key={c.id}
              onClick={() => openConv(c.id)}
              className={cn(
                "flex w-full items-center gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors",
                active ? "bg-primary/[0.08] border-l-2 border-l-primary" : "hover:bg-white/[0.03]"
              )}
            >
              <span className="relative shrink-0">
                <Avatar name={c.contact} photo={c.photo} size={10} />
                <span className={cn("absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-background", meta.ring)}>
                  <meta.Icon className="size-2" />
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className={cn("truncate text-sm", c.unread > 0 ? "font-bold" : "font-medium text-foreground/80")}>{c.contact}</p>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(c.lastTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className={cn("truncate text-xs mt-0.5", c.unread > 0 ? "text-foreground/70" : "text-muted-foreground")}>{c.lastText}</p>
              </div>
              {c.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">{c.unread}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100svh-7rem)] flex-col overflow-hidden rounded-2xl border border-border bg-[#0d1117]">

      {/* Abas de canal */}
      <div className="flex shrink-0 items-center border-b border-border bg-[#111827]/80 px-2 pt-1 sm:px-4">
        {/* Botão voltar mobile */}
        {mobileView === "chat" && (
          <button
            className="mr-2 flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-white/[0.06] sm:hidden"
            onClick={() => setMobileView("list")}
          >
            <X className="size-3.5" /> Voltar
          </button>
        )}
        <div className={cn("flex items-center gap-1.5 mr-3 pb-1 shrink-0", mobileView === "chat" && "hidden sm:flex")}>
          <MessageCircleMore className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Inbox</span>
          {totalUnread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{totalUnread}</span>
          )}
        </div>
        <div className={cn("flex items-center gap-0.5 overflow-x-auto", mobileView === "chat" && "hidden sm:flex")}>
          {CH_ORDER.map((ch) => {
            const meta   = CH[ch];
            const active = activeCh === ch;
            const u      = unread(ch);
            const linked = isConnected(ch);
            return (
              <button
                key={ch}
                onClick={() => { setActiveCh(ch); setMobileView("list"); }}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-2.5 py-2.5 text-xs font-medium transition-all sm:px-3",
                  active ? "border-primary bg-primary/[0.07] text-primary" : "border-transparent text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                )}
              >
                <meta.Logo className="size-3.5 rounded" />
                <span className="hidden sm:inline">{meta.label}</span>
                {u > 0 && linked && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{u}</span>}
                {!linked && <span className="rounded-full border border-border px-1 text-[8px] text-muted-foreground/60">off</span>}
              </button>
            );
          })}
        </div>
        {/* Nome do contato no header mobile quando no chat */}
        {mobileView === "chat" && activeConv && (
          <div className="flex min-w-0 flex-1 items-center gap-2 pb-1 sm:hidden">
            <Avatar name={activeConv.contact} photo={activeConv.photo} size={7} />
            <span className="truncate text-sm font-semibold">{activeConv.contact}</span>
          </div>
        )}
      </div>

      {/* Corpo */}
      <div className="flex flex-1 overflow-hidden">
        {!isConnected(activeCh) ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            {(() => { const ChLogo = CH[activeCh].Logo; return <ChLogo className="size-12 opacity-50" />; })()}
            <div>
              <p className="font-display text-base font-bold">{CH[activeCh].label} não conectado</p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">Conecte nas configurações para receber mensagens aqui.</p>
            </div>
            <Link href="/configuracoes?tab=canais"><Button variant="outline" size="sm" className="gap-2"><PlugZap className="size-4" /> Conectar agora</Button></Link>
          </div>
        ) : (
          <>
            {/* MOBILE: lista OU chat (nunca os dois) */}
            <div className={cn("flex w-full flex-col sm:hidden", mobileView !== "list" && "hidden")}>
              <ConvList />
            </div>
            <div className={cn("flex w-full flex-col sm:hidden", mobileView !== "chat" && "hidden")}>
              {activeConv ? (
                <ChatPanel
                  conv={activeConv} msgs={activeMsgs} sending={sending}
                  onSend={handleSend} showAi={false} onToggleAi={() => {}}
                  draft={draft} setDraft={setDraft}
                />
              ) : null}
            </div>

            {/* DESKTOP: 3 painéis lado a lado */}
            <div className="hidden sm:flex sm:w-72 sm:shrink-0 sm:flex-col sm:border-r sm:border-border">
              <ConvList />
            </div>

            {/* Chat desktop */}
            <div className="hidden sm:flex sm:min-w-0 sm:flex-1 sm:overflow-hidden">
              {activeConv ? (
                <div className="flex min-w-0 flex-1 overflow-hidden">
                  <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <ChatPanel
                      conv={activeConv} msgs={activeMsgs} sending={sending}
                      onSend={handleSend} showAi={showAi}
                      onToggleAi={() => setShowAi((v) => !v)}
                      draft={draft} setDraft={setDraft}
                    />
                  </div>
                  {showAi && (
                    <div className="flex w-[280px] shrink-0 flex-col border-l border-border bg-[#0d1117] xl:w-[300px]">
                      <AiPanel conv={activeConv} msgs={activeMsgs} onUseSuggestion={setDraft} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                  <MessageCircleMore className="size-12 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">Selecione uma conversa</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
