"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Briefcase, Trash2 } from "lucide-react";
import { useStore, type Company } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export function CompanyDrawer({ companyId, onClose }: { companyId: string | null; onClose: () => void }) {
  const company = useStore((s) => s.companies.find((c) => c.id === companyId)) ?? null;
  if (!company) return <Sheet open={false} onOpenChange={(o) => !o && onClose()} />;
  return <CompanyDrawerInner key={company.id} company={company} onClose={onClose} />;
}

function CompanyDrawerInner({ company, onClose }: { company: Company; onClose: () => void }) {
  const { contacts, deals, updateCompany, deleteCompany } = useStore();
  const [form, setForm] = useState({
    name: company.name,
    domain: company.domain ?? "",
    phone: company.phone ?? "",
    segment: company.segment ?? "",
    notes: company.notes ?? "",
  });

  const linkedContacts = contacts.filter((c) => c.company === company.name);
  const linkedDeals = deals.filter((d) => linkedContacts.some((c) => c.name === d.contact));
  const totalValue = linkedDeals.reduce((s, d) => s + d.value, 0);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="p-0">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
              <Building2 className="size-6" />
            </span>
            <div>
              <SheetTitle>{company.name}</SheetTitle>
              <p className="text-xs text-muted-foreground">{company.segment || "—"}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-3 border-b border-border/70 p-5">
          <Stat icon={Users} label="Contatos" value={String(linkedContacts.length)} />
          <Stat icon={Briefcase} label="Negócios" value={String(linkedDeals.length)} />
          <div className="col-span-2 rounded-lg border border-border bg-white/[0.02] p-3">
            <p className="text-xs text-muted-foreground">Receita potencial</p>
            <p className="font-display text-xl font-bold text-primary">{formatCurrency(totalValue)}</p>
          </div>
        </div>

        <form
          className="flex-1 space-y-3 overflow-y-auto p-5"
          onSubmit={(e) => {
            e.preventDefault();
            updateCompany(company.id, form);
            toast.success("Empresa atualizada.");
            onClose();
          }}
        >
          <div className="space-y-1.5"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Domínio</Label><Input value={form.domain} onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))} placeholder="empresa.com" /></div>
            <div className="space-y-1.5"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Segmento</Label><Input value={form.segment} onChange={(e) => setForm((f) => ({ ...f, segment: e.target.value }))} placeholder="SaaS, Varejo..." /></div>
          <div className="space-y-1.5">
            <Label>Notas</Label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="min-h-24 w-full rounded-lg border border-input bg-background/50 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40" placeholder="Anotações sobre a empresa..." />
          </div>

          {linkedContacts.length > 0 && (
            <div>
              <Label className="mb-2 block">Contatos vinculados</Label>
              <div className="space-y-1">
                {linkedContacts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                    <span>{c.name}</span>
                    <Badge variant="secondary">{c.source}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" className="w-full">Salvar alterações</Button>
          <Button type="button" variant="ghost" className="w-full text-destructive" onClick={() => { if (confirm(`Excluir a empresa "${company.name}"?`)) { deleteCompany(company.id); onClose(); toast("Empresa excluída."); } }}>
            <Trash2 className="size-4" /> Excluir empresa
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white/[0.02] p-3">
      <div className="flex items-center gap-2 text-muted-foreground"><Icon className="size-4" /><span className="text-xs">{label}</span></div>
      <p className="mt-1 font-display text-xl font-bold">{value}</p>
    </div>
  );
}
