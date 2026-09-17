/**
 * Persistência da conexão Google Calendar (OAuth) — mesmo padrão de
 * src/lib/email/store.ts (Gmail). Uma conta só (a mesma conta Google usada
 * para o Remarketing), guardando o refresh token do escopo calendar.events.
 */

import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export interface CalendarAccount {
  id: string;
  email: string;
  oauthRefreshToken?: string | null;
  status: "disconnected" | "connected" | "error";
  lastError?: string | null;
  connectedAt?: string | null;
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.supabaseServiceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

const mem = { account: null as CalendarAccount | null };

let schemaReady = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSchema(c: any) {
  if (schemaReady) return;
  schemaReady = true;
  await c
    .rpc("exec_sql", {
      sql: `CREATE TABLE IF NOT EXISTS calendar_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        oauth_refresh_token TEXT,
        status TEXT NOT NULL DEFAULT 'disconnected',
        last_error TEXT,
        connected_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    })
    .catch(() => null);
}

export async function getCalendarAccount(): Promise<CalendarAccount | null> {
  const c = client();
  if (!c) return mem.account;
  await ensureSchema(c);
  const { data } = await c.from("calendar_accounts").select("*").order("created_at", { ascending: false }).limit(1);
  const r = data?.[0];
  if (!r) return null;
  return {
    id: r.id, email: r.email, oauthRefreshToken: r.oauth_refresh_token,
    status: r.status, lastError: r.last_error, connectedAt: r.connected_at,
  };
}

export async function saveCalendarAccount(a: Omit<CalendarAccount, "id"> & { id?: string }): Promise<CalendarAccount> {
  const c = client();
  const record: CalendarAccount = { id: a.id ?? uid(), ...a };
  if (!c) { mem.account = record; return record; }
  await ensureSchema(c);
  await c.from("calendar_accounts").upsert({
    id: record.id, email: record.email, oauth_refresh_token: record.oauthRefreshToken ?? null,
    status: record.status, last_error: record.lastError ?? null, connected_at: record.connectedAt ?? null,
  });
  return record;
}
