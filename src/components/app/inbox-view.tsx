"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, initials } from "@/lib/utils";
import { useStore, useHydrated } from "@/lib/store";
import { TransferLeadDialog } from "@/components/app/transfer-lead-dialog";
import {
  Send, Loader2, ArrowLeft, UserCog, Search, MessageSquareOff, Image as ImageIcon,
  Mic, FileText, Video as VideoIcon, RefreshCw, CalendarDays, X,
  Paperclip, Square, Download,
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
  senderPhoto?: string;
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
  contactPhoto?: string;
  lastText: string;
  lastTimestamp: number;
  lastFromMe: boolean;
  unread: number;
}

/** Avatar estilo WhatsApp: foto do contato quando disponível, senão iniciais. */
function ContactAvatar({ name, photo, size = "size-9" }: { name: string; photo?: string; size?: string }) {
  const [broken, setBroken] = useState(false);
  if (photo && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- fotos de perfil do WhatsApp (domínio externo pps.whatsapp.net), sem otimização
      <img
        src={photo}
        alt={name}
        className={cn(size, "shrink-0 rounded-full object-cover")}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className={cn(size, "flex shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary")}>
      {initials(name)}
    </span>
  );
}

const POLL_MS = 8000;

/** Modo de filtro por data da conversa. */
type DateFilterMode = "lastMsg" | "firstMsg";

interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

/** Converte YYYY-MM-DD para timestamp ms no início do dia (00:00:00 local). */
function dateToStartMs(d: string): number {
  return new Date(d + "T00:00:00").getTime();
}
/** Converte YYYY-MM-DD para timestamp ms no final do dia (23:59:59 local). */
function dateToEndMs(d: string): number {
  return new Date(d + "T23:59:59").getTime();
}

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

  // ── Scroll automático ────────────────────────────────────────────────────
  const chatBottomRef = useRef<HTMLDivElement>(null);
  // Âncora de contagem de mensagens da thread ativa — atualizada após o useMemo
  const threadMsgCountRef = useRef(0);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    chatBottomRef.current?.scrollIntoView({ behavior });
  }
  // Rola ao trocar de thread
  useEffect(() => { scrollToBottom("instant"); }, [activeThread]);

  // ── Envio de mídia (arquivo) ─────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // ── Gravação de áudio ────────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ── Filtro de data ───────────────────────────────────────────────────────
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("lastMsg");
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });
  // firstTimestamps: mapa threadKey → timestamp ms da primeira mensagem
  const [firstTimestamps, setFirstTimestamps] = useState<Record<string, number>>({});

  const hasDateFilter = dateRange.from !== "" || dateRange.to !== "";

  function clearDateFilter() {
    setDateRange({ from: "", to: "" });
    setDateFilterOpen(false);
  }

  // Quando o filtro é por data da ÚLTIMA mensagem, passamos ?from=&to= para a API
  // e filtramos no servidor. Quando é por data da PRIMEIRA mensagem, carregamos
  // o mapa firstTimestamps e filtramos client-side nas threads.
  const buildApiUrl = useCallback((initial: boolean) => {
    if (!hasDateFilter || dateFilterMode === "firstMsg") {
      // sem filtro de data (ou filtro de 1ª msg que filtra client-side)
      return `/api/inbox/messages${sinceRef.current && !initial ? `?since=${sinceRef.current}` : ""}`;
    }
    const params = new URLSearchParams();
    if (dateRange.from) params.set("from", String(dateToStartMs(dateRange.from)));
    if (dateRange.to)   params.set("to",   String(dateToEndMs(dateRange.to)));
    return `/api/inbox/messages?${params.toString()}`;
  }, [hasDateFilter, dateFilterMode, dateRange]);

  const load = useCallback(async (initial = false) => {
    try {
      const url = buildApiUrl(initial);
      const res = await fetch(url);
      const data: InboxMessage[] = await res.json();
      if (Array.isArray(data)) {
        setMessages((prev) => {
          // em filtro server-side por data: substitui completamente
          const merged = (initial || hasDateFilter) ? data : [...prev, ...data];
          const byId = new Map(merged.map((m) => [m.id, m]));
          return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
        });
        if (data.length > 0 && !hasDateFilter) {
          sinceRef.current = Math.max(...data.map((m) => m.timestamp));
        }
      }
    } catch {
      /* polling silencioso — não interrompe a UI */
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, hasDateFilter]);

  // Carrega firstTimestamps quando o modo é "firstMsg" e há filtro ativo
  useEffect(() => {
    if (!hasDateFilter || dateFilterMode !== "firstMsg") return;
    fetch("/api/inbox/messages?firstTimestamps=1")
      .then((r) => r.json())
      .then((data) => { if (data && typeof data === "object") setFirstTimestamps(data); })
      .catch(() => {});
  }, [hasDateFilter, dateFilterMode]);

  // Referência estável para o polling — sempre aponta para a versão mais atual de load.
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  useEffect(() => {
    sinceRef.current = 0;
    setLoading(true);
    load(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange, dateFilterMode]);

  useEffect(() => {
    loadRef.current(true);
    const id = setInterval(() => loadRef.current(false), POLL_MS);
    return () => clearInterval(id);
  }, []);

  /* ── Agrega mensagens em threads (client-side, mesma lógica de getThreads) ──
   * Só conversas com sdrId (associadas a um SDR real) entram no Inbox — isso
   * esconde automaticamente qualquer conversa órfã/antiga anterior ao Inbox
   * multi-SDR, mesmo antes de rodar a limpeza definitiva no banco. */
  const scopedMessages = useMemo(() => messages.filter((m) => !!m.sdrId), [messages]);

  const threads = useMemo<Thread[]>(() => {
    const byThread = new Map<string, Thread>();
    for (const m of scopedMessages) {
      const key = m.threadKey ?? `${m.sdrId}:${m.from}`;
      const existing = byThread.get(key);
      // Mensagens fromMe (enviadas pelo SDR, seja via Beely ou eco do celular)
      // não carregam o nome/foto real do WhatsApp do lead — fromName nessas
      // vem só o telefone. Nunca deixa uma mensagem fromMe "degradar" um
      // nome/foto real já visto em mensagem recebida do lead na mesma thread.
      const isRealIdentity = !m.fromMe && !!m.fromName && m.fromName !== m.from;
      const bestName = isRealIdentity ? m.fromName : existing?.contactName ?? (m.fromName || m.from);
      const bestPhoto = (!m.fromMe && m.senderPhoto) || existing?.contactPhoto;
      if (!existing || m.timestamp >= existing.lastTimestamp) {
        byThread.set(key, {
          threadKey: key, sdrId: m.sdrId, phone: m.from,
          contactName: bestName,
          contactPhoto: bestPhoto,
          lastText: m.text,
          lastTimestamp: m.timestamp, lastFromMe: m.fromMe ?? false,
          unread: existing?.unread ?? 0,
        });
      } else if (isRealIdentity || m.senderPhoto) {
        // Mensagem mais antiga que a última, mas ainda traz identidade real
        // que a thread atual não tinha — preenche sem sobrescrever a prévia.
        if (isRealIdentity && (existing.contactName === existing.phone)) existing.contactName = m.fromName;
        if (m.senderPhoto && !existing.contactPhoto) existing.contactPhoto = m.senderPhoto;
      }
    }
    const lastOut = new Map<string, number>();
    for (const m of scopedMessages) {
      if (!m.fromMe) continue;
      const key = m.threadKey ?? `${m.sdrId}:${m.from}`;
      lastOut.set(key, Math.max(lastOut.get(key) ?? 0, m.timestamp));
    }
    for (const m of scopedMessages) {
      if (m.fromMe) continue;
      const key = m.threadKey ?? `${m.sdrId}:${m.from}`;
      if (m.timestamp > (lastOut.get(key) ?? 0)) {
        const t = byThread.get(key);
        if (t) t.unread += 1;
      }
    }
    return [...byThread.values()].sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }, [scopedMessages]);

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
    // Filtro por data da PRIMEIRA mensagem (client-side, usando o mapa carregado)
    if (hasDateFilter && dateFilterMode === "firstMsg") {
      const fromMs = dateRange.from ? dateToStartMs(dateRange.from) : 0;
      const toMs   = dateRange.to   ? dateToEndMs(dateRange.to)     : Infinity;
      list = list.filter((t) => {
        const first = firstTimestamps[t.threadKey];
        if (first == null) return false;
        return first >= fromMs && first <= toMs;
      });
    }
    return list;
  }, [threads, sdrFilter, search, hasDateFilter, dateFilterMode, dateRange, firstTimestamps]);

  const currentThread = threads.find((t) => t.threadKey === activeThread) ?? null;
  const threadMessages = useMemo(
    () => scopedMessages.filter((m) => (m.threadKey ?? `${m.sdrId}:${m.from}`) === activeThread),
    [scopedMessages, activeThread]
  );

  // Scroll suave ao receber novas mensagens na thread ativa
  useEffect(() => {
    if (threadMessages.length > threadMsgCountRef.current) {
      scrollToBottom("smooth");
    }
    threadMsgCountRef.current = threadMessages.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadMessages.length]);

  const linkedContact = currentThread
    ? contacts.find((c) => c.phone.replace(/\D/g, "") === currentThread.phone.replace(/\D/g, ""))
    : undefined;
  const sdrOfThread = currentThread?.sdrId ? sdrs.find((s) => s.id === currentThread.sdrId) : undefined;

  /** Adiciona mensagem ao state local imediatamente (UI otimista) e rola para o final. */
  function addOptimisticMessage(partial: Omit<InboxMessage, "id">) {
    const opt: InboxMessage = { ...partial, id: `opt-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]));
      byId.set(opt.id, opt);
      return [...byId.values()].sort((a, b) => a.timestamp - b.timestamp);
    });
    setTimeout(() => scrollToBottom("smooth"), 50);
  }

  async function handleSend() {
    if (!currentThread || !draft.trim()) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    // UI otimista: mostra a mensagem imediatamente
    addOptimisticMessage({
      channel: "whatsapp", from: currentThread.phone,
      fromName: currentThread.contactName, text,
      timestamp: Date.now(), fromMe: true, msgType: "text",
      sdrId: currentThread.sdrId, threadKey: currentThread.threadKey,
    });
    try {
      const res = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentThread.phone, text, contactName: currentThread.contactName, sdrId: currentThread.sdrId }),
      });
      const data = await res.json();
      if (data.sendOk === false && data.sendError) {
        toast.error(`Mensagem salva, mas o envio falhou: ${data.sendError}`);
      }
      await load(false);
    } catch {
      toast.error("Falha ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function handleSendMedia(file: File) {
    if (!currentThread) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/inbox/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadData.ok) { toast.error(`Falha no upload: ${uploadData.error}`); return; }

      const { mediaUrl, mediaType, fileName } = uploadData;
      // UI otimista
      addOptimisticMessage({
        channel: "whatsapp", from: currentThread.phone,
        fromName: currentThread.contactName,
        text: mediaType === "image" ? "[Imagem]" : mediaType === "audio" ? "[Áudio]" : mediaType === "video" ? "[Vídeo]" : `[${fileName}]`,
        timestamp: Date.now(), fromMe: true, msgType: mediaType,
        mediaUrl, fileName, sdrId: currentThread.sdrId, threadKey: currentThread.threadKey,
      });

      const sendRes = await fetch("/api/inbox/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: currentThread.phone, contactName: currentThread.contactName, sdrId: currentThread.sdrId, mediaUrl, mediaType, fileName }),
      });
      const sendData = await sendRes.json();
      if (sendData.sendOk === false && sendData.sendError) {
        toast.error(`Arquivo salvo, mas envio falhou: ${sendData.sendError}`);
      }
      await load(false);
    } catch {
      toast.error("Falha ao enviar arquivo.");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleStartRecording() {
    if (!navigator.mediaDevices) { toast.error("Microfone não disponível neste navegador."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      setRecordingSeconds(0);
      // timer de segundos
      const interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
      mr.onstop = () => {
        clearInterval(interval);
        stream.getTracks().forEach((t) => t.stop());
      };
    } catch {
      toast.error("Não foi possível acessar o microfone.");
    }
  }

  async function handleStopRecording() {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    setRecording(false);
    mr.stop();
    await new Promise<void>((resolve) => { mr.onstop = () => { resolve(); }; setTimeout(resolve, 500); });
    const blob = new Blob(audioChunksRef.current, { type: "audio/ogg; codecs=opus" });
    const file = new File([blob], `audio-${Date.now()}.ogg`, { type: "audio/ogg" });
    await handleSendMedia(file);
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
          <Button
            variant={hasDateFilter ? "default" : "ghost"}
            size="icon"
            className="size-8 shrink-0"
            onClick={() => setDateFilterOpen((v) => !v)}
            title="Filtrar por data"
          >
            <CalendarDays className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => load(false)} title="Atualizar">
            <RefreshCw className="size-3.5" />
          </Button>
        </div>

        {/* Painel de filtro por data */}
        {dateFilterOpen && (
          <div className="border-b border-border/70 bg-[#111] px-3 py-3 space-y-2.5">
            {/* Modo: última ou primeira mensagem */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setDateFilterMode("lastMsg")}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  dateFilterMode === "lastMsg"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                Última mensagem
              </button>
              <button
                onClick={() => setDateFilterMode("firstMsg")}
                className={cn(
                  "flex-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  dateFilterMode === "firstMsg"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground"
                )}
              >
                Primeira mensagem
              </button>
            </div>

            {/* Período: de / até */}
            <div className="flex items-center gap-1.5">
              <div className="flex-1">
                <label className="mb-0.5 block text-[10px] text-muted-foreground">De</label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange((r) => ({ ...r, from: e.target.value }))}
                  className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [color-scheme:dark]"
                />
              </div>
              <div className="flex-1">
                <label className="mb-0.5 block text-[10px] text-muted-foreground">Até</label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange((r) => ({ ...r, to: e.target.value }))}
                  className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Data única (atalho: preenche from=to) */}
            <div>
              <label className="mb-0.5 block text-[10px] text-muted-foreground">Ou data específica</label>
              <input
                type="date"
                value={dateRange.from === dateRange.to ? dateRange.from : ""}
                onChange={(e) => setDateRange({ from: e.target.value, to: e.target.value })}
                className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring [color-scheme:dark]"
              />
            </div>

            {hasDateFilter && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={clearDateFilter}
              >
                <X className="size-3" /> Limpar filtro
              </Button>
            )}
          </div>
        )}

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
                  <ContactAvatar name={t.contactName} photo={t.contactPhoto} />
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
              <ContactAvatar name={currentThread.contactName} photo={currentThread.contactPhoto} />
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

            <div
              className="flex-1 space-y-1.5 overflow-y-auto p-4"
              style={{
                backgroundColor: "#0b141a",
                backgroundImage:
                  "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.025) 0, transparent 40%)," +
                  "radial-gradient(circle at 85% 75%, rgba(255,255,255,0.02) 0, transparent 40%)",
              }}
            >
              {threadMessages.map((m) => (
                <div key={m.id} className={cn("flex", m.fromMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[75%] rounded-lg shadow-sm overflow-hidden",
                    m.fromMe ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-[#202c33] text-foreground",
                    m.msgType === "image" || m.msgType === "video" ? "p-0" : "px-3 py-2 text-sm",
                  )}>
                    {/* ── IMAGEM ── */}
                    {m.msgType === "image" && m.mediaUrl && (
                      <a href={m.mediaUrl} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.mediaUrl} alt={m.mediaCaption ?? "Imagem"} className="max-h-64 max-w-xs object-cover" />
                      </a>
                    )}
                    {m.msgType === "image" && !m.mediaUrl && (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm opacity-70"><ImageIcon className="size-4" /> Imagem</div>
                    )}

                    {/* ── ÁUDIO ── */}
                    {m.msgType === "audio" && (
                      <div className="px-3 py-2">
                        {m.mediaUrl
                          ? <audio controls src={m.mediaUrl} className="max-w-[240px]" />
                          : <span className="flex items-center gap-1 text-sm opacity-70"><Mic className="size-4" /> Áudio</span>
                        }
                      </div>
                    )}

                    {/* ── VÍDEO ── */}
                    {m.msgType === "video" && m.mediaUrl && (
                      <video controls src={m.mediaUrl} className="max-h-64 max-w-xs" />
                    )}
                    {m.msgType === "video" && !m.mediaUrl && (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm opacity-70"><VideoIcon className="size-4" /> Vídeo</div>
                    )}

                    {/* ── DOCUMENTO ── */}
                    {m.msgType === "document" && (
                      <div className="flex items-center gap-2 px-3 py-2 text-sm">
                        <FileText className="size-4 shrink-0" />
                        <span className="flex-1 truncate">{m.fileName ?? "Arquivo"}</span>
                        {m.mediaUrl && (
                          <a href={m.mediaUrl} download={m.fileName} target="_blank" rel="noreferrer" title="Baixar">
                            <Download className="size-3.5 opacity-70 hover:opacity-100" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* ── TEXTO (ou legenda após mídia) ── */}
                    {(m.msgType === "text" || !m.msgType) && (
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    )}
                    {(m.msgType === "image" || m.msgType === "video") && m.mediaCaption && (
                      <p className="px-3 pb-1 pt-0.5 text-xs opacity-90">{m.mediaCaption}</p>
                    )}

                    {/* ── TIMESTAMP ── */}
                    <p className={cn(
                      "text-right text-[10px]",
                      m.msgType === "image" || m.msgType === "video" ? "px-2 pb-1" : "mt-1",
                      m.fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {timeLabel(m.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {threadMessages.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">Sem mensagens nesta conversa ainda.</p>
              )}
              {/* Âncora para scroll automático */}
              <div ref={chatBottomRef} />
            </div>

            <div className="flex items-center gap-2 border-t border-border/70 p-3">
              {/* Input oculto para seleção de arquivo */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSendMedia(f); }}
              />

              {/* Botão de arquivo */}
              <Button
                variant="ghost" size="icon" className="size-9 shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile || recording || sending}
                title="Enviar arquivo"
              >
                {uploadingFile ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
              </Button>

              {/* Campo de texto ou indicador de gravação */}
              {recording ? (
                <div className="flex flex-1 items-center gap-2 rounded-full border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
                  <span className="size-2 animate-pulse rounded-full bg-destructive" />
                  Gravando… {recordingSeconds}s
                </div>
              ) : (
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Escreva uma mensagem..."
                  className="h-10 flex-1 rounded-full border border-input bg-background px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={uploadingFile || sending}
                />
              )}

              {/* Botão de gravar áudio ou parar gravação */}
              {!draft.trim() && (
                <Button
                  variant={recording ? "destructive" : "ghost"}
                  size="icon"
                  className="size-9 shrink-0"
                  onClick={recording ? handleStopRecording : handleStartRecording}
                  disabled={uploadingFile || sending}
                  title={recording ? "Parar e enviar áudio" : "Gravar áudio"}
                >
                  {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
                </Button>
              )}

              {/* Botão de enviar texto */}
              {(draft.trim() || sending) && (
                <Button size="icon" className="size-10 shrink-0 rounded-full" onClick={handleSend} disabled={!draft.trim() || sending}>
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                </Button>
              )}
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
