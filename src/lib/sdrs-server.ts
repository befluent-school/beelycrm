/**
 * Busca de SDR server-side (Drizzle) — compartilhado entre /api/inbox/send
 * e /api/webhooks/[provider]/[sdrId], que precisavam do mesmo fetchSdr()
 * duplicado antes. Nunca importar de código client-side (fala Postgres
 * direto, inclui os campos de credencial em texto puro — uso exclusivo de
 * rotas server-side que precisam enviar mensagem pelo provedor real).
 */
import { eq } from "drizzle-orm";
import { db as client, schema } from "@/db";
import type { Sdr } from "@/lib/store";

export async function fetchSdrWithSecrets(id: string): Promise<Sdr | null> {
  if (!client) return null;
  const rows = await client.select().from(schema.sdrs).where(eq(schema.sdrs.id, id)).limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    name: r.name,
    email: r.email ?? undefined,
    avatarColor: r.avatarColor ?? undefined,
    active: r.active ?? true,
    waProvider: (r.waProvider ?? undefined) as Sdr["waProvider"],
    zapiInstanceId: r.zapiInstanceId ?? undefined,
    zapiToken: r.zapiToken ?? undefined,
    zapiClientToken: r.zapiClientToken ?? undefined,
    metaPhoneNumberId: r.metaPhoneNumberId ?? undefined,
    metaAccessToken: r.metaAccessToken ?? undefined,
    metaWabaId: r.metaWabaId ?? undefined,
    metaVerifyToken: r.metaVerifyToken ?? undefined,
    webhookSecret: r.webhookSecret ?? undefined,
    phoneDisplay: r.phoneDisplay ?? undefined,
    waLiteStatus: (r.waLiteStatus ?? undefined) as Sdr["waLiteStatus"],
    waLiteConnectedPhone: r.waLiteConnectedPhone ?? undefined,
    waLiteLastConnectedAt: r.waLiteLastConnectedAt instanceof Date
      ? r.waLiteLastConnectedAt.toISOString()
      : r.waLiteLastConnectedAt ?? undefined,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  };
}
