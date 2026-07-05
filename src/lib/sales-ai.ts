/**
 * Sales AI Engine — Closer Sênior para escola de idiomas (Be Fluent).
 *
 * Frameworks integrados:
 * - Chris Voss (Never Split the Difference): labeling, tactical empathy, mirroring
 * - Alex Hormozi ($100M Offers): value stack, irresistible offer, risk reversal
 * - SPIN Selling (Neil Rackham): Situation → Problem → Implication → Need-payoff
 * - SNAP Selling (Jill Konrath): Simple, iNvaluable, Aligned, Priority
 * - Cialdini: reciprocity, scarcity, social proof, authority, liking, commitment
 * - Jon Benson: VSL structure, benefit-first, immediate CTA
 * - Chris Orlob: deal momentum, multi-threading, champion building
 * - Jordan Belfort: straight line persuasion, certainty transfer
 */

export type InsightType = "interest" | "suggestion" | "objection" | "warning" | "strategy" | "closing";

export interface SalesInsight {
  type: InsightType;
  title: string;
  body: string;
  cta?: string;
  priority: "high" | "medium" | "low";
  tag?: string;
  framework?: string;
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

const BUYING_SIGNALS = [
  "fechado", "vamos", "fechar", "quero", "contratar", "assinar", "renovar",
  "como faço", "qual o próximo passo", "quando começa", "manda o contrato",
  "aceito", "combinado", "pode mandar", "bora", "me manda", "vou fechar",
  "quero começar", "pode confirmar", "quando podemos", "vamos nessa",
];
const PRICE_OBJECTIONS = [
  "caro", "desconto", "preço", "valor", "custo", "orçamento", "cabe no",
  "parcela", "forma de pagamento", "investimento alto", "muito", "salgado",
  "não tenho budget", "não tenho grana", "tá pesado", "é muito",
];
const TIME_OBJECTIONS = [
  "prazo", "quanto tempo", "demora", "urgente", "preciso logo",
  "esta semana", "hoje", "quando começa", "tempo",
];
const POSTPONE_SIGNALS = [
  "depois", "mais tarde", "próximo mês", "ano que vem", "quando der",
  "não é agora", "no futuro", "ainda não", "em breve", "deixa pra depois",
];
const COMPETITOR_SIGS = [
  "outro sistema", "estou vendo", "comparando", "já uso", "estamos avaliando",
  "concorrente", "outra escola", "outro curso", "duolingo", "outro app",
  "preply", "italki", "wizard", "cultura", "fisk", "ccaa",
];
const COLD_SIGNALS = [
  "não sei", "talvez", "vou pensar", "deixa eu ver", "vou analisar",
  "não tenho certeza", "preciso perguntar", "vou ver com",
];
const PAIN_SIGNALS = [
  "problema", "dificuldade", "não consigo", "perco", "perde", "desperdiça",
  "demora muito", "manual", "trabalhoso", "confuso", "trancado", "vergonha",
  "medo", "não falo", "travo", "trave", "erro", "errar", "sotaque",
  "inglês fraco", "básico", "intermediário preso", "não evoluo",
];
const INTEREST_SIGNALS = [
  "interessante", "gostei", "parece bom", "me conta mais", "como funciona",
  "tem mais", "fala mais", "que mais", "adoro", "quero saber", "me interessa",
  "curioso", "qual é a metodologia", "como é a aula",
];
const URGENCY_SIGNALS = [
  "viagem", "entrevista", "promoção", "promoção de emprego", "intercâmbio",
  "reunião", "apresentação", "prazo", "mês que vem", "semana que vem",
  "urgente", "preciso muito", "job", "trabalho", "emprego", "oportunidade",
];
const AUTHORITY_QUESTION = [
  "meu marido", "minha esposa", "meu chefe", "empresa paga", "meu pai",
  "tenho que perguntar", "vou consultar", "não decido sozinho",
];

function detect(text: string, signals: string[]): boolean {
  const t = text.toLowerCase();
  return signals.some((s) => t.includes(s));
}

function detectAll(texts: string[], signals: string[]): boolean {
  return texts.some((t) => detect(t, signals));
}

function detectFirst(texts: string[], signals: string[]): string | null {
  for (const t of texts) {
    const found = signals.find((s) => t.toLowerCase().includes(s));
    if (found) return found;
  }
  return null;
}

/* ── Análise de sentimento simples ────────────────────────── */

function sentimentScore(texts: string[]): number {
  const positive = ["ótimo", "excelente", "perfeito", "adorei", "incrível", "top", "bom", "gosto", "legal", "show", "boa"];
  const negative = ["ruim", "péssimo", "não gostei", "horrível", "problema", "frustr", "chateado", "decepcionado"];
  let score = 0;
  for (const t of texts) {
    const tl = t.toLowerCase();
    for (const p of positive) if (tl.includes(p)) score += 1;
    for (const n of negative) if (tl.includes(n)) score -= 1;
  }
  return score;
}

/* ── Motor principal ──────────────────────────────────────── */

export function analyzeConversation(ctx: ConversationContext): SalesInsight[] {
  const insights: SalesInsight[] = [];
  const {
    contactName, contactScore, dealStage, dealValue,
    inMessages, outMessages, lastInText, lastOutText,
    channel, contactTags,
  } = ctx;

  const firstName    = contactName.split(" ")[0];
  const allInTexts   = inMessages.map((m) => m.text);
  const allOutTexts  = outMessages.map((m) => m.text);
  const noIn         = inMessages.length === 0;
  const noOut        = outMessages.length === 0;
  const msgCount     = inMessages.length + outMessages.length;
  const sentiment    = sentimentScore(allInTexts);
  const chName       = channel === "whatsapp" ? "WhatsApp" : channel === "instagram" ? "Instagram" : "Messenger";

  const isBuying     = detect(lastInText, BUYING_SIGNALS);
  const isPriceObj   = detect(lastInText, PRICE_OBJECTIONS) || detectAll(allInTexts.slice(-3), PRICE_OBJECTIONS);
  const isTimeObj    = detect(lastInText, TIME_OBJECTIONS);
  const isPostpone   = detect(lastInText, POSTPONE_SIGNALS);
  const isCompetitor = detect(lastInText, COMPETITOR_SIGS) || detectAll(allInTexts, COMPETITOR_SIGS);
  const isCold       = detect(lastInText, COLD_SIGNALS);
  const hasPain      = detectAll(allInTexts, PAIN_SIGNALS);
  const isInterested = detect(lastInText, INTEREST_SIGNALS);
  const hasUrgency   = detectAll(allInTexts, URGENCY_SIGNALS);
  const isAuthority  = detect(lastInText, AUTHORITY_QUESTION) || detectAll(allInTexts.slice(-2), AUTHORITY_QUESTION);
  const isHot        = contactScore >= 70 || contactTags.includes("quente");
  const isHighValue  = (dealValue ?? 0) >= 5000;
  const urgencyKw    = detectFirst(allInTexts, URGENCY_SIGNALS);
  const painKw       = detectFirst(allInTexts, PAIN_SIGNALS);

  /* ═══════════════════════════════════════════════════════
   * BLOCO 1 — VELOCIDADE DE RESPOSTA (prioridade máxima)
   * ═════════════════════════════════════════════════════ */

  if (noOut && inMessages.length > 0) {
    insights.push({
      type: "warning",
      priority: "high",
      title: `Sem resposta sua no ${chName}`,
      body: "Você ainda não respondeu. Cada minuto de silêncio aumenta em 10x a probabilidade de o lead ir para um concorrente. A primeira resposta define o tom. Seja humano, rápido e curioso.",
      tag: "Regra: Velocidade de resposta",
      framework: "Chris Voss — Rapport imediato",
      cta: `Oi ${firstName}! Recebi sua mensagem aqui. Vou te dar atenção completa — pode falar à vontade!`,
    });
  }

  if (noIn && !noOut) {
    insights.push({
      type: "warning",
      priority: "high",
      title: "Lead sem resposta — reative agora",
      body: `${firstName} ainda não respondeu. Leads sem follow-up nas primeiras 5 min têm 80% menos chance de converter (MIT Lead Response Study). Use a técnica de "rotulagem" de Voss: nomeie o estado emocional possível do lead.`,
      tag: "Regra: Follow-up urgente",
      framework: "Chris Voss — Tactical Labeling",
      cta: `Oi ${firstName}! Imagino que você deve estar bem ocupado hoje. Se quiser, posso te mandar um resumo rápido de como funciona aqui — fica mais fácil de ver quando der! 😊`,
    });
  }

  /* ═══════════════════════════════════════════════════════
   * BLOCO 2 — SINAL DE FECHAMENTO (ganhe agora)
   * ═════════════════════════════════════════════════════ */

  if (isBuying) {
    insights.push({
      type: "closing",
      priority: "high",
      title: "🔥 Sinal de fechamento — aja AGORA",
      body: `${firstName} demonstrou intenção clara de compra. Não dê mais opções nem mais informações — isso só cria dúvida. Aplique o "Straight Line" de Belfort: conduza direto ao próximo passo concreto. Qualquer hesitação sua neste momento vai esfriar o lead.`,
      tag: "Técnica: Assumir o sim",
      framework: "Jordan Belfort — Straight Line Persuasion",
      cta: `Perfeito ${firstName}! Fico muito feliz! Só preciso de dois segundos: qual o melhor e-mail pra eu enviar o contrato agora? Assim você já começa ainda essa semana. 🎯`,
    });
  }

  /* ═══════════════════════════════════════════════════════
   * BLOCO 3 — OBJEÇÕES (resolva com precisão cirúrgica)
   * ═════════════════════════════════════════════════════ */

  if (isPriceObj) {
    insights.push({
      type: "objection",
      priority: "high",
      title: "Objeção de preço — NUNCA dê desconto direto",
      body: `"Caro" quase sempre significa "ainda não enxerguei o valor". Use a ancoragem de Hormozi: empilhe o valor antes de mencionar preço. Mostre o custo de NÃO resolver: quanto vale um ano de fluência no trabalho de ${firstName}? Compare com o custo do método. Só dê desconto como ÚLTIMA opção e exija contrapartida (pagamento à vista, indicação, plano anual).`,
      tag: "Técnica: Ancoragem de valor",
      framework: "Alex Hormozi — Value Stack",
      cta: `${firstName}, entendo que você quer ter certeza que vale o investimento. Me deixa te mostrar: em 6 meses de aula você vai poder [resultado concreto: negociar em inglês / viajar com confiança / garantir a promoção]. Quanto você acha que isso vale pra sua carreira? Porque o investimento aqui é muito menos que isso.`,
    });
  }

  if (isTimeObj) {
    insights.push({
      type: "objection",
      priority: "medium",
      title: "Objeção de prazo — transforme em urgência",
      body: `${firstName} perguntou sobre tempo. Isso é uma oportunidade, não um obstáculo. Alunos que têm prazo (viagem, entrevista, promoção) são os que mais se comprometem. Mostre que o início é imediato e use o prazo DELES como âncora de urgência.`,
      tag: "Gatilho: Urgência do próprio lead",
      framework: "SNAP Selling — Priority",
      cta: `Boa pergunta ${firstName}! Você começa na semana que vem — as primeiras aulas já mostram diferença. E olha: com o prazo que você mencionou, cada semana que você espera é uma semana a menos de preparação. Vamos começar logo pra você chegar preparado?`,
    });
  }

  if (isPostpone) {
    insights.push({
      type: "warning",
      priority: "high",
      title: "Lead postergando — crie custo de espera",
      body: `"Depois" é onde os sonhos morrem. ${firstName} está postergando porque não sente urgência REAL. Aplique a técnica de "custo de inação": calcule concretamente o que cada mês de espera custa (oportunidades perdidas, tempo sem progresso). Hormozi: "O pior momento pra plantar uma árvore foi há 20 anos. O segundo melhor é hoje."`,
      tag: "Técnica: Custo de inação",
      framework: "Alex Hormozi — Urgency without manipulation",
      cta: `${firstName}, respeito sua decisão. Só queria te fazer uma pergunta sincera: se daqui a 6 meses você ainda não tiver o inglês que quer, como você vai se sentir? Porque posso te dizer que a maioria dos alunos que mais se arrependem são os que esperaram mais tempo. O melhor momento é agora — o segundo melhor é amanhã.`,
    });
  }

  if (isCompetitor) {
    insights.push({
      type: "objection",
      priority: "high",
      title: "Comparação com concorrente — mostre o mecanismo único",
      body: `Não ataque concorrentes — isso diminui você. Em vez disso, use o "Unique Mechanism" de Hormozi: explique POR QUE a metodologia da Be Fluent produz resultados que outros não conseguem. Foque em conversação real, imersão e velocidade de fluência vs. gramática decorada.`,
      tag: "Técnica: Único mecanismo",
      framework: "Alex Hormozi — Unique Mechanism",
      cta: `Ótimo que você esteja pesquisando ${firstName}! A diferença da Be Fluent não é só o conteúdo — é a metodologia de imersão conversacional. A maioria das escolas te ensina inglês como matéria. A gente te ensina inglês como idioma vivido. Você consegue comparar isso com o que você está vendo?`,
    });
  }

  if (isCold) {
    insights.push({
      type: "warning",
      priority: "high",
      title: "Lead hesitando — descubra o obstáculo real",
      body: `"Vou pensar" raramente é sobre o produto. É sobre incerteza, medo de erro ou falta de clareza. Voss: use uma pergunta calibrada ("Como posso te ajudar a se sentir mais seguro?") em vez de pressão. O objetivo é nomear a resistência para dissolvê-la.`,
      tag: "Técnica: Pergunta calibrada",
      framework: "Chris Voss — Calibrated Questions",
      cta: `Entendo ${firstName}, sem pressão alguma. Me ajuda a entender: o que faria você se sentir mais seguro para tomar essa decisão? Tem alguma dúvida específica que eu posso resolver agora?`,
    });
  }

  if (isAuthority) {
    insights.push({
      type: "strategy",
      priority: "high",
      title: "Decisor externo — envolva o influenciador",
      body: `${firstName} precisa consultar outra pessoa. Não espere passivamente — peça para incluir o decisor agora. Use a técnica de "multi-threading" de Chris Orlob: tente falar diretamente com quem decide. Se não for possível, equipe ${firstName} para vender internamente.`,
      tag: "Técnica: Multi-threading",
      framework: "Chris Orlob — Champion Building",
      cta: `Claro ${firstName}! Você acha que eu poderia falar com ele/ela também? Ou se preferir, posso te mandar um resumo bem direto com os pontos principais pra você mostrar — fica muito mais fácil de explicar. O que funciona melhor pra vocês?`,
    });
  }

  /* ═══════════════════════════════════════════════════════
   * BLOCO 4 — DOR IDENTIFICADA
   * ═════════════════════════════════════════════════════ */

  if (hasPain && !isBuying) {
    const painLabel = painKw
      ? `a dificuldade com "${painKw}"`
      : "o problema que você mencionou";
    insights.push({
      type: "strategy",
      priority: "medium",
      title: "Dor identificada — amplifique antes de oferecer",
      body: `${firstName} sinalizou ${painLabel}. NUNCA salte para a solução ainda — aprofunde a dor (Implication no SPIN). Faça ${firstName} sentir o peso do problema sem resolver. Só depois apresente a solução como alívio inevitável. Sequência: dor → agitação → solução → transformação.`,
      tag: "Framework: PAS + SPIN Implication",
      framework: "Neil Rackham — SPIN Implication",
      cta: `${firstName}, faz quanto tempo você está lidando com isso? Eu imagino que deve ser bem frustrante [situação específica]. Os nossos alunos que chegaram com a mesma situação contam que foi transformador quando conseguiram [resultado]. Quer que eu te explique como funciona?`,
    });
  }

  /* ═══════════════════════════════════════════════════════
   * BLOCO 5 — URGÊNCIA REAL DO LEAD
   * ═════════════════════════════════════════════════════ */

  if (hasUrgency && !isBuying) {
    const urgencyLabel = urgencyKw ?? "prazo importante";
    insights.push({
      type: "closing",
      priority: "high",
      title: `Urgência real detectada — ${urgencyLabel}`,
      body: `${firstName} tem um evento real com prazo (${urgencyLabel}). Isso é ouro: a urgência JÁ EXISTE, você só precisa conectá-la à solução. Use o prazo DELES para criar momentum de decisão. SNAP Selling: torne sua oferta a PRIORIDADE lógica dado o prazo.`,
      tag: "Gatilho: Urgência autêntica",
      framework: "SNAP Selling — Priority + Cialdini Scarcity",
      cta: `${firstName}, com ${urgencyLabel} em vista, cada semana que você esperar vai fazer diferença. Nossos alunos com prazo similar evoluíram muito mais rápido justamente pela urgência. Vamos garantir sua vaga agora pra você aproveitar ao máximo o tempo que tem?`,
    });
  }

  /* ═══════════════════════════════════════════════════════
   * BLOCO 6 — INTERESSE / CURIOSIDADE
   * ═════════════════════════════════════════════════════ */

  if (isInterested && !isBuying) {
    insights.push({
      type: "interest",
      priority: "medium",
      title: "Lead aquecendo — use SPIN para aprofundar",
      body: `${firstName} está engajado e curioso. É o momento perfeito para usar a sequência SPIN: descubra a Situação atual, mapeie o Problema, expanda as Implicações e mostre a Necessidade de solução. Uma boa pergunta aqui vale 10 argumentos de venda.`,
      tag: "Técnica: SPIN Selling",
      framework: "Neil Rackham — SPIN Need-payoff",
      cta: `Que ótimo ${firstName}! Me conta uma coisa: em que situação você mais sente falta do inglês no dia a dia? No trabalho, nas viagens, nas redes sociais? Quero entender exatamente onde você quer chegar.`,
    });
  }

  /* ═══════════════════════════════════════════════════════
   * BLOCO 7 — ESTRATÉGIA DE ETAPA DO FUNIL
   * ═════════════════════════════════════════════════════ */

  if (dealStage) {
    const stageLow = dealStage.toLowerCase();

    if (stageLow.includes("novo") || stageLow.includes("new") || stageLow.includes("inicial")) {
      insights.push({
        type: "strategy",
        priority: "medium",
        title: "Etapa: Novo lead — qualifique com BANT",
        body: `Nesta fase: NÃO venda. Qualifique. Descubra Budget (quanto pode investir), Authority (decide sozinho?), Need (qual a dor real?) e Timeline (quando quer resolver?). Uma pergunta aberta bem feita resolve em 1 mensagem. Cialdini: estabeleça reciprocidade — dê algo de valor primeiro.`,
        tag: "Framework: BANT",
        framework: "Cialdini — Reciprocity + BANT",
        cta: `${firstName}, pra eu te ajudar da melhor forma: você pensa em começar as aulas em breve ou ainda está só pesquisando? E tem algum objetivo específico — trabalho, viagem, promoção?`,
      });
    } else if (stageLow.includes("qualif")) {
      insights.push({
        type: "strategy",
        priority: "medium",
        title: "Etapa: Qualificação — social proof cirúrgico",
        body: `Lead qualificado. Hora de apresentar valor antes de preço. Use prova social específica: cases de alunos com perfil SIMILAR ao de ${firstName} (mesma faixa de nível, mesmo objetivo). Especificidade vende mais que generalidade.`,
        tag: "Técnica: Social proof específico",
        framework: "Cialdini — Social Proof + Authority",
        cta: `${firstName}, tenho um caso de uma aluna que chegou no mesmo nível que você e em 4 meses já estava conduzindo reuniões em inglês. Posso te contar como foi a jornada dela?`,
      });
    } else if (stageLow.includes("proposta") || stageLow.includes("proposal")) {
      insights.push({
        type: "strategy",
        priority: "high",
        title: "Etapa: Proposta enviada — follow-up em 24h",
        body: `Proposta enviada sem resposta = oportunidade em risco. O silêncio pós-proposta NÃO é decisão — é indecisão. Use a técnica de Voss: "Parece que você ainda está avaliando" — labeling que convida o lead a revelar a real objeção.`,
        tag: "Técnica: Tactical Empathy",
        framework: "Chris Voss — Labeling + Follow-up",
        cta: `Oi ${firstName}! Imagino que você deve ter muita coisa pra decidir nessa época. Teve alguma parte da proposta que ficou com dúvida? Posso ajustar qualquer coisa pra ficar mais fácil.`,
      });
    } else if (stageLow.includes("negoc")) {
      insights.push({
        type: "closing",
        priority: "high",
        title: "Etapa: Negociação — proteja o valor",
        body: `Em negociação: NUNCA ceda preço sem contrapartida. Voss: use "Como posso fazer isso funcionar pra você?" — transfere a criatividade ao lead. Se der desconto, exija: pagamento à vista, plano anual ou indicação de amigo. Mantenha a âncora alta.`,
        tag: "Técnica: Concessão condicionada",
        framework: "Chris Voss — Ackerman Bargaining",
        cta: `${firstName}, quero muito que você entre. Posso ver o que consigo fazer, mas nesse caso precisaria do plano anual ou pagamento à vista. Funciona pra você? Porque aí consigo um valor especial.`,
      });
    } else if (stageLow.includes("fecha") || stageLow.includes("close")) {
      insights.push({
        type: "closing",
        priority: "high",
        title: "Etapa: Fechamento — remova o último obstáculo",
        body: `Lead no fechamento. Use o "trial close" de Belfort: pergunte diretamente o que impede o sim. Identifique o último obstáculo e elimine agora. Cialdini — Commitment: pequenas confirmações progressivas levam ao grande sim.`,
        tag: "Técnica: Trial close",
        framework: "Jordan Belfort — Straight Line + Cialdini Commitment",
        cta: `${firstName}, o que falta pra você se sentir 100% seguro em começar hoje? Me fala o que está passando na sua cabeça que eu resolvo agora.`,
      });
    } else if (stageLow.includes("follow") || stageLow.includes("banho")) {
      insights.push({
        type: "strategy",
        priority: "medium",
        title: "Etapa: Follow-up — mantenha o contato vivo",
        body: `Lead em "banho-maria" não é lead perdido — é lead que precisa de contexto novo. Volte com algo de VALOR (artigo, insight, resultado de aluno) antes de fazer nova oferta. Cialdini: reciprocidade cria obrigação psicológica de retorno.`,
        tag: "Técnica: Value-first re-engagement",
        framework: "Cialdini — Reciprocity",
        cta: `Oi ${firstName}! Sei que você estava avaliando. Queria compartilhar algo que achei que pode te interessar: [resultado de aluno / dica rápida de inglês]. Temos novidade também nas turmas — posso te contar?`,
      });
    }
  }

  /* ═══════════════════════════════════════════════════════
   * BLOCO 8 — LEAD PREMIUM (alto valor / hot)
   * ═════════════════════════════════════════════════════ */

  if (isHot && isHighValue && !isBuying) {
    insights.push({
      type: "strategy",
      priority: "high",
      title: `💎 Lead premium — tratamento VIP`,
      body: `Lead de alto score e alto valor. NÃO trate como lead comum — personalize completamente. Ofereça: trial de aula, reunião com responsável, proposta personalizada. Hormozi: para leads premium, o atendimento EM SI já faz parte da oferta. Saia do script.`,
      tag: "Estratégia: White glove",
      framework: "Alex Hormozi — Grand Slam Offer para leads VIP",
      cta: `${firstName}, dado o seu perfil, quero que você tenha a melhor experiência possível antes de qualquer decisão. Posso te oferecer uma aula experimental gratuita com um dos nossos melhores professores? Sem compromisso — você conhece a metodologia na prática.`,
    });
  }

  /* ═══════════════════════════════════════════════════════
   * BLOCO 9 — ENGAJAMENTO GERAL
   * ═════════════════════════════════════════════════════ */

  if (inMessages.length > 0 && !isBuying && !isPriceObj && !isCompetitor && !isCold && !isInterested && !hasPain) {
    const sentLabel = sentiment > 1 ? "positivo" : sentiment < -1 ? "negativo" : "neutro";
    insights.push({
      type: "interest",
      priority: "low",
      title: `Engajamento ${sentLabel} — score ${contactScore} pts`,
      body: `${firstName} tem ${inMessages.length} mensagem${inMessages.length > 1 ? "s" : ""} nesta conversa. ${contactScore >= 60 ? "Score alto — avance para qualificação profunda." : contactScore >= 40 ? "Score médio — explore dores e objetivos." : "Score baixo — construa rapport antes de qualificar."}`,
      tag: contactScore >= 60 ? "Status: Pronto para qualificação" : "Status: Construindo rapport",
    });
  }

  /* ═══════════════════════════════════════════════════════
   * ORDENA e limita
   * ═════════════════════════════════════════════════════ */

  const order = { high: 0, medium: 1, low: 2 };
  return insights
    .sort((a, b) => order[a.priority] - order[b.priority])
    .slice(0, 5);
}
