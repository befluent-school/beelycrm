export const SITE = {
  name: "Beely",
  tagline: "CRM com inteligência comercial e Business Intelligence",
  description:
    "Beely é a plataforma de CRM e vendas que centraliza leads, pipeline, automações, remarketing e Business Intelligence em um só lugar. Decisões comerciais com dados, não com achismo.",
  // Obrigatório em todo o sistema:
  footerLegal: "Desenvolvido por Be Fluent Idiomas & Ensino LTDA.",
  email: "befluentschooll@gmail.com",
} as const;

export type PlanId = "starter" | "pro" | "business" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // BRL/mês
  tagline: string;
  highlight?: "popular" | "featured";
  badge?: string;
  cta: string;
  features: string[];
  limits: {
    users: string;
    contacts: string;
    pipelines: string;
    whatsapp: string;
  };
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 47,
    tagline: "Para quem está começando a organizar as vendas.",
    cta: "Começar com Starter",
    limits: { users: "Até 3 usuários", contacts: "2.000 contatos", pipelines: "1 funil", whatsapp: "1 número WhatsApp" },
    features: [
      "Pipeline visual (Kanban)",
      "Gestão de contatos e leads",
      "Tarefas e atividades",
      "Remarketing por e-mail (Gmail)",
      "Relatórios básicos",
      "Suporte por e-mail",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 87,
    tagline: "Para times que querem escalar com automação.",
    highlight: "popular",
    badge: "Mais popular",
    cta: "Assinar Pro",
    limits: { users: "Até 10 usuários", contacts: "20.000 contatos", pipelines: "5 funis", whatsapp: "3 números WhatsApp" },
    features: [
      "Tudo do Starter, mais:",
      "Automações e workflows",
      "Ligações com IA (voz)",
      "Lead scoring",
      "Sequências de e-mail e remarketing",
      "Relatórios avançados",
      "API (somente leitura) + Webhooks",
      "Suporte prioritário",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 147,
    tagline: "Para operações comerciais que exigem performance.",
    highlight: "featured",
    badge: "Melhor custo-benefício",
    cta: "Assinar Business",
    limits: { users: "Até 30 usuários", contacts: "100.000 contatos", pipelines: "Funis ilimitados", whatsapp: "10 números WhatsApp" },
    features: [
      "Tudo do Pro, mais:",
      "Automações avançadas + integração N8N",
      "Lead scoring com IA",
      "Copilot de vendas com IA (resumos e respostas)",
      "API completa + Webhooks ilimitados",
      "Relatórios custom + exportação",
      "Campos e dashboards personalizados",
      "Suporte dedicado",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 247,
    tagline: "Para empresas que precisam de escala e controle total.",
    badge: "Potência máxima",
    cta: "Falar com vendas",
    limits: { users: "Usuários ilimitados", contacts: "Contatos ilimitados", pipelines: "Funis ilimitados", whatsapp: "WhatsApp ilimitado" },
    features: [
      "Tudo do Business, mais:",
      "White-label completo",
      "BI dedicado e metas avançadas",
      "Papéis e permissões granulares",
      "SLA e gerente de conta dedicado",
      "Onboarding assistido",
      "Integrações sob medida",
    ],
  },
];

export const TRIAL_DAYS = 14;
