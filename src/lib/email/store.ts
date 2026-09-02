/**
 * Persistência de remarketing por e-mail.
 *
 * Segue o padrão do resto do backend do Beely: Supabase REST via service role,
 * com auto-criação de tabelas (exec_sql) e fallback em memória quando o Supabase
 * não está configurado (modo demo). O schema Drizzle em src/db/schema.ts é a
 * fonte de verdade para migrações formais (npm run db:generate / db:push).
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export interface EmailAccount {
  id: string;
  provider: "gmail" | "resend";
  fromEmail: string;
  fromName?: string;
  oauthRefreshToken?: string | null;
  status: "disconnected" | "connected" | "error";
  lastError?: string | null;
  connectedAt?: string | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string | null;
  createdAt: string;
}

export type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "done";

export interface EmailCampaign {
  id: string;
  name: string;
  templateId?: string | null;
  status: CampaignStatus;
  audienceFilter: Record<string, unknown>;
  scheduledAt?: string | null;
  stats: { sent: number; opened: number; clicked: number; bounced: number; failed: number };
  createdAt: string;
}

export interface EmailSend {
  id: string;
  campaignId?: string | null;
  contactId?: string | null;
  toEmail: string;
  status: "queued" | "sent" | "opened" | "clicked" | "bounced" | "failed";
  providerMessageId?: string | null;
  error?: string | null;
  sentAt?: string | null;
  openedAt?: string | null;
  clickedAt?: string | null;
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.supabaseServiceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/* ─── Fallback em memória (modo demo) ─────────────────────── */
const mem = {
  account: null as EmailAccount | null,
  templates: [] as EmailTemplate[],
  campaigns: [] as EmailCampaign[],
  sends: [] as EmailSend[],
};

let schemaReady = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSchema(c: any) {
  if (schemaReady) return;
  schemaReady = true;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS email_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider TEXT NOT NULL DEFAULT 'gmail',
      from_email TEXT NOT NULL,
      from_name TEXT,
      oauth_refresh_token TEXT,
      status TEXT NOT NULL DEFAULT 'disconnected',
      last_error TEXT,
      connected_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS email_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS email_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      template_id UUID,
      status TEXT NOT NULL DEFAULT 'draft',
      audience_filter JSONB NOT NULL DEFAULT '{}',
      scheduled_at TIMESTAMPTZ,
      stats JSONB NOT NULL DEFAULT '{"sent":0,"opened":0,"clicked":0,"bounced":0,"failed":0}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS email_sends (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID,
      contact_id UUID,
      to_email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      provider_message_id TEXT,
      error TEXT,
      sent_at TIMESTAMPTZ,
      opened_at TIMESTAMPTZ,
      clicked_at TIMESTAMPTZ
    )`,
  ];
  for (const sql of stmts) await c.rpc("exec_sql", { sql }).catch(() => null);
}

/* ─── Conta de envio ─────────────────────────────────────── */
export async function getEmailAccount(): Promise<EmailAccount | null> {
  const c = client();
  if (!c) return mem.account;
  await ensureSchema(c);
  const { data } = await c.from("email_accounts").select("*").order("created_at", { ascending: false }).limit(1);
  const r = data?.[0];
  if (!r) return null;
  return {
    id: r.id, provider: r.provider, fromEmail: r.from_email, fromName: r.from_name,
    oauthRefreshToken: r.oauth_refresh_token, status: r.status, lastError: r.last_error, connectedAt: r.connected_at,
  };
}

export async function saveEmailAccount(a: Omit<EmailAccount, "id"> & { id?: string }): Promise<EmailAccount> {
  const c = client();
  const record: EmailAccount = { id: a.id ?? uid(), ...a };
  if (!c) { mem.account = record; return record; }
  await ensureSchema(c);
  await c.from("email_accounts").upsert({
    id: record.id, provider: record.provider, from_email: record.fromEmail, from_name: record.fromName ?? null,
    oauth_refresh_token: record.oauthRefreshToken ?? null, status: record.status,
    last_error: record.lastError ?? null, connected_at: record.connectedAt ?? null,
  });
  return record;
}

/* ─── Templates ──────────────────────────────────────────── */
export async function listTemplates(): Promise<EmailTemplate[]> {
  const c = client();
  if (!c) return mem.templates;
  await ensureSchema(c);
  const { data } = await c.from("email_templates").select("*").order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name, subject: r.subject, bodyHtml: r.body_html, bodyText: r.body_text, createdAt: r.created_at,
  }));
}

export async function saveTemplate(t: Partial<EmailTemplate> & { name: string; subject: string; bodyHtml: string }): Promise<EmailTemplate> {
  const c = client();
  const record: EmailTemplate = {
    id: t.id ?? uid(), name: t.name, subject: t.subject, bodyHtml: t.bodyHtml,
    bodyText: t.bodyText ?? null, createdAt: t.createdAt ?? new Date().toISOString(),
  };
  if (!c) {
    const i = mem.templates.findIndex((x) => x.id === record.id);
    if (i >= 0) mem.templates[i] = record; else mem.templates.unshift(record);
    return record;
  }
  await ensureSchema(c);
  await c.from("email_templates").upsert({
    id: record.id, name: record.name, subject: record.subject,
    body_html: record.bodyHtml, body_text: record.bodyText ?? null,
  });
  return record;
}

export async function deleteTemplate(id: string): Promise<void> {
  const c = client();
  if (!c) { mem.templates = mem.templates.filter((t) => t.id !== id); return; }
  await ensureSchema(c);
  await c.from("email_templates").delete().eq("id", id);
}

/* ─── Campanhas ──────────────────────────────────────────── */
const ZERO_STATS = { sent: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 };

export async function listCampaigns(): Promise<EmailCampaign[]> {
  const c = client();
  if (!c) return mem.campaigns;
  await ensureSchema(c);
  const { data } = await c.from("email_campaigns").select("*").order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name, templateId: r.template_id, status: r.status,
    audienceFilter: r.audience_filter ?? {}, scheduledAt: r.scheduled_at,
    stats: r.stats ?? { ...ZERO_STATS }, createdAt: r.created_at,
  }));
}

export async function getCampaign(id: string): Promise<EmailCampaign | null> {
  return (await listCampaigns()).find((c) => c.id === id) ?? null;
}

export async function saveCampaign(
  p: Partial<EmailCampaign> & { name: string }
): Promise<EmailCampaign> {
  const c = client();
  const record: EmailCampaign = {
    id: p.id ?? uid(), name: p.name, templateId: p.templateId ?? null,
    status: p.status ?? "draft", audienceFilter: p.audienceFilter ?? {},
    scheduledAt: p.scheduledAt ?? null, stats: p.stats ?? { ...ZERO_STATS },
    createdAt: p.createdAt ?? new Date().toISOString(),
  };
  if (!c) {
    const i = mem.campaigns.findIndex((x) => x.id === record.id);
    if (i >= 0) mem.campaigns[i] = record; else mem.campaigns.unshift(record);
    return record;
  }
  await ensureSchema(c);
  await c.from("email_campaigns").upsert({
    id: record.id, name: record.name, template_id: record.templateId,
    status: record.status, audience_filter: record.audienceFilter,
    scheduled_at: record.scheduledAt, stats: record.stats,
  });
  return record;
}

export async function deleteCampaign(id: string): Promise<void> {
  const c = client();
  if (!c) { mem.campaigns = mem.campaigns.filter((x) => x.id !== id); return; }
  await ensureSchema(c);
  await c.from("email_campaigns").delete().eq("id", id);
}

/* ─── Envios individuais ─────────────────────────────────── */
export async function createSend(s: Omit<EmailSend, "id" | "status"> & { status?: EmailSend["status"] }): Promise<EmailSend> {
  const c = client();
  const record: EmailSend = { id: uid(), status: s.status ?? "queued", ...s };
  if (!c) { mem.sends.unshift(record); return record; }
  await ensureSchema(c);
  await c.from("email_sends").insert({
    id: record.id, campaign_id: record.campaignId ?? null, contact_id: record.contactId ?? null,
    to_email: record.toEmail, status: record.status, provider_message_id: record.providerMessageId ?? null,
    error: record.error ?? null, sent_at: record.sentAt ?? null,
  });
  return record;
}

export async function updateSend(id: string, patch: Partial<EmailSend>): Promise<void> {
  const c = client();
  if (!c) {
    const i = mem.sends.findIndex((x) => x.id === id);
    if (i >= 0) mem.sends[i] = { ...mem.sends[i], ...patch };
    return;
  }
  await ensureSchema(c);
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.providerMessageId !== undefined) row.provider_message_id = patch.providerMessageId;
  if (patch.error !== undefined) row.error = patch.error;
  if (patch.sentAt !== undefined) row.sent_at = patch.sentAt;
  if (patch.openedAt !== undefined) row.opened_at = patch.openedAt;
  if (patch.clickedAt !== undefined) row.clicked_at = patch.clickedAt;
  await c.from("email_sends").update(row).eq("id", id);
}

export async function findSend(id: string): Promise<EmailSend | null> {
  const c = client();
  if (!c) return mem.sends.find((x) => x.id === id) ?? null;
  await ensureSchema(c);
  const { data } = await c.from("email_sends").select("*").eq("id", id).limit(1);
  const r = data?.[0];
  if (!r) return null;
  return {
    id: r.id, campaignId: r.campaign_id, contactId: r.contact_id, toEmail: r.to_email,
    status: r.status, providerMessageId: r.provider_message_id, error: r.error,
    sentAt: r.sent_at, openedAt: r.opened_at, clickedAt: r.clicked_at,
  };
}

export async function bumpCampaignStat(campaignId: string, key: keyof EmailCampaign["stats"], by = 1): Promise<void> {
  const camp = await getCampaign(campaignId);
  if (!camp) return;
  const stats = { ...camp.stats, [key]: (camp.stats[key] ?? 0) + by };
  await saveCampaign({ ...camp, stats });
}
