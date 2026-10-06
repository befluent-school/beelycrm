/**
 * Persistência de Ligações com IA (campanhas + logs) — Postgres via Drizzle,
 * com fallback em memória no modo demo (DATABASE_URL ausente).
 */

import { desc, eq } from "drizzle-orm";
import { db as client, schema } from "@/db";
import type { AssistantConfig } from "./provider";

export type CampaignStatus = "draft" | "scheduled" | "running" | "paused" | "done";
export type CallStatus =
  | "queued" | "ringing" | "in_progress" | "completed" | "no_answer" | "failed" | "voicemail";

export interface CallCampaign {
  id: string;
  name: string;
  provider: "vapi" | "twilio";
  assistantConfig: AssistantConfig;
  audienceFilter: Record<string, unknown>;
  status: CampaignStatus;
  stats: {
    dialed: number; answered: number; completed: number; failed: number;
    totalCostCents: number; totalDurationSec: number;
  };
  createdAt: string;
}

export interface CallLog {
  id: string;
  campaignId?: string | null;
  contactId?: string | null;
  provider: "vapi" | "twilio";
  providerCallId?: string | null;
  toNumber: string;
  status: CallStatus;
  durationSec: number;
  costCents: number;
  recordingUrl?: string | null;
  transcript: { role: string; text: string; at?: number }[];
  summary?: string | null;
  endedReason?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt: string;
}

const ZERO_STATS: CallCampaign["stats"] = {
  dialed: 0, answered: 0, completed: 0, failed: 0, totalCostCents: 0, totalDurationSec: 0,
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const iso = (d: Date | string | null | undefined) =>
  d == null ? null : d instanceof Date ? d.toISOString() : d;

const mem = { campaigns: [] as CallCampaign[], logs: [] as CallLog[] };

/* ─── Campanhas ──────────────────────────────────────────── */
export async function listCallCampaigns(): Promise<CallCampaign[]> {
  if (!client) return mem.campaigns;
  const rows = await client.select().from(schema.callCampaigns).orderBy(desc(schema.callCampaigns.createdAt));
  return rows.map((r) => ({
    id: r.id, name: r.name, provider: r.provider as CallCampaign["provider"], assistantConfig: (r.assistantConfig ?? {}) as AssistantConfig,
    audienceFilter: r.audienceFilter ?? {}, status: r.status as CampaignStatus,
    stats: r.stats ?? { ...ZERO_STATS }, createdAt: iso(r.createdAt)!,
  }));
}

export async function getCallCampaign(id: string): Promise<CallCampaign | null> {
  return (await listCallCampaigns()).find((c) => c.id === id) ?? null;
}

export async function saveCallCampaign(p: Partial<CallCampaign> & { name: string }): Promise<CallCampaign> {
  const record: CallCampaign = {
    id: p.id ?? uid(), name: p.name, provider: p.provider ?? "vapi",
    assistantConfig: p.assistantConfig ?? {}, audienceFilter: p.audienceFilter ?? {},
    status: p.status ?? "draft", stats: p.stats ?? { ...ZERO_STATS },
    createdAt: p.createdAt ?? new Date().toISOString(),
  };
  if (!client) {
    const i = mem.campaigns.findIndex((x) => x.id === record.id);
    if (i >= 0) mem.campaigns[i] = record; else mem.campaigns.unshift(record);
    return record;
  }
  const assistantConfig = record.assistantConfig as Record<string, unknown>;
  await client.insert(schema.callCampaigns).values({
    id: record.id, name: record.name, provider: record.provider,
    assistantConfig, audienceFilter: record.audienceFilter,
    status: record.status, stats: record.stats,
  }).onConflictDoUpdate({
    target: schema.callCampaigns.id,
    set: {
      name: record.name, provider: record.provider,
      assistantConfig, audienceFilter: record.audienceFilter,
      status: record.status, stats: record.stats,
    },
  });
  return record;
}

export async function deleteCallCampaign(id: string): Promise<void> {
  if (!client) { mem.campaigns = mem.campaigns.filter((x) => x.id !== id); return; }
  await client.delete(schema.callCampaigns).where(eq(schema.callCampaigns.id, id));
}

/* ─── Logs ───────────────────────────────────────────────── */
export async function listCallLogs(limit = 100): Promise<CallLog[]> {
  if (!client) return mem.logs.slice(0, limit);
  const rows = await client.select().from(schema.callLogs).orderBy(desc(schema.callLogs.createdAt)).limit(limit);
  return rows.map(mapLog);
}

export async function getCallLog(id: string): Promise<CallLog | null> {
  if (!client) return mem.logs.find((x) => x.id === id) ?? null;
  const rows = await client.select().from(schema.callLogs).where(eq(schema.callLogs.id, id)).limit(1);
  return rows[0] ? mapLog(rows[0]) : null;
}

export async function getCallLogByProviderId(providerCallId: string): Promise<CallLog | null> {
  if (!client) return mem.logs.find((x) => x.providerCallId === providerCallId) ?? null;
  const rows = await client.select().from(schema.callLogs).where(eq(schema.callLogs.providerCallId, providerCallId)).limit(1);
  return rows[0] ? mapLog(rows[0]) : null;
}

export async function createCallLog(
  p: Omit<CallLog, "id" | "createdAt" | "transcript" | "durationSec" | "costCents" | "status"> &
    Partial<Pick<CallLog, "status" | "transcript" | "durationSec" | "costCents">>
): Promise<CallLog> {
  const record: CallLog = {
    id: uid(), createdAt: new Date().toISOString(),
    transcript: p.transcript ?? [], durationSec: p.durationSec ?? 0, costCents: p.costCents ?? 0,
    status: p.status ?? "queued",
    campaignId: p.campaignId ?? null, contactId: p.contactId ?? null,
    provider: p.provider, providerCallId: p.providerCallId ?? null, toNumber: p.toNumber,
    recordingUrl: p.recordingUrl ?? null, summary: p.summary ?? null,
    endedReason: p.endedReason ?? null, startedAt: p.startedAt ?? null, endedAt: p.endedAt ?? null,
  };
  if (!client) { mem.logs.unshift(record); return record; }
  await client.insert(schema.callLogs).values({
    id: record.id, campaignId: record.campaignId, contactId: record.contactId,
    provider: record.provider, providerCallId: record.providerCallId, toNumber: record.toNumber,
    status: record.status, durationSec: record.durationSec, costCents: record.costCents,
  });
  return record;
}

export async function updateCallLog(id: string, patch: Partial<CallLog>): Promise<void> {
  if (!client) {
    const i = mem.logs.findIndex((x) => x.id === id);
    if (i >= 0) mem.logs[i] = { ...mem.logs[i], ...patch };
    return;
  }
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.providerCallId !== undefined) row.providerCallId = patch.providerCallId;
  if (patch.durationSec !== undefined) row.durationSec = patch.durationSec;
  if (patch.costCents !== undefined) row.costCents = patch.costCents;
  if (patch.recordingUrl !== undefined) row.recordingUrl = patch.recordingUrl;
  if (patch.transcript !== undefined) row.transcript = patch.transcript;
  if (patch.summary !== undefined) row.summary = patch.summary;
  if (patch.endedReason !== undefined) row.endedReason = patch.endedReason;
  if (patch.startedAt !== undefined) row.startedAt = patch.startedAt ? new Date(patch.startedAt) : null;
  if (patch.endedAt !== undefined) row.endedAt = patch.endedAt ? new Date(patch.endedAt) : null;
  await client.update(schema.callLogs).set(row).where(eq(schema.callLogs.id, id));
}

export async function bumpCallCampaignStats(
  campaignId: string,
  patch: Partial<CallCampaign["stats"]>
): Promise<void> {
  const camp = await getCallCampaign(campaignId);
  if (!camp) return;
  const stats = { ...camp.stats };
  for (const [k, v] of Object.entries(patch)) {
    stats[k as keyof CallCampaign["stats"]] += v as number;
  }
  await saveCallCampaign({ ...camp, stats });
}

function mapLog(r: typeof schema.callLogs.$inferSelect): CallLog {
  return {
    id: r.id, campaignId: r.campaignId, contactId: r.contactId, provider: r.provider as CallLog["provider"],
    providerCallId: r.providerCallId, toNumber: r.toNumber, status: r.status as CallStatus,
    durationSec: r.durationSec ?? 0, costCents: r.costCents ?? 0,
    recordingUrl: r.recordingUrl, transcript: r.transcript ?? [], summary: r.summary,
    endedReason: r.endedReason, startedAt: iso(r.startedAt), endedAt: iso(r.endedAt), createdAt: iso(r.createdAt)!,
  };
}
