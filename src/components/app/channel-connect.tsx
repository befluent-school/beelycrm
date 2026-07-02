"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CopyField } from "./copy-field";
import { cn } from "@/lib/utils";
import { useStore, type ChannelType } from "@/lib/store";
import {
  CheckCircle2, ExternalLink, ChevronRight, ChevronLeft,
  Layers, Link2, Key, Webhook, ArrowRight, Check,
} from "lucide-react";

/* ── Tipos ──────────────────────────────────────────────────── */
interface StepDef {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  description: string;
  tip?: string;
  link?: { label: string; url: string };
  isWebhookStep?: boolean;
}

interface ProviderDef {
  id: string;
  label: string;
  badge?: string;
  color: string;
  fields: { name: string; label: string; placeholder?: string; hint?: string }[];
  steps: StepDef[];
}

interface ChannelConfig {
  name: string;
  slug: string;
  type: ChannelType;
  providers: ProviderDef[];
}

/* ── Dados de cada canal/provedor ───────────────────────────── */
const CONFIGS: Record<string, ChannelConfig> = {
  WhatsApp: {
    name: "WhatsApp", slug: "whatsapp", type: "whatsapp",
    providers: [
      {
        id: "meta_cloud", label: "Meta Cloud API", badge: "Recomendado", color: "#25D366",
        fields: [
          { name: "phone_id", label: "Phone Number ID",              placeholder: "1029384756123",    hint: "App Meta > WhatsApp > Configuracao > Phone Number ID" },
          { name: "token",    label: "Access Token (permanente)",     placeholder: "EAAB...",           hint: "Gerado em: Sistema de Usuarios > Gerar token de sistema" },
          { name: "verify",   label: "Verify Token",                  placeholder: "beely-verify-123",  hint: "Qualquer texto secreto que voce escolher" },
          { name: "waba_id",  label: "WhatsApp Business Account ID",  placeholder: "1234567890",        hint: "Encontrado em: Contas > Conta do WhatsApp Business" },
        ],
        steps: [
          {
            icon: Layers,
            title: "Crie um App Meta",
            subtitle: "Passo 1 de 6",
            description: "Acesse developers.facebook.com e va em Meus Apps > Criar app. Escolha o tipo Empresa. Na proxima tela, role ate encontrar WhatsApp e clique em Configurar.",
            link: { label: "Abrir Meta for Developers", url: "https://developers.facebook.com/apps" },
          },
          {
            icon: Link2,
            title: "Vincule o numero WhatsApp Business",
            subtitle: "Passo 2 de 6",
            description: "Dentro do app criado, va em WhatsApp > Configuracao. Siga o assistente para vincular sua Conta do WhatsApp Business (WABA) e adicionar seu numero de telefone.",
            tip: "Use apenas numeros de WhatsApp Business (API). Numeros pessoais nao sao suportados pela Meta Cloud API.",
          },
          {
            icon: Key,
            title: "Anote o Phone Number ID e WABA ID",
            subtitle: "Passo 3 de 6",
            description: "Na tela de Configuracao do WhatsApp, copie o Phone Number ID ao lado do seu numero. Em Configuracoes > Conta do WhatsApp Business, copie tambem o WABA ID.",
            tip: "Esses dois numeros identificam sua conta e sao obrigatorios para enviar mensagens.",
          },
          {
            icon: Key,
            title: "Gere um Token de Acesso Permanente",
            subtitle: "Passo 4 de 6",
            description: "Va em Configuracoes do App > Basico > Usuarios do Sistema. Crie um usuario de sistema com permissao Admin. Clique em Gerar novo token e selecione as permissoes: whatsapp_business_messaging e whatsapp_business_management.",
            tip: "Tokens de pagina expiram. Sempre use token de usuario de sistema para producao.",
          },
          {
            icon: Webhook,
            title: "Configure o Webhook",
            subtitle: "Passo 5 de 6",
            description: "No painel do App, va em WhatsApp > Configuracao > Webhooks. Cole a URL abaixo no campo URL de Retorno de Chamada e o Verify Token que voce escolheu. Depois assine os campos: messages, message_deliveries e message_reads.",
            isWebhookStep: true,
            tip: "O Verify Token e qualquer texto que voce inventar - voce usa o mesmo nos dois lados.",
          },
          {
            icon: Check,
            title: "Preencha as credenciais",
            subtitle: "Passo 6 de 6",
            description: "Clique no botao abaixo para ir para o formulario. Preencha os 4 campos com as informacoes coletadas nos passos anteriores e clique em Conectar canal.",
            tip: "Apos conectar, as mensagens do WhatsApp apareceram no Inbox automaticamente.",
          },
        ],
      },
      {
        id: "zapi", label: "Z-API", badge: "Facil", color: "#25D366",
        fields: [
          { name: "instance",     label: "ID da Instancia",          placeholder: "3C1A9B...", hint: "Instancias > selecionar > ID da instancia" },
          { name: "token",        label: "Token de seguranca",        placeholder: "...",        hint: "Exibido na tela da instancia no painel Z-API" },
          { name: "client_token", label: "Client Token (opcional)",   placeholder: "F...",       hint: "Seguranca extra - encontrado em Configuracoes da instancia" },
        ],
        steps: [
          {
            icon: Layers,
            title: "Crie uma conta e uma instancia",
            subtitle: "Passo 1 de 5",
            description: "Acesse z-api.io e crie sua conta gratuitamente. Depois clique em Nova instancia e defina um nome (ex: befluent-wa). Voce sera redirecionado ao painel da instancia.",
            link: { label: "Abrir z-api.io", url: "https://z-api.io" },
          },
          {
            icon: Link2,
            title: "Conecte o WhatsApp via QR Code",
            subtitle: "Passo 2 de 5",
            description: "Na tela da instancia, clique no botao QR Code. No celular, abra o WhatsApp > toque nos 3 pontos > Aparelhos conectados > Conectar um aparelho. Aponte para o QR Code na tela.",
            tip: "Mantenha o celular com bateria e internet. A instancia funciona enquanto o celular estiver conectado.",
          },
          {
            icon: Key,
            title: "Copie o Instance ID e Token",
            subtitle: "Passo 3 de 5",
            description: "Apos a conexao ser feita (icone ficar verde), na mesma tela voce encontra o Instance ID e o Token de seguranca. Copie os dois.",
          },
          {
            icon: Webhook,
            title: "Configure o Webhook",
            subtitle: "Passo 4 de 5",
            description: "Va em Instancia > Webhooks. No campo Ao receber mensagem, cole a URL abaixo. Isso garante que o Beely receba todas as mensagens em tempo real.",
            isWebhookStep: true,
          },
          {
            icon: Check,
            title: "Preencha as credenciais",
            subtitle: "Passo 5 de 5",
            description: "Clique em Inserir credenciais, preencha o Instance ID e Token e clique em Conectar canal.",
            tip: "A conexao via Z-API e mais simples e nao exige aprovacao da Meta.",
          },
        ],
      },
      {
        id: "evolution", label: "Evolution API", badge: "Self-hosted", color: "#25D366",
        fields: [
          { name: "base_url", label: "URL da Evolution API",    placeholder: "https://evo.suaempresa.com", hint: "URL onde sua instancia Evolution esta hospedada" },
          { name: "apikey",   label: "API Key global",          placeholder: "B6D111...",                  hint: "AUTHENTICATION_API_KEY do arquivo .env da Evolution" },
          { name: "instance", label: "Nome da instancia",       placeholder: "befluent-wa",               hint: "Nome exato da instancia criada no Evolution Manager" },
        ],
        steps: [
          {
            icon: Layers,
            title: "Instale a Evolution API",
            subtitle: "Passo 1 de 5",
            description: "A Evolution API e self-hosted - voce precisa hospedar em um servidor. A forma mais rapida e via Docker. Siga o repositorio oficial para instalar.",
            link: { label: "Ver repositorio Evolution API", url: "https://github.com/EvolutionAPI/evolution-api" },
            tip: "Precisa de um servidor Linux com Docker. Use qualquer VPS (DigitalOcean, Contabo, Hostinger VPS).",
          },
          {
            icon: Link2,
            title: "Crie uma instancia",
            subtitle: "Passo 2 de 5",
            description: "Via Evolution Manager (painel visual) ou pela API: POST /instance/create com body {instanceName: 'befluent-wa'}. Use a API Key definida no .env como header apikey.",
          },
          {
            icon: Key,
            title: "Conecte o WhatsApp",
            subtitle: "Passo 3 de 5",
            description: "Faca GET /instance/connect/{nome-da-instancia} para obter o QR Code. Escaneie com o WhatsApp Business > Aparelhos conectados > Conectar aparelho.",
          },
          {
            icon: Webhook,
            title: "Configure o Webhook",
            subtitle: "Passo 4 de 5",
            description: "POST /webhook/set/{nome-da-instancia} com body: {url: 'URL_ABAIXO', enabled: true, events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE']}.",
            isWebhookStep: true,
          },
          {
            icon: Check,
            title: "Preencha as credenciais",
            subtitle: "Passo 5 de 5",
            description: "Insira a URL base da sua Evolution API, a API Key e o nome da instancia criada. Clique em Conectar canal.",
          },
        ],
      },
    ],
  },

  "Instagram Direct": {
    name: "Instagram Direct", slug: "instagram", type: "instagram",
    providers: [
      {
        id: "meta", label: "Instagram Graph API", badge: "Oficial", color: "#E1306C",
        fields: [
          { name: "ig_id",   label: "Instagram Business Account ID", placeholder: "17841400...", hint: "Obtido via Graph API Explorer: GET /{page-id}?fields=instagram_business_account" },
          { name: "token",   label: "Page Access Token",             placeholder: "EAAB...",     hint: "Token com permissao instagram_manage_messages" },
          { name: "page_id", label: "Facebook Page ID",              placeholder: "1029...",     hint: "ID numerico da Pagina Facebook (Configuracoes da pagina > Sobre)" },
        ],
        steps: [
          {
            icon: Layers,
            title: "Requisitos antes de comecar",
            subtitle: "Passo 1 de 6",
            description: "Voce precisa de: (1) Conta Instagram Business ou Criador - nao pessoal. (2) Pagina no Facebook conectada a essa conta Instagram. Acesse o Meta Business Suite para verificar a conexao.",
            tip: "Para converter: Instagram > Configuracoes > Conta > Mudar para conta profissional > Empresa.",
            link: { label: "Abrir Meta Business Suite", url: "https://business.facebook.com" },
          },
          {
            icon: Layers,
            title: "Crie um App Meta com produto Instagram",
            subtitle: "Passo 2 de 6",
            description: "Va em developers.facebook.com > Meus Apps > Criar App > tipo Empresa. Adicione o produto Instagram. Em seguida, solicite a permissao instagram_manage_messages em Configuracoes do App > Permissoes.",
            link: { label: "Abrir Meta for Developers", url: "https://developers.facebook.com/apps" },
          },
          {
            icon: Key,
            title: "Gere o Page Access Token",
            subtitle: "Passo 3 de 6",
            description: "Va em Ferramentas > Explorador de API do Graph. Selecione seu App no canto superior direito. Clique em Gerar token de acesso e selecione a Pagina Facebook vinculada ao Instagram. Marque as permissoes: instagram_manage_messages, instagram_basic, pages_manage_metadata.",
            tip: "Para producao, use um token de usuario de sistema via Meta Business Manager para que nao expire.",
          },
          {
            icon: Key,
            title: "Obtenha o Instagram Business Account ID",
            subtitle: "Passo 4 de 6",
            description: "No Graph API Explorer, com o token gerado, faca a chamada: GET /{page-id}?fields=instagram_business_account. O valor id dentro do objeto retornado e o Instagram Business Account ID.",
            tip: "Substitua {page-id} pelo ID numerico da sua Pagina Facebook.",
          },
          {
            icon: Webhook,
            title: "Configure o Webhook para DMs",
            subtitle: "Passo 5 de 6",
            description: "No App, va em Webhooks > adicionar assinatura para Instagram. Cole a URL abaixo e um Verify Token de sua escolha. Assine o campo messages para receber mensagens diretas em tempo real.",
            isWebhookStep: true,
          },
          {
            icon: Check,
            title: "Preencha as credenciais",
            subtitle: "Passo 6 de 6",
            description: "Clique em Inserir credenciais e preencha os 3 campos: o Instagram Business Account ID, o Page Access Token e o Facebook Page ID.",
          },
        ],
      },
    ],
  },

  Messenger: {
    name: "Messenger", slug: "messenger", type: "messenger",
    providers: [
      {
        id: "meta", label: "Meta Messenger Platform", badge: "Oficial", color: "#0084FF",
        fields: [
          { name: "page_id",    label: "Facebook Page ID",   placeholder: "1029...",   hint: "Configuracoes da Pagina > Informacoes da pagina > ID da pagina" },
          { name: "token",      label: "Page Access Token",  placeholder: "EAAB...",   hint: "Token com permissao pages_messaging" },
          { name: "app_secret", label: "App Secret",         placeholder: "a1b2c3...", hint: "App Meta > Configuracoes > Basico > App Secret" },
        ],
        steps: [
          {
            icon: Layers,
            title: "Crie um App Meta e adicione Messenger",
            subtitle: "Passo 1 de 6",
            description: "Va em developers.facebook.com > Meus Apps > Criar App > tipo Empresa. Na lista de produtos, encontre Messenger e clique em Configurar.",
            link: { label: "Abrir Meta for Developers", url: "https://developers.facebook.com/apps" },
          },
          {
            icon: Link2,
            title: "Vincule sua Pagina Facebook",
            subtitle: "Passo 2 de 6",
            description: "Dentro do App, va em Messenger > Configuracoes do Messenger > Tokens de Acesso. Clique em Adicionar ou remover paginas e selecione a Pagina Facebook que recebera as mensagens.",
            tip: "A Pagina Facebook precisa estar publicada (ativa) para funcionar com o Messenger API.",
          },
          {
            icon: Key,
            title: "Gere o Page Access Token",
            subtitle: "Passo 3 de 6",
            description: "Na mesma secao de Tokens de Acesso, clique em Gerar token ao lado da sua pagina. Copie o token exibido - ele tem automaticamente a permissao pages_messaging.",
            tip: "Para producao, gere um token permanente via Sistema de Usuarios no Meta Business Manager para evitar expiracao.",
          },
          {
            icon: Key,
            title: "Anote o Page ID e App Secret",
            subtitle: "Passo 4 de 6",
            description: "O Page ID: acesse sua Pagina Facebook > Configuracoes > Sobre > Informacoes da pagina e role ate o fim. O App Secret: App Meta > Configuracoes > Basico > clique em Mostrar ao lado de App Secret.",
          },
          {
            icon: Webhook,
            title: "Configure o Webhook",
            subtitle: "Passo 5 de 6",
            description: "Em Messenger > Configuracoes > Webhooks, adicione um novo webhook. Cole a URL abaixo e um Verify Token. Assine os campos: messages, messaging_postbacks e messaging_optins.",
            isWebhookStep: true,
          },
          {
            icon: Check,
            title: "Preencha as credenciais",
            subtitle: "Passo 6 de 6",
            description: "Clique em Inserir credenciais e preencha o Page ID, Page Access Token e App Secret. Depois clique em Conectar canal.",
            tip: "Apos conectar, todas as mensagens recebidas na Pagina apareceram no Inbox > Messenger.",
          },
        ],
      },
    ],
  },
};

/* ── Componente visual do guia passo a passo ────────────────── */
function StepGuide({
  steps, webhookUrl, onGoToForm,
}: {
  steps: StepDef[];
  webhookUrl: string;
  onGoToForm: () => void;
}) {
  const [current, setCurrent] = useState(0);
  const step    = steps[current];
  const Icon    = step.icon;
  const total   = steps.length;
  const isFirst = current === 0;
  const isLast  = current === total - 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de progresso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{step.subtitle}</span>
          <span>{Math.round(((current + 1) / total) * 100)}% concluido</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
        {/* Mini indicadores */}
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                i <= current ? "bg-primary" : "bg-border hover:bg-border/80"
              )}
            />
          ))}
        </div>
      </div>

      {/* Card do passo atual */}
      <div className="rounded-xl border border-border bg-gradient-to-b from-accent/30 to-transparent p-5">
        {/* Header do passo */}
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Icon className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-display font-bold">{step.title}</p>
            <p className="text-xs text-muted-foreground">{step.subtitle}</p>
          </div>
          <div className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {current + 1}
          </div>
        </div>

        {/* Descrição */}
        <p className="text-sm leading-relaxed text-foreground/90">{step.description}</p>

        {/* Webhook URL */}
        {step.isWebhookStep && (
          <div className="mt-3 space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
              <Webhook className="size-3" /> Sua URL de Webhook
            </p>
            <CopyField value={webhookUrl} />
            <p className="text-[10px] text-muted-foreground">
              Cole essa URL no campo de Webhook do painel acima.
            </p>
          </div>
        )}

        {/* Dica */}
        {step.tip && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2.5">
            <span className="mt-0.5 text-sm">💡</span>
            <p className="text-[11px] leading-relaxed text-yellow-200/80">{step.tip}</p>
          </div>
        )}

        {/* Link externo */}
        {step.link && (
          <a
            href={step.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <ExternalLink className="size-3.5" /> {step.link.label} <ArrowRight className="size-3" />
          </a>
        )}
      </div>

      {/* Navegação */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCurrent((c) => c - 1)}
          disabled={isFirst}
          className="gap-1.5"
        >
          <ChevronLeft className="size-4" /> Anterior
        </Button>

        {isLast ? (
          <Button
            type="button"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onGoToForm}
          >
            Inserir credenciais <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => setCurrent((c) => c + 1)}
          >
            Proximo passo <ChevronRight className="size-4" />
          </Button>
        )}
      </div>

      {/* Atalho */}
      {!isLast && (
        <button
          type="button"
          onClick={onGoToForm}
          className="text-center text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Ja tenho as credenciais, pular para o formulario
        </button>
      )}
    </div>
  );
}

/* ── Componente principal ───────────────────────────────────── */
export function ChannelConnect({
  channel, connected, trigger,
}: {
  channel: string;
  connected: boolean;
  trigger: React.ReactNode;
}) {
  const config = CONFIGS[channel];
  const { connectChannel, disconnectChannel } = useStore();
  const [providerId, setProviderId] = useState(config?.providers[0]?.id ?? "");
  const [open, setOpen]             = useState(false);
  const [view, setView]             = useState<"guide" | "form">("guide");

  if (!config) return <>{trigger}</>;

  const provider   = config.providers.find((p) => p.id === providerId) ?? config.providers[0];
  const appUrl     = typeof window !== "undefined" ? window.location.origin : "https://app.beely.com.br";
  const webhookUrl = `${appUrl}/api/webhooks/${config.slug}`;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setView("guide");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd    = new FormData(e.currentTarget);
    const creds: Record<string, string> = {};
    for (const [k, v] of fd.entries()) creds[k] = String(v);

    const empty = provider.fields.filter((f) => !creds[f.name]?.trim());
    if (empty.length > 0) {
      toast.error(`Preencha: ${empty.map((f) => f.label).join(", ")}`);
      return;
    }

    connectChannel({
      type:        config.type,
      provider:    provider.label,
      connectedAt: new Date().toISOString(),
      credentials: creds,
    });

    toast.success(`${config.name} conectado! As conversas ja aparecem no Inbox.`);
    setOpen(false);
  }

  function handleDisconnect() {
    if (!confirm(`Desconectar ${config.name}? As conversas deste canal nao aparecerao mais no Inbox.`)) return;
    disconnectChannel(config.type);
    toast(`${config.name} desconectado.`);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {connected && <CheckCircle2 className="size-4 text-success" />}
            {connected ? `Gerenciar ${config.name}` : `Conectar ${config.name}`}
          </DialogTitle>
          <DialogDescription>
            {connected
              ? `${config.name} esta conectado via ${provider.label}.`
              : view === "guide"
                ? "Siga o guia abaixo para obter suas credenciais."
                : "Preencha as credenciais obtidas no guia."}
          </DialogDescription>
        </DialogHeader>

        {/* Seletor de provedor — sempre visivel */}
        {config.providers.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Escolha o provedor
            </p>
            <div className="flex flex-wrap gap-2">
              {config.providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setProviderId(p.id); setView("guide"); }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                    p.id === providerId
                      ? "border-primary/60 bg-primary/15 text-primary shadow-sm"
                      : "border-border text-muted-foreground hover:border-border/80 hover:bg-white/[0.04]"
                  )}
                >
                  {p.label}
                  {p.badge && (
                    <Badge variant="secondary" className="px-1 py-0 text-[9px]">{p.badge}</Badge>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Toggle guia / formulario */}
        <div className="flex rounded-lg border border-border bg-secondary/30 p-1 gap-1">
          <button
            type="button"
            onClick={() => setView("guide")}
            className={cn(
              "flex-1 rounded-md py-2 text-xs font-semibold transition-all",
              view === "guide"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Guia de configuracao
          </button>
          <button
            type="button"
            onClick={() => setView("form")}
            className={cn(
              "flex-1 rounded-md py-2 text-xs font-semibold transition-all",
              view === "form"
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {connected ? "Atualizar credenciais" : "Inserir credenciais"}
          </button>
        </div>

        {/* Guia passo a passo */}
        {view === "guide" && (
          <StepGuide
            steps={provider.steps}
            webhookUrl={webhookUrl}
            onGoToForm={() => setView("form")}
          />
        )}

        {/* Formulario de credenciais */}
        {view === "form" && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Webhook URL no topo do formulario como referencia */}
            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-1.5">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Webhook className="size-3.5" /> URL do Webhook (configure no painel do provedor)
              </p>
              <CopyField value={webhookUrl} />
            </div>

            {provider.fields.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <Label className="text-sm">{f.label}</Label>
                <Input name={f.name} placeholder={f.placeholder} />
                {f.hint && (
                  <p className="text-[10px] text-muted-foreground">{f.hint}</p>
                )}
              </div>
            ))}

            <div className="flex flex-col gap-2 pt-1">
              <Button type="submit" className="w-full">
                {connected ? "Salvar alteracoes" : "Conectar canal"}
              </Button>

              {connected && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={handleDisconnect}
                >
                  Desconectar {config.name}
                </Button>
              )}

              <button
                type="button"
                onClick={() => setView("guide")}
                className="text-center text-[11px] text-muted-foreground hover:text-foreground hover:underline underline-offset-2"
              >
                Voltar ao guia de configuracao
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
