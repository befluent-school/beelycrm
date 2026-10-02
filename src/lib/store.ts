"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import {
  STAGES, STAGES_COMERCIAL_BF, COMERCIAL_BF_PIPELINE_ID, STAGE_BENCHMARKS_BF,
  DEALS, CONTACTS, ACTIVITIES, DEMO_USER,
} from "@/lib/demo-data";
import { db } from "@/lib/db";

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
  contact: string;       // nome do contato (chave de ligacao)
  contactId?: string;    // id do contato (ligacao direta)
  owner: string;
  tags?: string[];
  status: DealStatus;
  lostReason?: string;
  notes?: string;
  createdAt: string;
  stageEnteredAt?: string;  // quando entrou na etapa atual (para calcular temperatura)
  history?: { ts: string; text: string }[];

  /* ── Playbook Comercial Be Fluent v3 (campos aditivos) ── */
  slaRespondedAt?: string;      // 1o contato humano real — SLA vs. 4 min (Playbook 2)
  costOfInactionNote?: string;  // numero/conclusao que o lead articulou (Playbook 5.3)
  refusalCount?: number;        // contador da Avenida do Nao neste deal (Playbook 6.4)
  lastActivityAt?: string;      // ultima atividade/mensagem/nota real — regra dos 3 dias (Playbook 10.2)
  /** Espelho do BANT do contato para o drawer; fonte de verdade = contato. */
  bant?: { budget?: boolean; authority?: boolean; need?: boolean; timing?: boolean };

  /** SDR responsável — espelho de Contact.sdrId. Fonte de verdade = contato. */
  sdrId?: string;
}

/** Temperatura do lead com base em dias na etapa atual */
export type LeadTemp = "hot" | "warm" | "cold";
export function dealTemperature(deal: Deal, hotDays = 3, coldDays = 10): LeadTemp {
  const ref = deal.stageEnteredAt ?? deal.createdAt;
  const days = (Date.now() - new Date(ref).getTime()) / 86_400_000;
  if (days <= hotDays) return "hot";
  if (days <= coldDays) return "warm";
  return "cold";
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;        // Razao Social
  fantasyName?: string;   // Nome Fantasia
  source: string;         // Origem
  campaign?: string;      // Campanha
  funnel?: string;        // Funil
  stage?: string;         // Etapa
  status?: string;        // Status (Frio/Morno/Quente)
  team?: string;          // Equipe
  score: number;
  tags: string[];
  owner: string;          // Responsavel 1
  // Endereco
  cep?: string;
  country?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  complement?: string;
  number?: string;
  // Endereco empresa
  companyCep?: string;
  companyCountry?: string;
  companyState?: string;
  companyCity?: string;
  companyNeighborhood?: string;
  companyStreet?: string;
  companyComplement?: string;
  companyNumber?: string;
  // Documento
  cpfCnpj?: string;
  // Produto
  product?: string;       // Nome do Produto 1
  productValue?: number;  // Valor do Produto 1
  productDesc?: string;   // Descricao do Produto 1
  // Meta Ads
  metaAdId?: string;
  metaAdName?: string;
  metaAdsetId?: string;
  metaAdsetName?: string;
  metaCampaignId?: string;
  metaCampaignName?: string;
  metaFormId?: string;
  metaFormName?: string;
  metaPageId?: string;
  metaPageName?: string;
  metaLeadgenId?: string;
  metaPlatform?: string;
  // UTM
  utmUrl?: string;
  utmMedium?: string;
  utmSource?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  // Qualificacao (perguntas do form)
  urgency?: string;
  investmentIntent?: string;
  jobTitle?: string;
  monthlyBudget?: string;
  contactPreference?: string;
  mainChallenge?: string;
  sector?: string;
  classFrequency?: string;
  professionalMoment?: string;
  // Misc
  discarded?: boolean;
  discardReason?: string;
  discardDesc?: string;
  firstNote?: string;
  firstTask?: string;
  registeredAt?: string;  // Data de Cadastro original
  externalId?: string;    // ID do Lead original

  /* ── Playbook Comercial Be Fluent v3 — Qualificacao BANT 3-de-4 (Playbook 3.5) ── */
  bantBudget?: boolean;     // orcamento compativel (inegociavel)
  bantAuthority?: boolean;  // decide sozinho ou com quem
  bantNeed?: boolean;       // dor genuina (inegociavel)
  bantTiming?: boolean;     // prazo real
  bantNote?: string;        // contexto livre da qualificacao
  refusalCount?: number;    // Avenida do Nao a nivel de contato (Playbook 6.4)

  /** SDR responsável por este contato/lead — vínculo real (owner segue como nome de exibição). */
  sdrId?: string;
}

/** Regra 3-de-4 do Playbook 3.5: Budget e Need inegociaveis + pelo menos 3 no total. */
export function isBantQualified(c: Pick<Contact, "bantBudget" | "bantAuthority" | "bantNeed" | "bantTiming">): boolean {
  const total = [c.bantBudget, c.bantAuthority, c.bantNeed, c.bantTiming].filter(Boolean).length;
  return total >= 3 && !!c.bantBudget && !!c.bantNeed;
}

export interface Activity {
  id: string;
  type: "task" | "call" | "meeting" | "email";
  title: string;
  due: string;         // data legível (DD/MM/YYYY ou "Hoje")
  dueDate?: string;    // ISO date para ordenação (YYYY-MM-DD)
  dueTime?: string;    // HH:MM
  contact: string;
  done: boolean;
  dealId?: string;
  notes?: string;      // anotação vinculada à tarefa
}

/** Metas diárias por função — Playbook Comercial Be Fluent v3, Seção 11.2 */
export interface DailyTargets {
  leadsContacted: number;      // leads novos contatados em ate 4 min
  coldReactivations: number;   // leads do backlog frio contatados/dia
  diagnosisMeetings: number;   // reunioes de diagnostico realizadas/dia
  followupsExecuted: number;   // follow-ups executados/dia (0 = "100% dos agendados")
  b2bProspects: number;        // novos contatos de prospeccao B2B/dia
}

/** Configurações financeiras para cálculo real de CAC, LTV, Ticket Médio */
export interface FinancialConfig {
  monthlyMarketingSpend: number;    // gasto mensal em marketing (R$)
  avgContractMonths: number;        // duração média do contrato em meses
  monthlyChurnRate: number;         // taxa de churn mensal (0-100%)
  avgCostPerStudent: number;        // custo operacional por aluno/mês (R$)
  revenueGoalMonthly: number;       // meta de receita mensal (R$)
  leadsPerMonth: number;            // leads gerados por mês (para CAC por lead)
  /* ── Playbook Comercial Be Fluent v3 ── */
  slaTargetMinutes: number;         // SLA de resposta ao lead — meta em minutos (Playbook 2)
  dailyTargets: DailyTargets;       // metas diarias por funcao (Playbook 11.2)
}

/** Benchmark de conversão por etapa — Playbook Seção 8.1 / 8.4 */
export interface StageBenchmark {
  stageId: string;
  expectedConversionPct: number;  // taxa de referencia (etapa -> proxima)
  alertFloorPct: number;          // piso; abaixo disso por 2 semanas = correcao (8.4)
}
/** Provedor de WhatsApp conectado a um SDR — Z-API ou Meta Cloud API (oficial). */
export type WaProvider = "zapi" | "meta_cloud";

/**
 * SDR — vendedor/atendente com seu próprio WhatsApp Business conectado.
 * Segredos (tokens) seguem o mesmo padrão de SavedIntegration.credentials:
 * guardados no Supabase, sem cofre dedicado nesta versão.
 */
export interface Sdr {
  id: string;
  name: string;
  email?: string;
  avatarColor?: string;   // cor do badge/avatar no Inbox
  active: boolean;
  waProvider?: WaProvider;
  // Z-API — o valor real do token NUNCA chega ao navegador (loadAll()
  // mascara via toSdr() em db.ts); só os campos has* indicam se existe uma
  // credencial salva. zapiInstanceId não é secreto (identificador, não
  // segredo) e continua chegando em texto puro.
  zapiInstanceId?: string;
  zapiToken?: string;        // presente só no instante do submit (campo preenchido pelo usuário), nunca vindo do load
  zapiClientToken?: string;  // idem
  hasZapiToken?: boolean;
  hasZapiClientToken?: boolean;
  // Meta Cloud API (oficial) — mesmo princípio
  metaPhoneNumberId?: string;
  metaAccessToken?: string;  // idem zapiToken
  metaWabaId?: string;
  metaVerifyToken?: string;  // idem
  hasMetaAccessToken?: boolean;
  hasMetaVerifyToken?: boolean;
  // Segredo do webhook — gerado pelo Beely (não é credencial de terceiro),
  // confere a query string ?secret= nas chamadas ao webhook do Z-API, que
  // não assina seus payloads (ao contrário de Instagram/Messenger, que usam
  // X-Hub-Signature-256). Só vem preenchido na resposta do POST /api/sdrs
  // logo após criar o SDR, nunca em loads subsequentes.
  webhookSecret?: string;
  hasWebhookSecret?: boolean;
  // Exibição
  phoneDisplay?: string;  // "+55 12 99999-9999"
  createdAt: string;
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
/**
 * Gatilhos e ações estruturados do motor de automação (executor real, não
 * mais texto livre decorativo). "legacy" cobre automações antigas criadas
 * antes desta mudança — continuam existindo/visíveis, mas o motor não as
 * executa (não há como inferir gatilho/ação estruturado de um texto livre).
 */
export type AutomationTrigger =
  | { type: "deal_won" }
  | { type: "deal_stage_changed"; pipelineId: string; stageId: string }
  | { type: "contact_created" }
  | { type: "deal_stale"; days: number }
  | { type: "legacy"; label: string };

export type AutomationAction =
  | { type: "schedule_meeting"; durationMinutes: number; title: string }
  | { type: "move_deal_stage"; pipelineId: string; stageId: string }
  | { type: "send_whatsapp"; scriptId: string }
  | { type: "send_email"; scriptId: string }
  | { type: "add_tag"; tag: string }
  | { type: "add_score"; points: number }
  | { type: "legacy"; label: string };

export interface Automation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
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

export interface SavedIntegration {
  id: string;
  connectedAt: string;
  credentials: Record<string, string>;
}

export interface StoreState {
  pipelines: Pipeline[];
  deals: Deal[];
  contacts: Contact[];
  activities: Activity[];
  companies: Company[];
  automations: Automation[];
  scoringRules: ScoringRule[];
  connectedChannels: ConnectedChannel[];
  financialConfig: FinancialConfig;
  integrations: Record<string, SavedIntegration>;
  stageBenchmarks: StageBenchmark[];
  sdrs: Sdr[];

  // pipelines & stages
  addPipeline: (name: string) => string;
  renamePipeline: (id: string, name: string) => void;
  deletePipeline: (id: string) => void;
  addStage: (pipelineId: string, name: string, probability: number) => void;
  renameStage: (pipelineId: string, stageId: string, name: string) => void;
  deleteStage: (pipelineId: string, stageId: string) => void;
  reorderStages: (pipelineId: string, stageIds: string[]) => void;

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
  updateActivity: (id: string, patch: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  toggleActivity: (id: string) => void;

  updateFinancialConfig: (patch: Partial<FinancialConfig>) => void;

  // stage benchmarks (Playbook 8.1/8.4)
  setStageBenchmark: (stageId: string, patch: Partial<Omit<StageBenchmark, "stageId">>) => void;
  resetStageBenchmarks: () => void;

  // SDRs — WhatsApp Business por atendente
  addSdr: (s: Omit<Sdr, "id" | "createdAt">) => string;
  updateSdr: (id: string, patch: Partial<Sdr>) => void;
  deleteSdr: (id: string) => void;
  /** Reatribui um contato (e seus deals abertos) a outro SDR, com rastro no histórico. */
  assignContactToSdr: (contactId: string, sdrId: string) => void;

  /** Registra venda: marca won + bump de score + move para funil onboarding D1 */
  winDealAndOnboard: (dealId: string) => void;

  addCompany: (c: Omit<Company, "id">) => void;
  updateCompany: (id: string, patch: Partial<Company>) => void;
  deleteCompany: (id: string) => void;

  addAutomation: (a: Omit<Automation, "id" | "active">) => void;
  updateAutomation: (id: string, patch: Partial<Omit<Automation, "id">>) => void;
  toggleAutomation: (id: string) => void;
  deleteAutomation: (id: string) => void;

  addScoringRule: (r: Omit<ScoringRule, "id">) => void;
  deleteScoringRule: (id: string) => void;

  connectChannel: (ch: ConnectedChannel) => void;
  disconnectChannel: (type: ChannelType) => void;

  saveIntegration: (id: string, credentials: Record<string, string>) => void;
  removeIntegration: (id: string) => void;
}

const SEED_PIPELINE_ID = "pipe-vendas";

function seed() {
  const pipelines: Pipeline[] = [
    {
      id: SEED_PIPELINE_ID,
      name: "Funil de Vendas",
      stages: STAGES.map((s) => ({ ...s })),
    },
    {
      // Playbook Comercial Be Fluent v3 — funil de 8 etapas, ao lado do de 5.
      id: COMERCIAL_BF_PIPELINE_ID,
      name: "Funil Comercial Be Fluent",
      stages: STAGES_COMERCIAL_BF.map((s) => ({ ...s })),
    },
  ];
  const deals: Deal[] = DEALS.map((d) => ({
    ...d,
    pipelineId: SEED_PIPELINE_ID,
    status: "open" as const,
    createdAt: new Date().toISOString(),
    stageEnteredAt: new Date().toISOString(),
  }));
  const companies: Company[] = Array.from(new Set(CONTACTS.map((c) => c.company))).map((name) => ({
    id: uid(),
    name,
    owner: CONTACTS.find((c) => c.company === name)?.owner ?? DEMO_USER.name,
  }));
  const automations: Automation[] = [
    { id: uid(), name: "Boas-vindas no WhatsApp", trigger: { type: "legacy", label: "Novo lead via WhatsApp" }, action: { type: "legacy", label: "Enviar mensagem + criar tarefa" }, active: true },
    { id: uid(), name: "Mover para Qualificação", trigger: { type: "legacy", label: "Lead respondeu" }, action: { type: "legacy", label: "Mover negócio de etapa" }, active: true },
    { id: uid(), name: "Alerta de negócio parado", trigger: { type: "deal_stale", days: 7 }, action: { type: "legacy", label: "Notificar responsável" }, active: false },
    { id: uid(), name: "Disparo N8N - lead quente", trigger: { type: "legacy", label: "Score >= 75" }, action: { type: "legacy", label: "Chamar webhook N8N" }, active: true },
  ];
  const scoringRules: ScoringRule[] = [
    { id: uid(), label: "Abriu e-mail de proposta", points: 10 },
    { id: uid(), label: "Respondeu no WhatsApp", points: 15 },
    { id: uid(), label: "Origem: Indicação", points: 20 },
    { id: uid(), label: "Sem resposta ha 14 dias", points: -10 },
  ];
  const financialConfig: FinancialConfig = {
    monthlyMarketingSpend: 0,
    avgContractMonths: 12,
    monthlyChurnRate: 5,
    avgCostPerStudent: 0,
    revenueGoalMonthly: 0,
    leadsPerMonth: 0,
    slaTargetMinutes: 4,
    dailyTargets: {
      leadsContacted: 2,     // Playbook 11.2: ~1-2/dia util
      coldReactivations: 12, // ~10-15/dia util
      diagnosisMeetings: 2,  // meta inicial 1-2/dia
      followupsExecuted: 0,  // 0 = "100% dos agendados"
      b2bProspects: 4,       // 3-5/dia
    },
  };
  const stageBenchmarks: StageBenchmark[] = STAGE_BENCHMARKS_BF.map((b) => ({ ...b }));
  return { pipelines, deals, contacts: [...CONTACTS], activities: [...ACTIVITIES], companies, automations, scoringRules, connectedChannels: [], financialConfig, integrations: {}, stageBenchmarks, sdrs: [] };
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

/** Normaliza string para comparacao de duplicatas (remove acento, lower, trim) */
function normalizeKey(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Chave de deduplicacao: phone > email > nome normalizado */
function dedupeKey(c: Omit<Contact, "id">): string {
  if (c.phone?.trim()) return `ph:${c.phone.replace(/\D/g, "")}`;
  if (c.email?.trim()) return `em:${normalizeKey(c.email)}`;
  return `nm:${normalizeKey(c.name)}`;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...seed(),

      addPipeline: (name) => {
        const id = uid();
        const newPipeline: Pipeline = {
          id,
          name,
          stages: [
            { id: uid(), name: "Novo lead", probability: 10 },
            { id: uid(), name: "Em contato", probability: 40 },
            { id: uid(), name: "Fechamento", probability: 80 },
          ],
        };
        set((s) => ({ pipelines: [...s.pipelines, newPipeline] }));
        void db.upsertPipeline(newPipeline);
        return id;
      },
      renamePipeline: (id, name) => {
        set((s) => ({ pipelines: s.pipelines.map((p) => (p.id === id ? { ...p, name } : p)) }));
        const p = get().pipelines.find((p) => p.id === id);
        if (p) void db.upsertPipeline({ ...p, name });
      },
      deletePipeline: (id) => {
        set((s) => ({
          pipelines: s.pipelines.filter((p) => p.id !== id),
          deals: s.deals.filter((d) => d.pipelineId !== id),
        }));
        void db.deletePipeline(id);
      },
      addStage: (pipelineId, name, probability) => {
        set((s) => ({
          pipelines: s.pipelines.map((p) =>
            p.id === pipelineId ? { ...p, stages: [...p.stages, { id: uid(), name, probability }] } : p
          ),
        }));
        const p = get().pipelines.find((p) => p.id === pipelineId);
        if (p) void db.upsertPipeline(p);
      },
      renameStage: (pipelineId, stageId, name) => {
        set((s) => ({
          pipelines: s.pipelines.map((p) =>
            p.id === pipelineId
              ? { ...p, stages: p.stages.map((st) => (st.id === stageId ? { ...st, name } : st)) }
              : p
          ),
        }));
        const p = get().pipelines.find((p) => p.id === pipelineId);
        if (p) void db.upsertPipeline(p);
      },
      deleteStage: (pipelineId, stageId) => {
        set((s) => ({
          pipelines: s.pipelines.map((p) =>
            p.id === pipelineId ? { ...p, stages: p.stages.filter((st) => st.id !== stageId) } : p
          ),
          deals: s.deals.filter((d) => d.stageId !== stageId),
        }));
        const p = get().pipelines.find((p) => p.id === pipelineId);
        if (p) void db.upsertPipeline(p);
      },
      reorderStages: (pipelineId, stageIds) => {
        set((s) => ({
          pipelines: s.pipelines.map((p) => {
            if (p.id !== pipelineId) return p;
            const map = Object.fromEntries(p.stages.map((st) => [st.id, st]));
            return { ...p, stages: stageIds.map((id) => map[id]).filter(Boolean) };
          }),
        }));
        const p = get().pipelines.find((p) => p.id === pipelineId);
        if (p) void db.upsertPipeline(p);
      },

      addDeal: (d) => {
        const newDeal: Deal = { ...d, id: uid(), status: "open", createdAt: new Date().toISOString(), stageEnteredAt: new Date().toISOString() };
        set((s) => ({ deals: [...s.deals, newDeal] }));
        void db.upsertDeal(newDeal);
      },
      moveDeal: (dealId, stageId) => {
        const before = get().deals.find((d) => d.id === dealId);
        set((s) => ({
          deals: s.deals.map((d) => {
            if (d.id !== dealId || d.stageId === stageId) return d;
            const pipeline = s.pipelines.find((p) => p.id === d.pipelineId);
            const fromName = pipeline?.stages.find((st) => st.id === d.stageId)?.name ?? "—";
            const toName = pipeline?.stages.find((st) => st.id === stageId)?.name ?? "—";
            const entry = { ts: new Date().toISOString(), text: `Movido de ${fromName} -> ${toName}` };
            return { ...d, stageId, stageEnteredAt: new Date().toISOString(), history: [...(d.history ?? []), entry] };
          }),
        }));
        const updated = get().deals.find((d) => d.id === dealId);
        if (updated) void db.upsertDeal(updated);
        if (updated && before && before.stageId !== stageId) {
          const contact = get().contacts.find((c) => c.id === updated.contactId || c.name === updated.contact);
          void import("@/lib/automation-engine").then(({ runAutomations }) =>
            runAutomations({ type: "deal_stage_changed", pipelineId: updated.pipelineId, stageId }, { deal: updated, contact }, get())
          );
        }
      },
      updateDeal: (dealId, patch) => {
        set((s) => ({ deals: s.deals.map((d) => (d.id === dealId ? { ...d, ...patch } : d)) }));
        const updated = get().deals.find((d) => d.id === dealId);
        if (updated) void db.upsertDeal(updated);
      },
      winDeal: (dealId) => {
        set((s) => ({
          deals: s.deals.map((d) =>
            d.id === dealId
              ? { ...d, status: "won", history: [...(d.history ?? []), { ts: new Date().toISOString(), text: "Marcado como ganho" }] }
              : d
          ),
        }));
        const updated = get().deals.find((d) => d.id === dealId);
        if (updated) void db.upsertDeal(updated);
        if (updated) {
          const contact = get().contacts.find((c) => c.id === updated.contactId || c.name === updated.contact);
          void import("@/lib/automation-engine").then(({ runAutomations }) =>
            runAutomations({ type: "deal_won" }, { deal: updated, contact }, get())
          );
        }
      },
      loseDeal: (dealId, reason) => {
        set((s) => ({
          deals: s.deals.map((d) =>
            d.id === dealId
              ? { ...d, status: "lost", lostReason: reason, history: [...(d.history ?? []), { ts: new Date().toISOString(), text: `Marcado como perdido - ${reason}` }] }
              : d
          ),
        }));
        const updated = get().deals.find((d) => d.id === dealId);
        if (updated) void db.upsertDeal(updated);
      },
      deleteDeal: (dealId) => {
        set((s) => ({ deals: s.deals.filter((d) => d.id !== dealId) }));
        void db.deleteDeal(dealId);
      },

      // Contato: sem duplicatas; deleteContact remove deals vinculados
      addContact: (c) => {
        const key = dedupeKey(c);
        let newContact: Contact | null = null;
        set((s) => {
          if (s.contacts.some((ex) => dedupeKey(ex) === key)) return s;
          newContact = { ...c, id: uid() };
          return { contacts: [newContact, ...s.contacts] };
        });
        if (newContact) {
          void db.upsertContact(newContact);
          void import("@/lib/automation-engine").then(({ runAutomations }) =>
            runAutomations({ type: "contact_created" }, { contact: newContact! }, get())
          );
        }
      },
      addContacts: (cs) => {
        let newOnes: Contact[] = [];
        set((s) => {
          const existingKeys = new Set(s.contacts.map(dedupeKey));
          const seen = new Set<string>();
          newOnes = [];
          for (const c of cs) {
            const key = dedupeKey(c);
            if (existingKeys.has(key) || seen.has(key)) continue;
            seen.add(key);
            newOnes.push({ ...c, id: uid() });
          }
          return { contacts: [...newOnes, ...s.contacts] };
        });
        if (newOnes.length > 0) {
          void db.upsertContacts(newOnes);
          // Importação em lote pode trazer centenas de contatos — não dispara
          // automação por contato aqui para não estourar rate limit de
          // WhatsApp/e-mail/Calendar; "novo lead" via import é intencionalmente
          // silencioso (a automação de contact_created é para leads um a um,
          // via formulário/webhook).
        }
      },
      updateContact: (id, patch) => {
        set((s) => ({ contacts: s.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
        const updated = get().contacts.find((c) => c.id === id);
        if (updated) void db.upsertContact(updated);
      },
      deleteContact: (id) => {
        const state = get();
        const contact = state.contacts.find((c) => c.id === id);
        set((s) => ({
          contacts: s.contacts.filter((c) => c.id !== id),
          deals: contact
            ? s.deals.filter((d) => d.contactId !== id && d.contact !== contact.name)
            : s.deals,
        }));
        void db.deleteContact(id);
      },
      addActivity: (a) => {
        const newActivity: Activity = { ...a, id: uid(), done: false };
        set((s) => ({ activities: [newActivity, ...s.activities] }));
        void db.upsertActivity(newActivity);
        // Playbook 10.2 — regra dos 3 dias: qualquer atividade num deal renova lastActivityAt.
        if (newActivity.dealId) get().updateDeal(newActivity.dealId, { lastActivityAt: new Date().toISOString() });
      },
      updateActivity: (id, patch) => {
        set((s) => ({ activities: s.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
        const updated = get().activities.find((a) => a.id === id);
        if (updated) void db.upsertActivity(updated);
        if (updated?.dealId) get().updateDeal(updated.dealId, { lastActivityAt: new Date().toISOString() });
      },
      deleteActivity: (id) => {
        set((s) => ({ activities: s.activities.filter((a) => a.id !== id) }));
        void db.deleteActivity(id);
      },
      toggleActivity: (id) => {
        set((s) => ({ activities: s.activities.map((a) => (a.id === id ? { ...a, done: !a.done } : a)) }));
        const updated = get().activities.find((a) => a.id === id);
        if (updated) void db.upsertActivity(updated);
      },

      updateFinancialConfig: (patch) => {
        set((s) => ({ financialConfig: { ...s.financialConfig, ...patch } }));
        void db.upsertFinancialConfig(get().financialConfig);
      },

      setStageBenchmark: (stageId, patch) => {
        set((s) => {
          const exists = s.stageBenchmarks.some((b) => b.stageId === stageId);
          return {
            stageBenchmarks: exists
              ? s.stageBenchmarks.map((b) => (b.stageId === stageId ? { ...b, ...patch } : b))
              : [...s.stageBenchmarks, { stageId, expectedConversionPct: 50, alertFloorPct: 40, ...patch }],
          };
        });
      },
      resetStageBenchmarks: () => {
        set({ stageBenchmarks: STAGE_BENCHMARKS_BF.map((b) => ({ ...b })) });
      },

      // addSdr/updateSdr: credenciais (zapiToken, zapiClientToken,
      // metaAccessToken, metaVerifyToken) NUNCA ficam no store Zustand
      // persistido (localStorage) — só passam em trânsito até /api/sdrs,
      // que grava via service role, e o state local guarda apenas os
      // booleanos has*. Antes disso, qualquer sessão do CRM (e o
      // localStorage) tinha o token real do WhatsApp de cada SDR em texto
      // puro — bastava abrir o DevTools.
      addSdr: (s) => {
        const id = uid();
        const { zapiToken, zapiClientToken, metaAccessToken, metaVerifyToken, ...rest } = s;
        const newSdr: Sdr = {
          ...rest, id, createdAt: new Date().toISOString(),
          hasZapiToken: !!zapiToken, hasZapiClientToken: !!zapiClientToken,
          hasMetaAccessToken: !!metaAccessToken, hasMetaVerifyToken: !!metaVerifyToken,
        };
        set((st) => ({ sdrs: [...st.sdrs, newSdr] }));
        // webhookSecret só existe na resposta desta primeira chamada (a API
        // só gera na criação) — guarda no store pra sdr-connect.tsx exibir
        // a URL do webhook completa sem precisar de uma segunda chamada.
        void fetch("/api/sdrs", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...rest, id, zapiToken, zapiClientToken, metaAccessToken, metaVerifyToken }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.webhookSecret) {
              set((st) => ({ sdrs: st.sdrs.map((x) => (x.id === id ? { ...x, webhookSecret: data.webhookSecret, hasWebhookSecret: true } : x)) }));
            }
          })
          .catch((e) => console.error("[sdr] falha ao salvar:", e));
        return id;
      },
      updateSdr: (id, patch) => {
        const { zapiToken, zapiClientToken, metaAccessToken, metaVerifyToken, ...rest } = patch;
        set((s) => ({
          sdrs: s.sdrs.map((x) => (x.id === id ? {
            ...x, ...rest,
            hasZapiToken: zapiToken !== undefined ? !!zapiToken : x.hasZapiToken,
            hasZapiClientToken: zapiClientToken !== undefined ? !!zapiClientToken : x.hasZapiClientToken,
            hasMetaAccessToken: metaAccessToken !== undefined ? !!metaAccessToken : x.hasMetaAccessToken,
            hasMetaVerifyToken: metaVerifyToken !== undefined ? !!metaVerifyToken : x.hasMetaVerifyToken,
          } : x)),
        }));
        void fetch("/api/sdrs", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...rest, id, zapiToken, zapiClientToken, metaAccessToken, metaVerifyToken }),
        }).catch((e) => console.error("[sdr] falha ao salvar:", e));
      },
      deleteSdr: (id) => {
        set((s) => ({ sdrs: s.sdrs.filter((x) => x.id !== id) }));
        void fetch(`/api/sdrs?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch((e) => console.error("[sdr] falha ao excluir:", e));
      },
      assignContactToSdr: (contactId, sdrId) => {
        const state = get();
        const sdr = state.sdrs.find((s) => s.id === sdrId);
        const contact = state.contacts.find((c) => c.id === contactId);
        if (!sdr || !contact) return;
        const fromName = contact.owner || "—";

        set((s) => ({
          contacts: s.contacts.map((c) => (c.id === contactId ? { ...c, sdrId, owner: sdr.name } : c)),
          deals: s.deals.map((d) => {
            const linked = d.contactId === contactId || d.contact === contact.name;
            if (!linked || d.status !== "open") return d;
            const entry = { ts: new Date().toISOString(), text: `Lead transferido de ${fromName} para ${sdr.name}` };
            return { ...d, sdrId, owner: sdr.name, history: [...(d.history ?? []), entry] };
          }),
        }));

        const updatedContact = get().contacts.find((c) => c.id === contactId);
        if (updatedContact) void db.upsertContact(updatedContact);
        for (const d of get().deals) {
          if (d.contactId === contactId || d.contact === contact.name) void db.upsertDeal(d);
        }
      },

      winDealAndOnboard: (dealId) => {
        const state = get();
        const deal = state.deals.find((d) => d.id === dealId);
        if (!deal) return;

        // 1. Marca como won com histórico
        const wonEntry = { ts: new Date().toISOString(), text: "Venda registrada — aluno convertido" };

        // 2. Bump de score do contato: +50 pts pela conversão (embasado: compra real)
        const contact = state.contacts.find((c) => c.name === deal.contact || c.id === deal.contactId);
        if (contact) {
          const newScore = Math.min(100, contact.score + 50);
          set((s) => ({
            contacts: s.contacts.map((c) =>
              c.id === contact.id ? { ...c, score: newScore } : c
            ),
          }));
        }

        // 3. Tenta encontrar funil de onboarding e etapa D1
        const onboardingPipeline = state.pipelines.find((p) =>
          p.name.toLowerCase().includes("onboard") ||
          p.name.toLowerCase().includes("d1") ||
          p.name.toLowerCase().includes("ps-venda") ||
          p.name.toLowerCase().includes("pos")
        );
        const d1Stage = onboardingPipeline?.stages.find((s) =>
          s.name.toLowerCase().includes("d1") ||
          s.name.toLowerCase().includes("01 dia") ||
          s.name.toLowerCase().includes("pos") ||
          s.name.toLowerCase().includes("primeiro")
        ) ?? onboardingPipeline?.stages[0];

        // 4. Marca won e (se houver onboarding) cria novo deal lá
        set((s) => ({
          deals: s.deals.map((d) =>
            d.id === dealId
              ? { ...d, status: "won", history: [...(d.history ?? []), wonEntry] }
              : d
          ),
        }));

        // Espelha deal won no Supabase
        const wonDeal = get().deals.find((d) => d.id === dealId);
        if (wonDeal) void db.upsertDeal(wonDeal);

        if (onboardingPipeline && d1Stage) {
          const onboardDeal: Deal = {
            id: uid(),
            title: deal.title,
            value: deal.value,
            pipelineId: onboardingPipeline.id,
            stageId: d1Stage.id,
            contact: deal.contact,
            contactId: deal.contactId,
            owner: deal.owner,
            tags: deal.tags,
            status: "open" as const,
            createdAt: new Date().toISOString(),
            stageEnteredAt: new Date().toISOString(),
            notes: `Convertido do funil comercial em ${new Date().toLocaleDateString("pt-BR")}`,
            history: [{ ts: new Date().toISOString(), text: `Iniciou onboarding — etapa ${d1Stage.name}` }],
          };
          set((s) => ({ deals: [...s.deals, onboardDeal] }));
          void db.upsertDeal(onboardDeal);
        }
      },

      addCompany: (c) => {
        const newC: Company = { ...c, id: uid() };
        set((s) => ({ companies: [newC, ...s.companies] }));
        void db.upsertCompany(newC);
      },
      updateCompany: (id, patch) => {
        set((s) => ({ companies: s.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
        const updated = get().companies.find((c) => c.id === id);
        if (updated) void db.upsertCompany(updated);
      },
      deleteCompany: (id) => {
        set((s) => ({ companies: s.companies.filter((c) => c.id !== id) }));
        void db.deleteCompany(id);
      },

      addAutomation: (a) => {
        const newA: Automation = { ...a, id: uid(), active: true };
        set((s) => ({ automations: [newA, ...s.automations] }));
        void db.upsertAutomation(newA);
      },
      updateAutomation: (id, patch) => {
        set((s) => ({ automations: s.automations.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
        const updated = get().automations.find((a) => a.id === id);
        if (updated) void db.upsertAutomation(updated);
      },
      toggleAutomation: (id) => {
        set((s) => ({ automations: s.automations.map((a) => (a.id === id ? { ...a, active: !a.active } : a)) }));
        const updated = get().automations.find((a) => a.id === id);
        if (updated) void db.upsertAutomation(updated);
      },
      deleteAutomation: (id) => {
        set((s) => ({ automations: s.automations.filter((a) => a.id !== id) }));
        void db.deleteAutomation(id);
      },

      addScoringRule: (r) => {
        const newR: ScoringRule = { ...r, id: uid() };
        set((s) => ({ scoringRules: [newR, ...s.scoringRules] }));
        void db.upsertScoringRule(newR);
      },
      deleteScoringRule: (id) => {
        set((s) => ({ scoringRules: s.scoringRules.filter((r) => r.id !== id) }));
        void db.deleteScoringRule(id);
      },

      connectChannel: (ch) => {
        set((s) => ({
          connectedChannels: [
            ...s.connectedChannels.filter((c) => c.type !== ch.type),
            ch,
          ],
        }));
        void db.upsertChannel(ch);
      },
      disconnectChannel: (type) => {
        set((s) => ({ connectedChannels: s.connectedChannels.filter((c) => c.type !== type) }));
        void db.deleteChannel(type);
      },

      saveIntegration: (id, credentials) => {
        const data: SavedIntegration = { id, credentials, connectedAt: new Date().toISOString() };
        set((s) => ({ integrations: { ...s.integrations, [id]: data } }));
        void db.upsertIntegration(id, data);
      },
      removeIntegration: (id) => {
        set((s) => {
          const next = { ...s.integrations };
          delete next[id];
          return { integrations: next };
        });
        void db.deleteIntegration(id);
      },
    }),
    {
      name: "beely-store",
      version: 8,
      skipHydration: true,
      migrate: (_persisted: unknown, fromVersion) => {
        if (fromVersion < 4) return seed() as unknown as StoreState;
        const base = seed();
        const prev = (_persisted ?? {}) as Partial<StoreState>;

        // Preserva os funis do usuario e ANEXA o "Funil Comercial Be Fluent"
        // se ainda nao existir (nunca substitui, nunca remove).
        const prevPipelines = prev.pipelines ?? base.pipelines;
        const hasBfPipeline = prevPipelines.some((p) => p.id === COMERCIAL_BF_PIPELINE_ID);
        const bfPipeline = base.pipelines.find((p) => p.id === COMERCIAL_BF_PIPELINE_ID);
        const pipelines = hasBfPipeline || !bfPipeline
          ? prevPipelines
          : [...prevPipelines, bfPipeline];

        return {
          ...base,
          ...prev,
          pipelines,
          connectedChannels: prev.connectedChannels ?? [],
          financialConfig: { ...base.financialConfig, ...(prev.financialConfig ?? {}) },
          integrations: prev.integrations ?? {},
          stageBenchmarks: prev.stageBenchmarks?.length ? prev.stageBenchmarks : base.stageBenchmarks,
          sdrs: prev.sdrs ?? [],
        } as StoreState;
      },
    }
  )
);

export const DEFAULT_OWNER = DEMO_USER.name;

export function useHydrated() {
  return useSyncExternalStore(
    (cb) => useStore.persist.onFinishHydration(cb),
    () => useStore.persist.hasHydrated(),
    () => false
  );
}
