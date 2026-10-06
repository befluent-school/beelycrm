/**
 * POST /api/migrate
 * Recebe o snapshot do localStorage (Zustand store) e persiste no Postgres.
 * Chamado uma vez na inicialização quando o banco está vazio — só funciona
 * nesse estado (guard abaixo), não é um endpoint de importação geral.
 */
import { NextResponse } from "next/server";
import { db as client, schema } from "@/db";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(req: Request) {
  if (!client) {
    return NextResponse.json({ error: "db_not_configured" }, { status: 503 });
  }

  // Verifica se já há dados no banco — evita seed duplo. Também é a única
  // proteção desta rota (sem auth): uma vez que o banco tem 1+ pipeline,
  // toda chamada subsequente retorna cedo sem tocar em nada.
  const existing = await client.select({ id: schema.pipelines.id }).from(schema.pipelines).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "already seeded" });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body: any = await req.json();
  const { pipelines = [], deals = [], contacts = [], activities = [],
          companies = [], automations = [], scoringRules = [],
          connectedChannels = [], integrations = {}, financialConfig, sdrs = [] } = body;

  const errors: string[] = [];

  // Pipelines
  if (pipelines.length > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await client.insert(schema.pipelines).values(pipelines.map((p: any) => ({ id: p.id, name: p.name, stages: p.stages })));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stageRows: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pipelines.forEach((p: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p.stages ?? []).forEach((s: any, idx: number) => {
          stageRows.push({ id: s.id, pipelineId: p.id, name: s.name, probability: s.probability ?? 0, position: idx });
        });
      });
      if (stageRows.length > 0) await client.insert(schema.stages).values(stageRows);
    } catch (e) {
      errors.push(`pipelines: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Contacts (lote de 200)
  if (contacts.length > 0) {
    for (let i = 0; i < contacts.length; i += 200) {
      const batch = contacts.slice(i, i + 200);
      try {
        await client.insert(schema.contacts).values(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          batch.map((c: any) => ({
            id: c.id, name: c.name, email: c.email || null, phone: c.phone || null,
            company: c.company || null, fantasyName: c.fantasyName ?? null,
            source: c.source || null, campaign: c.campaign ?? null,
            funnel: c.funnel ?? null, stage: c.stage ?? null, status: c.status ?? null,
            team: c.team ?? null, score: c.score ?? 0, tags: c.tags ?? [],
            owner: c.owner || null, cep: c.cep ?? null, country: c.country ?? null,
            state: c.state ?? null, city: c.city ?? null, neighborhood: c.neighborhood ?? null,
            street: c.street ?? null, complement: c.complement ?? null, number: c.number ?? null,
            companyCep: c.companyCep ?? null, companyCountry: c.companyCountry ?? null,
            companyState: c.companyState ?? null, companyCity: c.companyCity ?? null,
            companyNeighborhood: c.companyNeighborhood ?? null, companyStreet: c.companyStreet ?? null,
            companyComplement: c.companyComplement ?? null, companyNumber: c.companyNumber ?? null,
            cpfCnpj: c.cpfCnpj ?? null, product: c.product ?? null,
            productValue: c.productValue != null ? String(c.productValue) : null, productDesc: c.productDesc ?? null,
            metaAdId: c.metaAdId ?? null, metaAdName: c.metaAdName ?? null,
            metaAdsetId: c.metaAdsetId ?? null, metaAdsetName: c.metaAdsetName ?? null,
            metaCampaignId: c.metaCampaignId ?? null, metaCampaignName: c.metaCampaignName ?? null,
            metaFormId: c.metaFormId ?? null, metaFormName: c.metaFormName ?? null,
            metaPageId: c.metaPageId ?? null, metaPageName: c.metaPageName ?? null,
            metaLeadgenId: c.metaLeadgenId ?? null, metaPlatform: c.metaPlatform ?? null,
            utmUrl: c.utmUrl ?? null, utmMedium: c.utmMedium ?? null,
            utmSource: c.utmSource ?? null, utmCampaign: c.utmCampaign ?? null,
            utmTerm: c.utmTerm ?? null, utmContent: c.utmContent ?? null,
            urgency: c.urgency ?? null, investmentIntent: c.investmentIntent ?? null,
            jobTitle: c.jobTitle ?? null, monthlyBudget: c.monthlyBudget ?? null,
            contactPreference: c.contactPreference ?? null, mainChallenge: c.mainChallenge ?? null,
            sector: c.sector ?? null, classFrequency: c.classFrequency ?? null,
            professionalMoment: c.professionalMoment ?? null, discarded: c.discarded ?? false,
            discardReason: c.discardReason ?? null, discardDesc: c.discardDesc ?? null,
            firstNote: c.firstNote ?? null, firstTask: c.firstTask ?? null,
            registeredAt: c.registeredAt ?? null, externalId: c.externalId ?? null,
            bantBudget: c.bantBudget ?? null, bantAuthority: c.bantAuthority ?? null,
            bantNeed: c.bantNeed ?? null, bantTiming: c.bantTiming ?? null,
            bantNote: c.bantNote ?? null, refusalCount: c.refusalCount ?? 0,
            sdrId: c.sdrId ?? null,
          }))
        );
      } catch (e) {
        errors.push(`contacts batch ${i}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  // Deals
  if (deals.length > 0) {
    try {
      await client.insert(schema.deals).values(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deals.map((d: any) => ({
          id: d.id, title: d.title, value: String(d.value ?? 0),
          pipelineId: d.pipelineId, stageId: d.stageId,
          contact: d.contact || null, contactId: d.contactId ?? null,
          owner: d.owner || null, tags: d.tags ?? [], status: d.status ?? "open",
          lostReason: d.lostReason ?? null, notes: d.notes ?? null,
          history: d.history ?? [], stageEnteredAt: d.stageEnteredAt ? new Date(d.stageEnteredAt) : null,
          createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
          slaRespondedAt: d.slaRespondedAt ? new Date(d.slaRespondedAt) : null,
          costOfInactionNote: d.costOfInactionNote ?? null,
          refusalCount: d.refusalCount ?? 0,
          lastActivityAt: d.lastActivityAt ? new Date(d.lastActivityAt) : null,
          bant: d.bant ?? null,
          sdrId: d.sdrId ?? null,
        }))
      );
    } catch (e) {
      errors.push(`deals: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Activities
  if (activities.length > 0) {
    try {
      await client.insert(schema.activities).values(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        activities.map((a: any) => ({
          id: a.id, type: a.type, title: a.title, due: a.due || null,
          dueDate: a.dueDate ?? null, dueTime: a.dueTime ?? null,
          contact: a.contact || null, done: a.done ?? false,
          dealId: a.dealId ?? null, notes: a.notes ?? null,
        }))
      );
    } catch (e) {
      errors.push(`activities: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Companies
  if (companies.length > 0) {
    try {
      await client.insert(schema.companies).values(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        companies.map((c: any) => ({
          id: c.id, name: c.name, domain: c.domain ?? null,
          phone: c.phone ?? null, segment: c.segment ?? null,
          notes: c.notes ?? null, owner: c.owner || null,
        }))
      );
    } catch (e) {
      errors.push(`companies: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Automations
  if (automations.length > 0) {
    try {
      await client.insert(schema.automations).values(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        automations.map((a: any) => ({
          id: a.id, name: a.name,
          trigger: typeof a.trigger === "string" ? a.trigger : JSON.stringify(a.trigger ?? ""),
          action: typeof a.action === "string" ? a.action : JSON.stringify(a.action ?? ""),
          active: a.active ?? true,
        }))
      );
    } catch (e) {
      errors.push(`automations: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Scoring Rules
  if (scoringRules.length > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await client.insert(schema.scoringRules).values(scoringRules.map((r: any) => ({ id: r.id, label: r.label, points: r.points ?? 0 })));
    } catch (e) {
      errors.push(`scoring_rules: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Connected Channels
  if (connectedChannels.length > 0) {
    try {
      await client.insert(schema.connectedChannels).values(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connectedChannels.map((c: any) => ({
          type: c.type, provider: c.provider ?? "",
          credentials: c.credentials ?? {}, connectedAt: c.connectedAt ? new Date(c.connectedAt) : new Date(),
        }))
      );
    } catch (e) {
      errors.push(`channels: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Integrations
  const integrationEntries = Object.entries(integrations);
  if (integrationEntries.length > 0) {
    try {
      await client.insert(schema.integrations).values(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        integrationEntries.map(([id, data]: [string, any]) => ({
          id, credentials: data.credentials ?? {}, connectedAt: data.connectedAt ? new Date(data.connectedAt) : new Date(),
        }))
      );
    } catch (e) {
      errors.push(`integrations: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Financial Config
  if (financialConfig) {
    try {
      await client.insert(schema.financialConfig).values({
        id: "default",
        monthlyMarketingSpend: String(financialConfig.monthlyMarketingSpend ?? 0),
        avgContractMonths: String(financialConfig.avgContractMonths ?? 12),
        monthlyChurnRate: String(financialConfig.monthlyChurnRate ?? 5),
        avgCostPerStudent: String(financialConfig.avgCostPerStudent ?? 0),
        revenueGoalMonthly: String(financialConfig.revenueGoalMonthly ?? 0),
        leadsPerMonth: String(financialConfig.leadsPerMonth ?? 0),
        slaTargetMinutes: financialConfig.slaTargetMinutes ?? 4,
        dailyTargets: financialConfig.dailyTargets ?? null,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: schema.financialConfig.id,
        set: {
          monthlyMarketingSpend: String(financialConfig.monthlyMarketingSpend ?? 0),
          avgContractMonths: String(financialConfig.avgContractMonths ?? 12),
          monthlyChurnRate: String(financialConfig.monthlyChurnRate ?? 5),
          avgCostPerStudent: String(financialConfig.avgCostPerStudent ?? 0),
          revenueGoalMonthly: String(financialConfig.revenueGoalMonthly ?? 0),
          leadsPerMonth: String(financialConfig.leadsPerMonth ?? 0),
          slaTargetMinutes: financialConfig.slaTargetMinutes ?? 4,
          dailyTargets: financialConfig.dailyTargets ?? null,
          updatedAt: new Date(),
        },
      });
    } catch (e) {
      errors.push(`financial_config: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // SDRs (WhatsApp Business por atendente)
  if (sdrs.length > 0) {
    try {
      await client.insert(schema.sdrs).values(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sdrs.map((s: any) => ({
          id: s.id, name: s.name, email: s.email ?? null,
          avatarColor: s.avatarColor ?? null, active: s.active ?? true,
          waProvider: s.waProvider ?? null,
          zapiInstanceId: s.zapiInstanceId ?? null, zapiToken: s.zapiToken ?? null,
          zapiClientToken: s.zapiClientToken ?? null,
          metaPhoneNumberId: s.metaPhoneNumberId ?? null, metaAccessToken: s.metaAccessToken ?? null,
          metaWabaId: s.metaWabaId ?? null, metaVerifyToken: s.metaVerifyToken ?? null,
          phoneDisplay: s.phoneDisplay ?? null, createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
        }))
      );
    } catch (e) {
      errors.push(`sdrs: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 207 });
  }

  return NextResponse.json({
    ok: true,
    migrated: { pipelines: pipelines.length, contacts: contacts.length, deals: deals.length, activities: activities.length },
  });
}
