/**
 * Camada de queries server-side — único lugar que fala Drizzle/Postgres de
 * verdade. Chamada só pelas Route Handlers em src/app/api/data/*, nunca
 * diretamente do navegador (Postgres não tem driver de browser).
 *
 * src/lib/db.ts (client-safe) chama essas rotas via fetch() mantendo a
 * mesma interface pública que tinha com o Supabase — loadAll()/db.upsertX()
 * continuam existindo, só a implementação por trás mudou.
 */
import { eq, desc, asc } from "drizzle-orm";
import { db as client, schema } from "./index";

function requireClient() {
  if (!client) throw new Error("DATABASE_URL não configurado");
  return client;
}

/* ── Pipelines ────────────────────────────────────────────── */
export async function listPipelines() {
  return requireClient().select().from(schema.pipelines);
}
export async function upsertPipeline(row: typeof schema.pipelines.$inferInsert) {
  await requireClient().insert(schema.pipelines).values(row)
    .onConflictDoUpdate({ target: schema.pipelines.id, set: row });
}
export async function deletePipeline(id: string) {
  await requireClient().delete(schema.pipelines).where(eq(schema.pipelines.id, id));
}

/* ── Deals ────────────────────────────────────────────────── */
export async function listDeals() {
  return requireClient().select().from(schema.deals).orderBy(asc(schema.deals.createdAt));
}
export async function upsertDeal(row: typeof schema.deals.$inferInsert) {
  await requireClient().insert(schema.deals).values(row)
    .onConflictDoUpdate({ target: schema.deals.id, set: row });
}
export async function deleteDeal(id: string) {
  await requireClient().delete(schema.deals).where(eq(schema.deals.id, id));
}

/* ── Contacts ─────────────────────────────────────────────── */
export async function listContacts() {
  return requireClient().select().from(schema.contacts).orderBy(desc(schema.contacts.createdAt));
}
export async function upsertContact(row: typeof schema.contacts.$inferInsert) {
  await requireClient().insert(schema.contacts).values(row)
    .onConflictDoUpdate({ target: schema.contacts.id, set: row });
}
export async function upsertContacts(rows: (typeof schema.contacts.$inferInsert)[]) {
  if (rows.length === 0) return;
  const c = requireClient();
  // Lote de 200 — mesmo padrão do Supabase REST, evita uma query gigante.
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    for (const row of batch) {
      await c.insert(schema.contacts).values(row)
        .onConflictDoUpdate({ target: schema.contacts.id, set: row });
    }
  }
}
export async function deleteContact(id: string) {
  await requireClient().delete(schema.contacts).where(eq(schema.contacts.id, id));
}

/* ── Activities ───────────────────────────────────────────── */
export async function listActivities() {
  return requireClient().select().from(schema.activities).orderBy(desc(schema.activities.createdAt));
}
export async function upsertActivity(row: typeof schema.activities.$inferInsert) {
  await requireClient().insert(schema.activities).values(row)
    .onConflictDoUpdate({ target: schema.activities.id, set: row });
}
export async function deleteActivity(id: string) {
  await requireClient().delete(schema.activities).where(eq(schema.activities.id, id));
}

/* ── Companies ────────────────────────────────────────────── */
export async function listCompanies() {
  return requireClient().select().from(schema.companies);
}
export async function upsertCompany(row: typeof schema.companies.$inferInsert) {
  await requireClient().insert(schema.companies).values(row)
    .onConflictDoUpdate({ target: schema.companies.id, set: row });
}
export async function deleteCompany(id: string) {
  await requireClient().delete(schema.companies).where(eq(schema.companies.id, id));
}

/* ── Automations ──────────────────────────────────────────── */
export async function listAutomations() {
  return requireClient().select().from(schema.automations);
}
export async function upsertAutomation(row: typeof schema.automations.$inferInsert) {
  await requireClient().insert(schema.automations).values(row)
    .onConflictDoUpdate({ target: schema.automations.id, set: row });
}
export async function deleteAutomation(id: string) {
  await requireClient().delete(schema.automations).where(eq(schema.automations.id, id));
}

/* ── Scoring rules ────────────────────────────────────────── */
export async function listScoringRules() {
  return requireClient().select().from(schema.scoringRules);
}
export async function upsertScoringRule(row: typeof schema.scoringRules.$inferInsert) {
  await requireClient().insert(schema.scoringRules).values(row)
    .onConflictDoUpdate({ target: schema.scoringRules.id, set: row });
}
export async function deleteScoringRule(id: string) {
  await requireClient().delete(schema.scoringRules).where(eq(schema.scoringRules.id, id));
}

/* ── Connected channels ───────────────────────────────────── */
export async function listConnectedChannels() {
  return requireClient().select().from(schema.connectedChannels);
}
export async function upsertConnectedChannel(row: typeof schema.connectedChannels.$inferInsert) {
  await requireClient().insert(schema.connectedChannels).values(row)
    .onConflictDoUpdate({ target: schema.connectedChannels.type, set: row });
}
export async function deleteConnectedChannel(type: string) {
  await requireClient().delete(schema.connectedChannels).where(eq(schema.connectedChannels.type, type));
}

/* ── Integrations ─────────────────────────────────────────── */
export async function listIntegrations() {
  return requireClient().select().from(schema.integrations);
}
export async function upsertIntegration(row: typeof schema.integrations.$inferInsert) {
  await requireClient().insert(schema.integrations).values(row)
    .onConflictDoUpdate({ target: schema.integrations.id, set: row });
}
export async function deleteIntegration(id: string) {
  await requireClient().delete(schema.integrations).where(eq(schema.integrations.id, id));
}

/* ── Financial config (linha única, id='default') ───────────── */
export async function getFinancialConfig() {
  const rows = await requireClient().select().from(schema.financialConfig).where(eq(schema.financialConfig.id, "default"));
  return rows[0] ?? null;
}
export async function upsertFinancialConfig(row: typeof schema.financialConfig.$inferInsert) {
  await requireClient().insert(schema.financialConfig).values(row)
    .onConflictDoUpdate({ target: schema.financialConfig.id, set: row });
}

/* ── SDRs ─────────────────────────────────────────────────── */
export async function listSdrs() {
  return requireClient().select().from(schema.sdrs);
}
export async function getSdr(id: string) {
  const rows = await requireClient().select().from(schema.sdrs).where(eq(schema.sdrs.id, id));
  return rows[0] ?? null;
}
export async function upsertSdr(row: typeof schema.sdrs.$inferInsert) {
  await requireClient().insert(schema.sdrs).values(row)
    .onConflictDoUpdate({ target: schema.sdrs.id, set: row });
}
export async function deleteSdr(id: string) {
  await requireClient().delete(schema.sdrs).where(eq(schema.sdrs.id, id));
}
