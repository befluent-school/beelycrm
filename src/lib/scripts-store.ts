/**
 * Biblioteca de scripts livres do Playbook — reativação, quebra de objeção,
 * fechamento, script de vendas, remarketing. Complementa (não substitui) os
 * 7 modelos fixos de follow-up por situação em followup-playbook-store.ts,
 * que continuam com gatilho automático como estão.
 *
 * Aqui é uma biblioteca de referência: o vendedor cria, edita e apaga
 * quantos scripts quiser em cada categoria, sem nenhum disparo automático —
 * só consulta manual (copiar e usar na conversa).
 *
 * Persistido no Supabase via exec_sql (mesmo padrão de followup-playbook-store.ts).
 */

import { createClient } from "@supabase/supabase-js";

export type ScriptCategory =
  | "followup"
  | "remarketing"
  | "reativacao"
  | "objecao"
  | "fechamento"
  | "vendas";

export const SCRIPT_CATEGORY_LABELS: Record<ScriptCategory, string> = {
  followup:    "Follow-up",
  remarketing: "Remarketing",
  reativacao:  "Reativação de lead",
  objecao:     "Quebra de objeção",
  fechamento:  "Fechamento de venda",
  vendas:      "Script de vendas",
};

export interface Script {
  id: string;
  category: ScriptCategory;
  title: string;
  channel: "whatsapp" | "email" | "call";
  body: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Alguns pontos de partida por categoria — o usuário edita/apaga/cria à vontade. */
const SEED_SCRIPTS: Omit<Script, "id" | "createdAt" | "updatedAt">[] = [
  {
    category: "reativacao",
    title: "Reativação — trouxe novidade real",
    channel: "whatsapp",
    active: true,
    body: "{{primeiroNome}}, faz tempo que a gente não troca ideia! Lembrei de você porque mudou bastante coisa por aqui desde a nossa última conversa — inclusive no que resolveria o que você me contou na época. Vale eu te atualizar rapidinho?",
  },
  {
    category: "reativacao",
    title: "Reativação — pergunta aberta, sem pressão",
    channel: "whatsapp",
    active: true,
    body: "Oi {{primeiroNome}}, tudo bem? Passando só para saber como ficou aquela ideia de estudar inglês que a gente conversou. Ainda está nos seus planos?",
  },
  {
    category: "objecao",
    title: "Objeção de preço — reformula valor antes de mexer no preço",
    channel: "whatsapp",
    active: true,
    body: "Entendo que o valor pesou, {{primeiroNome}}. Antes de mexer em preço, me deixa entender melhor: o que precisaria ser verdade pra isso fazer sentido pra você hoje?",
  },
  {
    category: "objecao",
    title: "Objeção \"vou pensar\" — descobre a objeção real",
    channel: "whatsapp",
    active: true,
    body: "Sem problema, {{primeiroNome}}! Só pra eu te ajudar melhor: o que especificamente você quer pensar com mais calma — o investimento, o horário, ou se é o momento certo?",
  },
  {
    category: "objecao",
    title: "Objeção \"não tenho tempo\"",
    channel: "whatsapp",
    active: true,
    body: "Faz sentido, {{primeiroNome}}, tempo é o recurso mais escasso de todo mundo. Por isso o formato foi pensado pra caber em 30 min por dia, no seu horário. Posso te mostrar como isso funciona na prática?",
  },
  {
    category: "fechamento",
    title: "Fechamento — resumo + próximo passo claro",
    channel: "whatsapp",
    active: true,
    body: "Perfeito, {{primeiroNome}}! Recapitulando: {{resumoProposta}}. Posso te mandar o link de matrícula agora para garantirmos sua vaga nessa turma?",
  },
  {
    category: "fechamento",
    title: "Fechamento — urgência real (vaga/turma)",
    channel: "whatsapp",
    active: true,
    body: "{{primeiroNome}}, temos só mais {{vagasRestantes}} vagas nessa turma que fecha em {{dia}}. Posso reservar a sua enquanto você confirma?",
  },
  {
    category: "vendas",
    title: "Abertura de diagnóstico — perguntas de descoberta",
    channel: "call",
    active: true,
    body: "1) O que te fez procurar um curso de inglês agora? 2) Já tentou aprender antes — o que não funcionou? 3) Pra que você vai usar o inglês (viagem, trabalho, prova)? 4) Até quando você gostaria de estar falando com confiança?",
  },
  {
    category: "vendas",
    title: "Apresentação de proposta — estrutura recomendada",
    channel: "call",
    active: true,
    body: "1. Reconecta com a dor que o lead trouxe no diagnóstico. 2. Mostra o caminho (metodologia) ligado direto a essa dor. 3. Apresenta o investimento como consequência do resultado, não isolado. 4. Fecha com uma pergunta de avanço, nunca com silêncio.",
  },
  {
    category: "remarketing",
    title: "Remarketing — lead frio de campanha antiga",
    channel: "email",
    active: true,
    body: "Olá {{primeiroNome}}, você chegou a demonstrar interesse em aprender inglês com a gente. Preparamos uma condição especial para quem começar até {{dia}}. Quer que eu te explique como funciona?",
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
      sql: `CREATE TABLE IF NOT EXISTS scripts (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL DEFAULT 'vendas',
        title TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'whatsapp',
        body TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
    })
    .catch(() => null);
}

function uid() {
  return `scr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

let memScripts: Script[] | null = null;
function memSeed(): Script[] {
  const now = new Date().toISOString();
  return SEED_SCRIPTS.map((s) => ({ ...s, id: uid(), createdAt: now, updatedAt: now }));
}

export async function getScripts(): Promise<Script[]> {
  const client = getClient();
  if (!client) {
    if (!memScripts) memScripts = memSeed();
    return memScripts;
  }
  await ensureSchema(client);

  const { data, error } = await client.from("scripts").select("*").order("created_at");

  if (error) {
    console.error("[scripts-store] erro ao ler scripts:", error.message);
    return [];
  }

  if (!data || data.length === 0) {
    // Popula com os exemplos iniciais na primeira vez.
    const seed = memSeed();
    const { error: seedErr } = await client.from("scripts").upsert(
      seed.map((s) => ({
        id: s.id, category: s.category, title: s.title, channel: s.channel,
        body: s.body, active: s.active, created_at: s.createdAt, updated_at: s.updatedAt,
      }))
    );
    if (seedErr) console.error("[scripts-store] erro ao semear scripts:", seedErr.message);
    return seed;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((r: any) => ({
    id: r.id,
    category: r.category as ScriptCategory,
    title: r.title,
    channel: (r.channel === "email" ? "email" : r.channel === "call" ? "call" : "whatsapp") as Script["channel"],
    body: r.body,
    active: r.active ?? true,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function createScript(
  s: Omit<Script, "id" | "createdAt" | "updatedAt">
): Promise<Script> {
  const now = new Date().toISOString();
  const script: Script = { ...s, id: uid(), createdAt: now, updatedAt: now };

  const client = getClient();
  if (!client) {
    if (!memScripts) memScripts = memSeed();
    memScripts = [...memScripts, script];
    return script;
  }
  await ensureSchema(client);
  const { error } = await client.from("scripts").insert({
    id: script.id, category: script.category, title: script.title, channel: script.channel,
    body: script.body, active: script.active, created_at: script.createdAt, updated_at: script.updatedAt,
  });
  if (error) console.error("[scripts-store] erro ao criar script:", error.message);
  return script;
}

export async function updateScript(
  id: string,
  patch: Partial<Omit<Script, "id" | "createdAt">>
): Promise<void> {
  const client = getClient();
  if (!client) {
    if (!memScripts) memScripts = memSeed();
    memScripts = memScripts.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s));
    return;
  }
  await ensureSchema(client);
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.channel !== undefined) row.channel = patch.channel;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.active !== undefined) row.active = patch.active;
  const { error } = await client.from("scripts").update(row).eq("id", id);
  if (error) console.error("[scripts-store] erro ao atualizar script:", error.message);
}

export async function deleteScript(id: string): Promise<void> {
  const client = getClient();
  if (!client) {
    if (memScripts) memScripts = memScripts.filter((s) => s.id !== id);
    return;
  }
  await ensureSchema(client);
  const { error } = await client.from("scripts").delete().eq("id", id);
  if (error) console.error("[scripts-store] erro ao apagar script:", error.message);
}
