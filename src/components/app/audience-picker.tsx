"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { audienceFacets, filterContacts, type AudienceFilter } from "@/lib/audience";
import { useStore } from "@/lib/store";

/**
 * Seletor de audiência reutilizável (Remarketing e Ligações IA).
 * Opera sobre os contatos do CRM e devolve o filtro + a prévia de alcance.
 */
export function AudiencePicker({
  value,
  onChange,
  channel,
}: {
  value: AudienceFilter;
  onChange: (f: AudienceFilter) => void;
  channel: "email" | "phone";
}) {
  const contacts = useStore((s) => s.contacts);
  const facets = useMemo(() => audienceFacets(contacts), [contacts]);

  const matched = useMemo(() => {
    const effective: AudienceFilter = {
      ...value,
      requireEmail: channel === "email" ? true : value.requireEmail,
      requirePhone: channel === "phone" ? true : value.requirePhone,
    };
    return filterContacts(contacts, effective);
  }, [contacts, value, channel]);

  function toggle(key: "sources" | "funnels" | "statuses" | "tags", v: string) {
    const cur = new Set(value[key] ?? []);
    if (cur.has(v)) cur.delete(v); else cur.add(v);
    onChange({ ...value, [key]: [...cur] });
  }

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
      active
        ? "border-primary bg-primary/15 text-primary"
        : "border-border text-muted-foreground hover:text-foreground"
    );

  return (
    <div className="space-y-4">
      <FacetRow label="Origem" options={facets.sources} selected={value.sources ?? []} onToggle={(v) => toggle("sources", v)} chip={chip} />
      <FacetRow label="Funil" options={facets.funnels} selected={value.funnels ?? []} onToggle={(v) => toggle("funnels", v)} chip={chip} />
      <FacetRow label="Status" options={facets.statuses} selected={value.statuses ?? []} onToggle={(v) => toggle("statuses", v)} chip={chip} />
      <FacetRow label="Tags" options={facets.tags} selected={value.tags ?? []} onToggle={(v) => toggle("tags", v)} chip={chip} />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Score mínimo</Label>
          <Input
            type="number"
            value={value.minScore ?? ""}
            onChange={(e) => onChange({ ...value, minScore: e.target.value === "" ? undefined : Number(e.target.value) })}
            placeholder="0"
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Score máximo</Label>
          <Input
            type="number"
            value={value.maxScore ?? ""}
            onChange={(e) => onChange({ ...value, maxScore: e.target.value === "" ? undefined : Number(e.target.value) })}
            placeholder="100"
            className="h-9"
          />
        </div>
      </div>

      <p className="rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm">
        Alcance estimado: <strong className="text-primary">{matched.length}</strong>{" "}
        {matched.length === 1 ? "contato" : "contatos"}
        {channel === "email" ? " com e-mail válido" : " com telefone"}.
      </p>
    </div>
  );
}

function FacetRow({
  label, options, selected, onToggle, chip,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  chip: (active: boolean) => string;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o} type="button" className={chip(selected.includes(o))} onClick={() => onToggle(o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
