"use client";

/**
 * Componentes de campo compartilhados entre contact-drawer.tsx e
 * deal-drawer.tsx — antes duplicados (F2/Section definidos localmente em
 * contact-drawer.tsx), extraídos pra um único lugar.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function F2({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}
