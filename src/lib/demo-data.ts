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
