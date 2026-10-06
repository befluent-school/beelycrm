/**
 * Camada de persistência do Beely CRM — fala com o Postgres local via a
 * API interna /api/data/* (Drizzle server-side, nunca Supabase).
 *
 * Estratégia: Zustand é o cache local (UI reativa), Postgres é o source of
 * truth. Cada mutação no store chama a função correspondente aqui em
 * paralelo. Na inicialização, loadAll() busca tudo da API e hidrata o store.
 *
 * Este arquivo roda NO NAVEGADOR (importado por componentes "use client" e
 * por store.ts) — por isso fala com /api/data/* via fetch, nunca importa
 * Drizzle/pg diretamente (não existe driver de Postgres no browser). A
 * implementação real das queries fica em src/db/queries.ts, chamada pelas
 * Route Handlers em src/app/api/data/*.
 */

import type {
  Pipeline, Deal, Contact, Activity, Company,
  Automation, AutomationTrigger, AutomationAction, ScoringRule, ConnectedChannel, SavedIntegration, FinancialConfig, Sdr,
} from "@/lib/store";

/* ── Helpers de conversão ─────────────────────────────────── */

/**
 * trigger/action de Automation são objetos estruturados no store (motor
 * real de execução), mas a coluna no banco é TEXT — grava JSON.stringify e
 * lê de volta com JSON.parse. Automações criadas antes dessa mudança tinham
 * texto livre nessas colunas (ex.: "Novo lead criado"); como não é JSON
 * válido, o parse cai no fallback "legacy" — continuam existindo e
 * visíveis, só não são mais executadas pelo motor.
 */
function parseAutomationTrigger(raw: string): AutomationTrigger {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "type" in parsed) return parsed as AutomationTrigger;
  } catch { /* não era JSON — automação antiga em texto livre */ }
  return { type: "legacy", label: raw };
}
function parseAutomationAction(raw: string): AutomationAction {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "type" in parsed) return parsed as AutomationAction;
  } catch { /* não era JSON — automação antiga em texto livre */ }
  return { type: "legacy", label: raw };
}

// snake_case do banco → camelCase do store
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDeal(r: any): Deal {
  return {
    id:             r.id,
    title:          r.title,
    value:          Number(r.value ?? 0),
    pipelineId:     r.pipelineId,
    stageId:        r.stageId,
    contact:        r.contact ?? "",
    contactId:      r.contactId ?? undefined,
    owner:          r.owner ?? "",
    tags:           r.tags ?? [],
    status:         r.status ?? "open",
    lostReason:     r.lostReason ?? undefined,
    notes:          r.notes ?? undefined,
    history:        r.history ?? [],
    createdAt:      r.createdAt,
    stageEnteredAt: r.stageEnteredAt ?? undefined,
    // Playbook Comercial Be Fluent v3 — campos aditivos
    slaRespondedAt:     r.slaRespondedAt ?? undefined,
    costOfInactionNote: r.costOfInactionNote ?? undefined,
    refusalCount:       r.refusalCount ?? undefined,
    lastActivityAt:     r.lastActivityAt ?? undefined,
    bant:              r.bant ?? undefined,
    sdrId:             r.sdrId ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toContact(r: any): Contact {
  return {
    id:                  r.id,
    name:                r.name,
    email:               r.email ?? "",
    phone:               r.phone ?? "",
    company:             r.company ?? "",
    fantasyName:         r.fantasyName ?? undefined,
    source:              r.source ?? "",
    campaign:            r.campaign ?? undefined,
    funnel:              r.funnel ?? undefined,
    stage:               r.stage ?? undefined,
    status:              r.status ?? undefined,
    team:                r.team ?? undefined,
    score:               r.score ?? 0,
    tags:                r.tags ?? [],
    owner:               r.owner ?? "",
    cep:                 r.cep ?? undefined,
    country:             r.country ?? undefined,
    state:               r.state ?? undefined,
    city:                r.city ?? undefined,
    neighborhood:        r.neighborhood ?? undefined,
    street:              r.street ?? undefined,
    complement:          r.complement ?? undefined,
    number:              r.number ?? undefined,
    companyCep:          r.companyCep ?? undefined,
    companyCountry:      r.companyCountry ?? undefined,
    companyState:        r.companyState ?? undefined,
    companyCity:         r.companyCity ?? undefined,
    companyNeighborhood: r.companyNeighborhood ?? undefined,
    companyStreet:       r.companyStreet ?? undefined,
    companyComplement:   r.companyComplement ?? undefined,
    companyNumber:       r.companyNumber ?? undefined,
    cpfCnpj:             r.cpfCnpj ?? undefined,
    product:             r.product ?? undefined,
    productValue:        r.productValue != null ? Number(r.productValue) : undefined,
    productDesc:         r.productDesc ?? undefined,
    metaAdId:            r.metaAdId ?? undefined,
    metaAdName:          r.metaAdName ?? undefined,
    metaAdsetId:         r.metaAdsetId ?? undefined,
    metaAdsetName:       r.metaAdsetName ?? undefined,
    metaCampaignId:      r.metaCampaignId ?? undefined,
    metaCampaignName:    r.metaCampaignName ?? undefined,
    metaFormId:          r.metaFormId ?? undefined,
    metaFormName:        r.metaFormName ?? undefined,
    metaPageId:          r.metaPageId ?? undefined,
    metaPageName:        r.metaPageName ?? undefined,
    metaLeadgenId:       r.metaLeadgenId ?? undefined,
    metaPlatform:        r.metaPlatform ?? undefined,
    utmUrl:              r.utmUrl ?? undefined,
    utmMedium:           r.utmMedium ?? undefined,
    utmSource:           r.utmSource ?? undefined,
    utmCampaign:         r.utmCampaign ?? undefined,
    utmTerm:             r.utmTerm ?? undefined,
    utmContent:          r.utmContent ?? undefined,
    urgency:             r.urgency ?? undefined,
    investmentIntent:    r.investmentIntent ?? undefined,
    jobTitle:            r.jobTitle ?? undefined,
    monthlyBudget:       r.monthlyBudget ?? undefined,
    contactPreference:   r.contactPreference ?? undefined,
    mainChallenge:       r.mainChallenge ?? undefined,
    sector:              r.sector ?? undefined,
    classFrequency:      r.classFrequency ?? undefined,
    professionalMoment:  r.professionalMoment ?? undefined,
    discarded:           r.discarded ?? false,
    discardReason:       r.discardReason ?? undefined,
    discardDesc:         r.discardDesc ?? undefined,
    firstNote:           r.firstNote ?? undefined,
    firstTask:           r.firstTask ?? undefined,
    registeredAt:        r.registeredAt ?? undefined,
    externalId:          r.externalId ?? undefined,
    // Playbook Comercial Be Fluent v3 — qualificação BANT + Avenida do Não
    bantBudget:          r.bantBudget ?? undefined,
    bantAuthority:       r.bantAuthority ?? undefined,
    bantNeed:            r.bantNeed ?? undefined,
    bantTiming:          r.bantTiming ?? undefined,
    bantNote:            r.bantNote ?? undefined,
    refusalCount:        r.refusalCount ?? undefined,
    sdrId:               r.sdrId ?? undefined,
  };
}

// camelCase do store → shape esperado pela rota (chaves camelCase — o
// Drizzle já mapeia para snake_case internamente via schema.ts).
function fromContact(c: Contact) {
  return {
    id:                  c.id,
    name:                c.name,
    email:               c.email || null,
    phone:               c.phone || null,
    company:             c.company || null,
    fantasyName:         c.fantasyName ?? null,
    source:              c.source || null,
    campaign:            c.campaign ?? null,
    funnel:              c.funnel ?? null,
    stage:               c.stage ?? null,
    status:              c.status ?? null,
    team:                c.team ?? null,
    score:               c.score,
    tags:                c.tags,
    owner:               c.owner || null,
    cep:                 c.cep ?? null,
    country:             c.country ?? null,
    state:               c.state ?? null,
    city:                c.city ?? null,
    neighborhood:        c.neighborhood ?? null,
    street:              c.street ?? null,
    complement:          c.complement ?? null,
    number:              c.number ?? null,
    companyCep:          c.companyCep ?? null,
    companyCountry:      c.companyCountry ?? null,
    companyState:        c.companyState ?? null,
    companyCity:         c.companyCity ?? null,
    companyNeighborhood: c.companyNeighborhood ?? null,
    companyStreet:       c.companyStreet ?? null,
    companyComplement:   c.companyComplement ?? null,
    companyNumber:       c.companyNumber ?? null,
    cpfCnpj:             c.cpfCnpj ?? null,
    product:             c.product ?? null,
    productValue:        c.productValue != null ? String(c.productValue) : null,
    productDesc:         c.productDesc ?? null,
    metaAdId:            c.metaAdId ?? null,
    metaAdName:          c.metaAdName ?? null,
    metaAdsetId:         c.metaAdsetId ?? null,
    metaAdsetName:       c.metaAdsetName ?? null,
    metaCampaignId:      c.metaCampaignId ?? null,
    metaCampaignName:    c.metaCampaignName ?? null,
    metaFormId:          c.metaFormId ?? null,
    metaFormName:        c.metaFormName ?? null,
    metaPageId:          c.metaPageId ?? null,
    metaPageName:        c.metaPageName ?? null,
    metaLeadgenId:       c.metaLeadgenId ?? null,
    metaPlatform:        c.metaPlatform ?? null,
    utmUrl:              c.utmUrl ?? null,
    utmMedium:           c.utmMedium ?? null,
    utmSource:           c.utmSource ?? null,
    utmCampaign:         c.utmCampaign ?? null,
    utmTerm:             c.utmTerm ?? null,
    utmContent:          c.utmContent ?? null,
    urgency:             c.urgency ?? null,
    investmentIntent:    c.investmentIntent ?? null,
    jobTitle:            c.jobTitle ?? null,
    monthlyBudget:       c.monthlyBudget ?? null,
    contactPreference:   c.contactPreference ?? null,
    mainChallenge:       c.mainChallenge ?? null,
    sector:              c.sector ?? null,
    classFrequency:      c.classFrequency ?? null,
    professionalMoment:  c.professionalMoment ?? null,
    discarded:           c.discarded ?? false,
    discardReason:       c.discardReason ?? null,
    discardDesc:         c.discardDesc ?? null,
    firstNote:           c.firstNote ?? null,
    firstTask:           c.firstTask ?? null,
    registeredAt:        c.registeredAt ?? null,
    externalId:          c.externalId ?? null,
    // Playbook Comercial Be Fluent v3
    bantBudget:          c.bantBudget ?? null,
    bantAuthority:       c.bantAuthority ?? null,
    bantNeed:            c.bantNeed ?? null,
    bantTiming:          c.bantTiming ?? null,
    bantNote:            c.bantNote ?? null,
    refusalCount:        c.refusalCount ?? 0,
    sdrId:               c.sdrId ?? null,
    updatedAt:           new Date().toISOString(),
  };
}

function fromDeal(d: Deal) {
  return {
    id:              d.id,
    title:           d.title,
    value:           String(d.value),
    pipelineId:      d.pipelineId,
    stageId:         d.stageId,
    contact:         d.contact || null,
    contactId:       d.contactId ?? null,
    owner:           d.owner || null,
    tags:            d.tags ?? [],
    status:          d.status,
    lostReason:      d.lostReason ?? null,
    notes:           d.notes ?? null,
    history:         d.history ?? [],
    stageEnteredAt:  d.stageEnteredAt ?? null,
    createdAt:       d.createdAt,
    updatedAt:       new Date().toISOString(),
    // Playbook Comercial Be Fluent v3 — campos aditivos
    slaRespondedAt:      d.slaRespondedAt ?? null,
    costOfInactionNote:  d.costOfInactionNote ?? null,
    refusalCount:        d.refusalCount ?? 0,
    lastActivityAt:      d.lastActivityAt ?? null,
    bant:                d.bant ?? null,
    sdrId:               d.sdrId ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toActivity(r: any): Activity {
  return {
    id:      r.id,
    type:    r.type,
    title:   r.title,
    due:     r.due ?? "",
    dueDate: r.dueDate ?? undefined,
    dueTime: r.dueTime ?? undefined,
    contact: r.contact ?? "",
    done:    r.done ?? false,
    dealId:  r.dealId ?? undefined,
    notes:   r.notes ?? undefined,
  };
}

function fromActivity(a: Activity) {
  return {
    id:      a.id,
    type:    a.type,
    title:   a.title,
    due:     a.due || null,
    dueDate: a.dueDate ?? null,
    dueTime: a.dueTime ?? null,
    contact: a.contact || null,
    done:    a.done,
    dealId:  a.dealId ?? null,
    notes:   a.notes ?? null,
  };
}

/* ── Carregamento inicial ─────────────────────────────────── */

export interface DbSnapshot {
  pipelines:         Pipeline[];
  deals:             Deal[];
  contacts:          Contact[];
  activities:        Activity[];
  companies:         Company[];
  automations:       Automation[];
  scoringRules:      ScoringRule[];
  connectedChannels: ConnectedChannel[];
  integrations:      Record<string, SavedIntegration>;
  financialConfig:   FinancialConfig;
  sdrs:              Sdr[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSdr(r: any): Sdr {
  // Nunca devolve o valor real de token/access token/verify token ao
  // navegador — loadAll() roda no client. Só os booleanos has* indicam que
  // existe uma credencial salva; o valor de verdade só existe server-side
  // (webhooks, /api/inbox/send, /api/sdrs) usando o Postgres direto.
  return {
    id:                 r.id,
    name:               r.name,
    email:              r.email ?? undefined,
    avatarColor:        r.avatarColor ?? undefined,
    active:             r.active ?? true,
    waProvider:         r.waProvider ?? undefined,
    zapiInstanceId:     r.zapiInstanceId ?? undefined,
    hasZapiToken:       !!r.zapiToken,
    hasZapiClientToken: !!r.zapiClientToken,
    metaPhoneNumberId:  r.metaPhoneNumberId ?? undefined,
    hasMetaAccessToken: !!r.metaAccessToken,
    metaWabaId:         r.metaWabaId ?? undefined,
    hasMetaVerifyToken: !!r.metaVerifyToken,
    hasWebhookSecret:   !!r.webhookSecret,
    phoneDisplay:       r.phoneDisplay ?? undefined,
    createdAt:          r.createdAt,
  };
}

const DEFAULT_DAILY_TARGETS = {
  leadsContacted: 2,
  coldReactivations: 12,
  diagnosisMeetings: 2,
  followupsExecuted: 0,
  b2bProspects: 4,
};

const DEFAULT_FINANCIAL: FinancialConfig = {
  monthlyMarketingSpend: 0,
  avgContractMonths: 12,
  monthlyChurnRate: 5,
  avgCostPerStudent: 0,
  revenueGoalMonthly: 0,
  leadsPerMonth: 0,
  slaTargetMinutes: 4,
  dailyTargets: { ...DEFAULT_DAILY_TARGETS },
};

/**
 * Une uma lista local com a versão vinda do banco por id, SEM nunca
 * descartar um registro que só existe localmente — essencial para um
 * refresh (periódico, manual, ou de visibilidade da aba) não apagar dados
 * recém-criados (ex.: leads importados em lote) cujo upsert ainda está em
 * voo quando o refresh dispara. O snapshot remoto vence quando o id já
 * existe dos dois lados (é o source of truth para edições), mas nunca
 * remove um item local-only — só uma exclusão explícita (delete*) tira algo
 * da lista.
 */
export function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const remoteIds = new Set(remote.map((r) => r.id));
  const localOnly = local.filter((l) => !remoteIds.has(l.id));
  return [...remote, ...localOnly];
}

export async function loadAll(): Promise<DbSnapshot | null> {
  try {
    const res = await fetch("/api/data");
    const data = await res.json();
    if (!data.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const integrationsMap: Record<string, SavedIntegration> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const row of data.integrations ?? []) {
      integrationsMap[row.id] = {
        id:           row.id,
        connectedAt:  row.connectedAt,
        credentials:  row.credentials ?? {},
      };
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pipelines: (data.pipelines ?? []).map((r: any) => ({
        id:     r.id,
        name:   r.name,
        stages: r.stages ?? [],
      })),
      deals:             (data.deals ?? []).map(toDeal),
      contacts:          (data.contacts ?? []).map(toContact),
      activities:        (data.activities ?? []).map(toActivity),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      companies:         (data.companies ?? []).map((r: any) => ({
        id: r.id, name: r.name, domain: r.domain ?? undefined,
        phone: r.phone ?? undefined, segment: r.segment ?? undefined,
        notes: r.notes ?? undefined, owner: r.owner ?? "",
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      automations:       (data.automations ?? []).map((r: any) => ({
        id: r.id, name: r.name,
        trigger: parseAutomationTrigger(r.trigger ?? ""),
        action: parseAutomationAction(r.action ?? ""),
        active: r.active ?? true,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scoringRules:      (data.scoringRules ?? []).map((r: any) => ({
        id: r.id, label: r.label, points: r.points ?? 0,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connectedChannels: (data.connectedChannels ?? []).map((r: any) => ({
        type: r.type, provider: r.provider ?? "",
        connectedAt: r.connectedAt, credentials: r.credentials ?? {},
      })),
      integrations: integrationsMap,
      financialConfig: data.financialConfig ? {
        monthlyMarketingSpend: Number(data.financialConfig.monthlyMarketingSpend ?? 0),
        avgContractMonths:     Number(data.financialConfig.avgContractMonths ?? 12),
        monthlyChurnRate:      Number(data.financialConfig.monthlyChurnRate ?? 5),
        avgCostPerStudent:     Number(data.financialConfig.avgCostPerStudent ?? 0),
        revenueGoalMonthly:    Number(data.financialConfig.revenueGoalMonthly ?? 0),
        leadsPerMonth:         Number(data.financialConfig.leadsPerMonth ?? 0),
        slaTargetMinutes:      Number(data.financialConfig.slaTargetMinutes ?? 4),
        dailyTargets:          { ...DEFAULT_DAILY_TARGETS, ...(data.financialConfig.dailyTargets ?? {}) },
      } : DEFAULT_FINANCIAL,
      sdrs: (data.sdrs ?? []).map(toSdr),
    };
  } catch (e) {
    console.error("[db] loadAll falhou:", e);
    return null;
  }
}

/* ── Mutações individuais ─────────────────────────────────── */

/**
 * Loga qualquer erro de persistência em vez de engolir silenciosamente —
 * sem isso, uma escrita bloqueada (coluna faltando, conexão caída, etc.)
 * nunca aparecia em lugar nenhum: o dado "sumia" sem nenhum rastro no
 * console. Foi assim que o bug do SDR não persistir passou despercebido;
 * aplicado aqui para toda mutação do CRM.
 */
async function postEntity(entity: string, body: unknown) {
  try {
    const res = await fetch(`/api/data/${entity}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error(`[db] upsert em "${entity}" falhou:`, data.error ?? res.statusText);
    }
  } catch (e) {
    console.error(`[db] upsert em "${entity}" falhou (rede):`, e);
  }
}

async function deleteEntity(entity: string, id: string, param = "id") {
  try {
    const res = await fetch(`/api/data/${entity}?${param}=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error(`[db] delete em "${entity}" falhou:`, data.error ?? res.statusText);
    }
  } catch (e) {
    console.error(`[db] delete em "${entity}" falhou (rede):`, e);
  }
}

export const db = {
  // ── Pipelines ──────────────────────────────────────────────
  upsertPipeline: async (p: Pipeline) => postEntity("pipelines", { id: p.id, name: p.name, stages: p.stages }),
  deletePipeline: async (id: string) => deleteEntity("pipelines", id),

  // ── Deals ──────────────────────────────────────────────────
  upsertDeal: async (d: Deal) => postEntity("deals", fromDeal(d)),
  deleteDeal: async (id: string) => deleteEntity("deals", id),

  // ── Contacts ───────────────────────────────────────────────
  upsertContact: async (c: Contact) => postEntity("contacts", fromContact(c)),
  upsertContacts: async (cs: Contact[]) => {
    if (cs.length === 0) return;
    await postEntity("contacts", cs.map(fromContact));
  },
  deleteContact: async (id: string) => deleteEntity("contacts", id),

  // ── Activities ─────────────────────────────────────────────
  upsertActivity: async (a: Activity) => postEntity("activities", fromActivity(a)),
  deleteActivity: async (id: string) => deleteEntity("activities", id),

  // ── Companies ──────────────────────────────────────────────
  upsertCompany: async (c: Company) => postEntity("companies", {
    id: c.id, name: c.name, domain: c.domain ?? null, phone: c.phone ?? null,
    segment: c.segment ?? null, notes: c.notes ?? null, owner: c.owner,
  }),
  deleteCompany: async (id: string) => deleteEntity("companies", id),

  // ── Automations ────────────────────────────────────────────
  upsertAutomation: async (a: Automation) => postEntity("automations", {
    id: a.id, name: a.name, trigger: JSON.stringify(a.trigger), action: JSON.stringify(a.action), active: a.active,
  }),
  deleteAutomation: async (id: string) => deleteEntity("automations", id),

  // ── Scoring Rules ──────────────────────────────────────────
  upsertScoringRule: async (r: ScoringRule) => postEntity("scoring-rules", { id: r.id, label: r.label, points: r.points }),
  deleteScoringRule: async (id: string) => deleteEntity("scoring-rules", id),

  // ── Connected Channels ─────────────────────────────────────
  upsertChannel: async (ch: ConnectedChannel) => postEntity("connected-channels", {
    type: ch.type, provider: ch.provider, credentials: ch.credentials, connectedAt: ch.connectedAt,
  }),
  deleteChannel: async (type: string) => deleteEntity("connected-channels", type, "type"),

  // ── Integrations ───────────────────────────────────────────
  upsertIntegration: async (id: string, data: SavedIntegration) => postEntity("integrations", {
    id, credentials: data.credentials, connectedAt: data.connectedAt,
  }),
  deleteIntegration: async (id: string) => deleteEntity("integrations", id),

  // ── Financial Config ───────────────────────────────────────
  upsertFinancialConfig: async (fc: FinancialConfig) => postEntity("financial-config", {
    id: "default",
    monthlyMarketingSpend: fc.monthlyMarketingSpend,
    avgContractMonths:     fc.avgContractMonths,
    monthlyChurnRate:      fc.monthlyChurnRate,
    avgCostPerStudent:     fc.avgCostPerStudent,
    revenueGoalMonthly:    fc.revenueGoalMonthly,
    leadsPerMonth:         fc.leadsPerMonth,
    slaTargetMinutes:      fc.slaTargetMinutes,
    dailyTargets:          fc.dailyTargets,
    updatedAt:             new Date().toISOString(),
  }),

  // ── SDRs (WhatsApp Business por atendente) ──────────────────
  // Mantido por compatibilidade — SDRs já tinham migrado para /api/sdrs
  // numa correção de segurança anterior (nunca envia credencial real pelo
  // navegador); este caminho não é mais chamado por addSdr/updateSdr no
  // store, mas fica disponível caso algo ainda dependa dele.
  upsertSdr: async (s: Sdr) => postEntity("sdrs", {
    id: s.id, name: s.name, email: s.email ?? null, avatarColor: s.avatarColor ?? null,
    active: s.active ?? true, waProvider: s.waProvider ?? null,
    zapiInstanceId: s.zapiInstanceId ?? null, phoneDisplay: s.phoneDisplay ?? null,
    createdAt: s.createdAt,
  }),
  deleteSdr: async (id: string) => deleteEntity("sdrs", id),
};
