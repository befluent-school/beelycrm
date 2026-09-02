/**
 * Persistência de Ligações com IA (campanhas + logs).
 * Mesmo padrão de src/lib/email/store.ts: Supabase REST com auto-criação de
 * tabelas e fallback em memória no modo demo.
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
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

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.supabaseServiceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const mem = { campaigns: [] as CallCampaign[], logs: [] as CallLog[] };

let schemaReady = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSchema(c: any) {
  if (schemaReady) return;
  schemaReady = true;
  const stmts = [
    `CREATE TABLE IF NOT EXISTS call_campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'vapi',
      assistant_config JSONB NOT NULL DEFAULT '{}',
      audience_filter JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft',
      stats JSONB NOT NULL DEFAULT '{"dialed":0,"answered":0,"completed":0,"failed":0,"totalCostCents":0,"totalDurationSec":0}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS call_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID,
      contact_id UUID,
      provider TEXT NOT NULL DEFAULT 'vapi',
      provider_call_id TEXT,
      to_number TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      duration_sec INTEGER NOT NULL DEFAULT 0,
      cost_cents INTEGER NOT NULL DEFAULT 0,
      recording_url TEXT,
      transcript JSONB DEFAULT '[]',
      summary TEXT,
      ended_reason TEXT,
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];
  for (const sql of stmts) await c.rpc("exec_sql", { sql }).catch(() => null);
}

/* ─── Campanhas ──────────────────────────────────────────── */
export async function listCallCampaigns(): Promise<CallCampaign[]> {
  const c = client();
  if (!c) return mem.campaigns;
  await ensureSchema(c);
  const { data } = await c.from("call_campaigns").select("*").order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    id: r.id, name: r.name, provider: r.provider, assistantConfig: r.assistant_config ?? {},
    audienceFilter: r.audience_filter ?? {}, status: r.status,
    stats: r.stats ?? { ...ZERO_STATS }, createdAt: r.created_at,
  }));
}

export async function getCallCampaign(id: string): Promise<CallCampaign | null> {
  return (await listCallCampaigns()).find((c) => c.id === id) ?? null;
}

export async function saveCallCampaign(p: Partial<CallCampaign> & { name: string }): Promise<CallCampaign> {
  const c = client();
  const record: CallCampaign = {
    id: p.id ?? uid(), name: p.name, provider: p.provider ?? "vapi",
    assistantConfig: p.assistantConfig ?? {}, audienceFilter: p.audienceFilter ?? {},
    status: p.status ?? "draft", stats: p.stats ?? { ...ZERO_STATS },
    createdAt: p.createdAt ?? new Date().toISOString(),
  };
  if (!c) {
    const i = mem.campaigns.findIndex((x) => x.id === record.id);
    if (i >= 0) mem.campaigns[i] = record; else mem.campaigns.unshift(record);
    return record;
  }
  await ensureSchema(c);
  await c.from("call_campaigns").upsert({
    id: record.id, name: record.name, provider: record.provider,
    assistant_config: record.assistantConfig, audience_filter: record.audienceFilter,
    status: record.status, stats: record.stats,
  });
  return record;
}

export async function deleteCallCampaign(id: string): Promise<void> {
  const c = client();
  if (!c) { mem.campaigns = mem.campaigns.filter((x) => x.id !== id); return; }
  await ensureSchema(c);
  await c.from("call_campaigns").delete().eq("id", id);
}

/* ─── Logs ───────────────────────────────────────────────── */
export async function listCallLogs(limit = 100): Promise<CallLog[]> {
  const c = client();
  if (!c) return mem.logs.slice(0, limit);
  await ensureSchema(c);
  const { data } = await c.from("call_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map(mapLog);
}

export async function getCallLog(id: string): Promise<CallLog | null> {
  const c = client();
  if (!c) return mem.logs.find((x) => x.id === id) ?? null;
  await ensureSchema(c);
  const { data } = await c.from("call_logs").select("*").eq("id", id).limit(1);
  return data?.[0] ? mapLog(data[0]) : null;
}

export async function getCallLogByProviderId(providerCallId: string): Promise<CallLog | null> {
  const c = client();
  if (!c) return mem.logs.find((x) => x.providerCallId === providerCallId) ?? null;
  await ensureSchema(c);
  const { data } = await c.from("call_logs").select("*").eq("provider_call_id", providerCallId).limit(1);
  return data?.[0] ? mapLog(data[0]) : null;
}

export async function createCallLog(
  p: Omit<CallLog, "id" | "createdAt" | "transcript" | "durationSec" | "costCents" | "status"> &
    Partial<Pick<CallLog, "status" | "transcript" | "durationSec" | "costCents">>
): Promise<CallLog> {
  const c = client();
  const record: CallLog = {
    id: uid(), createdAt: new Date().toISOString(),
    transcript: p.transcript ?? [], durationSec: p.durationSec ?? 0, costCents: p.costCents ?? 0,
    status: p.status ?? "queued",
    campaignId: p.campaignId ?? null, contactId: p.contactId ?? null,
    provider: p.provider, providerCallId: p.providerCallId ?? null, toNumber: p.toNumber,
    recordingUrl: p.recordingUrl ?? null, summary: p.summary ?? null,
    endedReason: p.endedReason ?? null, startedAt: p.startedAt ?? null, endedAt: p.endedAt ?? null,
  };
  if (!c) { mem.logs.unshift(record); return record; }
  await ensureSchema(c);
  await c.from("call_logs").insert({
    id: record.id, campaign_id: record.campaignId, contact_id: record.contactId,
    provider: record.provider, provider_call_id: record.providerCallId, to_number: record.toNumber,
    status: record.status, duration_sec: record.durationSec, cost_cents: record.costCents,
  });
  return record;
}

export async function updateCallLog(id: string, patch: Partial<CallLog>): Promise<void> {
  const c = client();
  if (!c) {
    const i = mem.logs.findIndex((x) => x.id === id);
    if (i >= 0) mem.logs[i] = { ...mem.logs[i], ...patch };
    return;
  }
  await ensureSchema(c);
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.providerCallId !== undefined) row.provider_call_id = patch.providerCallId;
  if (patch.durationSec !== undefined) row.duration_sec = patch.durationSec;
  if (patch.costCents !== undefined) row.cost_cents = patch.costCents;
  if (patch.recordingUrl !== undefined) row.recording_url = patch.recordingUrl;
  if (patch.transcript !== undefined) row.transcript = patch.transcript;
  if (patch.summary !== undefined) row.summary = patch.summary;
  if (patch.endedReason !== undefined) row.ended_reason = patch.endedReason;
  if (patch.startedAt !== undefined) row.started_at = patch.startedAt;
  if (patch.endedAt !== undefined) row.ended_at = patch.endedAt;
  await c.from("call_logs").update(row).eq("id", id);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapLog(r: any): CallLog {
  return {
    id: r.id, campaignId: r.campaign_id, contactId: r.contact_id, provider: r.provider,
    providerCallId: r.provider_call_id, toNumber: r.to_number, status: r.status,
    durationSec: r.duration_sec ?? 0, costCents: r.cost_cents ?? 0,
    recordingUrl: r.recording_url, transcript: r.transcript ?? [], summary: r.summary,
    endedReason: r.ended_reason, startedAt: r.started_at, endedAt: r.ended_at, createdAt: r.created_at,
  };
}
