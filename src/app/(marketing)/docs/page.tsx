import type { Metadata } from "next";
import Link from "next/link";
import { DocTitle, DocLead, DocH2, DocP, DocList } from "@/components/docs/doc";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Documentação" };

export default function DocsHome() {
  return (
    <>
      <DocTitle>Documentação do {SITE.name}</DocTitle>
      <DocLead>
        Tudo o que você precisa para organizar suas vendas, automatizar o comercial e integrar o
        {" "}{SITE.name} ao seu ecossistema de ferramentas.
      </DocLead>

      <DocH2 id="primeiros-passos">Primeiros passos</DocH2>
      <DocList
        items={[
          <>Crie sua conta e inicie o teste grátis de 14 dias (sem cartão).</>,
          <>Importe seus contatos via CSV ou conecte um canal (WhatsApp, Instagram, Messenger).</>,
          <>Monte seu funil em <strong>Pipeline</strong> e arraste negócios entre as etapas.</>,
          <>Ative <strong>automações</strong> para responder e mover negócios automaticamente.</>,
          <>Acompanhe tudo no <strong>Dashboard</strong> e nos <strong>Relatórios</strong>.</>,
        ]}
      />

      <DocH2 id="contatos">Contatos & Empresas</DocH2>
      <DocP>
        Centralize todos os seus leads e clientes. Cada contato tem histórico de atividades, campos
        personalizados, tags, origem e pontuação (lead scoring). Empresas agrupam contatos e somam o
        valor de negócios associados.
      </DocP>

      <DocH2 id="pipeline">Pipeline & Negócios</DocH2>
      <DocP>
        Crie múltiplos funis com etapas personalizadas e probabilidade de fechamento. O quadro Kanban
        permite arrastar negócios entre etapas, e a previsão de receita é calculada automaticamente.
      </DocP>

      <DocH2 id="bi">Business Intelligence</DocH2>
      <DocP>
        Indicadores executivos agrupados por Aquisição, Conversão, Receita e Velocidade: custo por lead,
        taxa de conversão, forecast ponderado por probabilidade de etapa, ticket médio e tempo médio de
        ciclo. Além de remarketing por e-mail e ligações com IA para reativação da base.
      </DocP>

      <DocH2 id="automacoes">Automações & Lead Scoring</DocH2>
      <DocP>
        Defina gatilhos (novo lead, mudança de etapa, score atingido) e ações (enviar mensagem, mover
        negócio, criar tarefa, chamar webhook/N8N). As regras de scoring qualificam leads
        automaticamente conforme o comportamento.
      </DocP>

      <DocH2>Para desenvolvedores</DocH2>
      <DocP>
        Conecte o {SITE.name} a qualquer sistema com nossa{" "}
        <Link href="/docs/api" className="font-medium text-primary hover:underline">API REST</Link>,{" "}
        <Link href="/docs/integracoes" className="font-medium text-primary hover:underline">webhooks e fluxos N8N</Link>.
      </DocP>
    </>
  );
}
