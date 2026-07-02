"use client";

import { useState, useEffect } from "react";
import { Bell, CheckCheck, MessageSquare, UserPlus, Trophy, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Notif {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  time: string;
  read: boolean;
  tone: "primary" | "success" | "info" | "warning";
}

// Começa vazio — notificações reais chegam via webhooks/eventos do sistema
const SEED: Notif[] = [];

// Simulação de chegada de novas notificações
const INCOMING: Omit<Notif, "id" | "read">[] = [
  { icon: MessageSquare, title: "Nova mensagem — Instagram", body: "Beatriz Lima enviou uma mensagem.", time: "agora", tone: "primary" },
  { icon: UserPlus,      title: "Lead capturado",            body: "Novo lead via landing page (Turma Avançado).", time: "agora", tone: "info" },
];
let incomingIdx = 0;

export function Notifications() {
  const [items, setItems] = useState<Notif[]>(SEED);
  const [open, setOpen]   = useState(false);

  const unreadCount = items.filter((i) => !i.read).length;

  // Ao abrir o painel, marca todas como lidas (mas mantém na lista)
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && unreadCount > 0) {
      // pequeno delay para o usuário ver o badge antes de limpar
      setTimeout(() => {
        setItems((arr) => arr.map((n) => ({ ...n, read: true })));
      }, 400);
    }
  }

  function markOneRead(id: string) {
    setItems((arr) => arr.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setItems((arr) => arr.map((n) => ({ ...n, read: true })));
  }

  // Simula chegada de novas notificações a cada 45s
  useEffect(() => {
    const t = setInterval(() => {
      if (incomingIdx >= INCOMING.length) return;
      const n: Notif = { ...INCOMING[incomingIdx], id: `inc-${Date.now()}`, read: false };
      incomingIdx++;
      setItems((prev) => [n, ...prev]);
    }, 45_000);
    return () => clearInterval(t);
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações" className="relative">
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-border/70 p-3">
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-semibold">Notificações</p>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-bold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" /> Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Lista */}
        <ul className="max-h-[26rem] overflow-y-auto">
          {items.length === 0 && (
            <li className="flex flex-col items-center gap-2 px-3 py-8 text-center">
              <Bell className="size-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sem notificações.</p>
            </li>
          )}
          {items.map((n) => {
            const Icon = n.icon;
            return (
              <li key={n.id}>
                <button
                  onClick={() => markOneRead(n.id)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-border/40 p-3 text-left transition-colors hover:bg-white/[0.04] last:border-0",
                    !n.read && "bg-primary/[0.05]"
                  )}
                >
                  <span className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                    n.tone === "success" && "bg-success/15 text-success",
                    n.tone === "primary" && "bg-primary/15 text-primary",
                    n.tone === "warning" && "bg-yellow-500/15 text-yellow-400",
                    n.tone === "info"    && "bg-secondary text-muted-foreground"
                  )}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", !n.read ? "font-semibold" : "font-medium text-muted-foreground")}>
                      {n.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">{n.time}</p>
                  </div>
                  {!n.read && <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Rodapé */}
        <div className="border-t border-border/70 p-2 text-center">
          <p className="text-[10px] text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""} · clique para marcar como lida`
              : "Todas as notificações foram lidas"}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
