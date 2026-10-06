/**
 * Follow-up por SITUAÇÃO — Playbook Comercial Be Fluent v3, Seções 7.2 e 7.3.
 *
 * Sistema PARALELO ao follow-up sequencial de 5 etapas (src/lib/followup-store.ts),
 * que continua existindo e não é tocado. Aqui o disparo é por gatilho de situação
 * (proposta parada há D+1, reunião terminou em "vou levar pro time" → D+3, etc.),
 * com scripts fixos redigidos no playbook.
 *
 * Persistido no Postgres via Drizzle, com fallback em memória quando
 * DATABASE_URL não está configurado (modo demo local).
 */

import { asc } from "drizzle-orm";
import { db as client, schema } from "@/db";
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

/* ── Fallback em memória (modo demo / sem Postgres) ────────── */
let memTemplates: PlaybookFollowupTemplate[] | null = null;
function memDefaults(): PlaybookFollowupTemplate[] {
  return DEFAULT_PLAYBOOK_TEMPLATES.map((t) => ({ ...t, updatedAt: new Date().toISOString() }));
}

export async function getPlaybookTemplates(): Promise<PlaybookFollowupTemplate[]> {
  if (!client) {
    if (!memTemplates) memTemplates = memDefaults();
    return memTemplates;
  }

  const rows = await client.select().from(schema.followupPlaybookTemplates)
    .orderBy(asc(schema.followupPlaybookTemplates.dayOffset));

  if (rows.length === 0) {
    // Popula com os defaults na primeira vez.
    await client.insert(schema.followupPlaybookTemplates).values(
      DEFAULT_PLAYBOOK_TEMPLATES.map((t) => ({
        situationKey: t.situationKey,
        channel: t.channel,
        message: t.message,
        dayOffset: t.dayOffset,
        suggestedTime: t.suggestedTime || null,
        active: t.active,
      }))
    );
    return memDefaults();
  }

  return rows.map((r) => ({
    situationKey: r.situationKey as FollowupSituation,
    channel: (r.channel === "email" ? "email" : "whatsapp") as "whatsapp" | "email",
    message: r.message,
    dayOffset: r.dayOffset ?? 1,
    suggestedTime: r.suggestedTime ?? "",
    active: r.active ?? true,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  }));
}

export async function savePlaybookTemplate(
  situationKey: FollowupSituation,
  patch: { channel?: string; message?: string; dayOffset?: number; suggestedTime?: string; active?: boolean }
): Promise<void> {
  const normChannel: "whatsapp" | "email" | undefined =
    patch.channel === undefined ? undefined : patch.channel === "email" ? "email" : "whatsapp";

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

  const row: Record<string, unknown> = { situationKey, updatedAt: new Date() };
  if (patch.channel !== undefined) row.channel = patch.channel;
  if (patch.message !== undefined) row.message = patch.message;
  if (patch.dayOffset !== undefined) row.dayOffset = patch.dayOffset;
  if (patch.suggestedTime !== undefined) row.suggestedTime = patch.suggestedTime || null;
  if (patch.active !== undefined) row.active = patch.active;

  await client.insert(schema.followupPlaybookTemplates)
    .values({
      situationKey,
      channel: (row.channel as string) ?? "whatsapp",
      message: (row.message as string) ?? "",
      dayOffset: (row.dayOffset as number) ?? 1,
      suggestedTime: (row.suggestedTime as string | null) ?? null,
      active: (row.active as boolean) ?? true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({ target: schema.followupPlaybookTemplates.situationKey, set: row });
}

export async function logPlaybookFollowup(
  dealId: string,
  situationKey: string,
  channel: string,
  ok: boolean
): Promise<void> {
  if (!client) return;
  await client.insert(schema.followupPlaybookLog).values({ dealId, situationKey, channel, ok });
}

/** Renderiza o script substituindo {{primeiroNome}}, {{dia}}, {{mes}} etc. */
export function renderPlaybookMessage(message: string, vars: Record<string, string>): string {
  return renderTemplate(message, vars);
}

export { DEFAULT_PLAYBOOK_TEMPLATES };
