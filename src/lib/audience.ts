import type { Contact } from "@/lib/store";

/** Filtro de audiência aplicado sobre a base de contatos do CRM. */
export interface AudienceFilter {
  sources?: string[];
  funnels?: string[];
  statuses?: string[];
  tags?: string[];
  minScore?: number;
  maxScore?: number;
  requireEmail?: boolean;
  requirePhone?: boolean;
}

export function filterContacts(contacts: Contact[], f: AudienceFilter): Contact[] {
  return contacts.filter((c) => {
    if (c.discarded) return false;
    if (f.requireEmail && !c.email?.trim()) return false;
    if (f.requirePhone && !c.phone?.trim()) return false;
    if (f.sources?.length && !f.sources.includes(c.source)) return false;
    if (f.funnels?.length && !f.funnels.includes(c.funnel ?? "")) return false;
    if (f.statuses?.length && !f.statuses.includes(c.status ?? "")) return false;
    if (f.tags?.length && !f.tags.some((t) => (c.tags ?? []).includes(t))) return false;
    if (typeof f.minScore === "number" && c.score < f.minScore) return false;
    if (typeof f.maxScore === "number" && c.score > f.maxScore) return false;
    return true;
  });
}

/** Valores distintos para montar os seletores do filtro. */
export function audienceFacets(contacts: Contact[]) {
  const sources = new Set<string>();
  const funnels = new Set<string>();
  const statuses = new Set<string>();
  const tags = new Set<string>();
  for (const c of contacts) {
    if (c.source) sources.add(c.source);
    if (c.funnel) funnels.add(c.funnel);
    if (c.status) statuses.add(c.status);
    for (const t of c.tags ?? []) tags.add(t);
  }
  return {
    sources: [...sources].sort(),
    funnels: [...funnels].sort(),
    statuses: [...statuses].sort(),
    tags: [...tags].sort(),
  };
}
