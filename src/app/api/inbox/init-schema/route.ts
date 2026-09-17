import { NextResponse } from "next/server";

/**
 * GET /api/inbox/init-schema
 * Adiciona colunas/tabelas faltantes para o Inbox multi-SDR via pg REST
 * (aditivo — ALTER ... ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS).
 * Acesse uma vez após o deploy para garantir o schema atualizado; também
 * chamado automaticamente por use-supabase-sync.ts na inicialização.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, reason: "no_supabase_config" });
  }

  const sqls = [
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS sender_photo TEXT",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS from_me BOOLEAN DEFAULT FALSE",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS msg_type TEXT DEFAULT 'text'",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS media_url TEXT",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS media_caption TEXT",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS file_name TEXT",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS is_lid BOOLEAN DEFAULT FALSE",
    // Inbox multi-SDR — cada conversa fica associada ao SDR/instância que a recebeu.
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS sdr_id TEXT",
    "ALTER TABLE inbox_messages ADD COLUMN IF NOT EXISTS thread_key TEXT",
    `CREATE TABLE IF NOT EXISTS sdrs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      avatar_color TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      wa_provider TEXT,
      zapi_instance_id TEXT,
      zapi_token TEXT,
      zapi_client_token TEXT,
      meta_phone_number_id TEXT,
      meta_access_token TEXT,
      meta_waba_id TEXT,
      meta_verify_token TEXT,
      phone_display TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE IF NOT EXISTS conversation_assignments (
      thread_key TEXT PRIMARY KEY,
      sdr_id TEXT,
      contact_id TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  ];

  const results: { sql: string; ok: boolean; error?: string }[] = [];

  for (const sql of sqls) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "apikey":        key,
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify({ sql }),
      });
      if (res.ok) {
        results.push({ sql: sql.slice(0, 60), ok: true });
      } else {
        const err = await res.text();
        results.push({ sql: sql.slice(0, 60), ok: false, error: err.slice(0, 100) });
      }
    } catch (e) {
      results.push({ sql: sql.slice(0, 60), ok: false, error: String(e).slice(0, 100) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
