/**
 * Dados iniciais da conta Be Fluent — prontos para produção.
 * Contatos, negócios e atividades começam vazios.
 * O usuário adiciona seus dados reais após o primeiro login.
 */

export const DEMO_USER = {
  id: "demo-user",
  name: "Be Fluent",
  email: "befluentschooll@gmail.com",
  role: "owner" as const,
  org: "Be Fluent Idiomas & Ensino LTDA",
  plan: "enterprise" as const,
};

export const TEAM: { id: string; name: string; deals: number; won: number; revenue: number }[] = [];

export interface DemoContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  score: number;
  tags: string[];
  owner: string;
}

export const CONTACTS: DemoContact[] = [];

export interface DemoStage {
  id: string;
  name: string;
  probability: number;
}

export const STAGES: DemoStage[] = [
  { id: "s1", name: "Novo lead",    probability: 10 },
  { id: "s2", name: "Qualificação", probability: 30 },
  { id: "s3", name: "Proposta",     probability: 60 },
  { id: "s4", name: "Negociação",   probability: 80 },
  { id: "s5", name: "Fechamento",   probability: 95 },
];

/**
 * Funil de 8 etapas do Playbook Comercial Be Fluent v3 (Seções 3 e 8.1).
 * Entra como pipeline adicional "Funil Comercial Be Fluent", sem tocar no funil de 5 acima.
 * IDs estáveis para preservar deals vinculados em migrações futuras.
 */
export const STAGES_COMERCIAL_BF: DemoStage[] = [
  { id: "bf-s1", name: "Lead novo (trabalhado)",   probability: 5  },
  { id: "bf-s2", name: "Conectado",                probability: 15 },
  { id: "bf-s3", name: "Qualificado (BANT 3-de-4)", probability: 35 },
  { id: "bf-s4", name: "Reunião agendada",          probability: 55 },
  { id: "bf-s5", name: "Diagnóstico realizado",     probability: 70 },
  { id: "bf-s6", name: "Proposta enviada",          probability: 85 },
  { id: "bf-s7", name: "Fechado — matrícula",       probability: 100 },
  { id: "bf-s8", name: "Perdido/frio",              probability: 0  },
];

export const COMERCIAL_BF_PIPELINE_ID = "pipe-comercial-bf";

/**
 * Benchmarks de conversão por etapa (Playbook 8.1). Ponto de partida —
 * recalibrar após 60 dias de dado real (8.4). Chave = id da etapa BF.
 * alertFloor derivado da Matriz de Diagnóstico Rápido (8.5).
 */
export const STAGE_BENCHMARKS_BF: { stageId: string; expectedConversionPct: number; alertFloorPct: number }[] = [
  { stageId: "bf-s1", expectedConversionPct: 50, alertFloorPct: 40 }, // Lead novo -> Conectado (~50%)
  { stageId: "bf-s2", expectedConversionPct: 50, alertFloorPct: 40 }, // Conectado -> Qualificado (~50%)
  { stageId: "bf-s3", expectedConversionPct: 80, alertFloorPct: 60 }, // Qualificado -> Reunião agendada (~80%)
  { stageId: "bf-s4", expectedConversionPct: 80, alertFloorPct: 80 }, // Reunião agendada -> Diagnóstico (no-show <20%)
  { stageId: "bf-s5", expectedConversionPct: 100, alertFloorPct: 90 }, // Diagnóstico -> Proposta (~100%)
  { stageId: "bf-s6", expectedConversionPct: 30, alertFloorPct: 25 }, // Proposta -> Fechado (25-35% das reuniões)
];

export interface DemoDeal {
  id: string;
  title: string;
  value: number;
  stageId: string;
  contact: string;
  owner: string;
  tags?: string[];
}

export const DEALS: DemoDeal[] = [];

export interface DemoActivity {
  id: string;
  type: "task" | "call" | "meeting" | "email";
  title: string;
  due: string;
  contact: string;
  done: boolean;
}

export const ACTIVITIES: DemoActivity[] = [];

export interface DemoConversation {
  id: string;
  contact: string;
  channel: "whatsapp" | "instagram" | "messenger";
  preview: string;
  unread: number;
  time: string;
}

export const CONVERSATIONS: DemoConversation[] = [];

/* Dashboard series — zerado para a conta real começar do zero */
export const REVENUE_SERIES: { month: string; receita: number; meta: number }[] = [
  { month: "Jan", receita: 0, meta: 0 },
  { month: "Fev", receita: 0, meta: 0 },
  { month: "Mar", receita: 0, meta: 0 },
  { month: "Abr", receita: 0, meta: 0 },
  { month: "Mai", receita: 0, meta: 0 },
  { month: "Jun", receita: 0, meta: 0 },
];

export const FUNNEL_SERIES = STAGES.map((s) => ({
  stage: s.name,
  count: 0,
  value: 0,
}));

export const SOURCE_SERIES: { source: string; value: number }[] = [
  { source: "WhatsApp",  value: 0 },
  { source: "Instagram", value: 0 },
  { source: "Site",      value: 0 },
  { source: "Indicação", value: 0 },
  { source: "Messenger", value: 0 },
];

export const KPIS = {
  pipelineValue:  0,
  openDeals:      0,
  wonThisMonth:   0,
  conversionRate: 0,
  newLeads:       0,
  avgTicket:      0,
};
