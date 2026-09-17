import { NextResponse } from "next/server";

/**
 * GET /api/playbook/init-schema
 *
 * Adiciona (aditivamente, IF NOT EXISTS) as colunas e tabelas do Playbook
 * Comercial Be Fluent v3 no Postgres do Supabase, via RPC exec_sql — mesmo
 * padrão de /api/inbox/init-schema.
 *
 * NÃO executa nenhum DROP, rename ou alteração destrutiva. Idempotente:
 * pode ser chamado várias vezes com segurança. Chamado uma vez pela
 * sincronização inicial (use-supabase-sync) e disponível para acesso manual.
 */
export const dynamic = "force-dynamic";

const STATEMENTS = [
  // deals — campos aditivos do Playbook
  "ALTER TABLE deals ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ",
  "ALTER TABLE deals ADD COLUMN IF NOT EXISTS sla_responded_at TIMESTAMPTZ",
  "ALTER TABLE deals ADD COLUMN IF NOT EXISTS cost_of_inaction_note TEXT",
  "ALTER TABLE deals ADD COLUMN IF NOT EXISTS refusal_count INTEGER DEFAULT 0",
  "ALTER TABLE deals ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ",
  "ALTER TABLE deals ADD COLUMN IF NOT EXISTS bant JSONB",

  // contacts — qualificação BANT 3-de-4 (Playbook 3.5) + Avenida do Não (6.4)
  "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bant_budget BOOLEAN",
  "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bant_authority BOOLEAN",
  "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bant_need BOOLEAN",
  "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bant_timing BOOLEAN",
  "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bant_note TEXT",
  "ALTER TABLE contacts ADD COLUMN IF NOT EXISTS refusal_count INTEGER DEFAULT 0",

  // financial_config — SLA alvo + metas diárias (Playbook 2 e 11.2)
  "ALTER TABLE financial_config ADD COLUMN IF NOT EXISTS sla_target_minutes INTEGER DEFAULT 4",
  "ALTER TABLE financial_config ADD COLUMN IF NOT EXISTS daily_targets JSONB",

  // follow-ups por situação (Playbook 7.2 / 7.3) — paralelo a followup_templates, sem tocá-la
  `CREATE TABLE IF NOT EXISTS followup_playbook_templates (
     situation_key TEXT PRIMARY KEY,
     channel TEXT NOT NULL DEFAULT 'whatsapp',
     message TEXT NOT NULL,
     day_offset INTEGER NOT NULL DEFAULT 1,
     suggested_time TEXT,
     active BOOLEAN NOT NULL DEFAULT TRUE,
     updated_at TIMESTAMPTZ DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS followup_playbook_log (
     id BIGSERIAL PRIMARY KEY,
     deal_id TEXT NOT NULL,
     situation_key TEXT NOT NULL,
     triggered_at TIMESTAMPTZ DEFAULT NOW(),
     channel TEXT,
     ok BOOLEAN DEFAULT TRUE
   )`,
];

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, reason: "no_supabase_config" });
  }

  const results: { sql: string; ok: boolean; error?: string }[] = [];

  for (const sql of STATEMENTS) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ sql }),
      });
      if (res.ok) {
        results.push({ sql: sql.replace(/\s+/g, " ").slice(0, 70), ok: true });
      } else {
        const err = await res.text();
        results.push({ sql: sql.replace(/\s+/g, " ").slice(0, 70), ok: false, error: err.slice(0, 120) });
      }
    } catch (e) {
      results.push({ sql: sql.replace(/\s+/g, " ").slice(0, 70), ok: false, error: String(e).slice(0, 120) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
