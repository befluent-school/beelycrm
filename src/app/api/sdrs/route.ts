import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

/**
 * Persistência de SDR com credenciais de WhatsApp (Z-API/Meta) — rota
 * server-side (service role), nunca pelo navegador direto.
 *
 * Antes, o navegador gravava sdrs direto no Supabase com a anon key
 * (db.upsertSdr) e o loadAll() do client devolvia o token em texto puro
 * pra qualquer sessão do CRM — qualquer pessoa com acesso ao app (ou uma
 * XSS, ou simplesmente abrindo o DevTools) conseguia ler o token real do
 * Z-API/Meta de qualquer SDR e mandar mensagem como aquele número.
 *
 * Esta rota só devolve/recebe o SECRET de verdade aqui, server-side. O
 * client nunca mais vê o valor armazenado — só um booleano "has*" indicando
 * que existe uma credencial salva. Editar um SDR sem preencher o campo de
 * token de novo preserva o valor já salvo (merge no servidor); só grava um
 * valor novo quando o campo vem preenchido.
 */
function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

let schemaReady = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureWebhookSecretColumn(client: any) {
  if (schemaReady) return;
  schemaReady = true;
  await client
    .rpc("exec_sql", { sql: "ALTER TABLE sdrs ADD COLUMN IF NOT EXISTS webhook_secret TEXT" })
    .catch(() => null);
}

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
  const client = getClient();
  if (!client) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });
  await ensureWebhookSecretColumn(client);

  let body: SdrPatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const id = body.id ?? uid();
  const now = new Date().toISOString();

  // O client sempre gera o id antes de chamar esta rota (uid() no store),
  // então "isNew" não pode ser inferido por "body.id presente" — precisa
  // checar se a linha já existe de verdade, senão webhookSecret nunca seria
  // gerado (toda chamada chegaria aqui com um id já preenchido).
  const { data: existingRow } = await client.from("sdrs").select("id, webhook_secret").eq("id", id).maybeSingle();
  const isNew = !existingRow;

  const row: Record<string, unknown> = {
    id,
    name: body.name,
    email: body.email ?? null,
    avatar_color: body.avatarColor ?? null,
    active: body.active ?? true,
    wa_provider: body.waProvider ?? null,
    phone_display: body.phoneDisplay ?? null,
  };
  if (isNew) row.created_at = now;

  // Segredo do webhook — gerado pelo Beely (não é credencial de terceiro;
  // Z-API não assina payloads), só na criação. Devolvido uma única vez na
  // resposta deste POST; nunca mais lido de volta depois (mesmo princípio
  // das credenciais de provedor).
  let webhookSecret: string | undefined;
  if (isNew) {
    webhookSecret = randomBytes(24).toString("hex");
    row.webhook_secret = webhookSecret;
  }

  // Credenciais: só inclui no upsert se vier preenchido no body — campo
  // ausente/undefined nunca sobrescreve o que já está salvo no banco.
  if (body.zapiInstanceId !== undefined) row.zapi_instance_id = body.zapiInstanceId || null;
  if (body.zapiToken !== undefined) row.zapi_token = body.zapiToken || null;
  if (body.zapiClientToken !== undefined) row.zapi_client_token = body.zapiClientToken || null;
  if (body.metaPhoneNumberId !== undefined) row.meta_phone_number_id = body.metaPhoneNumberId || null;
  if (body.metaAccessToken !== undefined) row.meta_access_token = body.metaAccessToken || null;
  if (body.metaWabaId !== undefined) row.meta_waba_id = body.metaWabaId || null;
  if (body.metaVerifyToken !== undefined) row.meta_verify_token = body.metaVerifyToken || null;

  const { error } = await client.from("sdrs").upsert(row);
  if (error) {
    console.error("[api/sdrs] upsert falhou:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id, webhookSecret });
}

/** DELETE /api/sdrs?id=... */
export async function DELETE(request: Request) {
  const client = getClient();
  if (!client) return NextResponse.json({ error: "supabase_not_configured" }, { status: 500 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  const { error } = await client.from("sdrs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
