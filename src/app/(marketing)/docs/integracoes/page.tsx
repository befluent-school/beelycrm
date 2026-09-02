import type { Metadata } from "next";
import { DocTitle, DocLead, DocH2, DocP, DocCode, DocList } from "@/components/docs/doc";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Webhooks & Integrações" };

export default function IntegrationsDocs() {
  return (
    <>
      <DocTitle>Webhooks & Integrações</DocTitle>
      <DocLead>Conecte o {SITE.name} ao Gmail (remarketing), Vapi (ligações com IA), analytics, pagamentos e automação.</DocLead>

      <DocH2 id="webhooks">Webhooks</DocH2>
      <DocP>
        Cadastre uma URL em <strong>Configurações → Integrações</strong> e escolha os eventos. Enviamos
        um <code className="rounded bg-secondary px-1 py-0.5 text-xs">POST</code> JSON a cada ocorrência, assinado com HMAC SHA-256 no header
        {" "}<code className="rounded bg-secondary px-1 py-0.5 text-xs">X-Beely-Signature</code>.
      </DocP>
      <DocP>Eventos disponíveis:</DocP>
      <DocList
        items={[
          <><code>contact.created</code> · <code>contact.updated</code></>,
          <><code>deal.created</code> · <code>deal.stage_changed</code> · <code>deal.won</code> · <code>deal.lost</code></>,
          <><code>message.received</code> · <code>message.sent</code></>,
          <><code>activity.created</code> · <code>form.submitted</code></>,
        ]}
      />
      <DocP>Exemplo de payload:</DocP>
      <DocCode>{`{
  "event": "deal.won",
  "created_at": "2026-05-28T12:00:00Z",
  "data": {
    "id": "dl_9x8y7z",
    "title": "Plano anual — TechBR",
    "value": 24000.00,
    "owner": "Ana Martins"
  }
}`}</DocCode>

      <DocH2 id="n8n">Fluxos com N8N</DocH2>
      <DocP>
        Use o nó <strong>Webhook</strong> do N8N para receber eventos do {SITE.name}, e o nó{" "}
        <strong>HTTP Request</strong> para chamar nossa API de volta. Fluxo típico:
      </DocP>
      <DocList
        items={[
          <>Gatilho: <code>message.received</code> chega no webhook do N8N.</>,
          <>N8N consulta um sistema externo (ERP, planilha, IA).</>,
          <>N8N chama <code>POST /api/v1/activities</code> ou move o negócio de etapa.</>,
        ]}
      />
      <DocCode>{`# Nó HTTP Request (N8N) chamando a API
Method: POST
URL: https://app.beely.com/api/v1/contacts
Headers:
  Authorization: Bearer bly_live_...
  Content-Type: application/json
Body: {{ $json.contato }}`}</DocCode>

      <DocH2 id="remarketing">Remarketing por e-mail e Ligações com IA</DocH2>
      <DocP>
        <strong>Remarketing (Gmail API):</strong> em <strong>Integrações → Gmail</strong>, siga o guia para
        criar as credenciais OAuth no Google Cloud Console, defina{" "}
        <code className="rounded bg-secondary px-1 py-0.5 text-xs">GOOGLE_OAUTH_CLIENT_ID</code> e{" "}
        <code className="rounded bg-secondary px-1 py-0.5 text-xs">GOOGLE_OAUTH_CLIENT_SECRET</code> no ambiente
        e conecte a conta {SITE.email} em <strong>Remarketing → Conta de envio</strong>. Os e-mails são
        enviados via <code className="rounded bg-secondary px-1 py-0.5 text-xs">gmail.users.messages.send</code>{" "}
        com escopo <code className="rounded bg-secondary px-1 py-0.5 text-xs">gmail.send</code>. Abertura e
        clique são rastreados por pixel e redirecionador próprios.
      </DocP>
      <DocP>
        <strong>Ligações com IA (Vapi):</strong> em <strong>Integrações → Vapi</strong>, informe a Private
        API Key, o Phone Number ID e (opcional) o Assistant ID. Configure o Server URL do assistant/número
        para a URL de webhook abaixo, com o mesmo segredo de{" "}
        <code className="rounded bg-secondary px-1 py-0.5 text-xs">VAPI_WEBHOOK_SECRET</code>:
      </DocP>
      <DocCode>{`https://app.beely.com/api/calls/webhook`}</DocCode>
      <DocP>
        As ligações são iniciadas via <code className="rounded bg-secondary px-1 py-0.5 text-xs">POST https://api.vapi.ai/call</code>{" "}
        e o webhook normaliza os eventos <code>status-update</code> e <code>end-of-call-report</code> em
        status, duração, custo, gravação, transcrição e resumo.
      </DocP>

      <DocH2 id="zapier">Zapier & Make</DocH2>
      <DocP>
        Como os webhooks são genéricos (JSON), você conecta facilmente via os módulos &quot;Webhooks&quot; do
        Zapier ou Make, sem necessidade de app dedicado.
      </DocP>
    </>
  );
}
