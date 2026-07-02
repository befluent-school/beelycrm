"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Upload, Plus } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { QuickAdd } from "./quick-add";
import { ContactDrawer } from "./contact-drawer";
import { initials, cn } from "@/lib/utils";

export function ContactsTable() {
  const hydrated = useHydrated();
  const contacts = useStore((s) => s.contacts);
  const [q, setQ] = useState("");
  const [source, setSource] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const sources = ["all", ...Array.from(new Set(contacts.map((c) => c.source)))];
  const term = q.trim().toLowerCase();
  const filtered = contacts.filter((c) => {
    const matchesTerm = !term || c.name.toLowerCase().includes(term) || c.email.toLowerCase().includes(term) || c.company.toLowerCase().includes(term);
    const matchesSource = source === "all" || c.source === source;
    return matchesTerm && matchesSource;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-sm sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contatos..." className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40" />
          </div>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="h-9 rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            {sources.map((s) => <option key={s} value={s}>{s === "all" ? "Todas as origens" : s}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/contatos/importar"><Upload className="size-4" /> Importar</Link></Button>
          <QuickAdd defaultTab="contact" trigger={<Button size="sm"><Plus className="size-4" /> Novo contato</Button>} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{hydrated ? filtered.length : 0} contatos</p>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-white/[0.03] text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Tags</th>
                <th className="px-4 py-3 font-medium">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {hydrated && filtered.map((c) => (
                <tr key={c.id} onClick={() => setOpenId(c.id)} className="cursor-pointer border-b border-border/70 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">{initials(c.name)}</span>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.email || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.company || "—"}</td>
                  <td className="px-4 py-3"><Badge variant="outline">{c.source}</Badge></td>
                  <td className="px-4 py-3"><ScoreBar score={c.score} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">{c.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hydrated && filtered.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nenhum contato encontrado.</p>}
        </div>
      </Card>

      <ContactDrawer contactId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-success" : score >= 50 ? "bg-warning" : "bg-muted-foreground";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums">{score}</span>
    </div>
  );
}
