/**
 * Persistência de remarketing por e-mail — Postgres via Drizzle, com
 * fallback em memória quando DATABASE_URL não está configurado (modo demo).
 */

import { desc, eq } from "drizzle-orm";
import { db as client, schema } from "@/db";

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

const iso = (d: Date | string | null | undefined) =>
  d == null ? null : d instanceof Date ? d.toISOString() : d;

/* ─── Fallback em memória (modo demo) ─────────────────────── */
const mem = {
  account: null as EmailAccount | null,
  templates: [] as EmailTemplate[],
  campaigns: [] as EmailCampaign[],
  sends: [] as EmailSend[],
};

/* ─── Conta de envio ─────────────────────────────────────── */
export async function getEmailAccount(): Promise<EmailAccount | null> {
  if (!client) return mem.account;
  const rows = await client.select().from(schema.emailAccounts)
    .orderBy(desc(schema.emailAccounts.createdAt)).limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id, provider: r.provider as EmailAccount["provider"], fromEmail: r.fromEmail, fromName: r.fromName ?? undefined,
    oauthRefreshToken: r.oauthRefreshToken, status: r.status as EmailAccount["status"],
    lastError: r.lastError, connectedAt: iso(r.connectedAt),
  };
}

export async function saveEmailAccount(a: Omit<EmailAccount, "id"> & { id?: string }): Promise<EmailAccount> {
  const record: EmailAccount = { id: a.id ?? uid(), ...a };
  if (!client) { mem.account = record; return record; }
  await client.insert(schema.emailAccounts).values({
    id: record.id, provider: record.provider, fromEmail: record.fromEmail, fromName: record.fromName ?? null,
    oauthRefreshToken: record.oauthRefreshToken ?? null, status: record.status,
    lastError: record.lastError ?? null, connectedAt: record.connectedAt ? new Date(record.connectedAt) : null,
  }).onConflictDoUpdate({
    target: schema.emailAccounts.id,
    set: {
      provider: record.provider, fromEmail: record.fromEmail, fromName: record.fromName ?? null,
      oauthRefreshToken: record.oauthRefreshToken ?? null, status: record.status,
      lastError: record.lastError ?? null, connectedAt: record.connectedAt ? new Date(record.connectedAt) : null,
    },
  });
  return record;
}

/* ─── Templates ──────────────────────────────────────────── */
export async function listTemplates(): Promise<EmailTemplate[]> {
  if (!client) return mem.templates;
  const rows = await client.select().from(schema.emailTemplates).orderBy(desc(schema.emailTemplates.createdAt));
  return rows.map((r) => ({
    id: r.id, name: r.name, subject: r.subject, bodyHtml: r.bodyHtml, bodyText: r.bodyText, createdAt: iso(r.createdAt)!,
  }));
}

export async function saveTemplate(t: Partial<EmailTemplate> & { name: string; subject: string; bodyHtml: string }): Promise<EmailTemplate> {
  const record: EmailTemplate = {
    id: t.id ?? uid(), name: t.name, subject: t.subject, bodyHtml: t.bodyHtml,
    bodyText: t.bodyText ?? null, createdAt: t.createdAt ?? new Date().toISOString(),
  };
  if (!client) {
    const i = mem.templates.findIndex((x) => x.id === record.id);
    if (i >= 0) mem.templates[i] = record; else mem.templates.unshift(record);
    return record;
  }
  await client.insert(schema.emailTemplates).values({
    id: record.id, name: record.name, subject: record.subject,
    bodyHtml: record.bodyHtml, bodyText: record.bodyText ?? null,
  }).onConflictDoUpdate({
    target: schema.emailTemplates.id,
    set: { name: record.name, subject: record.subject, bodyHtml: record.bodyHtml, bodyText: record.bodyText ?? null },
  });
  return record;
}

export async function deleteTemplate(id: string): Promise<void> {
  if (!client) { mem.templates = mem.templates.filter((t) => t.id !== id); return; }
  await client.delete(schema.emailTemplates).where(eq(schema.emailTemplates.id, id));
}

/* ─── Campanhas ──────────────────────────────────────────── */
const ZERO_STATS = { sent: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 };

export async function listCampaigns(): Promise<EmailCampaign[]> {
  if (!client) return mem.campaigns;
  const rows = await client.select().from(schema.emailCampaigns).orderBy(desc(schema.emailCampaigns.createdAt));
  return rows.map((r) => ({
    id: r.id, name: r.name, templateId: r.templateId, status: r.status as CampaignStatus,
    audienceFilter: r.audienceFilter ?? {}, scheduledAt: iso(r.scheduledAt),
    stats: r.stats ?? { ...ZERO_STATS }, createdAt: iso(r.createdAt)!,
  }));
}

export async function getCampaign(id: string): Promise<EmailCampaign | null> {
  return (await listCampaigns()).find((c) => c.id === id) ?? null;
}

export async function saveCampaign(
  p: Partial<EmailCampaign> & { name: string }
): Promise<EmailCampaign> {
  const record: EmailCampaign = {
    id: p.id ?? uid(), name: p.name, templateId: p.templateId ?? null,
    status: p.status ?? "draft", audienceFilter: p.audienceFilter ?? {},
    scheduledAt: p.scheduledAt ?? null, stats: p.stats ?? { ...ZERO_STATS },
    createdAt: p.createdAt ?? new Date().toISOString(),
  };
  if (!client) {
    const i = mem.campaigns.findIndex((x) => x.id === record.id);
    if (i >= 0) mem.campaigns[i] = record; else mem.campaigns.unshift(record);
    return record;
  }
  await client.insert(schema.emailCampaigns).values({
    id: record.id, name: record.name, templateId: record.templateId,
    status: record.status, audienceFilter: record.audienceFilter,
    scheduledAt: record.scheduledAt ? new Date(record.scheduledAt) : null, stats: record.stats,
  }).onConflictDoUpdate({
    target: schema.emailCampaigns.id,
    set: {
      name: record.name, templateId: record.templateId, status: record.status,
      audienceFilter: record.audienceFilter,
      scheduledAt: record.scheduledAt ? new Date(record.scheduledAt) : null, stats: record.stats,
    },
  });
  return record;
}

export async function deleteCampaign(id: string): Promise<void> {
  if (!client) { mem.campaigns = mem.campaigns.filter((x) => x.id !== id); return; }
  await client.delete(schema.emailCampaigns).where(eq(schema.emailCampaigns.id, id));
}

/* ─── Envios individuais ─────────────────────────────────── */
export async function createSend(s: Omit<EmailSend, "id" | "status"> & { status?: EmailSend["status"] }): Promise<EmailSend> {
  const record: EmailSend = { id: uid(), status: s.status ?? "queued", ...s };
  if (!client) { mem.sends.unshift(record); return record; }
  await client.insert(schema.emailSends).values({
    id: record.id, campaignId: record.campaignId ?? null, contactId: record.contactId ?? null,
    toEmail: record.toEmail, status: record.status, providerMessageId: record.providerMessageId ?? null,
    error: record.error ?? null, sentAt: record.sentAt ? new Date(record.sentAt) : null,
  });
  return record;
}

export async function updateSend(id: string, patch: Partial<EmailSend>): Promise<void> {
  if (!client) {
    const i = mem.sends.findIndex((x) => x.id === id);
    if (i >= 0) mem.sends[i] = { ...mem.sends[i], ...patch };
    return;
  }
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.providerMessageId !== undefined) row.providerMessageId = patch.providerMessageId;
  if (patch.error !== undefined) row.error = patch.error;
  if (patch.sentAt !== undefined) row.sentAt = patch.sentAt ? new Date(patch.sentAt) : null;
  if (patch.openedAt !== undefined) row.openedAt = patch.openedAt ? new Date(patch.openedAt) : null;
  if (patch.clickedAt !== undefined) row.clickedAt = patch.clickedAt ? new Date(patch.clickedAt) : null;
  await client.update(schema.emailSends).set(row).where(eq(schema.emailSends.id, id));
}

export async function findSend(id: string): Promise<EmailSend | null> {
  if (!client) return mem.sends.find((x) => x.id === id) ?? null;
  const rows = await client.select().from(schema.emailSends).where(eq(schema.emailSends.id, id)).limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id, campaignId: r.campaignId, contactId: r.contactId, toEmail: r.toEmail,
    status: r.status as EmailSend["status"], providerMessageId: r.providerMessageId, error: r.error,
    sentAt: iso(r.sentAt), openedAt: iso(r.openedAt), clickedAt: iso(r.clickedAt),
  };
}

export async function bumpCampaignStat(campaignId: string, key: keyof EmailCampaign["stats"], by = 1): Promise<void> {
  const camp = await getCampaign(campaignId);
  if (!camp) return;
  const stats = { ...camp.stats, [key]: (camp.stats[key] ?? 0) + by };
  await saveCampaign({ ...camp, stats });
}
