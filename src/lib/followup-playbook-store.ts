/**
 * Follow-up por SITUAÇÃO — Playbook Comercial Be Fluent v3, Seções 7.2 e 7.3.
 *
 * Sistema PARALELO ao follow-up sequencial de 5 etapas (src/lib/followup-store.ts),
 * que continua existindo e não é tocado. Aqui o disparo é por gatilho de situação
 * (proposta parada há D+1, reunião terminou em "vou levar pro time" → D+3, etc.),
 * com scripts fixos redigidos no playbook.
 *
 * Persistido no Supabase via exec_sql (mesmo padrão de followup-store.ts), com
 * fallback em memória quando o Supabase não está configurado.
 */

import { createClient } from "@supabase/supabase-js";
import { renderTemplate } from "@/lib/followup-store";
import { SITUATION_LABELS, type FollowupSituation } from "@/lib/followup-playbook-labels";

export { SITUATION_LABELS };
export type { FollowupSituation };

export interface PlaybookFollowupTemplate {
  situationKey: FollowupSituation;
  channel: "whatsapp" | "email";
  message: string;
  dayOffset: number;       // Playbook 7.3 — D+N após o gatilho
  suggestedTime: string;   // "HH:MM" ou "" para "mesmo horário do contato"
  active: boolean;
  updatedAt: string;
}

/** Os 7 modelos oficiais — scripts VERBATIM da Seção 7.2, calendário da 7.3. */
const DEFAULT_PLAYBOOK_TEMPLATES: Omit<PlaybookFollowupTemplate, "updatedAt">[] = [
  {
    situationKey: "proposta_sumiu",
    channel: "whatsapp",
    dayOffset: 1,
    suggestedTime: "",
    active: true,
    message:
      "{{primeiroNome}}, vi que ainda não deu pra olhar a proposta com calma. Só pra eu não ocupar sua agenda à toa: ainda faz sentido a gente conversar essa semana, ou prefere que eu volte em {{mes}}?",
  },
  {
    situationKey: "levar_pro_time",
    channel: "whatsapp",
    dayOffset: 3,
    suggestedTime: "10:30",
    active: true,
    message:
      "{{primeiroNome}}, fechando o que a gente combinou: você leva pro time até {{dia}}. Quer que eu prepare algo específico pra facilitar essa conversa do lado de vocês?",
  },
  {
    situationKey: "reativacao_frio",
    channel: "whatsapp",
    dayOffset: 45,
    suggestedTime: "",
    active: true,
    message:
      "{{primeiroNome}}, faz tempo que a gente não troca ideia. Mudou bastante coisa aqui desde então, inclusive no que resolveria o que você me contou na época. Posso te atualizar?",
  },
  {
    situationKey: "pediu_desconto_sumiu",
    channel: "whatsapp",
    dayOffset: 5,
    suggestedTime: "15:00",
    active: true,
    message:
      "{{primeiroNome}}, entendo que o valor pesou. Antes de mexer em preço, queria entender: o que precisaria ser verdade pra isso fazer sentido pra vocês hoje?",
  },
  {
    situationKey: "contrato_sem_retorno",
    channel: "whatsapp",
    dayOffset: 8,
    suggestedTime: "10:30",
    active: true,
    message:
      "{{primeiroNome}}, o contrato está pronto do nosso lado. Só preciso saber se ainda está no seu radar essa semana.",
  },
  {
    situationKey: "pediu_info_sumiu",
    channel: "whatsapp",
    dayOffset: 1,
    suggestedTime: "",
    active: true,
    message:
      "{{primeiroNome}}, mandei o material, mas uma informação sozinha raramente resolve uma dúvida real. Qual foi a pergunta que ficou sem resposta?",
  },
  {
    situationKey: "ultima_tentativa",
    channel: "whatsapp",
    dayOffset: 15,
    suggestedTime: "",
    active: true,
    message:
      "{{primeiroNome}}, não tive retorno nas últimas tentativas, então vou parar de te procurar por aqui. Se algo mudar do seu lado, minha porta continua aberta, é só chamar.",
  },
];

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

let schemaReady = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureSchema(client: any) {
  if (schemaReady) return;
  schemaReady = true;
  await client
    .rpc("exec_sql", {
      sql: `CREATE TABLE IF NOT EXISTS followup_playbook_templates (
        situation_key TEXT PRIMARY KEY,
        channel TEXT NOT NULL DEFAULT 'whatsapp',
        message TEXT NOT NULL,
        day_offset INTEGER NOT NULL DEFAULT 1,
        suggested_time TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    })
    .catch(() => null);
  await client
    .rpc("exec_sql", {
      sql: `CREATE TABLE IF NOT EXISTS followup_playbook_log (
        id BIGSERIAL PRIMARY KEY,
        deal_id TEXT NOT NULL,
        situation_key TEXT NOT NULL,
        triggered_at TIMESTAMPTZ DEFAULT NOW(),
        channel TEXT,
        ok BOOLEAN DEFAULT TRUE
      )`,
    })
    .catch(() => null);
}

/* ── Fallback em memória (modo demo / sem Supabase) ────────── */
let memTemplates: PlaybookFollowupTemplate[] | null = null;
function memDefaults(): PlaybookFollowupTemplate[] {
  return DEFAULT_PLAYBOOK_TEMPLATES.map((t) => ({ ...t, updatedAt: new Date().toISOString() }));
}

export async function getPlaybookTemplates(): Promise<PlaybookFollowupTemplate[]> {
  const client = getClient();
  if (!client) {
    if (!memTemplates) memTemplates = memDefaults();
    return memTemplates;
  }
  await ensureSchema(client);

  const { data, error } = await client
    .from("followup_playbook_templates")
    .select("*")
    .order("day_offset");

  if (error || !data || data.length === 0) {
    // Popula com os defaults na primeira vez.
    await client.from("followup_playbook_templates").upsert(
      DEFAULT_PLAYBOOK_TEMPLATES.map((t) => ({
        situation_key: t.situationKey,
        channel: t.channel,
        message: t.message,
        day_offset: t.dayOffset,
        suggested_time: t.suggestedTime || null,
        active: t.active,
      }))
    );
    return memDefaults();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any) => ({
    situationKey: r.situation_key as FollowupSituation,
    channel: (r.channel === "email" ? "email" : "whatsapp") as "whatsapp" | "email",
    message: r.message,
    dayOffset: r.day_offset ?? 1,
    suggestedTime: r.suggested_time ?? "",
    active: r.active ?? true,
    updatedAt: r.updated_at,
  }));
}

export async function savePlaybookTemplate(
  situationKey: FollowupSituation,
  patch: { channel?: string; message?: string; dayOffset?: number; suggestedTime?: string; active?: boolean }
): Promise<void> {
  const normChannel: "whatsapp" | "email" | undefined =
    patch.channel === undefined ? undefined : patch.channel === "email" ? "email" : "whatsapp";

  const client = getClient();
  if (!client) {
    if (!memTemplates) memTemplates = memDefaults();
    memTemplates = memTemplates.map((t) =>
      t.situationKey === situationKey
        ? {
            ...t,
            message: patch.message ?? t.message,
            dayOffset: patch.dayOffset ?? t.dayOffset,
            suggestedTime: patch.suggestedTime ?? t.suggestedTime,
            active: patch.active ?? t.active,
            channel: normChannel ?? t.channel,
            updatedAt: new Date().toISOString(),
          }
        : t
    );
    return;
  }
  await ensureSchema(client);
  const row: Record<string, unknown> = { situation_key: situationKey, updated_at: new Date().toISOString() };
  if (patch.channel !== undefined) row.channel = patch.channel;
  if (patch.message !== undefined) row.message = patch.message;
  if (patch.dayOffset !== undefined) row.day_offset = patch.dayOffset;
  if (patch.suggestedTime !== undefined) row.suggested_time = patch.suggestedTime || null;
  if (patch.active !== undefined) row.active = patch.active;
  await client.from("followup_playbook_templates").upsert(row);
}

export async function logPlaybookFollowup(
  dealId: string,
  situationKey: string,
  channel: string,
  ok: boolean
): Promise<void> {
  const client = getClient();
  if (!client) return;
  await ensureSchema(client);
  await client.from("followup_playbook_log").insert({
    deal_id: dealId,
    situation_key: situationKey,
    channel,
    ok,
  });
}

/** Renderiza o script substituindo {{primeiroNome}}, {{dia}}, {{mes}} etc. */
export function renderPlaybookMessage(message: string, vars: Record<string, string>): string {
  return renderTemplate(message, vars);
}

export { getClient as getPlaybookClient, DEFAULT_PLAYBOOK_TEMPLATES };
