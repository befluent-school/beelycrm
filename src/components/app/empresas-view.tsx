"use client";

import { useState } from "react";
import { useStore, useHydrated } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Users, Plus } from "lucide-react";
import { QuickAdd } from "./quick-add";
import { CompanyDrawer } from "./company-drawer";
import { formatCurrency } from "@/lib/utils";

export function EmpresasView() {
  const hydrated = useHydrated();
  const { companies, contacts, deals } = useStore();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const term = q.trim().toLowerCase();
  const list = companies
    .map((co) => {
      const linkedContacts = contacts.filter((c) => c.company === co.name);
      const linkedDeals = deals.filter((d) => linkedContacts.some((c) => c.name === d.contact));
      return { ...co, contactsCount: linkedContacts.length, value: linkedDeals.reduce((s, d) => s + d.value, 0) };
    })
    .filter((co) => !term || co.name.toLowerCase().includes(term) || (co.segment ?? "").toLowerCase().includes(term));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar empresa..." className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/40" />
        </div>
        <QuickAdd defaultTab="company" trigger={<Button size="sm"><Plus className="size-4" /> Nova empresa</Button>} />
      </div>

      <p className="text-xs text-muted-foreground">{hydrated ? list.length : 0} empresas</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hydrated && list.map((co) => (
          <Card key={co.id} className="cursor-pointer transition-transform hover:-translate-y-0.5" onClick={() => setOpenId(co.id)}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
                  <Building2 className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display font-semibold">{co.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{co.segment || co.owner}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="size-4" /> {co.contactsCount} contatos
                </span>
                <Badge variant="secondary">{formatCurrency(co.value)}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {hydrated && list.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</p>
      )}

      <CompanyDrawer companyId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
