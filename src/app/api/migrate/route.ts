/**
 * POST /api/migrate
 * Recebe o snapshot do localStorage (Zustand store) e persiste no Supabase.
 * Chamado uma vez na inicialização quando o banco está vazio.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: Request) {
  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // Verifica se já há dados no banco — evita seed duplo
  const { data: existing } = await supabase.from("pipelines").select("id").limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "already seeded" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await req.json();
  const { pipelines = [], deals = [], contacts = [], activities = [],
          companies = [], automations = [], scoringRules = [],
          connectedChannels = [], integrations = {}, financialConfig } = body;

  const errors: string[] = [];

  // Pipelines
  if (pipelines.length > 0) {
    const { error } = await supabase.from("pipelines").upsert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pipelines.map((p: any) => ({ id: p.id, name: p.name, stages: p.stages }))
    );
    if (error) errors.push(`pipelines: ${error.message}`);

    // Stages (tabela desnormalizada)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stageRows: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pipelines.forEach((p: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p.stages ?? []).forEach((s: any, idx: number) => {
        stageRows.push({ id: s.id, pipeline_id: p.id, name: s.name, probability: s.probability ?? 0, position: idx });
      });
    });
    if (stageRows.length > 0) {
      const { error: se } = await supabase.from("stages").upsert(stageRows);
      if (se) errors.push(`stages: ${se.message}`);
    }
  }

  // Contacts (lote de 200)
  if (contacts.length > 0) {
    for (let i = 0; i < contacts.length; i += 200) {
      const batch = contacts.slice(i, i + 200);
      const { error } = await supabase.from("contacts").upsert(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        batch.map((c: any) => ({
          id: c.id, name: c.name, email: c.email || null, phone: c.phone || null,
          company: c.company || null, fantasy_name: c.fantasyName ?? null,
          source: c.source || null, campaign: c.campaign ?? null,
          funnel: c.funnel ?? null, stage: c.stage ?? null, status: c.status ?? null,
          team: c.team ?? null, score: c.score ?? 0, tags: c.tags ?? [],
          owner: c.owner || null, cep: c.cep ?? null, country: c.country ?? null,
          state: c.state ?? null, city: c.city ?? null, neighborhood: c.neighborhood ?? null,
          street: c.street ?? null, complement: c.complement ?? null, number: c.number ?? null,
          company_cep: c.companyCep ?? null, company_country: c.companyCountry ?? null,
          company_state: c.companyState ?? null, company_city: c.companyCity ?? null,
          company_neighborhood: c.companyNeighborhood ?? null, company_street: c.companyStreet ?? null,
          company_complement: c.companyComplement ?? null, company_number: c.companyNumber ?? null,
          cpf_cnpj: c.cpfCnpj ?? null, product: c.product ?? null,
          product_value: c.productValue ?? null, product_desc: c.productDesc ?? null,
          meta_ad_id: c.metaAdId ?? null, meta_ad_name: c.metaAdName ?? null,
          meta_adset_id: c.metaAdsetId ?? null, meta_adset_name: c.metaAdsetName ?? null,
          meta_campaign_id: c.metaCampaignId ?? null, meta_campaign_name: c.metaCampaignName ?? null,
          meta_form_id: c.metaFormId ?? null, meta_form_name: c.metaFormName ?? null,
          meta_page_id: c.metaPageId ?? null, meta_page_name: c.metaPageName ?? null,
          meta_leadgen_id: c.metaLeadgenId ?? null, meta_platform: c.metaPlatform ?? null,
          utm_url: c.utmUrl ?? null, utm_medium: c.utmMedium ?? null,
          utm_source: c.utmSource ?? null, utm_campaign: c.utmCampaign ?? null,
          utm_term: c.utmTerm ?? null, utm_content: c.utmContent ?? null,
          urgency: c.urgency ?? null, investment_intent: c.investmentIntent ?? null,
          job_title: c.jobTitle ?? null, monthly_budget: c.monthlyBudget ?? null,
          contact_preference: c.contactPreference ?? null, main_challenge: c.mainChallenge ?? null,
          sector: c.sector ?? null, class_frequency: c.classFrequency ?? null,
          professional_moment: c.professionalMoment ?? null, discarded: c.discarded ?? false,
          discard_reason: c.discardReason ?? null, discard_desc: c.discardDesc ?? null,
          first_note: c.firstNote ?? null, first_task: c.firstTask ?? null,
          registered_at: c.registeredAt ?? null, external_id: c.externalId ?? null,
        }))
      );
      if (error) errors.push(`contacts batch ${i}: ${error.message}`);
    }
  }

  // Deals
  if (deals.length > 0) {
    const { error } = await supabase.from("deals").upsert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deals.map((d: any) => ({
        id: d.id, title: d.title, value: d.value ?? 0,
        pipeline_id: d.pipelineId, stage_id: d.stageId,
        contact: d.contact || null, contact_id: d.contactId ?? null,
        owner: d.owner || null, tags: d.tags ?? [], status: d.status ?? "open",
        lost_reason: d.lostReason ?? null, notes: d.notes ?? null,
        history: d.history ?? [], stage_entered_at: d.stageEnteredAt ?? null,
        created_at: d.createdAt,
      }))
    );
    if (error) errors.push(`deals: ${error.message}`);
  }

  // Activities
  if (activities.length > 0) {
    const { error } = await supabase.from("activities").upsert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activities.map((a: any) => ({
        id: a.id, type: a.type, title: a.title, due: a.due || null,
        due_date: a.dueDate ?? null, due_time: a.dueTime ?? null,
        contact: a.contact || null, done: a.done ?? false,
        deal_id: a.dealId ?? null, notes: a.notes ?? null,
      }))
    );
    if (error) errors.push(`activities: ${error.message}`);
  }

  // Companies
  if (companies.length > 0) {
    const { error } = await supabase.from("companies").upsert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      companies.map((c: any) => ({
        id: c.id, name: c.name, domain: c.domain ?? null,
        phone: c.phone ?? null, segment: c.segment ?? null,
        notes: c.notes ?? null, owner: c.owner || null,
      }))
    );
    if (error) errors.push(`companies: ${error.message}`);
  }

  // Automations
  if (automations.length > 0) {
    const { error } = await supabase.from("automations").upsert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      automations.map((a: any) => ({
        id: a.id, name: a.name, trigger: a.trigger ?? "",
        action: a.action ?? "", active: a.active ?? true,
      }))
    );
    if (error) errors.push(`automations: ${error.message}`);
  }

  // Scoring Rules
  if (scoringRules.length > 0) {
    const { error } = await supabase.from("scoring_rules").upsert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      scoringRules.map((r: any) => ({ id: r.id, label: r.label, points: r.points ?? 0 }))
    );
    if (error) errors.push(`scoring_rules: ${error.message}`);
  }

  // Connected Channels
  if (connectedChannels.length > 0) {
    const { error } = await supabase.from("connected_channels").upsert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connectedChannels.map((c: any) => ({
        type: c.type, provider: c.provider ?? "",
        credentials: c.credentials ?? {}, connected_at: c.connectedAt,
      }))
    );
    if (error) errors.push(`channels: ${error.message}`);
  }

  // Integrations
  const integrationEntries = Object.entries(integrations);
  if (integrationEntries.length > 0) {
    const { error } = await supabase.from("integrations").upsert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      integrationEntries.map(([id, data]: [string, any]) => ({
        id, credentials: data.credentials ?? {}, connected_at: data.connectedAt,
      }))
    );
    if (error) errors.push(`integrations: ${error.message}`);
  }

  // Financial Config
  if (financialConfig) {
    const { error } = await supabase.from("financial_config").upsert({
      id: "default",
      monthly_marketing_spend: financialConfig.monthlyMarketingSpend ?? 0,
      avg_contract_months: financialConfig.avgContractMonths ?? 12,
      monthly_churn_rate: financialConfig.monthlyChurnRate ?? 5,
      avg_cost_per_student: financialConfig.avgCostPerStudent ?? 0,
      revenue_goal_monthly: financialConfig.revenueGoalMonthly ?? 0,
      leads_per_month: financialConfig.leadsPerMonth ?? 0,
      updated_at: new Date().toISOString(),
    });
    if (error) errors.push(`financial_config: ${error.message}`);
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 207 });
  }

  return NextResponse.json({
    ok: true,
    migrated: { pipelines: pipelines.length, contacts: contacts.length, deals: deals.length, activities: activities.length },
  });
}
