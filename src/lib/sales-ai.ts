/**
 * Sales AI Engine — análise profunda de conversas + sugestões estratégicas.
 *
 * Filosofia inspirada em:
 * - Jon Benson (VSL / copy de resposta direta): mensagem curta, benefício imediato, CTA claro
 * - COO mindset: visão de funil, conversão por etapa, custo de oportunidade
 * - Copy Master: gatilhos mentais, quebra de objeção, ancoragem de valor
 */

export type InsightType = "interest" | "suggestion" | "objection" | "warning" | "strategy" | "closing";

export interface SalesInsight {
  type: InsightType;
  title: string;
  body: string;
  cta?: string;          // texto sugerido para enviar (botão "Usar")
  priority: "high" | "medium" | "low";
  tag?: string;          // ex: "Gatilho: Urgência", "Técnica: SPIN"
}

export interface ConversationContext {
  contactName: string;
  contactScore: number;
  contactSource: string;
  contactTags: string[];
  dealStage?: string;
  dealValue?: number;
  totalMessages: number;
  inMessages: { text: string; time: string }[];
  outMessages: { text: string; time: string }[];
  lastInText: string;
  lastOutText: string;
  channel: "whatsapp" | "instagram" | "messenger";
}

/* ── Detectores de sinal ──────────────────────────────────── */

const BUYING_SIGNALS   = ["fechado", "vamos", "fechar", "quero", "contratar", "assinar", "renovar", "como faço", "qual o próximo passo", "quando começa", "manda o contrato", "aceito", "combinado", "pode mandar"];
const PRICE_OBJECTIONS = ["caro", "desconto", "preço", "valor", "custo", "orçamento", "cabe no", "parcela", "forma de pagamento", "investimento alto"];
const TIME_OBJECTIONS  = ["prazo", "quanto tempo", "quando", "demora", "urgente", "preciso logo", "esta semana", "hoje"];
const COMPETITOR_SIGS  = ["concorrente", "outro sistema", "estou vendo", "comparando", "já uso", "estamos avaliando"];
const COLD_SIGNALS     = ["não sei", "talvez", "vou pensar", "deixa eu ver", "depois", "mais tarde", "vou analisar", "não tenho certeza"];
const PAIN_SIGNALS     = ["problema", "dificuldade", "não consigo", "perco", "perde", "desperdiça", "demora muito", "manual", "trabalhoso", "confuso"];
const INTEREST_SIGNALS = ["interessante", "gostei", "parece bom", "me conta mais", "como funciona", "tem mais", "fala mais", "que mais"];

function detect(text: string, signals: string[]): boolean {
  const t = text.toLowerCase();
  return signals.some((s) => t.includes(s));
}

function detectAll(texts: string[], signals: string[]): boolean {
  return texts.some((t) => detect(t, signals));
}

/* ── Motor principal de análise ───────────────────────────── */

export function analyzeConversation(ctx: ConversationContext): SalesInsight[] {
  const insights: SalesInsight[] = [];
  const { contactName, contactScore, dealStage, dealValue, inMessages, outMessages, lastInText, lastOutText, channel, contactTags } = ctx;
  const firstName = contactName.split(" ")[0];
  const allInTexts = inMessages.map((m) => m.text);
  const noIn = inMessages.length === 0;
  const noOut = outMessages.length === 0;

  const isBuying     = detect(lastInText, BUYING_SIGNALS);
  const isPriceObj   = detect(lastInText, PRICE_OBJECTIONS) || detectAll(allInTexts.slice(-3), PRICE_OBJECTIONS);
  const isTimeObj    = detect(lastInText, TIME_OBJECTIONS);
  const isCompetitor = detect(lastInText, COMPETITOR_SIGS) || detectAll(allInTexts, COMPETITOR_SIGS);
  const isCold       = detect(lastInText, COLD_SIGNALS);
  const hasPain      = detectAll(allInTexts, PAIN_SIGNALS);
  const isInterested = detect(lastInText, INTEREST_SIGNALS);
  const isHot        = contactScore >= 70 || contactTags.includes("quente");
  const isHighValue  = (dealValue ?? 0) >= 10000;

  /* ── 1. Análise de momento do lead ─────────────────────── */
  if (noIn) {
    insights.push({
      type: "warning",
      priority: "high",
      title: "Lead sem resposta",
      body: `${contactName} ainda não respondeu. Leads sem follow-up nas primeiras 5 min têm 80% menos chance de converter. Envie uma mensagem de reativação agora.`,
      tag: "Regra: Follow-up urgente",
      cta: `Oi ${firstName}! Vi que você entrou em contato com a gente. Tenho 2 minutos agora — posso te ligar ou prefere que eu te mande mais detalhes aqui?`,
    });
  } else if (isBuying) {
    insights.push({
      type: "closing",
      priority: "high",
      title: "🔥 Sinal de fechamento detectado!",
      body: `${contactName} demonstrou intenção de compra. Este é o momento de avançar para o fechamento sem hesitar. Não dê mais tempo para dúvidas surgirem — proponha o próximo passo concreto agora.`,
      tag: "Técnica: Assumir o sim",
      cta: `Perfeito ${firstName}! Vou te mandar o contrato agora mesmo. Qual o melhor e-mail para enviar? Assim já deixo tudo certo pra você começar ainda essa semana.`,
    });
  } else if (isCold) {
    insights.push({
      type: "warning",
      priority: "high",
      title: "Lead em fase de hesitação",
      body: `${contactName} está em modo de procrastinação — "vou pensar" geralmente significa que falta clareza no valor ou medo da decisão. Reduza o risco percebido e crie uma micro-ação.`,
      tag: "Técnica: Redução de risco",
      cta: `Entendo ${firstName}! Sem pressão. Só queria saber: qual é a sua principal dúvida? Posso resolver em 2 minutos agora e você decide com mais segurança.`,
    });
  } else if (isInterested) {
    insights.push({
      type: "interest",
      priority: "medium",
      title: "Lead aquecendo — aproveite o momentum",
      body: `${contactName} demonstrou curiosidade ativa. Este é o momento de aprofundar a dor e conectar ao benefício concreto. Faça uma pergunta SPIN (Situação → Problema → Implicação → Necessidade).`,
      tag: "Técnica: SPIN Selling",
      cta: `Que ótimo ${firstName}! Me conta: qual é o maior desafio que você tem hoje na parte de [área de interesse]? Quero entender melhor pra te mostrar exatamente o que vai resolver.`,
    });
  } else if (inMessages.length > 0) {
    insights.push({
      type: "interest",
      priority: "low",
      title: `Engajamento ${contactScore >= 50 ? "positivo" : "baixo"} — score ${contactScore} pts`,
      body: `${contactName} tem ${inMessages.length} mensagem${inMessages.length > 1 ? "s" : ""} nesta conversa. ${contactScore >= 50 ? "Bom sinal — mantenha o ritmo e avance para qualificação." : "Score baixo — qualifique antes de apresentar proposta."}`,
      tag: contactScore >= 50 ? "Status: Qualificado" : "Status: Em qualificação",
    });
  }

  /* ── 2. Objeções ────────────────────────────────────────── */
  if (isPriceObj) {
    insights.push({
      type: "objection",
      priority: "high",
      title: "Objeção de preço — ancore no ROI",
      body: `Nunca dê desconto como primeiro recurso — isso desvaloriza a oferta. Use a técnica de ancoragem: mostre o custo do problema atual vs. o investimento na solução. ${isHighValue ? "Oferta de alto valor — reforce exclusividade e resultado garantido." : ""}`,
      tag: "Técnica: Ancoragem de valor",
      cta: `${firstName}, entendo! Mas me deixa te mostrar uma coisa: quanto você estima que perde por mês com esse problema hoje? Porque o retorno dos nossos clientes é em média 3x o investimento nos primeiros 60 dias.`,
    });
  }

  if (isTimeObj) {
    insights.push({
      type: "objection",
      priority: "medium",
      title: "Objeção de prazo — crie urgência real",
      body: `${contactName} perguntou sobre tempo. Use isso a seu favor: mostre que o onboarding é rápido E crie urgência com uma oferta ou data limite genuína.`,
      tag: "Gatilho: Urgência + Velocidade",
      cta: `Boa pergunta ${firstName}! A implantação leva menos de 24h — você já estaria operando amanhã. E olha: tenho uma condição especial só até sexta-feira. Quer que eu monte uma proposta personalizada pra você agora?`,
    });
  }

  if (isCompetitor) {
    insights.push({
      type: "objection",
      priority: "high",
      title: "Comparação com concorrente — diferencie-se",
      body: `${contactName} está avaliando alternativas. Não critique concorrentes — mostre o que APENAS você oferece. Use a técnica "único mecanismo": o que só você tem que resolve o problema de forma única?`,
      tag: "Técnica: Único mecanismo",
      cta: `Ótimo que você esteja pesquisando ${firstName}! A maioria dos sistemas resolvem o básico. O que nos diferencia é [diferencial único]. Você já avaliou isso nos outros? Porque a diferença de resultado é grande.`,
    });
  }

  /* ── 3. Dor identificada ────────────────────────────────── */
  if (hasPain && !isBuying) {
    insights.push({
      type: "strategy",
      priority: "medium",
      title: "Dor identificada — amplifique antes de oferecer",
      body: `${contactName} sinalizou um problema concreto. Antes de apresentar a solução, aprofunde a dor (Implication) — faça ${firstName} sentir o peso do problema não resolvido. Copy de resposta direta: dor → agitação → solução.`,
      tag: "Framework: PAS (Problema-Agitação-Solução)",
      cta: `E quanto tempo você já está lidando com isso ${firstName}? Imagino que deve ser bem desgastante. Nossos clientes que chegaram com essa mesma situação resolveram em menos de 2 semanas com a gente.`,
    });
  }

  /* ── 4. Estratégia de canal ─────────────────────────────── */
  if (noOut && inMessages.length > 0) {
    insights.push({
      type: "warning",
      priority: "high",
      title: `Sem resposta sua no ${channel === "whatsapp" ? "WhatsApp" : channel === "instagram" ? "Instagram" : "Messenger"}`,
      body: "Você ainda não respondeu. Cada minuto sem resposta aumenta a chance de o lead ir para um concorrente. Responda agora — mesmo uma mensagem curta de acolhimento já quebra o silêncio.",
      tag: "Regra: Velocidade de resposta",
      cta: `Oi ${firstName}! Recebi sua mensagem aqui. Vou te dar atenção completa — pode falar à vontade!`,
    });
  }

  /* ── 5. Estratégia baseada no estágio do funil ───────────── */
  if (dealStage) {
    const stageInsights: Record<string, SalesInsight> = {
      "Novo lead": {
        type: "strategy", priority: "medium",
        title: "Etapa: Novo lead — objetivo é qualificar",
        body: `Nesta fase não venda, qualifique. Descubra: budget, autoridade de decisão, necessidade e prazo (BANT). Uma pergunta aberta resolve isso em 1 mensagem.`,
        tag: "Framework: BANT",
        cta: `${firstName}, pra eu te ajudar melhor: você é o responsável pela decisão? E tem algum prazo em mente pra resolver isso?`,
      },
      "Qualificação": {
        type: "strategy", priority: "medium",
        title: "Etapa: Qualificação — mapeie a necessidade",
        body: `Lead qualificado. Hora de apresentar valor antes do preço. Mostre um caso de sucesso de cliente parecido com ${firstName}.`,
        tag: "Técnica: Social proof",
        cta: `${firstName}, tenho um caso de um cliente no mesmo setor que você que resolveu exatamente isso. Posso compartilhar o resultado?`,
      },
      "Proposta": {
        type: "strategy", priority: "high",
        title: "Etapa: Proposta enviada — siga up!",
        body: `Proposta enviada mas sem resposta é oportunidade em risco. O silêncio pós-proposta precisa de follow-up em até 24h. Use a técnica "estou do seu lado".`,
        tag: "Técnica: Follow-up pós-proposta",
        cta: `Oi ${firstName}! Só passando pra saber se você conseguiu ver a proposta. Tem alguma dúvida? Posso adaptar qualquer parte.`,
      },
      "Negociação": {
        type: "closing", priority: "high",
        title: "Etapa: Negociação — proteja o valor",
        body: `Em negociação: nunca ceda preço sem contrapartida. Se der desconto, peça algo em troca (pagamento à vista, contrato anual, indicação). Mantenha a âncora alta.`,
        tag: "Técnica: Concessão condicionada",
        cta: `${firstName}, posso te ajudar no investimento — mas nesse caso precisaria do plano anual ou pagamento à vista. Funciona pra você?`,
      },
      "Fechamento": {
        type: "closing", priority: "high",
        title: "Etapa: Fechamento — remova o último obstáculo",
        body: `Lead no fechamento. Pergunte diretamente o que falta para assinar. Identifique o último obstáculo e remova-o agora.`,
        tag: "Técnica: Trial close",
        cta: `${firstName}, o que falta pra você se sentir 100% seguro em fechar hoje?`,
      },
    };
    const stageInsight = stageInsights[dealStage];
    if (stageInsight) insights.push(stageInsight);
  }

  /* ── 6. Lead quente de alto valor — atenção máxima ─────── */
  if (isHot && isHighValue && !isBuying) {
    insights.push({
      type: "strategy",
      priority: "high",
      title: `💎 Lead premium — R$ ${dealValue?.toLocaleString("pt-BR") ?? "alto valor"}`,
      body: `Este é um lead de alto valor e alta probabilidade. Não deixe no fluxo comum — personalize o atendimento, ofereça uma demonstração ao vivo ou uma ligação com um especialista sênior.`,
      tag: "Estratégia: White glove",
      cta: `${firstName}, dado o seu perfil, quero que você tenha a melhor experiência possível. Posso te fazer uma demonstração personalizada de 20 minutos com nosso especialista? Qual o melhor horário pra você?`,
    });
  }

  /* ── Ordena por prioridade ─────────────────────────────── */
  const order = { high: 0, medium: 1, low: 2 };
  return insights.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 6);
}
