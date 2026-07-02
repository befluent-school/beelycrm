"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import { STAGES, DEALS, CONTACTS, ACTIVITIES, DEMO_USER } from "@/lib/demo-data";

export interface Stage {
  id: string;
  name: string;
  probability: number;
}
export interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}
export type DealStatus = "open" | "won" | "lost";
export interface Deal {
  id: string;
  title: string;
  value: number;
  pipelineId: string;
  stageId: string;
  contact: string;
  owner: string;
  tags?: string[];
  status: DealStatus;
  lostReason?: string;
  notes?: string;
  createdAt: string;
  history?: { ts: string; text: string }[];
}
export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  score: number;
  tags: string[];
  owner: string;
}
export interface Activity {
  id: string;
  type: "task" | "call" | "meeting" | "email";
  title: string;
  due: string;
  contact: string;
  done: boolean;
  dealId?: string;
}
export interface Company {
  id: string;
  name: string;
  domain?: string;
  phone?: string;
  segment?: string;
  notes?: string;
  owner: string;
}
export interface Automation {
  id: string;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
}
export interface ScoringRule {
  id: string;
  label: string;
  points: number;
}
export type ChannelType = "whatsapp" | "instagram" | "messenger";
export interface ConnectedChannel {
  type: ChannelType;
  provider: string;
  connectedAt: string;
  credentials: Record<string, string>;
}

interface StoreState {
  pipelines: Pipeline[];
  deals: Deal[];
  contacts: Contact[];
  activities: Activity[];
  companies: Company[];
  automations: Automation[];
  scoringRules: ScoringRule[];
  connectedChannels: ConnectedChannel[];

  // pipelines & stages
  addPipeline: (name: string) => string;
  renamePipeline: (id: string, name: string) => void;
  deletePipeline: (id: string) => void;
  addStage: (pipelineId: string, name: string, probability: number) => void;
  renameStage: (pipelineId: string, stageId: string, name: string) => void;
  deleteStage: (pipelineId: string, stageId: string) => void;

  // deals
  addDeal: (d: Omit<Deal, "id" | "status" | "createdAt">) => void;
  moveDeal: (dealId: string, stageId: string) => void;
  updateDeal: (dealId: string, patch: Partial<Deal>) => void;
  winDeal: (dealId: string) => void;
  loseDeal: (dealId: string, reason: string) => void;
  deleteDeal: (dealId: string) => void;

  // contacts & activities
  addContact: (c: Omit<Contact, "id">) => void;
  addContacts: (cs: Omit<Contact, "id">[]) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  addActivity: (a: Omit<Activity, "id" | "done">) => void;
  toggleActivity: (id: string) => void;

  addCompany: (c: Omit<Company, "id">) => void;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  deleteCompany: (id: string) => void;

  addAutomation: (a: Omit<Automation, "id" | "active">) => void;
  toggleAutomation: (id: string) => void;
  deleteAutomation: (id: string) => void;

  addScoringRule: (r: Omit<ScoringRule, "id">) => void;
  deleteScoringRule: (id: string) => void;

  connectChannel: (ch: ConnectedChannel) => void;
  disconnectChannel: (type: ChannelType) => void;
}

const SEED_PIPELINE_ID = "pipe-vendas";

function seed() {
  const pipelines: Pipeline[] = [
    {
      id: SEED_PIPELINE_ID,
      name: "Funil de Vendas",
      stages: STAGES.map((s) => ({ ...s })),
    },
  ];
  const deals: Deal[] = DEALS.map((d) => ({
    ...d,
    pipelineId: SEED_PIPELINE_ID,
    status: "open" as const,
    createdAt: new Date().toISOString(),
  }));
  const companies: Company[] = Array.from(new Set(CONTACTS.map((c) => c.company))).map((name) => ({
    id: uid(),
    name,
    owner: CONTACTS.find((c) => c.company === name)?.owner ?? DEMO_USER.name,
  }));
  const automations: Automation[] = [
    { id: uid(), name: "Boas-vindas no WhatsApp", trigger: "Novo lead via WhatsApp", action: "Enviar mensagem + criar tarefa", active: true },
    { id: uid(), name: "Mover para Qualificação", trigger: "Lead respondeu", action: "Mover negócio de etapa", active: true },
    { id: uid(), name: "Alerta de negócio parado", trigger: "Sem atividade por 7 dias", action: "Notificar responsável", active: false },
    { id: uid(), name: "Disparo N8N — lead quente", trigger: "Score ≥ 75", action: "Chamar webhook N8N", active: true },
  ];
  const scoringRules: ScoringRule[] = [
    { id: uid(), label: "Abriu e-mail de proposta", points: 10 },
    { id: uid(), label: "Respondeu no WhatsApp", points: 15 },
    { id: uid(), label: "Origem: Indicação", points: 20 },
    { id: uid(), label: "Sem resposta há 14 dias", points: -10 },
  ];
  return { pipelines, deals, contacts: [...CONTACTS], activities: [...ACTIVITIES], companies, automations, scoringRules, connectedChannels: [] };
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      ...seed(),

      addPipeline: (name) => {
        const id = uid();
        set((s) => ({
          pipelines: [
            ...s.pipelines,
            {
              id,
              name,
              stages: [
                { id: uid(), name: "Novo lead", probability: 10 },
                { id: uid(), name: "Em contato", probability: 40 },
                { id: uid(), name: "Fechamento", probability: 80 },
              ],
            },
          ],
        }));
        return id;
      },
      renamePipeline: (id, name) =>
        set((s) => ({ pipelines: s.pipelines.map((p) => (p.id === id ? { ...p, name } : p)) })),
      deletePipeline: (id) =>
        set((s) => ({
          pipelines: s.pipelines.filter((p) => p.id !== id),
          deals: s.deals.filter((d) => d.pipelineId !== id),
        })),
      addStage: (pipelineId, name, probability) =>
        set((s) => ({
          pipelines: s.pipelines.map((p) =>
            p.id === pipelineId ? { ...p, stages: [...p.stages, { id: uid(), name, probability }] } : p
          ),
        })),
      renameStage: (pipelineId, stageId, name) =>
        set((s) => ({
          pipelines: s.pipelines.map((p) =>
            p.id === pipelineId
              ? { ...p, stages: p.stages.map((st) => (st.id === stageId ? { ...st, name } : st)) }
              : p
          ),
        })),
      deleteStage: (pipelineId, stageId) =>
        set((s) => ({
          pipelines: s.pipelines.map((p) =>
            p.id === pipelineId ? { ...p, stages: p.stages.filter((st) => st.id !== stageId) } : p
          ),
          deals: s.deals.filter((d) => d.stageId !== stageId),
        })),

      addDeal: (d) =>
        set((s) => ({
          deals: [...s.deals, { ...d, id: uid(), status: "open", createdAt: new Date().toISOString() }],
        })),
      moveDeal: (dealId, stageId) =>
        set((s) => ({
          deals: s.deals.map((d) => {
            if (d.id !== dealId || d.stageId === stageId) return d;
            const pipeline = s.pipelines.find((p) => p.id === d.pipelineId);
            const fromName = pipeline?.stages.find((st) => st.id === d.stageId)?.name ?? "—";
            const toName = pipeline?.stages.find((st) => st.id === stageId)?.name ?? "—";
            const entry = { ts: new Date().toISOString(), text: `Movido de ${fromName} → ${toName}` };
            return { ...d, stageId, history: [...(d.history ?? []), entry] };
          }),
        })),
      updateDeal: (dealId, patch) =>
        set((s) => ({ deals: s.deals.map((d) => (d.id === dealId ? { ...d, ...patch } : d)) })),
      winDeal: (dealId) =>
        set((s) => ({
          deals: s.deals.map((d) =>
            d.id === dealId
              ? { ...d, status: "won", history: [...(d.history ?? []), { ts: new Date().toISOString(), text: "Marcado como ganho 🎉" }] }
              : d
          ),
        })),
      loseDeal: (dealId, reason) =>
        set((s) => ({
          deals: s.deals.map((d) =>
            d.id === dealId
              ? { ...d, status: "lost", lostReason: reason, history: [...(d.history ?? []), { ts: new Date().toISOString(), text: `Marcado como perdido — ${reason}` }] }
              : d
          ),
        })),
      deleteDeal: (dealId) => set((s) => ({ deals: s.deals.filter((d) => d.id !== dealId) })),

      addContact: (c) => set((s) => ({ contacts: [{ ...c, id: uid() }, ...s.contacts] })),
      addContacts: (cs) =>
        set((s) => ({ contacts: [...cs.map((c) => ({ ...c, id: uid() })), ...s.contacts] })),
      updateContact: (id, patch) =>
        set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteContact: (id) => set((s) => ({ contacts: s.contacts.filter((c) => c.id !== id) })),
      addActivity: (a) => set((s) => ({ activities: [{ ...a, id: uid(), done: false }, ...s.activities] })),
      toggleActivity: (id) =>
        set((s) => ({ activities: s.activities.map((a) => (a.id === id ? { ...a, done: !a.done } : a)) })),

      addCompany: (c) => set((s) => ({ companies: [{ ...c, id: uid() }, ...s.companies] })),
      updateCompany: (id, patch) =>
        set((s) => ({ companies: s.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      deleteCompany: (id) => set((s) => ({ companies: s.companies.filter((c) => c.id !== id) })),

      addAutomation: (a) =>
        set((s) => ({ automations: [{ ...a, id: uid(), active: true }, ...s.automations] })),
      toggleAutomation: (id) =>
        set((s) => ({ automations: s.automations.map((a) => (a.id === id ? { ...a, active: !a.active } : a)) })),
      deleteAutomation: (id) =>
        set((s) => ({ automations: s.automations.filter((a) => a.id !== id) })),

      addScoringRule: (r) =>
        set((s) => ({ scoringRules: [{ ...r, id: uid() }, ...s.scoringRules] })),
      deleteScoringRule: (id) =>
        set((s) => ({ scoringRules: s.scoringRules.filter((r) => r.id !== id) })),

      connectChannel: (ch) =>
        set((s) => ({
          connectedChannels: [
            ...s.connectedChannels.filter((c) => c.type !== ch.type),
            ch,
          ],
        })),
      disconnectChannel: (type) =>
        set((s) => ({ connectedChannels: s.connectedChannels.filter((c) => c.type !== type) })),
    }),
    {
      name: "beely-store",
      // v3 → apaga dados fictícios antigos, começa com conta Be Fluent limpa
      version: 3,
      skipHydration: true,
      migrate: (_persisted: unknown, fromVersion) => {
        // Qualquer versão anterior ao v3 recomeça do zero (conta limpa para produção)
        if (fromVersion < 3) {
          return seed() as unknown as StoreState;
        }
        const base = seed();
        const prev = (_persisted ?? {}) as Partial<StoreState>;
        return { ...base, ...prev, connectedChannels: prev.connectedChannels ?? [] } as StoreState;
      },
    }
  )
);

export const DEFAULT_OWNER = DEMO_USER.name;

/** True only after Zustand persist has finished rehydrating from localStorage. */
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => useStore.persist.onFinishHydration(cb),
    () => useStore.persist.hasHydrated(),
    () => false
  );
}
