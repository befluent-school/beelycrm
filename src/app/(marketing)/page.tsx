import Link from "next/link";
import {
  ArrowRight,
  MessageSquare,
  Kanban,
  Bot,
  BarChart3,
  Plug,
  Zap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pricing } from "@/components/marketing/pricing";
import { TRIAL_DAYS } from "@/lib/site";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <Features />
      <Channels />
      <Pricing />
      <Faq />
      <FinalCta />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-28 text-center">
        <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/10 text-primary">
          <Sparkles className="mr-1 size-3 text-primary" />
          {TRIAL_DAYS} dias grátis · sem cartão de crédito
        </Badge>
        <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Fale com clareza.{" "}
          <span className="gradient-text text-glow">Venda com potência.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          O CRM que centraliza leads, WhatsApp, Instagram e automações em um só lugar.
          Organize seu funil, responda mais rápido e feche mais negócios — sem complicação.
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Começar teste grátis <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/#pricing">Ver planos</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Implementação em minutos · Suporte em português · Cancele quando quiser
        </p>
      </div>
    </section>
  );
}

function SocialProof() {
  const stats = [
    ["+38%", "de conversão de leads"],
    ["3x", "mais rápido para responder"],
    ["−60%", "de tarefas manuais"],
    ["100%", "das conversas num só lugar"],
  ];
  return (
    <section className="border-y border-border/60 bg-[#222222]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
        {stats.map(([value, label]) => (
          <div key={label} className="text-center">
            <div className="font-display text-3xl font-extrabold text-primary text-glow">{value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  { icon: Kanban, title: "Pipeline visual", desc: "Funis Kanban com arrastar e soltar. Veja cada negócio avançar em tempo real e nunca perca um follow-up." },
  { icon: MessageSquare, title: "Inbox omnichannel", desc: "WhatsApp, Instagram Direct e Messenger em uma caixa de entrada única, com atribuição automática e respostas rápidas." },
  { icon: Zap, title: "Automações poderosas", desc: "Crie fluxos que movem negócios, enviam mensagens e disparam webhooks. Integre com N8N e automatize tudo." },
  { icon: Bot, title: "IA de vendas", desc: "Lead scoring inteligente, resumos de conversas e sugestões de resposta com Copilot para acelerar o fechamento." },
  { icon: BarChart3, title: "Dashboards e relatórios", desc: "Métricas de funil, receita prevista, performance por vendedor e metas — tudo visual e em tempo real." },
  { icon: Plug, title: "Integrações abertas", desc: "API REST completa, webhooks e conexões prontas com as ferramentas que seu time já usa." },
];

function Features() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-4">Tudo em um só lugar</Badge>
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ferramentas de gente grande, simples de usar
          </h2>
          <p className="mt-4 text-muted-foreground">
            Recursos completos de vendas, comunicação e automação — com a simplicidade que seu time precisa para vender mais.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card-premium group rounded-2xl p-6 transition-all hover:-translate-y-1">
              <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary transition-transform group-hover:scale-110">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-9">
      <circle cx="24" cy="24" r="24" fill="#25D366"/>
      <path d="M34.5 13.5A14.5 14.5 0 0 0 9.5 24.05a14.4 14.4 0 0 0 1.95 7.3L9.5 38.5l7.35-1.92a14.5 14.5 0 0 0 21.65-12.53A14.5 14.5 0 0 0 34.5 13.5Zm-10.5 22.3a12.05 12.05 0 0 1-6.14-1.68l-.44-.26-4.57 1.2 1.22-4.45-.28-.46A12.1 12.1 0 1 1 24 35.8Zm6.63-9.06c-.36-.18-2.14-1.06-2.47-1.18-.33-.12-.57-.18-.81.18-.24.36-.94 1.18-1.15 1.42-.21.24-.42.27-.78.09-.36-.18-1.52-.56-2.9-1.79-1.07-.96-1.8-2.14-2.01-2.5-.21-.36-.02-.56.16-.74.16-.16.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.81-1.95-1.11-2.67-.29-.7-.59-.6-.81-.61l-.69-.01a1.32 1.32 0 0 0-.96.45c-.33.36-1.26 1.23-1.26 3s1.29 3.48 1.47 3.72c.18.24 2.54 3.87 6.15 5.43.86.37 1.53.59 2.05.75.86.27 1.65.23 2.27.14.69-.1 2.14-.87 2.44-1.72.3-.84.3-1.56.21-1.71-.09-.15-.33-.24-.69-.42Z" fill="white"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-9">
      <defs>
        <radialGradient id="ig-grad1" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#ig-grad1)"/>
      <rect x="13" y="13" width="22" height="22" rx="6" stroke="white" strokeWidth="2.2" fill="none"/>
      <circle cx="24" cy="24" r="5.5" stroke="white" strokeWidth="2.2" fill="none"/>
      <circle cx="30.5" cy="17.5" r="1.5" fill="white"/>
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-9">
      <defs>
        <linearGradient id="msg-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00c6ff"/>
          <stop offset="100%" stopColor="#0068ff"/>
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill="url(#msg-grad)"/>
      <path d="M24 10C16.27 10 10 15.92 10 23.27c0 4.1 1.98 7.77 5.08 10.23V38l4.79-2.63A14.7 14.7 0 0 0 24 36c7.73 0 14-5.92 14-13.27C38 15.92 31.73 10 24 10Zm1.4 17.87-3.56-3.8-6.95 3.8 7.64-8.12 3.65 3.8 6.86-3.8-7.64 8.12Z" fill="white"/>
    </svg>
  );
}

function N8NIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-9">
      <rect width="48" height="48" rx="10" fill="#1a1a2e"/>
      <circle cx="14" cy="24" r="5" fill="#EA4B71"/>
      <circle cx="34" cy="24" r="5" fill="#EA4B71"/>
      <circle cx="24" cy="14" r="5" fill="#FF6B6B"/>
      <circle cx="24" cy="34" r="5" fill="#FF6B6B"/>
      <path d="M14 24 L24 14 M24 14 L34 24 M34 24 L24 34 M24 34 L14 24" stroke="#EA4B71" strokeWidth="1.5" opacity="0.6"/>
      <text x="24" y="28" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="monospace">n8n</text>
    </svg>
  );
}

function Channels() {
  const channels = [
    { name: "WhatsApp", Icon: WhatsAppIcon },
    { name: "Instagram", Icon: InstagramIcon },
    { name: "Messenger", Icon: MessengerIcon },
    { name: "Webhooks / N8N", Icon: N8NIcon },
  ];
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="overflow-hidden rounded-3xl border border-primary/20 bg-[#232323]">
          <div className="grid items-center gap-10 p-10 md:grid-cols-2 md:p-14">
            <div>
              <Badge className="mb-4 border-primary/30 bg-primary/10 text-primary">Conecte em minutos</Badge>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
                Seus canais favoritos,<br />conectados ao seu funil
              </h2>
              <p className="mt-4 text-muted-foreground">
                Conecte WhatsApp (API oficial Meta, Z-API ou Evolution), Instagram e Messenger.
                Receba mensagens, atribua a vendedores e transforme conversas em negócios automaticamente.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Atribuição inteligente de conversas",
                  "Histórico unificado por contato",
                  "Gatilhos e respostas automáticas",
                ].map((label) => (
                  <li key={label} className="flex items-center gap-3 text-sm text-foreground">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Check />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8">
                <Link href="/signup">Conectar agora <ArrowRight className="size-4" /></Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {channels.map(({ name, Icon }) => (
                <div
                  key={name}
                  className="flex h-28 flex-col items-center justify-center gap-2.5 rounded-2xl border border-white/8 bg-white/4 text-center transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <Icon />
                  <span className="font-display text-sm font-semibold text-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Check() {
  return <ShieldCheck className="size-3.5" />;
}

const FAQS: [string, string][] = [
  ["Preciso de cartão de crédito para testar?", `Não. O teste de ${TRIAL_DAYS} dias é totalmente grátis e inclui os recursos do plano Pro. Você só escolhe um plano se quiser continuar.`],
  ["Consigo conectar meu WhatsApp?", "Sim. Suportamos a API oficial da Meta e provedores como Z-API e Evolution. Você escolhe o provedor no momento de conectar."],
  ["Tem integração com outras ferramentas?", "Sim. Oferecemos API REST completa, webhooks e fluxos N8N para conectar com praticamente qualquer sistema."],
  ["Posso mudar de plano depois?", "A qualquer momento. O upgrade é imediato e o downgrade vale no próximo ciclo. Sem fidelidade."],
];

function Faq() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <Badge variant="outline" className="mb-4">Dúvidas frequentes</Badge>
          <h2 className="font-display text-3xl font-extrabold tracking-tight">Perguntas frequentes</h2>
        </div>
        <div className="mt-10 divide-y divide-border">
          {FAQS.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-display font-semibold">
                {q}
                <span className="text-primary transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground">
        <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Pronto para vender com mais clareza e potência?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90">
          Junte-se aos times que organizaram o comercial e aceleraram os resultados. Comece em minutos.
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-8">
          <Link href="/signup">
            Criar minha conta grátis <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
