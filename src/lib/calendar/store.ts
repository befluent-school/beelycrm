/**
 * Persistência da conexão Google Calendar (OAuth) — mesmo padrão de
 * src/lib/email/store.ts (Gmail). Uma conta só (a mesma conta Google usada
 * para o Remarketing), guardando o refresh token do escopo calendar.events.
 */

import { desc } from "drizzle-orm";
import { db as client, schema } from "@/db";

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

const iso = (d: Date | string | null | undefined) =>
  d == null ? null : d instanceof Date ? d.toISOString() : d;

const mem = { account: null as CalendarAccount | null };

export async function getCalendarAccount(): Promise<CalendarAccount | null> {
  if (!client) return mem.account;
  const rows = await client.select().from(schema.calendarAccounts)
    .orderBy(desc(schema.calendarAccounts.createdAt)).limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id, email: r.email, oauthRefreshToken: r.oauthRefreshToken,
    status: r.status as CalendarAccount["status"], lastError: r.lastError, connectedAt: iso(r.connectedAt),
  };
}

export async function saveCalendarAccount(a: Omit<CalendarAccount, "id"> & { id?: string }): Promise<CalendarAccount> {
  const record: CalendarAccount = { id: a.id ?? uid(), ...a };
  if (!client) { mem.account = record; return record; }
  await client.insert(schema.calendarAccounts).values({
    id: record.id, email: record.email, oauthRefreshToken: record.oauthRefreshToken ?? null,
    status: record.status, lastError: record.lastError ?? null,
    connectedAt: record.connectedAt ? new Date(record.connectedAt) : null,
  }).onConflictDoUpdate({
    target: schema.calendarAccounts.id,
    set: {
      email: record.email, oauthRefreshToken: record.oauthRefreshToken ?? null,
      status: record.status, lastError: record.lastError ?? null,
      connectedAt: record.connectedAt ? new Date(record.connectedAt) : null,
    },
  });
  return record;
}
