"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyField } from "@/components/app/copy-field";
import { CheckCircle2, Plus, Settings, Trash2, ExternalLink, AlertCircle, Info } from "lucide-react";
import { useStore, useHydrated } from "@/lib/store";

/* ── Logos oficiais (SVG) ──────────────────────────────────── */
function LogoGmail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#fff" stroke="#e5e7eb" />
      <path d="M12 16.5v15A1.5 1.5 0 0 0 13.5 33H17V22.2l7 5.25 7-5.25V33h3.5a1.5 1.5 0 0 0 1.5-1.5v-15L24 25 12 16.5Z" fill="#EA4335" />
      <path d="M12 16.5 24 25l12-8.5A1.5 1.5 0 0 0 34.5 15h-21A1.5 1.5 0 0 0 12 16.5Z" fill="#FBBC04" />
    </svg>
  );
}
function LogoResend({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#000" />
      <path d="M16 14h9.5c3.6 0 6 2.2 6 5.6 0 2.6-1.5 4.5-3.9 5.2L34 34h-5.4l-5.7-8.4H21V34h-5V14Zm5 4v3.9h4c1.6 0 2.6-.8 2.6-2s-1-1.9-2.6-1.9h-4Z" fill="#fff" />
    </svg>
  );
}
function LogoVapi({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#0FBF61" />
      <path d="M14 18v12M20 13v22M26 16v16M32 20v8" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
function LogoTwilio({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#F22F46" />
      <circle cx="24" cy="24" r="10" stroke="white" strokeWidth="2.5" fill="none" />
      <circle cx="20" cy="21" r="2" fill="white" /><circle cx="28" cy="21" r="2" fill="white" />
      <circle cx="20" cy="27" r="2" fill="white" /><circle cx="28" cy="27" r="2" fill="white" />
    </svg>
  );
}
function LogoStripe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#635BFF" />
      <path d="M22.5 20c0-.9.75-1.25 2-1.25 1.8 0 4.05.55 5.85 1.5V15.3c-1.95-.75-3.9-1.05-5.85-1.05-4.8 0-8 2.5-8 6.65 0 6.5 8.95 5.45 8.95 8.25 0 1.05-.9 1.4-2.2 1.4-1.9 0-4.35-.8-6.3-1.85v5.05c2.15.9 4.3 1.25 6.3 1.25 4.9 0 8.25-2.4 8.25-6.6-.05-7-8.95-5.75-8.95-8.4z" fill="white" />
    </svg>
  );
}
function LogoMercadoPago({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#009EE3" />
      <path d="M24 10C16.268 10 10 16.268 10 24s6.268 14 14 14 14-6.268 14-14S31.732 10 24 10zm6.8 15.4l-7.6 4.4a.8.8 0 01-1.2-.7v-8.8a.8.8 0 011.2-.7l7.6 4.4a.8.8 0 010 1.4z" fill="white" />
    </svg>
  );
}
function LogoHotmart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#FF4D00" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="Arial">H</text>
    </svg>
  );
}
function LogoAsaas({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#00A859" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">A</text>
    </svg>
  );
}
function LogoGA4({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#F9A825" />
      <path d="M14 34V20l7 7 7-14 6 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
function LogoGoogleSheets({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#34A853" />
      <rect x="13" y="10" width="22" height="28" rx="2" fill="white" />
      <path d="M13 20h22M13 27h22M22 10v28" stroke="#34A853" strokeWidth="1.5" />
    </svg>
  );
}
function LogoGoogleCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="11" y="13" width="26" height="24" rx="3" fill="white" stroke="#4285F4" strokeWidth="2" />
      <path d="M20 12v4M28 12v4M11 20h26" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" />
      <text x="50%" y="74%" dominantBaseline="middle" textAnchor="middle" fill="#4285F4" fontSize="11" fontWeight="bold" fontFamily="Arial">31</text>
    </svg>
  );
}
function LogoCalendly({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#006BFF" />
      <circle cx="24" cy="24" r="11" stroke="white" strokeWidth="2.5" fill="none" />
      <path d="M24 18v6l4 2" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
function LogoMake({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#6D00CC" />
      <circle cx="17" cy="24" r="3" fill="white" /><circle cx="31" cy="24" r="3" fill="white" />
      <path d="M20 24h8" stroke="white" strokeWidth="2" />
      <path d="M17 21V17m0 14v-4m14-10v4m0 10v-4" stroke="white" strokeWidth="2" />
    </svg>
  );
}
function LogoZapier({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#FF4A00" />
      <path d="M24 10l2.4 8.6H35l-7 5.1 2.7 8.3L24 27l-6.7 5 2.7-8.3-7-5.1h8.6L24 10z" fill="white" />
    </svg>
  );
}
function LogoN8N({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="12" fill="#EA4B71" />
      <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial">n8n</text>
    </svg>
  );
}

/* ── Catálogo ──────────────────────────────────────────────── */
type IntegrationConnectMode = "credentials" | "oauth" | "webhook_only";

interface IntegrationDef {
  id: string;
  name: string;
  description: string;
  category: string;
  LogoComponent: React.ComponentType<{ className?: string }>;
  connectMode?: IntegrationConnectMode;
  /** Rota que inicia o OAuth quando connectMode === "oauth". */
  oauthStartPath?: string;
  fields?: { name: string; label: string; placeholder?: string; required?: boolean }[];
  /** Slug relativo a /api/webhooks/ (provedores de eventos). */
  webhookSlug?: string;
  /** Caminho absoluto de webhook quando não está sob /api/webhooks/. */
  webhookUrl?: string;
  guideSteps?: string[];
  guideLink?: string;
  guideLinkLabel?: string;
}

const INTEGRATIONS: IntegrationDef[] = [
  /* ── Remarketing & E-mail ─────────────────────────────── */
  {
    id: "gmail",
    name: "Gmail (Remarketing)",
    description: "Envia campanhas e follow-ups por e-mail como befluentschooll@gmail.com via Gmail API.",
    category: "Remarketing & E-mail",
    LogoComponent: LogoGmail,
    connectMode: "oauth",
    oauthStartPath: "/api/remarketing/oauth/start",
    guideSteps: [
      "Acesse console.cloud.google.com e crie (ou selecione) um projeto.",
      "Em APIs e Serviços > Biblioteca, ative a Gmail API.",
      "Em Credenciais, crie um ID do cliente OAuth 2.0 do tipo Aplicativo Web.",
      "Adicione o URI de redirecionamento autorizado exibido abaixo.",
      "Na Tela de consentimento OAuth, adicione o escopo .../auth/gmail.send e a conta befluentschooll@gmail.com como usuário de teste (ou publique o app).",
      "Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET no ambiente e reinicie.",
      "Clique em Conectar abaixo e autorize com a conta befluentschooll@gmail.com.",
    ],
    guideLink: "https://console.cloud.google.com/apis/library/gmail.googleapis.com",
    guideLinkLabel: "Abrir Google Cloud Console",
  },
  {
    id: "resend",
    name: "Resend",
    description: "Opcional: provedor transacional para volume alto. Exige domínio próprio verificado (SPF/DKIM).",
    category: "Remarketing & E-mail",
    LogoComponent: LogoResend,
    connectMode: "credentials",
    fields: [
      { name: "api_key", label: "API Key", placeholder: "re_...", required: true },
      { name: "from_email", label: "Remetente verificado", placeholder: "contato@seudominio.com", required: true },
    ],
    guideSteps: [
      "Crie uma conta em resend.com.",
      "Em Domains, adicione seu domínio e configure os registros SPF e DKIM no DNS.",
      "Aguarde a verificação do domínio ficar Verified.",
      "Em API Keys, gere uma chave com permissão de envio.",
      "Cole a chave e um remetente do domínio verificado. Observação: não é possível enviar como @gmail.com pelo Resend.",
    ],
    guideLink: "https://resend.com/domains",
    guideLinkLabel: "Abrir painel Resend",
  },

  /* ── Ligações com IA ──────────────────────────────────── */
  {
    id: "vapi",
    name: "Vapi (Voz com IA)",
    description: "Telefonia + transcrição + LLM + voz numa API. Faz ligações de saída com o agente de IA.",
    category: "Ligações com IA",
    LogoComponent: LogoVapi,
    connectMode: "credentials",
    webhookUrl: "/api/calls/webhook",
    fields: [
      { name: "api_key", label: "Private API Key", placeholder: "vapi_private_...", required: true },
      { name: "phone_number_id", label: "Phone Number ID", placeholder: "uuid do número", required: true },
      { name: "assistant_id", label: "Assistant ID (opcional)", placeholder: "uuid do assistant" },
    ],
    guideSteps: [
      "Crie uma conta em dashboard.vapi.ai.",
      "Em Phone Numbers, compre ou importe um número e copie o Phone Number ID.",
      "Em Assistants, crie um assistant definindo voz, modelo e system prompt; copie o Assistant ID.",
      "Em API Keys, copie a Private Key.",
      "Cole os valores abaixo e defina VAPI_PRIVATE_KEY, VAPI_PHONE_NUMBER_ID (e VAPI_ASSISTANT_ID) no ambiente.",
      "No assistant/número, configure o Server URL para a URL de webhook exibida abaixo e um Server URL Secret igual a VAPI_WEBHOOK_SECRET.",
    ],
    guideLink: "https://dashboard.vapi.ai",
    guideLinkLabel: "Abrir painel Vapi",
  },
  {
    id: "twilio",
    name: "Twilio",
    description: "Opcional: telefonia bruta para stack self-hosted (Twilio + OpenAI Realtime). Requer bridge de Media Streams.",
    category: "Ligações com IA",
    LogoComponent: LogoTwilio,
    connectMode: "credentials",
    fields: [
      { name: "account_sid", label: "Account SID", placeholder: "AC...", required: true },
      { name: "auth_token", label: "Auth Token", placeholder: "...", required: true },
      { name: "from_number", label: "Número de origem (E.164)", placeholder: "+5511999999999", required: true },
    ],
    guideSteps: [
      "Crie uma conta em twilio.com e compre um número de voz.",
      "Copie o Account SID e o Auth Token do Console.",
      "Defina TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_FROM_NUMBER no ambiente.",
      "Implemente o bridge WebSocket de Media Streams para a OpenAI Realtime API (não incluído).",
    ],
    guideLink: "https://console.twilio.com",
    guideLinkLabel: "Abrir Twilio Console",
  },

  /* ── Analytics & Dados ────────────────────────────────── */
  {
    id: "ga4",
    name: "Google Analytics 4",
    description: "Envia eventos de conversão do CRM para o GA4 via Measurement Protocol.",
    category: "Analytics & Dados",
    LogoComponent: LogoGA4,
    connectMode: "credentials",
    fields: [
      { name: "measurement_id", label: "Measurement ID", placeholder: "G-XXXXXXX", required: true },
      { name: "api_secret", label: "API Secret", placeholder: "gerado em Admin > Data Streams", required: true },
    ],
    guideSteps: [
      "No GA4, abra Admin > Data Streams e selecione o stream da Web.",
      "Copie o Measurement ID (G-...).",
      "Em Measurement Protocol API secrets, crie um segredo e copie o valor.",
      "Cole ambos abaixo.",
    ],
  },
  {
    id: "gsheets",
    name: "Google Sheets",
    description: "Exporta contatos, negócios e métricas de BI para uma planilha.",
    category: "Analytics & Dados",
    LogoComponent: LogoGoogleSheets,
    connectMode: "credentials",
    fields: [
      { name: "spreadsheet_id", label: "Spreadsheet ID", placeholder: "1BxiMVs0XRA5nFMdKvBdB...", required: true },
      { name: "service_account_email", label: "Service Account (e-mail)", placeholder: "...@...iam.gserviceaccount.com", required: true },
    ],
    guideSteps: [
      "No Google Cloud Console, crie uma Service Account e ative a Google Sheets API.",
      "Gere uma chave JSON para a Service Account.",
      "Compartilhe a planilha de destino com o e-mail da Service Account (permissão de editor).",
      "Copie o ID da planilha (da URL, entre /d/ e /edit) e o e-mail da Service Account.",
    ],
  },

  /* ── Pagamentos ───────────────────────────────────────── */
  {
    id: "stripe",
    name: "Stripe",
    description: "Recebe pagamentos e eventos de assinatura. Valide o webhook com a assinatura Stripe-Signature.",
    category: "Pagamentos",
    LogoComponent: LogoStripe,
    connectMode: "credentials",
    webhookSlug: "stripe",
    fields: [{ name: "secret", label: "Secret Key", placeholder: "sk_live_...", required: true }],
    guideSteps: [
      "No painel Stripe, abra Developers > API keys e copie a Secret key.",
      "Em Developers > Webhooks, adicione um endpoint com a URL exibida abaixo.",
      "Selecione os eventos: checkout.session.completed, invoice.paid, customer.subscription.updated.",
      "Copie o Signing secret (whsec_...) para STRIPE_WEBHOOK_SECRET no ambiente.",
    ],
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    description: "Notificações de pagamentos Pix e cartão como eventos no CRM.",
    category: "Pagamentos",
    LogoComponent: LogoMercadoPago,
    connectMode: "credentials",
    webhookSlug: "mercadopago",
    fields: [{ name: "access_token", label: "Access Token", placeholder: "APP_USR-...", required: true }],
    guideSteps: [
      "No Mercado Pago, abra Seus negócios > Configurações > Credenciais.",
      "Copie o Access Token de produção.",
      "Configure a URL de notificações (Webhooks/IPN) apontando para a URL exibida abaixo.",
    ],
  },
  {
    id: "hotmart",
    name: "Hotmart",
    description: "Cria um lead a cada venda ou reembolso na Hotmart.",
    category: "Pagamentos",
    LogoComponent: LogoHotmart,
    connectMode: "credentials",
    webhookSlug: "hotmart",
    fields: [{ name: "secret", label: "Webhook Secret (Hottok)", placeholder: "...", required: true }],
    guideSteps: [
      "Na Hotmart, abra Ferramentas > Webhook (Postback).",
      "Crie um webhook apontando para a URL exibida abaixo.",
      "Copie o token (Hottok) e cole no campo acima.",
      "Selecione os eventos: PURCHASE_COMPLETE, PURCHASE_REFUNDED, PURCHASE_CANCELED.",
    ],
  },
  {
    id: "asaas",
    name: "ASAAS",
    description: "Gestão de cobranças e assinaturas (Pix/boleto/cartão) no Brasil.",
    category: "Pagamentos",
    LogoComponent: LogoAsaas,
    connectMode: "credentials",
    fields: [{ name: "api_key", label: "API Key", placeholder: "$aact_...", required: true }],
    guideSteps: [
      "No ASAAS, abra Configurações > Integrações > API.",
      "Gere uma chave de API de produção e cole acima.",
    ],
  },

  /* ── Agenda & Reuniões ────────────────────────────────── */
  {
    id: "google_cal",
    name: "Google Agenda + Meet",
    description: "Agenda reuniões direto do CRM com link do Google Meet gerado automaticamente.",
    category: "Agenda & Reuniões",
    LogoComponent: LogoGoogleCalendar,
    connectMode: "oauth",
    oauthStartPath: "/api/calendar/oauth/start",
    guideSteps: [
      "Acesse console.cloud.google.com e selecione o mesmo projeto usado no Gmail (Remarketing), ou crie um novo.",
      "Em APIs e Serviços > Biblioteca, ative a Google Calendar API.",
      "No mesmo ID do cliente OAuth 2.0 do Gmail (ou um novo), adicione o URI de redirecionamento exibido abaixo.",
      "Na Tela de consentimento OAuth, adicione o escopo .../auth/calendar.events.",
      "Defina GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET no ambiente (mesmas variáveis do Gmail) e reinicie.",
      "Clique em Conectar abaixo e autorize com a conta Google que vai criar os eventos.",
    ],
    guideLink: "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com",
    guideLinkLabel: "Abrir Google Cloud Console",
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Cria uma atividade quando um agendamento Calendly é confirmado.",
    category: "Agenda & Reuniões",
    LogoComponent: LogoCalendly,
    connectMode: "credentials",
    fields: [{ name: "token", label: "Personal Access Token", placeholder: "eyJ...", required: true }],
    guideSteps: [
      "No Calendly, abra Integrations > API & Webhooks.",
      "Gere um Personal Access Token e cole acima.",
    ],
  },

  /* ── Automação & Fluxo ────────────────────────────────── */
  {
    id: "zapier",
    name: "Zapier",
    description: "Conecta o Beely a mais de 5.000 apps via webhook.",
    category: "Automação & Fluxo",
    LogoComponent: LogoZapier,
    connectMode: "webhook_only",
    webhookSlug: "zapier",
    guideSteps: [
      "No Zapier, crie um Zap com o trigger Webhooks by Zapier.",
      "Use a URL do Beely exibida abaixo para enviar eventos ao CRM, ou aponte um Action para a URL gerada pelo Zapier.",
    ],
  },
  {
    id: "make",
    name: "Make (Integromat)",
    description: "Cenários de automação conectando o Beely a qualquer app.",
    category: "Automação & Fluxo",
    LogoComponent: LogoMake,
    connectMode: "webhook_only",
    webhookSlug: "make",
    guideSteps: [
      "No Make, crie um Scenario com o módulo Webhooks > Custom webhook.",
      "Use a URL do Beely abaixo para receber dados, ou cole a URL do Make na integração de origem.",
    ],
  },
  {
    id: "n8n",
    name: "n8n",
    description: "Fluxos avançados de automação self-hosted.",
    category: "Automação & Fluxo",
    LogoComponent: LogoN8N,
    connectMode: "webhook_only",
    webhookSlug: "n8n",
    guideSteps: [
      "No n8n, adicione um nó Webhook como trigger.",
      "Adicione um nó HTTP Request apontando para a URL do Beely exibida abaixo.",
    ],
  },
];

const CATEGORIES = [...new Set(INTEGRATIONS.map((i) => i.category))];

/* ── Modal de configuração ─────────────────────────────────── */
function ConfigModal({
  integration,
  existingCredentials,
  onSave,
  onDisconnect,
  onClose,
}: {
  integration: IntegrationDef;
  existingCredentials?: Record<string, string>;
  onSave: (credentials: Record<string, string>) => void;
  onDisconnect: () => void;
  onClose: () => void;
}) {
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const { LogoComponent } = integration;
  const isConnected = !!existingCredentials;
  const mode: IntegrationConnectMode = integration.connectMode ?? "credentials";

  const [values, setValues] = useState<Record<string, string>>(() => ({ ...(existingCredentials ?? {}) }));
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [showGuide, setShowGuide] = useState(!isConnected && !!integration.guideSteps);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "oauth") {
      if (integration.oauthStartPath) window.location.href = integration.oauthStartPath;
      return;
    }
    const requiredFields = (integration.fields ?? []).filter((f) => f.required);
    const newErrors: Record<string, boolean> = {};
    for (const f of requiredFields) if (!values[f.name]?.trim()) newErrors[f.name] = true;
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    onSave(values);
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <LogoComponent className="size-8 shrink-0" />
            {isConnected ? "Gerenciar" : "Conectar"} {integration.name}
          </DialogTitle>
          <DialogDescription>{integration.description}</DialogDescription>
        </DialogHeader>

        {integration.guideSteps && (
          <div>
            <button
              type="button"
              onClick={() => setShowGuide((v) => !v)}
              className="flex items-center gap-2 text-xs text-primary hover:underline mb-2"
            >
              <Info className="size-3.5" />
              {showGuide ? "Ocultar guia de configuração" : "Ver guia de configuração"}
            </button>
            {showGuide && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2 mb-2">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Como configurar</p>
                <ol className="space-y-1.5">
                  {integration.guideSteps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                      <span className="size-4 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold mt-0.5">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                {integration.guideLink && (
                  <a
                    href={integration.guideLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2 hover:underline"
                  >
                    <ExternalLink className="size-3" />
                    {integration.guideLinkLabel ?? integration.guideLink}
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {mode !== "oauth" && integration.fields && integration.fields.length > 0 && (
            <div className="space-y-3">
              {integration.fields.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <Label className="flex items-center gap-1">
                    {f.label}
                    {f.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    name={f.name}
                    placeholder={f.placeholder}
                    value={values[f.name] ?? ""}
                    onChange={(e) => {
                      setValues((v) => ({ ...v, [f.name]: e.target.value }));
                      setErrors((v) => ({ ...v, [f.name]: false }));
                    }}
                    className={cn(errors[f.name] && "border-destructive focus-visible:ring-destructive")}
                  />
                  {errors[f.name] && (
                    <p className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="size-3" /> Campo obrigatório
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {(integration.webhookSlug || integration.webhookUrl) && (
            <div className="space-y-1.5">
              <Label>URL do Webhook (cole no painel do provedor)</Label>
              <CopyField value={`${appUrl}${integration.webhookUrl ?? `/api/webhooks/${integration.webhookSlug}`}`} />
            </div>
          )}

          {integration.id === "gmail" && (
            <div className="space-y-1.5">
              <Label>URI de redirecionamento autorizado (cole no Google Cloud Console)</Label>
              <CopyField value={`${appUrl}/api/remarketing/oauth/callback`} />
            </div>
          )}

          {integration.id === "google_cal" && (
            <div className="space-y-1.5">
              <Label>URI de redirecionamento autorizado (cole no Google Cloud Console)</Label>
              <CopyField value={`${appUrl}/api/calendar/oauth/callback`} />
            </div>
          )}

          {mode === "oauth" && (
            <p className="text-sm text-muted-foreground">
              Esta integração usa OAuth. Ao conectar, você autoriza o acesso na sua Conta Google e volta para o Beely.
            </p>
          )}
          {mode === "webhook_only" && (
            <p className="text-sm text-muted-foreground">
              Sem credenciais: copie a URL do webhook acima para o painel do provedor.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            {isConnected && (
              <Button type="button" variant="destructive" size="sm" className="gap-1.5" onClick={onDisconnect}>
                <Trash2 className="size-3.5" /> Desconectar
              </Button>
            )}
            <Button type="submit" className="flex-1">
              {mode === "oauth"
                ? (isConnected ? "Reconectar com Google" : "Conectar com Google")
                : isConnected ? "Salvar alterações" : mode === "webhook_only" ? "Marcar como conectado" : "Conectar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Card ──────────────────────────────────────────────────── */
function IntegrationCard({
  integration,
  connected,
  onConnect,
}: {
  integration: IntegrationDef;
  connected: boolean;
  onConnect: (id: string) => void;
}) {
  const { LogoComponent } = integration;
  return (
    <div className={cn(
      "flex flex-col gap-3 rounded-xl border p-4 transition-all",
      connected ? "border-primary/30 bg-primary/5" : "border-border bg-card hover:border-border/80 hover:bg-white/[0.03]"
    )}>
      <div className="flex items-start justify-between gap-2">
        <LogoComponent className="size-10 shrink-0 rounded-xl" />
        {connected && (
          <Badge variant="success" className="flex items-center gap-1 text-[10px]">
            <CheckCircle2 className="size-3" /> Conectado
          </Badge>
        )}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold">{integration.name}</p>
        <p className="mt-0.5 line-clamp-3 text-xs text-muted-foreground">{integration.description}</p>
      </div>
      <Button
        size="sm"
        variant={connected ? "outline" : "default"}
        className="w-full"
        onClick={() => onConnect(integration.id)}
      >
        {connected ? (<><Settings className="size-3.5" /> Gerenciar</>) : (<><Plus className="size-3.5" /> Conectar</>)}
      </Button>
    </div>
  );
}

/* ── View principal ────────────────────────────────────────── */
export function IntegrationsView() {
  const hydrated = useHydrated();
  const integrations = useStore((s) => s.integrations);
  const saveIntegration = useStore((s) => s.saveIntegration);
  const removeIntegration = useStore((s) => s.removeIntegration);

  const [activeCategory, setActiveCategory] = useState("Todos");
  const [configuring, setConfiguring] = useState<IntegrationDef | null>(null);

  const filtered = activeCategory === "Todos"
    ? INTEGRATIONS
    : INTEGRATIONS.filter((i) => i.category === activeCategory);

  function handleConnect(id: string) {
    const integration = INTEGRATIONS.find((i) => i.id === id);
    if (integration) setConfiguring(integration);
  }

  function handleSave(credentials: Record<string, string>) {
    if (!configuring) return;
    saveIntegration(configuring.id, credentials);
    toast.success(`${configuring.name} conectado.`);
    setConfiguring(null);
  }

  function handleDisconnect() {
    if (!configuring) return;
    removeIntegration(configuring.id);
    toast.success(`${configuring.name} desconectado.`);
    setConfiguring(null);
  }

  if (!hydrated) return null;

  const connectedCount = Object.keys(integrations).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-wrap gap-2">
          {["Todos", ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
                activeCategory === cat
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              )}
            >
              {cat}
              {cat === "Todos" && <span className="ml-1.5 text-[10px] opacity-60">{INTEGRATIONS.length}</span>}
            </button>
          ))}
        </div>
        {connectedCount > 0 && (
          <span className="text-xs text-muted-foreground">
            <CheckCircle2 className="inline size-3 text-primary mr-1" />
            {connectedCount} {connectedCount === 1 ? "integração ativa" : "integrações ativas"}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            connected={!!integrations[integration.id]}
            onConnect={handleConnect}
          />
        ))}
      </div>

      {configuring && (
        <ConfigModal
          integration={configuring}
          existingCredentials={integrations[configuring.id]?.credentials}
          onSave={handleSave}
          onDisconnect={handleDisconnect}
          onClose={() => setConfiguring(null)}
        />
      )}
    </div>
  );
}
