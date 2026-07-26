/**
 * Follow-up automático — 5 etapas sequenciais no funil de vendas.
 *
 * Regra de negócio:
 * - Lead parado numa etapa "Follow-up N" recebe a mensagem do dia.
 * - Se não responder até o próximo disparo (24h), avança para "Follow-up N+1".
 * - Follow-up 5 sem resposta → lead descartado (loseDeal).
 * - Se o lead responder a qualquer momento, volta para "Qualificação"
 *   (a resposta é detectada via inbox_messages, fora deste módulo).
 *
 * Persistido no Supabase (não no zustand) porque o disparo roda em
 * cron server-side, sem acesso ao localStorage do navegador.
 */

import { createClient } from "@supabase/supabase-js";

export interface FollowupTemplate {
  step: 1 | 2 | 3 | 4 | 5;
  channel: "whatsapp" | "email";
  message: string;
  subject?: string; // usado só no e-mail
  updatedAt: string;
}

const DEFAULT_TEMPLATES: Omit<FollowupTemplate, "updatedAt">[] = [
  {
    step: 1,
    channel: "whatsapp",
    message: "Oi {{primeiroNome}}! Passando rapidinho por aqui 😊 Vi que a gente conversou sobre o inglês, mas você sumiu no meio do papo — tudo certo por aí? Fico à disposição se quiser continuar de onde paramos.",
  },
  {
    step: 2,
    channel: "whatsapp",
    message: "{{primeiroNome}}, separei uma coisa rápida pra você: sabia que quem fala inglês fluente ganha em média 61% a mais no mercado? (dado da FGV) Faz sentido a gente retomar aquela conversa sobre o seu inglês?",
  },
  {
    step: 3,
    channel: "whatsapp",
    message: "Oi {{primeiroNome}}! Uma pergunta rápida, sem compromisso: o que te fez procurar a Be Fluent lá no início? Pergunto porque quero entender se ainda faz sentido pra você — e se não fizer, tudo bem também, só me avisa 🙏",
  },
  {
    step: 4,
    channel: "whatsapp",
    message: "{{primeiroNome}}, essa é minha penúltima mensagem por aqui — não quero ser inconveniente 😅 Se o momento não é agora, entendo. Mas se ainda houver 1% de interesse em finalmente destravar o inglês, me chama que eu te conto como funciona.",
  },
  {
    step: 5,
    channel: "whatsapp",
    message: "{{primeiroNome}}, vou parar de insistir por aqui pra não te incomodar 🙂 Se um dia quiser retomar o assunto do inglês, é só me chamar — as portas ficam abertas. Um abraço e sucesso pra você!",
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
  await client.rpc("exec_sql", {
    sql: `CREATE TABLE IF NOT EXISTS followup_templates (
      step INTEGER PRIMARY KEY,
      channel TEXT NOT NULL DEFAULT 'whatsapp',
      message TEXT NOT NULL,
      subject TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
  }).catch(() => null);
  await client.rpc("exec_sql", {
    sql: `CREATE TABLE IF NOT EXISTS followup_log (
      id BIGSERIAL PRIMARY KEY,
      deal_id TEXT NOT NULL,
      step INTEGER NOT NULL,
      sent_at TIMESTAMPTZ DEFAULT NOW(),
      channel TEXT,
      ok BOOLEAN DEFAULT TRUE
    )`,
  }).catch(() => null);
}

export async function getTemplates(): Promise<FollowupTemplate[]> {
  const client = getClient();
  if (!client) return DEFAULT_TEMPLATES.map((t) => ({ ...t, updatedAt: new Date().toISOString() }));
  await ensureSchema(client);

  const { data, error } = await client.from("followup_templates").select("*").order("step");
  if (error || !data || data.length === 0) {
    // Popula com defaults na primeira vez
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await client.from("followup_templates").upsert(
      DEFAULT_TEMPLATES.map((t) => ({ step: t.step, channel: t.channel, message: t.message, subject: t.subject ?? null }))
    );
    return DEFAULT_TEMPLATES.map((t) => ({ ...t, updatedAt: new Date().toISOString() }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any) => ({
    step: r.step, channel: r.channel, message: r.message,
    subject: r.subject ?? undefined, updatedAt: r.updated_at,
  }));
}

export async function saveTemplate(step: number, patch: { channel?: string; message?: string; subject?: string }) {
  const client = getClient();
  if (!client) return;
  await ensureSchema(client);
  await client.from("followup_templates").upsert({
    step, ...patch, updated_at: new Date().toISOString(),
  });
}

export async function logFollowupSent(dealId: string, step: number, channel: string, ok: boolean) {
  const client = getClient();
  if (!client) return;
  await ensureSchema(client);
  await client.from("followup_log").insert({ deal_id: dealId, step, channel, ok });
}

export function renderTemplate(message: string, vars: Record<string, string>): string {
  return message.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export { getClient as getFollowupClient };
