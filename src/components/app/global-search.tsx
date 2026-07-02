"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Search, Users, Kanban } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const { contacts, deals } = useStore();
  const boxRef = useRef<HTMLDivElement>(null);

  const term = q.trim().toLowerCase();
  const contactHits = term ? contacts.filter((c) => c.name.toLowerCase().includes(term) || c.company.toLowerCase().includes(term) || c.email.toLowerCase().includes(term)).slice(0, 5) : [];
  const dealHits = term ? deals.filter((d) => d.title.toLowerCase().includes(term) || d.contact.toLowerCase().includes(term)).slice(0, 5) : [];
  const showResults = focused && term.length > 0;

  return (
    <div ref={boxRef} className="relative ml-4 hidden max-w-md flex-1 md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Buscar contatos, negócios..."
        className="h-9 w-full rounded-lg border border-input bg-background/50 pl-9 pr-3 text-sm outline-none transition-colors focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      {showResults && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-80 overflow-y-auto rounded-xl border border-border bg-[#262626] p-2 shadow-2xl">
          {contactHits.length === 0 && dealHits.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum resultado para “{q}”.</p>
          )}
          {contactHits.length > 0 && (
            <Section title="Contatos">
              {contactHits.map((c) => (
                <Link key={c.id} href="/contatos" className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.06]">
                  <Users className="size-4 text-primary" />
                  <span className="flex-1 truncate text-sm">{c.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{c.company}</span>
                </Link>
              ))}
            </Section>
          )}
          {dealHits.length > 0 && (
            <Section title="Negócios">
              {dealHits.map((d) => (
                <Link key={d.id} href="/pipeline" className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/[0.06]">
                  <Kanban className="size-4 text-primary" />
                  <span className="flex-1 truncate text-sm">{d.title}</span>
                  <span className="text-xs font-medium text-primary">{formatCurrency(d.value)}</span>
                </Link>
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
