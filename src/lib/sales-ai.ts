/**
 * Sales AI Engine v2 — Closer Sênior Be Fluent School
 *
 * Frameworks: Chris Voss · Alex Hormozi · SPIN Selling · SNAP Selling
 * Cialdini · Jordan Belfort · Chris Orlob · Jeb Blount · Sandler
 */

export type InsightType = "interest" | "suggestion" | "objection" | "warning" | "strategy" | "closing";

export interface SalesInsight {
  type:      InsightType;
  title:     string;
  body:      string;
  cta?:      string;
  priority:  "high" | "medium" | "low";
  tag?:      string;
  framework?: string;
}

export interface ConversationContext {
  contactName:   string;
  contactScore:  number;
  contactSource: string;
  contactTags:   string[];
  dealStage?:    string;
  dealValue?:    number;
  totalMessages: number;
  inMessages:    { text: string; time: string }[];
  outMessages:   { text: string; time: string }[];
  lastInText:    string;
  lastOutText:   string;
  channel:       "whatsapp" | "instagram" | "messenger";
}

/* ── Sinais de linguagem ────────────────────────────────────── */

const BUYING_SIGNALS = [
  "fechado","vamos fechar","quero contratar","assinar","renovar","como faço para começar",
  "qual o próximo passo","quando começa","manda o contrato","aceito","combinado",
  "pode mandar","bora","me manda","vou fechar","quero começar","pode confirmar",
  "quando podemos","vamos nessa","tô dentro","bora começar","fecha","quero sim",
  "me manda o link","qual o pix","como pago","forma de pagamento","vai","topo",
];
const PRICE_OBJECTIONS = [
  "caro","desconto","preço","valor","custo","orçamento","cabe no",
  "parcela","forma de pagamento","muito","salgado","não tenho budget",
  "não tenho grana","tá pesado","é muito","tá caro","fica caro","pesado",
  "não consigo pagar","não tenho dinheiro","acima do meu orçamento",
];
const TIME_OBJECTIONS = [
  "não tenho tempo","muito ocupado","sem tempo","agenda cheia","corrido",
  "difícil encaixar","minha rotina","não tenho horário",
];
const DEADLINE_URGENCY = [
  "viagem","entrevista de emprego","promoção","intercâmbio","reunião importante",
  "apresentação","semana que vem","mês que vem","urgente","preciso logo",
  "prazo","job","nova vaga","emprego novo","mudança de carreira",
];
const POSTPONE_SIGNALS = [
  "depois","mais tarde","próximo mês","ano que vem","quando der",
  "não é agora","no futuro","ainda não","em breve","deixa pra depois",
  "vou pensar mais","não agora","talvez mais tarde",
];
const COMPETITOR_SIGS = [
  "outra escola","outro curso","wizard","cultura inglesa","fisk","ccaa","yazigi",
  "duolingo","babbel","preply","italki","stooa","english live","open english",
  "estou vendo outras","comparando","analisando outras opções","mais barato lá",
];
const COLD_SIGNALS = [
  "não sei","talvez","vou pensar","deixa eu ver","vou analisar",
  "não tenho certeza","preciso perguntar","vou ver com","deixa ver",
  "ainda em dúvida","não decidi","vou verificar",
];
const PAIN_SIGNALS = [
  "vergonha de falar","trao","travo","travar","não consigo falar","fico nervoso",
  "não evoluo","não avança","anos estudando","não sai do básico","não sai do lugar",
  "perco oportunidade","perdi promoção","barreira","bloqueio","inglês fraco",
  "intermediário preso","não consigo me comunicar","entendo mas não falo",
  "curso que não funcionou","escola que não deu resultado","perdi dinheiro",
];
const INTEREST_SIGNALS = [
  "interessante","gostei","parece bom","me conta mais","como funciona",
  "tem mais","fala mais","que mais","adoro","quero saber","me interessa",
  "curioso","qual é a metodologia","como é a aula","quantas aulas",
  "qual o nível","tem turma","quando tem","tem horário",
];
const AUTHORITY_QUESTION = [
  "meu marido","minha esposa","meu chefe","empresa paga","meu pai","minha mãe",
  "tenho que perguntar","vou consultar","não decido sozinho","preciso falar com",
  "meu sócio","minha parceira","depende do meu",
];
const FRUSTRATION_SIGNALS = [
  "já tentei","não funciona","não adiantou","desperdicei dinheiro","já paguei",
  "já fiz curso","não deu certo","decepcionei","frustrado","perdi tempo",
];
const POSITIVE_ENGAGE = [
  "ótimo","excelente","perfeito","adorei","incrível","top","show","boa","legal",
  "gostei muito","muito bom","maravilhoso","sensacional","que bacana","que legal",
];
const NEGATIVE_ENGAGE = [
  "ruim","horrível","não gostei","péssimo","chateado","decepcionado","frustrado",
];

/* ── Helpers ────────────────────────────────────────────────── */

function detect(text: string, sigs: string[]): boolean {
  const t = text.toLowerCase();
  return sigs.some((s) => t.includes(s));
}
function detectAll(texts: string[], sigs: string[]): boolean {
  return texts.some((t) => detect(t, sigs));
}
function detectFirst(texts: string[], sigs: string[]): string | null {
  for (const t of texts) {
    const found = sigs.find((s) => t.toLowerCase().includes(s));
    if (found) return found;
  }
  return null;
}
function sentiment(texts: string[]): number {
  let s = 0;
  for (const t of texts) {
    const tl = t.toLowerCase();
    for (const p of POSITIVE_ENGAGE) if (tl.includes(p)) s++;
    for (const n of NEGATIVE_ENGAGE) if (tl.includes(n)) s--;
  }
  return s;
}

/* ── Analisador de temperatura da conversa ─────────────────── */

function convTemp(inMsgs: { text: string }[], outMsgs: { text: string }[]): "🔥 Quente" | "🟡 Morno" | "❄️ Frio" {
  const allIn = inMsgs.map((m) => m.text);
  if (detectAll(allIn, BUYING_SIGNALS)) return "🔥 Quente";
  if (detectAll(allIn, INTEREST_SIGNALS) || detectAll(allIn, DEADLINE_URGENCY)) return "🟡 Morno";
  if (detectAll(allIn, POSTPONE_SIGNALS) || detectAll(allIn, COLD_SIGNALS)) return "❄️ Frio";
  if (outMsgs.length > 0 && inMsgs.length === 0) return "❄️ Frio";
  return inMsgs.length > 2 ? "🟡 Morno" : "❄️ Frio";
}

/* ── Motor principal ────────────────────────────────────────── */

export function analyzeConversation(ctx: ConversationContext): SalesInsight[] {
  const insights: SalesInsight[] = [];
  const {
    contactName, contactScore, dealStage, dealValue,
    inMessages, outMessages, lastInText,
    channel, contactTags,
  } = ctx;

  const fn         = contactName.split(" ")[0];
  const allIn      = inMessages.map((m) => m.text);
  const allOut     = outMessages.map((m) => m.text);
  const noIn       = inMessages.length === 0;
  const noOut      = outMessages.length === 0;
  const chName     = channel === "whatsapp" ? "WhatsApp" : channel === "instagram" ? "Instagram" : "Messenger";
  const temp       = convTemp(inMessages, outMessages);
  const sentScore  = sentiment(allIn);

  // Detecções
  const isBuying     = detect(lastInText, BUYING_SIGNALS) || detectAll(allIn.slice(-2), BUYING_SIGNALS);
  const isPriceObj   = detect(lastInText, PRICE_OBJECTIONS) || detectAll(allIn.slice(-3), PRICE_OBJECTIONS);
  const isTimeObj    = detect(lastInText, TIME_OBJECTIONS);
  const isPostpone   = detect(lastInText, POSTPONE_SIGNALS);
  const isCompetitor = detectAll(allIn, COMPETITOR_SIGS);
  const isCold       = detect(lastInText, COLD_SIGNALS) && !isBuying;
  const hasPain      = detectAll(allIn, PAIN_SIGNALS);
  const isInterested = detect(lastInText, INTEREST_SIGNALS) && !isBuying;
  const hasDeadline  = detectAll(allIn, DEADLINE_URGENCY);
  const isAuthority  = detectAll(allIn.slice(-3), AUTHORITY_QUESTION);
  const isFrustrated = detectAll(allIn, FRUSTRATION_SIGNALS);
  const isHot        = contactScore >= 70 || contactTags.includes("quente") || temp === "🔥 Quente";
  const isHighValue  = (dealValue ?? 0) >= 3000;
  const deadlineKw   = detectFirst(allIn, DEADLINE_URGENCY);
  const painKw       = detectFirst(allIn, PAIN_SIGNALS);
  const msgRatio     = outMessages.length > 0 ? inMessages.length / outMessages.length : 0;

  /* ═══ ALERTA MÁXIMO: sem nenhuma resposta sua ══════════════ */
  if (noOut && inMessages.length >= 1) {
    const minutesSince = (() => {
      const lastTs = inMessages[inMessages.length - 1]?.time;
      if (!lastTs) return 0;
      const [h, m] = lastTs.split(":").map(Number);
      const now = new Date();
      return Math.max(0, (now.getHours() * 60 + now.getMinutes()) - (h * 60 + m));
    })();

    insights.push({
      type:      "warning",
      priority:  "high",
      title:     `🚨 Sem resposta — ${minutesSince > 0 ? `${minutesSince} min sem retorno` : "responda agora"}`,
      body:      `${fn} está esperando. Estudos do MIT mostram que responder nos primeiros 5 minutos aumenta em 21x a chance de conversão. Após 30 min, cai 100x. Não perca esse lead para um concorrente que responde mais rápido. Primeira mensagem deve ser curta, humana e com pergunta para manter engajamento.`,
      tag:       "⚡ Velocidade de resposta",
      framework: "MIT Lead Response Study + Chris Voss — First Contact",
      cta:       `Oi ${fn}! 😊 Recebi sua mensagem aqui. Posso te ajudar agora — me conta um pouco mais sobre o que você está buscando?`,
    });
  }

  /* ═══ LEAD SEM RESPOSTA (você mandou, ele sumiu) ══════════ */
  if (noIn && !noOut) {
    const lastOutMsg = allOut[allOut.length - 1] ?? "";
    const wasShortMsg = lastOutMsg.length < 40;
    insights.push({
      type:      "warning",
      priority:  "high",
      title:     "📵 Lead silencioso — reative com nova abordagem",
      body:      `${fn} leu mas não respondeu. Isso quase nunca é rejeição — é inércia. Use a técnica de "rotulagem negativa" de Voss: diga o oposto do que quer ouvir para provocar reação. ${wasShortMsg ? "Sua última mensagem foi muito curta — talvez não tenha dado motivo suficiente para responder." : "Tente uma abordagem diferente, mais leve e sem pressão."}`,
      tag:       "Técnica: Labeling reverso",
      framework: "Chris Voss — Negative Labeling",
      cta:       `Oi ${fn}! Imagino que talvez não seja o momento certo pra você. Tudo bem — só não queria que você perdesse a chance de mudar o seu inglês de vez. Se quiser, posso te mandar algo rápido que pode mudar sua perspectiva. 😊`,
    });
  }

  /* ═══ SINAL DE FECHAMENTO ═════════════════════════════════ */
  if (isBuying) {
    insights.push({
      type:      "closing",
      priority:  "high",
      title:     "🔥 FECHAR AGORA — sinal claro de compra",
      body:      `${fn} está pronto para comprar. PARE de dar informações — cada palavra extra cria dúvida nova. Aplique o "Assumptive Close" de Belfort: aja COMO SE já estivesse fechado e leve diretamente ao próximo passo (dados para contrato, link de pagamento). Silêncio após a CTA é sinal de processamento — não quebre o silêncio.`,
      tag:       "🎯 Assumptive Close",
      framework: "Jordan Belfort — Straight Line + Assumptive Close",
      cta:       `Perfeito, ${fn}! Fico muito feliz em ter você aqui. 🎉 Só preciso de dois dados rápidos: qual o melhor e-mail e o seu nome completo? Já preparo tudo pra você começar ainda essa semana.`,
    });
  }

  /* ═══ OBJEÇÃO DE PREÇO ════════════════════════════════════ */
  if (isPriceObj && !isBuying) {
    const valueAnchor = isHighValue
      ? "Considere que profissionais com inglês fluente ganham em média 61% a mais (FGV 2023)."
      : "Uma aula de inglês aqui custa menos que um jantar fora — mas o retorno é para a vida toda.";
    insights.push({
      type:      "objection",
      priority:  "high",
      title:     "💰 Objeção de preço — NUNCA dê desconto direto",
      body:      `"Caro" = "não vi o valor ainda". Sequência Hormozi: (1) Reconheça sem concordar. (2) Apresente o custo de NÃO resolver — quanto ${fn} perde por não ter inglês hoje? (3) Empilhe o valor do pacote (aulas + suporte + material + resultado garantido). (4) Só dê desconto como última saída com contrapartida obrigatória. ${valueAnchor}`,
      tag:       "Técnica: Value Stack + Ancoragem",
      framework: "Alex Hormozi — $100M Offers Value Stack",
      cta:       `${fn}, entendo que você quer ter certeza que vale. Me deixa te perguntar: hoje, quantas oportunidades você sente que perde por não ter o inglês fluente? [aguarda resposta] Porque o que a gente oferece não é um curso — é o resultado. E o investimento é muito menor que o custo de continuar parado.`,
    });
  }

  /* ═══ OBJEÇÃO DE TEMPO ════════════════════════════════════ */
  if (isTimeObj && !isBuying) {
    insights.push({
      type:      "objection",
      priority:  "high",
      title:     "⏰ Objeção de tempo — ressignifique a agenda",
      body:      `Falta de tempo é falta de prioridade, não de horas. Não tente convencer que "é rápido" — isso soa como desculpa. Em vez disso, use SPIN: ajude ${fn} a perceber o custo de NÃO priorizar. Sandler: descubra se é objeção real ou smokescreen de outra dúvida. Pergunte: "O que você faria diferente se tivesse o inglês hoje?"`,
      tag:       "Técnica: Reframe de prioridade",
      framework: "Sandler Selling + SPIN Implication",
      cta:       `${fn}, eu ouço muito isso! Mas deixa eu te perguntar uma coisa: se eu te dissesse que com 3h por semana você já consegue resultado real em 4 meses — isso caberia na sua agenda? Porque a maioria dos nossos alunos mais ocupados são os que mais evoluem, justamente porque são focados.`,
    });
  }

  /* ═══ CONCORRENTE ═════════════════════════════════════════ */
  if (isCompetitor) {
    insights.push({
      type:      "objection",
      priority:  "high",
      title:     "⚔️ Comparando concorrentes — posicione o mecanismo único",
      body:      `Não ataque a concorrência — isso diminui você e parece desespero. Posicione a Be Fluent como categoria diferente usando o "Unique Mechanism": explique o mecanismo que faz alunos fluentes mais rápido (imersão conversacional vs gramática decorada). Use prova social específica: aluno que foi de básico a fluente em X meses. Deixe o lead fazer a comparação mentalmente.`,
      tag:       "Técnica: Category Design",
      framework: "Alex Hormozi — Unique Mechanism + Al Ries Positioning",
      cta:       `Ótimo que você esteja pesquisando! A diferença da Be Fluent não é só conteúdo. A maioria das escolas te ensina inglês como matéria. A gente te ensina inglês como comunicação real. Temos alunos que foram de "básico travado" para fluente em reuniões em menos de 6 meses. Posso te contar como funciona a metodologia?`,
    });
  }

  /* ═══ POSTERGAÇÃO ═════════════════════════════════════════ */
  if (isPostpone && !isBuying) {
    insights.push({
      type:      "warning",
      priority:  "high",
      title:     "📅 Postergando — crie urgência real sem manipular",
      body:      `"Depois" mata mais vendas do que "não". O lead não decidiu contra — decidiu para mais tarde, e mais tarde nunca chega. Técnica de Hormozi: calcule o custo de espera em termos concretos (meses sem progresso = X meses que poderiam estar no caminho da fluência). Crie escassez legítima (vagas de turma, preço vigente). NÃO invente urgência falsa.`,
      tag:       "Técnica: Cost of Inaction",
      framework: "Alex Hormozi — COI + Cialdini Scarcity (autêntica)",
      cta:       `${fn}, respeito totalmente. Só quero te deixar com uma reflexão: daqui a 6 meses, onde você quer estar com seu inglês? Porque os alunos que mais se arrependem são os que esperaram mais tempo do que precisavam. As vagas da próxima turma estão preenchendo — posso te reservar uma por 48h enquanto você decide?`,
    });
  }

  /* ═══ LEAD HESITANTE (vou pensar) ════════════════════════ */
  if (isCold && !isPostpone) {
    insights.push({
      type:      "warning",
      priority:  "high",
      title:     "🤔 Lead em dúvida — descubra o obstáculo real",
      body:      `"Vou pensar" raramente é sobre o produto. É medo de errar, incerteza, ou uma objeção não dita. Voss: use pergunta calibrada para trazer a objeção à superfície. NÃO pressione — isso aprofunda a resistência. Objetivo: tornar seguro para ${fn} dizer qual é a dúvida real. Quando a objeção sai, você pode trabalhar nela.`,
      tag:       "Técnica: Pergunta calibrada",
      framework: "Chris Voss — Calibrated Questions + Sandler Pain Funnel",
      cta:       `${fn}, sem pressão nenhuma! Só queria entender melhor: o que faria você se sentir 100% confiante para tomar essa decisão? Tem alguma dúvida específica que ficou — sobre a metodologia, os resultados, ou outra coisa?`,
    });
  }

  /* ═══ EXPERIÊNCIA FRUSTRANTE ANTERIOR ════════════════════ */
  if (isFrustrated) {
    insights.push({
      type:      "objection",
      priority:  "high",
      title:     "💔 Já foi frustrado — valide antes de vender",
      body:      `${fn} já tentou aprender inglês e não funcionou. Isso é uma objeção emocional — a maior barreira não é preço ou tempo, é medo de decepcionar-se de novo. Voss: use "Tactical Empathy" — valide a frustração antes de qualquer argumento. Só depois mostre o que é diferente na Be Fluent. Jamais minimize a experiência anterior.`,
      tag:       "Técnica: Tactical Empathy",
      framework: "Chris Voss — Tactical Empathy + Jeb Blount Emotional Intelligence",
      cta:       `${fn}, faz todo sentido ter essa dúvida — você já investiu antes e não teve o resultado que queria. Isso é frustrante e é legítimo. Me conta: o que te faltou naquela experiência? Pergunto porque é exatamente esses pontos que a nossa metodologia foi construída para resolver.`,
    });
  }

  /* ═══ DECISOR EXTERNO ═════════════════════════════════════ */
  if (isAuthority) {
    insights.push({
      type:      "strategy",
      priority:  "high",
      title:     "👥 Decisor externo — multi-threading agora",
      body:      `${fn} não decide sozinho. Erro fatal: esperar passivamente. Use "Multi-threading" de Orlob: tente envolver o decisor diretamente. Se não for possível, equipe ${fn} com argumentos para "vender internamente". Crie um resumo/material que ${fn} possa usar para convencer o outro. A maioria dos vendedores para aqui — os melhores não.`,
      tag:       "Técnica: Champion Selling",
      framework: "Chris Orlob — Multi-threading + Champion Building",
      cta:       `Claro ${fn}! Uma ideia: você acha que eu poderia falar com ele/ela também, ou fazer uma call rápida juntos? Assim eu respondo qualquer dúvida na hora. Se preferir, posso te mandar um resumo visual, bem direto, que facilita muito mostrar os benefícios. O que funciona melhor pra vocês?`,
    });
  }

  /* ═══ DOR IDENTIFICADA ════════════════════════════════════ */
  if (hasPain && !isBuying) {
    const painLabel = painKw ? `a situação com "${painKw}"` : "o que você descreveu";
    insights.push({
      type:      "strategy",
      priority:  "medium",
      title:     "🎯 Dor mapeada — aprofunde antes de oferecer",
      body:      `${fn} revelou ${painLabel}. REGRA DE OURO: nunca pule para a solução agora. Use SPIN — Implication Questions: faça ${fn} sentir o peso total do problema. "Isso já te custou alguma oportunidade profissional?" "Como você se sente quando precisa falar em inglês e trava?" A dor aprofundada cria desejo genuíno pela solução — não pressão.`,
      tag:       "Framework: PAS + SPIN Implication",
      framework: "Neil Rackham — SPIN Implication + Problem Amplification",
      cta:       `${fn}, faz quanto tempo você convive com isso? Imagino que deva ser bem frustrante, especialmente quando [contexto específico da dor]. Os nossos alunos que chegaram com essa mesma situação dizem que o maior ganho foi a confiança — não só o inglês em si. Posso te mostrar como funciona o processo?`,
    });
  }

  /* ═══ URGÊNCIA REAL (prazo/viagem/emprego) ════════════════ */
  if (hasDeadline && !isBuying) {
    const dl = deadlineKw ?? "prazo";
    insights.push({
      type:      "closing",
      priority:  "high",
      title:     `⏱️ Urgência real: "${dl}" — use o prazo DELES`,
      body:      `${fn} tem um evento real com prazo. Isso é o melhor gatilho de venda existente — a urgência JÁ EXISTE, você só precisa conectá-la à solução. SNAP Selling: torne a decisão a PRIORIDADE lógica dado o contexto. Calcule junto: "Para atingir o nível X até [data], precisamos começar no máximo até [data - X semanas]."`,
      tag:       "Gatilho: Urgência autêntica do lead",
      framework: "SNAP Selling — Priority + Jill Konrath Framing",
      cta:       `${fn}, com ${dl} em vista, o tempo realmente importa. Nossos alunos que começam com prazo definido evoluem muito mais rápido porque têm foco. Para você chegar preparado, precisaríamos começar nas próximas semanas. Posso te mostrar o plano de como chegaria lá no prazo?`,
    });
  }

  /* ═══ INTERESSE / CURIOSIDADE ════════════════════════════ */
  if (isInterested) {
    insights.push({
      type:      "interest",
      priority:  "medium",
      title:     "💡 Lead interessado — qualifique com SPIN agora",
      body:      `${fn} está aquecendo. Momento ideal para usar SPIN: descubra a Situação atual ("Qual nível você está hoje?"), o Problema ("O que te impede de avançar?"), a Implicação ("Isso já afetou algo na sua carreira?") e a Necessidade ("O que mudaria se você fosse fluente em 6 meses?"). Uma boa pergunta aqui vale 10 argumentos de venda.`,
      tag:       "Framework: SPIN Selling",
      framework: "Neil Rackham — SPIN Need-payoff",
      cta:       `Que ótimo, ${fn}! Me conta: qual é o seu nível de inglês hoje — básico, intermediário, ou já tem uma base mas trava na hora de falar? Quero entender exatamente onde você está para te mostrar o caminho mais direto.`,
    });
  }

  /* ═══ ESTRATÉGIA POR ETAPA DO FUNIL ═══════════════════════ */
  if (dealStage && !isBuying) {
    const sl = dealStage.toLowerCase();

    if (sl.includes("novo") || sl.includes("new") || sl.includes("inicial") || sl.includes("sdr")) {
      if (msgRatio < 0.5 && outMessages.length > 1) {
        insights.push({
          type:      "warning",
          priority:  "medium",
          title:     "📊 Ratio desequilibrado — você fala mais que o lead",
          body:      `Você enviou mais mensagens do que ${fn} respondeu (ratio ${outMessages.length}:${inMessages.length}). Isso sinaliza que você está "empurrando" em vez de "puxando". Regra de ouro: o lead deve falar mais que você. Faça uma pergunta aberta e espere — não mande mensagem seguida sem resposta.`,
          tag:       "Técnica: Talk-to-listen ratio",
          framework: "Jeb Blount — Fanatical Prospecting",
          cta:       `${fn}, deixa eu te fazer uma pergunta direta: qual é o principal objetivo com o inglês pra você agora — carreira, viagem ou simplesmente se comunicar melhor?`,
        });
      } else {
        insights.push({
          type:      "strategy",
          priority:  "medium",
          title:     "🔍 Novo lead — qualifique BANT antes de apresentar",
          body:      `Nesta fase: NÃO apresente preço nem metodologia ainda. Qualifique primeiro. Budget: quanto pensa em investir? Authority: decide sozinho? Need: qual a dor real? Timeline: quando quer começar? Use Cialdini — Reciprocidade: dê algo de valor antes de pedir qualquer coisa.`,
          tag:       "Framework: BANT + Reciprocidade",
          framework: "Cialdini — Reciprocity + BANT Qualification",
          cta:       `${fn}, pra eu te ajudar da melhor forma possível: você tá buscando inglês mais para o lado profissional ou pessoal? E pensando em quando começar?`,
        });
      }
    } else if (sl.includes("qualif")) {
      insights.push({
        type:      "strategy",
        priority:  "medium",
        title:     "🏆 Qualificado — apresente prova social específica",
        body:      `Lead qualificado. Hora do "Social Proof Cirúrgico" de Cialdini: apresente um caso de aluno com perfil IDÊNTICO ao de ${fn} (nível similar, objetivo parecido, resultado obtido). Especificidade vende 10x mais que generalidade. "Uma aluna nossa, professora como você, foi de básico a conduzir reuniões em inglês em 5 meses."`,
        tag:       "Técnica: Social proof específico",
        framework: "Cialdini — Social Proof + Authority",
        cta:       `${fn}, tenho um exemplo que acho que vai te interessar: temos alunos com perfil parecido com o seu que chegaram aqui [nível/situação similar] e em poucos meses já estavam [resultado concreto]. Quer que eu te mostre como foi esse percurso?`,
      });
    } else if (sl.includes("proposta")) {
      insights.push({
        type:      "strategy",
        priority:  "high",
        title:     "📄 Proposta enviada — follow-up em 24h é obrigatório",
        body:      `Silêncio pós-proposta é indecisão, não rejeição. 80% das vendas precisam de 5 ou mais follow-ups (Dartnell). Use Labeling de Voss: "Imagino que você deve estar avaliando várias coisas…" — isso convida ${fn} a revelar a objeção real sem se sentir pressionado.`,
        tag:       "Técnica: Labeling + Follow-up persistente",
        framework: "Chris Voss — Labeling + Dartnell Follow-up Rule",
        cta:       `Oi ${fn}! Imagino que você deve estar avaliando bastante coisa nessa época. Teve alguma parte da proposta que ficou com dúvida ou que eu possa explicar melhor?`,
      });
    } else if (sl.includes("negoc")) {
      insights.push({
        type:      "closing",
        priority:  "high",
        title:     "⚖️ Negociação — proteja o valor, ceda com contrapartida",
        body:      `Em negociação: ceder direto no preço destrói sua margem E sua autoridade. Voss — Ackerman Method: ofereça concessões pequenas e peça algo em troca sempre. Se der desconto: plano anual, pagamento à vista, ou indicação de amigo. Mantenha a âncora de valor alta.`,
        tag:       "Técnica: Ackerman Bargaining",
        framework: "Chris Voss — Ackerman Method + Anchoring",
        cta:       `${fn}, quero muito que você faça parte aqui. Deixa eu ver o que consigo fazer — mas nesse caso precisaria ser no plano anual ou pagamento à vista. Funciona pra você? Porque aí consigo um valor especial.`,
      });
    } else if (sl.includes("fecha") || sl.includes("close")) {
      insights.push({
        type:      "closing",
        priority:  "high",
        title:     "🏁 Fechamento — identifique o último obstáculo",
        body:      `${fn} está na última milha. O "Trial Close" de Belfort: pergunte diretamente o que impede o sim AGORA. Cialdini — Commitment: use micro-confirmações progressivas ("Você quer começar pela manhã ou tarde?" em vez de "Você vai fechar?"). Remova o último obstáculo e feche.`,
        tag:       "Técnica: Trial Close + Micro-commitment",
        framework: "Jordan Belfort — Trial Close + Cialdini Commitment",
        cta:       `${fn}, honestamente: o que falta pra você começar hoje? Me fala o que ainda está passando pela sua cabeça — seja lá o que for, eu resolvo agora.`,
      });
    } else if (sl.includes("follow") || sl.includes("banho")) {
      const daysSinceMsg = inMessages.length > 0 ? 0 : 7;
      insights.push({
        type:      "strategy",
        priority:  daysSinceMsg > 5 ? "high" : "medium",
        title:     "🔄 Follow-up — volte com VALOR, não com pressão",
        body:      `Lead em banho-maria não é lead perdido — é lead que precisa de contexto novo ou timing diferente. Regra: nunca volte com "só passando para ver se decidiu". Volte com algo que agrega valor primeiro (dica, resultado de aluno, novidade). Cialdini — Reciprocidade cria obrigação de responder.`,
        tag:       "Técnica: Value-first re-engagement",
        framework: "Cialdini — Reciprocity + Jeb Blount Persistence",
        cta:       `Oi ${fn}! Sei que você estava pensando. Queria compartilhar algo rápido: [resultado de um aluno / dica de inglês para o objetivo dele]. Aproveito pra avisar que temos nova turma abrindo — posso te reservar uma vaga por 48h?`,
      });
    }
  }

  /* ═══ LEAD PREMIUM ════════════════════════════════════════ */
  if (isHot && isHighValue && !isBuying) {
    insights.push({
      type:      "strategy",
      priority:  "high",
      title:     "💎 Lead premium — tratamento white-glove",
      body:      `Lead de alto potencial. Não use abordagem padrão — personalize cada mensagem. Hormozi: para leads premium, o atendimento EM SI já é parte da oferta. Ofereça acesso exclusivo: aula experimental com professor sênior, consulta personalizada de plano de estudos, conversa com o fundador. O lead premium quer sentir que é especial — porque é.`,
      tag:       "Estratégia: White Glove Experience",
      framework: "Alex Hormozi — Grand Slam Offer para VIP",
      cta:       `${fn}, dado o seu perfil e objetivos, quero te oferecer algo diferente: uma aula experimental gratuita com um dos nossos professores mais experientes — completamente personalizada para onde você quer chegar. Sem compromisso, só para você sentir a metodologia na prática. Quando fica melhor pra você?`,
    });
  }

  /* ═══ ANÁLISE DE ENGAJAMENTO GERAL ════════════════════════ */
  if (inMessages.length > 0 && !isBuying && !isPriceObj && !isCompetitor && !isCold && !isInterested && !hasPain && !isFrustrated) {
    const tempLabel = temp;
    const scoreLabel = contactScore >= 70 ? "alto — avance para proposta" : contactScore >= 40 ? "médio — explore a dor principal" : "baixo — construa rapport primeiro";
    insights.push({
      type:     "interest",
      priority: "low",
      title:    `${tempLabel} — Score ${contactScore}pts`,
      body:     `${fn} tem ${inMessages.length} msg${inMessages.length > 1 ? "s" : ""} recebidas, ${outMessages.length} enviadas. Score ${scoreLabel}. ${sentScore > 1 ? "Sentimento positivo — boa abertura." : sentScore < -1 ? "Sentimento negativo — aborde com cuidado." : "Sentimento neutro — faça uma pergunta de dor para aquecer."} Próximo passo: identifique o objetivo principal de ${fn} antes de qualquer oferta.`,
      tag:      `Temperatura: ${temp}`,
    });
  }

  /* ═══ ORDENA: high → medium → low, limita 5 ══════════════ */
  const order = { high: 0, medium: 1, low: 2 };
  return insights.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 5);
}
