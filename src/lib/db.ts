/**
 * Camada de persistência Supabase para o Beely CRM.
 *
 * Estratégia: Zustand é o cache local (UI reativa), Supabase é o source of truth.
 * Cada mutação no store chama a função correspondente aqui em paralelo.
 * Na inicialização, loadAll() busca tudo do Supabase e hidrata o store.
 */

import { supabase } from "@/lib/supabase";
import type {
  Pipeline, Deal, Contact, Activity, Company,
  Automation, ScoringRule, ConnectedChannel, SavedIntegration, FinancialConfig, Sdr,
} from "@/lib/store";

/* ── Helpers de conversão ─────────────────────────────────── */

// snake_case do banco → camelCase do store
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toDeal(r: any): Deal {
  return {
    id:             r.id,
    title:          r.title,
    value:          Number(r.value ?? 0),
    pipelineId:     r.pipeline_id,
    stageId:        r.stage_id,
    contact:        r.contact ?? "",
    contactId:      r.contact_id ?? undefined,
    owner:          r.owner ?? "",
    tags:           r.tags ?? [],
    status:         r.status ?? "open",
    lostReason:     r.lost_reason ?? undefined,
    notes:          r.notes ?? undefined,
    history:        r.history ?? [],
    createdAt:      r.created_at,
    stageEnteredAt: r.stage_entered_at ?? undefined,
    // Playbook Comercial Be Fluent v3 — campos aditivos
    slaRespondedAt:     r.sla_responded_at ?? undefined,
    costOfInactionNote: r.cost_of_inaction_note ?? undefined,
    refusalCount:       r.refusal_count ?? undefined,
    lastActivityAt:     r.last_activity_at ?? undefined,
    bant:              r.bant ?? undefined,
    sdrId:             r.sdr_id ?? undefined,
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
    fantasyName:         r.fantasy_name ?? undefined,
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
    companyCep:          r.company_cep ?? undefined,
    companyCountry:      r.company_country ?? undefined,
    companyState:        r.company_state ?? undefined,
    companyCity:         r.company_city ?? undefined,
    companyNeighborhood: r.company_neighborhood ?? undefined,
    companyStreet:       r.company_street ?? undefined,
    companyComplement:   r.company_complement ?? undefined,
    companyNumber:       r.company_number ?? undefined,
    cpfCnpj:             r.cpf_cnpj ?? undefined,
    product:             r.product ?? undefined,
    productValue:        r.product_value != null ? Number(r.product_value) : undefined,
    productDesc:         r.product_desc ?? undefined,
    metaAdId:            r.meta_ad_id ?? undefined,
    metaAdName:          r.meta_ad_name ?? undefined,
    metaAdsetId:         r.meta_adset_id ?? undefined,
    metaAdsetName:       r.meta_adset_name ?? undefined,
    metaCampaignId:      r.meta_campaign_id ?? undefined,
    metaCampaignName:    r.meta_campaign_name ?? undefined,
    metaFormId:          r.meta_form_id ?? undefined,
    metaFormName:        r.meta_form_name ?? undefined,
    metaPageId:          r.meta_page_id ?? undefined,
    metaPageName:        r.meta_page_name ?? undefined,
    metaLeadgenId:       r.meta_leadgen_id ?? undefined,
    metaPlatform:        r.meta_platform ?? undefined,
    utmUrl:              r.utm_url ?? undefined,
    utmMedium:           r.utm_medium ?? undefined,
    utmSource:           r.utm_source ?? undefined,
    utmCampaign:         r.utm_campaign ?? undefined,
    utmTerm:             r.utm_term ?? undefined,
    utmContent:          r.utm_content ?? undefined,
    urgency:             r.urgency ?? undefined,
    investmentIntent:    r.investment_intent ?? undefined,
    jobTitle:            r.job_title ?? undefined,
    monthlyBudget:       r.monthly_budget ?? undefined,
    contactPreference:   r.contact_preference ?? undefined,
    mainChallenge:       r.main_challenge ?? undefined,
    sector:              r.sector ?? undefined,
    classFrequency:      r.class_frequency ?? undefined,
    professionalMoment:  r.professional_moment ?? undefined,
    discarded:           r.discarded ?? false,
    discardReason:       r.discard_reason ?? undefined,
    discardDesc:         r.discard_desc ?? undefined,
    firstNote:           r.first_note ?? undefined,
    firstTask:           r.first_task ?? undefined,
    registeredAt:        r.registered_at ?? undefined,
    externalId:          r.external_id ?? undefined,
    // Playbook Comercial Be Fluent v3 — qualificação BANT + Avenida do Não
    bantBudget:          r.bant_budget ?? undefined,
    bantAuthority:       r.bant_authority ?? undefined,
    bantNeed:            r.bant_need ?? undefined,
    bantTiming:          r.bant_timing ?? undefined,
    bantNote:            r.bant_note ?? undefined,
    refusalCount:        r.refusal_count ?? undefined,
    sdrId:               r.sdr_id ?? undefined,
  };
}

// camelCase do store → snake_case do banco
function fromContact(c: Contact) {
  return {
    id:                  c.id,
    name:                c.name,
    email:               c.email || null,
    phone:               c.phone || null,
    company:             c.company || null,
    fantasy_name:        c.fantasyName ?? null,
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
    company_cep:         c.companyCep ?? null,
    company_country:     c.companyCountry ?? null,
    company_state:       c.companyState ?? null,
    company_city:        c.companyCity ?? null,
    company_neighborhood:c.companyNeighborhood ?? null,
    company_street:      c.companyStreet ?? null,
    company_complement:  c.companyComplement ?? null,
    company_number:      c.companyNumber ?? null,
    cpf_cnpj:            c.cpfCnpj ?? null,
    product:             c.product ?? null,
    product_value:       c.productValue ?? null,
    product_desc:        c.productDesc ?? null,
    meta_ad_id:          c.metaAdId ?? null,
    meta_ad_name:        c.metaAdName ?? null,
    meta_adset_id:       c.metaAdsetId ?? null,
    meta_adset_name:     c.metaAdsetName ?? null,
    meta_campaign_id:    c.metaCampaignId ?? null,
    meta_campaign_name:  c.metaCampaignName ?? null,
    meta_form_id:        c.metaFormId ?? null,
    meta_form_name:      c.metaFormName ?? null,
    meta_page_id:        c.metaPageId ?? null,
    meta_page_name:      c.metaPageName ?? null,
    meta_leadgen_id:     c.metaLeadgenId ?? null,
    meta_platform:       c.metaPlatform ?? null,
    utm_url:             c.utmUrl ?? null,
    utm_medium:          c.utmMedium ?? null,
    utm_source:          c.utmSource ?? null,
    utm_campaign:        c.utmCampaign ?? null,
    utm_term:            c.utmTerm ?? null,
    utm_content:         c.utmContent ?? null,
    urgency:             c.urgency ?? null,
    investment_intent:   c.investmentIntent ?? null,
    job_title:           c.jobTitle ?? null,
    monthly_budget:      c.monthlyBudget ?? null,
    contact_preference:  c.contactPreference ?? null,
    main_challenge:      c.mainChallenge ?? null,
    sector:              c.sector ?? null,
    class_frequency:     c.classFrequency ?? null,
    professional_moment: c.professionalMoment ?? null,
    discarded:           c.discarded ?? false,
    discard_reason:      c.discardReason ?? null,
    discard_desc:        c.discardDesc ?? null,
    first_note:          c.firstNote ?? null,
    first_task:          c.firstTask ?? null,
    registered_at:       c.registeredAt ?? null,
    external_id:         c.externalId ?? null,
    // Playbook Comercial Be Fluent v3
    bant_budget:         c.bantBudget ?? null,
    bant_authority:      c.bantAuthority ?? null,
    bant_need:           c.bantNeed ?? null,
    bant_timing:         c.bantTiming ?? null,
    bant_note:           c.bantNote ?? null,
    refusal_count:       c.refusalCount ?? 0,
    sdr_id:              c.sdrId ?? null,
    updated_at:          new Date().toISOString(),
  };
}

function fromDeal(d: Deal) {
  return {
    id:              d.id,
    title:           d.title,
    value:           d.value,
    pipeline_id:     d.pipelineId,
    stage_id:        d.stageId,
    contact:         d.contact || null,
    contact_id:      d.contactId ?? null,
    owner:           d.owner || null,
    tags:            d.tags ?? [],
    status:          d.status,
    lost_reason:     d.lostReason ?? null,
    notes:           d.notes ?? null,
    history:         d.history ?? [],
    stage_entered_at:d.stageEnteredAt ?? null,
    created_at:      d.createdAt,
    updated_at:      new Date().toISOString(),
    // Playbook Comercial Be Fluent v3 — campos aditivos
    sla_responded_at:      d.slaRespondedAt ?? null,
    cost_of_inaction_note: d.costOfInactionNote ?? null,
    refusal_count:         d.refusalCount ?? 0,
    last_activity_at:      d.lastActivityAt ?? null,
    bant:                  d.bant ?? null,
    sdr_id:                d.sdrId ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toActivity(r: any): Activity {
  return {
    id:      r.id,
    type:    r.type,
    title:   r.title,
    due:     r.due ?? "",
    dueDate: r.due_date ?? undefined,
    dueTime: r.due_time ?? undefined,
    contact: r.contact ?? "",
    done:    r.done ?? false,
    dealId:  r.deal_id ?? undefined,
    notes:   r.notes ?? undefined,
  };
}

function fromActivity(a: Activity) {
  return {
    id:       a.id,
    type:     a.type,
    title:    a.title,
    due:      a.due || null,
    due_date: a.dueDate ?? null,
    due_time: a.dueTime ?? null,
    contact:  a.contact || null,
    done:     a.done,
    deal_id:  a.dealId ?? null,
    notes:    a.notes ?? null,
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
  return {
    id:                 r.id,
    name:               r.name,
    email:              r.email ?? undefined,
    avatarColor:        r.avatar_color ?? undefined,
    active:             r.active ?? true,
    waProvider:         r.wa_provider ?? undefined,
    zapiInstanceId:     r.zapi_instance_id ?? undefined,
    zapiToken:          r.zapi_token ?? undefined,
    zapiClientToken:    r.zapi_client_token ?? undefined,
    metaPhoneNumberId:  r.meta_phone_number_id ?? undefined,
    metaAccessToken:    r.meta_access_token ?? undefined,
    metaWabaId:         r.meta_waba_id ?? undefined,
    metaVerifyToken:    r.meta_verify_token ?? undefined,
    phoneDisplay:       r.phone_display ?? undefined,
    createdAt:          r.created_at,
  };
}

function fromSdr(s: Sdr) {
  return {
    id:                     s.id,
    name:                   s.name,
    email:                  s.email ?? null,
    avatar_color:           s.avatarColor ?? null,
    active:                 s.active ?? true,
    wa_provider:            s.waProvider ?? null,
    zapi_instance_id:       s.zapiInstanceId ?? null,
    zapi_token:             s.zapiToken ?? null,
    zapi_client_token:      s.zapiClientToken ?? null,
    meta_phone_number_id:   s.metaPhoneNumberId ?? null,
    meta_access_token:      s.metaAccessToken ?? null,
    meta_waba_id:           s.metaWabaId ?? null,
    meta_verify_token:      s.metaVerifyToken ?? null,
    phone_display:          s.phoneDisplay ?? null,
    created_at:             s.createdAt,
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

export async function loadAll(): Promise<DbSnapshot | null> {
  try {
    const [
      { data: pipelines },
      { data: deals },
      { data: contacts },
      { data: activities },
      { data: companies },
      { data: automations },
      { data: scoringRules },
      { data: channels },
      { data: integrations },
      { data: financial },
      { data: sdrs },
    ] = await Promise.all([
      supabase.from("pipelines").select("*").order("created_at"),
      supabase.from("deals").select("*").order("created_at"),
      supabase.from("contacts").select("*").order("created_at", { ascending: false }),
      supabase.from("activities").select("*").order("created_at", { ascending: false }),
      supabase.from("companies").select("*").order("created_at"),
      supabase.from("automations").select("*").order("created_at"),
      supabase.from("scoring_rules").select("*").order("created_at"),
      supabase.from("connected_channels").select("*"),
      supabase.from("integrations").select("*"),
      supabase.from("financial_config").select("*").eq("id", "default").single(),
      supabase.from("sdrs").select("*").order("created_at").then((r) => r, () => ({ data: [] })),
    ]);

    // Se não há pipelines, banco está vazio — retorna null para usar seed local
    if (!pipelines || pipelines.length === 0) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const integrationsMap: Record<string, SavedIntegration> = {};
    for (const row of integrations ?? []) {
      integrationsMap[row.id] = {
        id:           row.id,
        connectedAt:  row.connected_at,
        credentials:  row.credentials ?? {},
      };
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pipelines: (pipelines ?? []).map((r: any) => ({
        id:     r.id,
        name:   r.name,
        stages: r.stages ?? [],
      })),
      deals:             (deals ?? []).map(toDeal),
      contacts:          (contacts ?? []).map(toContact),
      activities:        (activities ?? []).map(toActivity),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      companies:         (companies ?? []).map((r: any) => ({
        id: r.id, name: r.name, domain: r.domain ?? undefined,
        phone: r.phone ?? undefined, segment: r.segment ?? undefined,
        notes: r.notes ?? undefined, owner: r.owner ?? "",
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      automations:       (automations ?? []).map((r: any) => ({
        id: r.id, name: r.name, trigger: r.trigger ?? "",
        action: r.action ?? "", active: r.active ?? true,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scoringRules:      (scoringRules ?? []).map((r: any) => ({
        id: r.id, label: r.label, points: r.points ?? 0,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connectedChannels: (channels ?? []).map((r: any) => ({
        type: r.type, provider: r.provider ?? "",
        connectedAt: r.connected_at, credentials: r.credentials ?? {},
      })),
      integrations: integrationsMap,
      financialConfig: financial ? {
        monthlyMarketingSpend: Number(financial.monthly_marketing_spend ?? 0),
        avgContractMonths:     Number(financial.avg_contract_months ?? 12),
        monthlyChurnRate:      Number(financial.monthly_churn_rate ?? 5),
        avgCostPerStudent:     Number(financial.avg_cost_per_student ?? 0),
        revenueGoalMonthly:    Number(financial.revenue_goal_monthly ?? 0),
        leadsPerMonth:         Number(financial.leads_per_month ?? 0),
        slaTargetMinutes:      Number(financial.sla_target_minutes ?? 4),
        dailyTargets:          { ...DEFAULT_DAILY_TARGETS, ...(financial.daily_targets ?? {}) },
      } : DEFAULT_FINANCIAL,
      sdrs: (sdrs ?? []).map(toSdr),
    };
  } catch (e) {
    console.error("[db] loadAll falhou:", e);
    return null;
  }
}

/* ── Seed inicial (primeira vez) ──────────────────────────── */

export async function seedSupabase(snapshot: DbSnapshot): Promise<void> {
  try {
    await Promise.all([
      supabase.from("pipelines").upsert(
        snapshot.pipelines.map((p) => ({ id: p.id, name: p.name, stages: p.stages }))
      ),
      supabase.from("contacts").upsert(snapshot.contacts.map(fromContact)),
      supabase.from("deals").upsert(snapshot.deals.map(fromDeal)),
      supabase.from("activities").upsert(snapshot.activities.map(fromActivity)),
      supabase.from("companies").upsert(
        snapshot.companies.map((c) => ({ id: c.id, name: c.name, domain: c.domain ?? null, phone: c.phone ?? null, segment: c.segment ?? null, notes: c.notes ?? null, owner: c.owner }))
      ),
      supabase.from("automations").upsert(
        snapshot.automations.map((a) => ({ id: a.id, name: a.name, trigger: a.trigger, action: a.action, active: a.active }))
      ),
      supabase.from("scoring_rules").upsert(
        snapshot.scoringRules.map((r) => ({ id: r.id, label: r.label, points: r.points }))
      ),
      supabase.from("financial_config").upsert({
        id:                       "default",
        monthly_marketing_spend:  snapshot.financialConfig.monthlyMarketingSpend,
        avg_contract_months:      snapshot.financialConfig.avgContractMonths,
        monthly_churn_rate:       snapshot.financialConfig.monthlyChurnRate,
        avg_cost_per_student:     snapshot.financialConfig.avgCostPerStudent,
        revenue_goal_monthly:     snapshot.financialConfig.revenueGoalMonthly,
        leads_per_month:          snapshot.financialConfig.leadsPerMonth,
        sla_target_minutes:       snapshot.financialConfig.slaTargetMinutes,
        daily_targets:            snapshot.financialConfig.dailyTargets,
        updated_at:               new Date().toISOString(),
      }),
    ]);
    console.log("[db] seed inicial concluído");
  } catch (e) {
    console.error("[db] seedSupabase falhou:", e);
  }
}

/* ── Mutações individuais ─────────────────────────────────── */

/**
 * Loga qualquer erro do Supabase em vez de engolir silenciosamente — sem
 * isso, uma escrita bloqueada (RLS sem policy, coluna faltando, etc.)
 * nunca aparecia em lugar nenhum: o dado "sumia" (voltava a não existir no
 * banco) sem nenhum rastro no console. Foi assim que o bug do SDR não
 * persistir passou despercebido; aplicado aqui para toda mutação do CRM.
 */
function logErr(table: string, op: "upsert" | "delete", error: { message: string } | null) {
  if (error) console.error(`[db] ${op} em "${table}" falhou:`, error.message);
}

// Pipelines
export const db = {
  // ── Pipelines ──────────────────────────────────────────────
  upsertPipeline: async (p: Pipeline) => {
    const { error } = await supabase.from("pipelines").upsert({ id: p.id, name: p.name, stages: p.stages });
    logErr("pipelines", "upsert", error);
  },
  deletePipeline: async (id: string) => {
    const { error } = await supabase.from("pipelines").delete().eq("id", id);
    logErr("pipelines", "delete", error);
  },

  // ── Deals ──────────────────────────────────────────────────
  upsertDeal: async (d: Deal) => {
    const { error } = await supabase.from("deals").upsert(fromDeal(d));
    logErr("deals", "upsert", error);
  },
  deleteDeal: async (id: string) => {
    const { error } = await supabase.from("deals").delete().eq("id", id);
    logErr("deals", "delete", error);
  },

  // ── Contacts ───────────────────────────────────────────────
  upsertContact: async (c: Contact) => {
    const { error } = await supabase.from("contacts").upsert(fromContact(c));
    logErr("contacts", "upsert", error);
  },
  upsertContacts: async (cs: Contact[]) => {
    if (cs.length === 0) return;
    // Lote de 200 para evitar timeout
    for (let i = 0; i < cs.length; i += 200) {
      const { error } = await supabase.from("contacts").upsert(cs.slice(i, i + 200).map(fromContact));
      logErr("contacts", "upsert", error);
    }
  },
  deleteContact: async (id: string) => {
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    logErr("contacts", "delete", error);
  },

  // ── Activities ─────────────────────────────────────────────
  upsertActivity: async (a: Activity) => {
    const { error } = await supabase.from("activities").upsert(fromActivity(a));
    logErr("activities", "upsert", error);
  },
  deleteActivity: async (id: string) => {
    const { error } = await supabase.from("activities").delete().eq("id", id);
    logErr("activities", "delete", error);
  },

  // ── Companies ──────────────────────────────────────────────
  upsertCompany: async (c: Company) => {
    const { error } = await supabase.from("companies").upsert({ id: c.id, name: c.name, domain: c.domain ?? null, phone: c.phone ?? null, segment: c.segment ?? null, notes: c.notes ?? null, owner: c.owner });
    logErr("companies", "upsert", error);
  },
  deleteCompany: async (id: string) => {
    const { error } = await supabase.from("companies").delete().eq("id", id);
    logErr("companies", "delete", error);
  },

  // ── Automations ────────────────────────────────────────────
  upsertAutomation: async (a: Automation) => {
    const { error } = await supabase.from("automations").upsert({ id: a.id, name: a.name, trigger: a.trigger, action: a.action, active: a.active });
    logErr("automations", "upsert", error);
  },
  deleteAutomation: async (id: string) => {
    const { error } = await supabase.from("automations").delete().eq("id", id);
    logErr("automations", "delete", error);
  },

  // ── Scoring Rules ──────────────────────────────────────────
  upsertScoringRule: async (r: ScoringRule) => {
    const { error } = await supabase.from("scoring_rules").upsert({ id: r.id, label: r.label, points: r.points });
    logErr("scoring_rules", "upsert", error);
  },
  deleteScoringRule: async (id: string) => {
    const { error } = await supabase.from("scoring_rules").delete().eq("id", id);
    logErr("scoring_rules", "delete", error);
  },

  // ── Connected Channels ─────────────────────────────────────
  upsertChannel: async (ch: ConnectedChannel) => {
    const { error } = await supabase.from("connected_channels").upsert({ type: ch.type, provider: ch.provider, credentials: ch.credentials, connected_at: ch.connectedAt });
    logErr("connected_channels", "upsert", error);
  },
  deleteChannel: async (type: string) => {
    const { error } = await supabase.from("connected_channels").delete().eq("type", type);
    logErr("connected_channels", "delete", error);
  },

  // ── Integrations ───────────────────────────────────────────
  upsertIntegration: async (id: string, data: SavedIntegration) => {
    const { error } = await supabase.from("integrations").upsert({ id, credentials: data.credentials, connected_at: data.connectedAt });
    logErr("integrations", "upsert", error);
  },
  deleteIntegration: async (id: string) => {
    const { error } = await supabase.from("integrations").delete().eq("id", id);
    logErr("integrations", "delete", error);
  },

  // ── Financial Config ───────────────────────────────────────
  upsertFinancialConfig: async (fc: FinancialConfig) => {
    const { error } = await supabase.from("financial_config").upsert({
      id:                      "default",
      monthly_marketing_spend: fc.monthlyMarketingSpend,
      avg_contract_months:     fc.avgContractMonths,
      monthly_churn_rate:      fc.monthlyChurnRate,
      avg_cost_per_student:    fc.avgCostPerStudent,
      revenue_goal_monthly:    fc.revenueGoalMonthly,
      leads_per_month:         fc.leadsPerMonth,
      sla_target_minutes:      fc.slaTargetMinutes,
      daily_targets:           fc.dailyTargets,
      updated_at:              new Date().toISOString(),
    });
    logErr("financial_config", "upsert", error);
  },

  // ── SDRs (WhatsApp Business por atendente) ──────────────────
  upsertSdr: async (s: Sdr) => {
    const { error } = await supabase.from("sdrs").upsert(fromSdr(s));
    if (error) {
      // Este era o ponto cego que fazia SDRs "salvos" nunca chegarem ao banco:
      // o webhook então não os encontrava e descartava mensagens sem rastro.
      console.error("[db] upsertSdr falhou — SDR NÃO foi persistido no Supabase:", error.message);
    }
  },
  deleteSdr: async (id: string) => {
    await supabase.from("sdrs").delete().eq("id", id);
  },
};
