"use client";

import { useStore, useHydrated } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Camera, MessageCircle, Globe, Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  WhatsApp:  { icon: Phone,         color: "bg-[#25D366]" },
  Instagram: { icon: Camera,        color: "bg-[#E1306C]" },
  Messenger: { icon: MessageCircle, color: "bg-[#0084FF]" },
  Site:      { icon: Globe,         color: "bg-primary" },
  Indicação: { icon: Users,         color: "bg-success" },
  Manual:    { icon: Sparkles,      color: "bg-muted-foreground" },
};

export function SourcesPanel() {
  const hydrated = useHydrated();
  const { contacts, deals } = useStore();

  if (!hydrated) {
    return (
      <Card>
        <CardHeader><CardTitle>Origem dos leads</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between">
                <div className="h-4 w-28 rounded bg-white/10 animate-pulse" />
                <div className="h-4 w-10 rounded bg-white/10 animate-pulse" />
              </div>
              <div className="h-2 w-full rounded-full bg-white/[0.06]" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const total = contacts.length || 1;
  const bySource = new Map<string, number>();
  for (const c of contacts) bySource.set(c.source, (bySource.get(c.source) ?? 0) + 1);

  const items = [...bySource.entries()]
    .map(([source, count]) => {
      const linkedDeals = deals.filter((d) => contacts.some((c) => c.name === d.contact && c.source === source));
      const won = linkedDeals.filter((d) => d.status === "won").length;
      const conversion = linkedDeals.length ? Math.round((won / linkedDeals.length) * 100) : 0;
      return { source, count, share: Math.round((count / total) * 100), conversion };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader><CardTitle>Origem dos leads</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.map((it) => {
          const m = META[it.source] ?? META.Manual;
          const Icon = m.icon;
          return (
            <div key={it.source} className="group">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn("flex size-6 items-center justify-center rounded-md text-white", m.color)}>
                    <Icon className="size-3.5" />
                  </span>
                  <span className="text-sm font-medium">{it.source}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-sm font-bold">{it.count}</span>
                  <span className="text-xs text-muted-foreground">{it.share}%</span>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn("h-full rounded-full transition-all", m.color)}
                  style={{ width: `${it.share}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Conversão: <strong className={cn("font-semibold", it.conversion >= 50 ? "text-success" : it.conversion >= 25 ? "text-warning" : "text-muted-foreground")}>{it.conversion}%</strong></span>
              </div>
            </div>
          );
        })}
        {items.length === 0 && <p className="text-center text-sm text-muted-foreground">Nenhum lead cadastrado.</p>}
      </CardContent>
    </Card>
  );
}
