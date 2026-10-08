import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { db as client, schema } from "@/db";
import { stopSession } from "@/lib/wa-lite/session-manager";

export const dynamic = "force-dynamic";

/**
 * Persistência de SDR com credenciais de WhatsApp (Z-API/Meta) — rota
 * server-side, nunca pelo navegador direto.
 *
 * O client nunca vê o valor armazenado — só um booleano "has*" indicando
 * que existe uma credencial salva. Editar um SDR sem preencher o campo de
 * token de novo preserva o valor já salvo (merge no servidor); só grava um
 * valor novo quando o campo vem preenchido.
 */

interface SdrPatchBody {
  id?: string;
  name?: string;
  email?: string;
  avatarColor?: string;
  active?: boolean;
  waProvider?: string;
  phoneDisplay?: string;
  // Campos de credencial — presentes = "trocar"; ausentes = "manter o que já está salvo".
  zapiInstanceId?: string;
  zapiToken?: string;
  zapiClientToken?: string;
  metaPhoneNumberId?: string;
  metaAccessToken?: string;
  metaWabaId?: string;
  metaVerifyToken?: string;
}

function uid() {
  return `sdr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** POST — cria ou atualiza (upsert) um SDR. Grava credenciais apenas quando o campo veio preenchido no body. */
export async function POST(request: Request) {
  if (!client) return NextResponse.json({ error: "db_not_configured" }, { status: 500 });

  let body: SdrPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const id = body.id ?? uid();

  // O client sempre gera o id antes de chamar esta rota (uid() no store),
  // então "isNew" não pode ser inferido por "body.id presente" — precisa
  // checar se a linha já existe de verdade, senão webhookSecret nunca seria
  // gerado (toda chamada chegaria aqui com um id já preenchido).
  const existingRows = await client.select({ id: schema.sdrs.id, active: schema.sdrs.active, waProvider: schema.sdrs.waProvider })
    .from(schema.sdrs).where(eq(schema.sdrs.id, id)).limit(1);
  const isNew = existingRows.length === 0;
  const existing = existingRows[0];

  const row: Record<string, unknown> = {
    id,
    name: body.name,
    email: body.email ?? null,
    avatarColor: body.avatarColor ?? null,
    active: body.active ?? true,
    waProvider: body.waProvider ?? null,
    phoneDisplay: body.phoneDisplay ?? null,
  };
  if (isNew) row.createdAt = new Date();

  // Segredo do webhook — gerado pelo Beely (não é credencial de terceiro;
  // Z-API não assina payloads), só na criação. Devolvido uma única vez na
  // resposta deste POST; nunca mais lido de volta depois (mesmo princípio
  // das credenciais de provedor).
  let webhookSecret: string | undefined;
  if (isNew) {
    webhookSecret = randomBytes(24).toString("hex");
    row.webhookSecret = webhookSecret;
  }

  // Credenciais: só inclui no upsert se vier preenchido no body — campo
  // ausente/undefined nunca sobrescreve o que já está salvo no banco.
  if (body.zapiInstanceId !== undefined) row.zapiInstanceId = body.zapiInstanceId || null;
  if (body.zapiToken !== undefined) row.zapiToken = body.zapiToken || null;
  if (body.zapiClientToken !== undefined) row.zapiClientToken = body.zapiClientToken || null;
  if (body.metaPhoneNumberId !== undefined) row.metaPhoneNumberId = body.metaPhoneNumberId || null;
  if (body.metaAccessToken !== undefined) row.metaAccessToken = body.metaAccessToken || null;
  if (body.metaWabaId !== undefined) row.metaWabaId = body.metaWabaId || null;
  if (body.metaVerifyToken !== undefined) row.metaVerifyToken = body.metaVerifyToken || null;

  try {
    if (isNew) {
      await client.insert(schema.sdrs).values(row as typeof schema.sdrs.$inferInsert);
    } else {
      await client.update(schema.sdrs).set(row).where(eq(schema.sdrs.id, id));
    }
  } catch (e) {
    console.error("[api/sdrs] upsert falhou:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }

  // SDR WA Lite desativado — desconecta a sessão do WhatsApp junto (decisão
  // explícita: diferente de Z-API/Meta, aqui "inativo" também derruba a
  // conexão real, exigindo novo QR Code se reativado depois).
  const wasActive = existing?.active ?? true;
  const isWaLite = (existing?.waProvider ?? body.waProvider) === "wa_lite";
  if (!isNew && isWaLite && wasActive && body.active === false) {
    void stopSession(id);
  }

  return NextResponse.json({ ok: true, id, webhookSecret });
}

/** DELETE /api/sdrs?id=... */
export async function DELETE(request: Request) {
  if (!client) return NextResponse.json({ error: "db_not_configured" }, { status: 500 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  try {
    await client.delete(schema.sdrs).where(eq(schema.sdrs.id, id));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
