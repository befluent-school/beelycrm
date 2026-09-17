"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, initials } from "@/lib/utils";
import { useStore, useHydrated } from "@/lib/store";
import { TransferLeadDialog } from "@/components/app/transfer-lead-dialog";
import {
  Send, Loader2, ArrowLeft, UserCog, Search, MessageSquareOff, Image as ImageIcon,
  Mic, FileText, Video as VideoIcon, RefreshCw,
} from "lucide-react";

/* ── Tipos espelhando message-store.ts (client-safe, sem importar o server) ── */
interface InboxMessage {
  id: string;
  channel: "whatsapp" | "instagram" | "messenger";
  from: string;
  fromName: string;
  text: string;
  timestamp: number;
  fromMe?: boolean;
  msgType?: "text" | "image" | "audio" | "document" | "video";
  mediaUrl?: string;
  mediaCaption?: string;
  fileName?: string;
  isLid?: boolean;
  sdrId?: string;
  threadKey?: string;
}

interface Thread {
  threadKey: string;
  sdrId?: string;
  phone: string;
  contactName: string;
  lastText: string;
  lastTimestamp: number;
  lastFromMe: boolean;
  unread: number;
}

const POLL_MS = 8000;

function timeLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  return isToday
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function MediaIcon({ type }: { type?: InboxMessage["msgType"] }) {
  if (type === "image") return <ImageIcon className="size-3.5" />;
  if (type === "audio") return <Mic className="size-3.5" />;
  if (type === "video") return <VideoIcon className="size-3.5" />;
  if (type === "document") return <FileText className="size-3.5" />;
  return null;
}

export function InboxView() {
  const hydrated = useHydrated();
  const sdrs = useStore((s) => s.sdrs);
  const contacts = useStore((s) => s.contacts);

  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sdrFilter, setSdrFilter] = useState<string | "all">("all");
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const sinceRef = useRef(0);

  async function load(initial = false) {
    try {
      const res = await fetch(`/api/inbox/messages${sinceRef.current ? `?since=${sinceRef.current}` : ""}`);
      const data: InboxMessage[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setMessages((prev) => {
          const merged = initial ? data : [...prev, ...data];
          const byId = new Map(merged.map((m) => [m.id, m]));
          return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
        });
        sinceRef.current = Math.max(...data.map((m) => m.timestamp));
      }
    } catch {
      /* polling silencioso — não interrompe a UI */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), POLL_MS);
    return () => clearInterval(id);
  }, []);

  /* ── Agrega mensagens em threads (client-side, mesma lógica de getThreads) ── */
  const threads = useMemo<Thread[]>(() => {
    const byThread = new Map<string, Thread>();
    for (const m of messages) {
      const key = m.threadKey ?? (m.sdrId ? `${m.sdrId}:${m.from}` : m.from);
      const existing = byThread.get(key);
      if (!existing || m.timestamp >= existing.lastTimestamp) {
        byThread.set(key, {
          threadKey: key, sdrId: m.sdrId, phone: m.from,
          contactName: m.fromName || m.from, lastText: m.text,
          lastTimestamp: m.timestamp, lastFromMe: m.fromMe ?? false,
          unread: existing?.unread ?? 0,
        });
      }
    }
    const lastOut = new Map<string, number>();
    for (const m of messages) {
      if (!m.fromMe) continue;
      const key = m.threadKey ?? (m.sdrId ? `${m.sdrId}:${m.from}` : m.from);
      lastOut.set(key, Math.max(lastOut.get(key) ?? 0, m.timestamp));
    }
    for (const m of messages) {
      if (m.fromMe) continue;
      const key = m.threadKey ?? (m.sdrId ? `${m.sdrId}:${m.from}` : m.from);
      if (m.timestamp > (lastOut.get(key) ?? 0)) {
        const t = byThread.get(key);
        if (t) t.unread += 1;
      }
    }
    return [...byThread.values()].sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }, [messages]);

  const sdrCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of threads) {
      if (!t.sdrId) continue;
      map.set(t.sdrId, (map.get(t.sdrId) ?? 0) + t.unread);
    }
    return map;
  }, [threads]);

  const filteredThreads = useMemo(() => {
    let list = threads;
    if (sdrFilter !== "all") list = list.filter((t) => t.sdrId === sdrFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.contactName.toLowerCase().includes(q) || t.phone.includes(q));
    }
    return list;
  }, [threads, sdrFilter, search]);

  const currentThread = threads.find((t) => t.threadKey === activeThread) ?? null;
  const threadMessages = useMemo(
    () => messages.filter((m) => (m.threadKey ?? (m.sdrId ? `${m.sdrId}:${m.from}` : m.from)) === activeThread),
    [messages, activeThread]
  );

  const linkedContact = currentThread
    ? contacts.find((c) => c.phone.replace(/\D/g, "") === currentThread.phone.replace(/\D/g, ""))
    : undefined;
  const sdrOfThread = currentThread?.sdrId ? sdrs.find((s) => s.id === currentThread.sdrId) : undefined;

  async function handleSend() {
    if (!currentThread || !draft.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: currentThread.phone,
          text: draft.trim(),
          contactName: currentThread.contactName,
          sdrId: currentThread.sdrId,
        }),
      });
      const data = await res.json();
      if (data.sendOk === false && data.sendError) {
        toast.error(`Mensagem salva, mas o envio falhou: ${data.sendError}`);
      } else {
        toast.success("Mensagem enviada.");
      }
      setDraft("");
      await load(false);
    } catch {
      toast.error("Falha ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  if (!hydrated) return null;

  return (
    <div className="flex h-[calc(100svh-3.5rem)] overflow-hidden">
      {/* Coluna 1 — SDRs */}
      <aside className={cn(
        "w-56 shrink-0 flex-col border-r border-border/70 bg-[#1a1a1a] lg:flex",
        activeThread ? "hidden" : "hidden md:flex"
      )}>
        <div className="border-b border-border/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SDRs</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <button
            onClick={() => setSdrFilter("all")}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
              sdrFilter === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/[0.05]"
            )}
          >
            Todos os SDRs
            {threads.reduce((s, t) => s + t.unread, 0) > 0 && (
              <Badge variant="default" className="h-5 px-1.5 text-[10px]">{threads.reduce((s, t) => s + t.unread, 0)}</Badge>
            )}
          </button>
          {sdrs.map((sdr) => (
            <button
              key={sdr.id}
              onClick={() => setSdrFilter(sdr.id)}
              className={cn(
                "mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                sdrFilter === sdr.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-white/[0.05]",
                !sdr.active && "opacity-50"
              )}
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ background: sdr.avatarColor || "#E59313" }}
              >
                {sdr.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 truncate text-left">{sdr.name}</span>
              {(sdrCounts.get(sdr.id) ?? 0) > 0 && (
                <Badge variant="default" className="h-5 px-1.5 text-[10px]">{sdrCounts.get(sdr.id)}</Badge>
              )}
            </button>
          ))}
          {sdrs.length === 0 && (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              Nenhum SDR cadastrado. Vá em Configurações → SDRs &amp; WhatsApp.
            </p>
          )}
        </nav>
      </aside>

      {/* Coluna 2 — Conversas */}
      <section className={cn(
        "w-full shrink-0 flex-col border-r border-border/70 md:w-80 lg:flex",
        activeThread ? "hidden md:flex" : "flex"
      )}>
        <div className="flex items-center gap-2 border-b border-border/70 p-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => load(false)} title="Atualizar">
            <RefreshCw className="size-3.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <MessageSquareOff className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
              <p className="text-xs text-muted-foreground/70">Mensagens recebidas via WhatsApp aparecem aqui automaticamente.</p>
            </div>
          ) : (
            filteredThreads.map((t) => {
              const sdr = t.sdrId ? sdrs.find((s) => s.id === t.sdrId) : undefined;
              return (
                <button
                  key={t.threadKey}
                  onClick={() => setActiveThread(t.threadKey)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/40 px-3 py-3 text-left transition-colors hover:bg-white/[0.03]",
                    activeThread === t.threadKey && "bg-primary/10"
                  )}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                    {initials(t.contactName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{t.contactName}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{timeLabel(t.lastTimestamp)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {t.lastFromMe && "Você: "}{t.lastText}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {sdr && <Badge variant="outline" className="h-4 px-1 text-[9px]">{sdr.name}</Badge>}
                      {t.unread > 0 && <Badge variant="default" className="h-4 px-1.5 text-[9px]">{t.unread}</Badge>}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* Coluna 3 — Chat */}
      <section className={cn("flex-1 flex-col lg:flex", activeThread ? "flex" : "hidden md:flex")}>
        {!currentThread ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MessageSquareOff className="size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Selecione uma conversa para começar.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-border/70 p-3">
              <Button variant="ghost" size="icon" className="size-8 shrink-0 md:hidden" onClick={() => setActiveThread(null)}>
                <ArrowLeft className="size-4" />
              </Button>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                {initials(currentThread.contactName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{currentThread.contactName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {currentThread.phone}{sdrOfThread ? ` · atendido por ${sdrOfThread.name}` : ""}
                </p>
              </div>
              <Button
                variant="outline" size="sm" className="shrink-0 gap-1.5"
                onClick={() => setTransferOpen(true)}
                disabled={!linkedContact}
                title={linkedContact ? "Transferir para outro SDR" : "Sem contato vinculado a este número"}
              >
                <UserCog className="size-3.5" /> Transferir
              </Button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {threadMessages.map((m) => (
                <div key={m.id} className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                    m.fromMe ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                  )}>
                    {m.msgType && m.msgType !== "text" && (
                      <div className="mb-1 flex items-center gap-1 text-[10px] opacity-70">
                        <MediaIcon type={m.msgType} /> {m.msgType}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <p className={cn("mt-1 text-right text-[10px]", m.fromMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                      {timeLabel(m.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {threadMessages.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">Sem mensagens nesta conversa ainda.</p>
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border/70 p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Escreva uma mensagem..."
                className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button size="icon" className="size-10 shrink-0 rounded-full" onClick={handleSend} disabled={!draft.trim() || sending}>
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </>
        )}
      </section>

      <TransferLeadDialog
        contactId={linkedContact?.id ?? null}
        contactName={linkedContact?.name ?? currentThread?.contactName}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
    </div>
  );
}
