import type { Metadata } from "next";
import { DocTitle, DocLead, DocH2, DocP, DocCode, DocList } from "@/components/docs/doc";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Webhooks & Integrações" };

export default function IntegrationsDocs() {
  return (
    <>
      <DocTitle>Webhooks & Integrações</DocTitle>
      <DocLead>Conecte o {SITE.name} a N8N, Zapier, Make e às suas ferramentas de mensageria.</DocLead>

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

      <DocH2 id="canais">Conectar WhatsApp, Instagram e Messenger</DocH2>
      <DocP>
        Em <strong>Configurações → Canais</strong>, escolha o canal e o provedor. Suportamos abordagem
        híbrida — use a API oficial da Meta ou provedores alternativos:
      </DocP>
      <DocList
        items={[
          <><strong>WhatsApp:</strong> Meta Cloud API (oficial), Z-API ou Evolution API.</>,
          <><strong>Instagram Direct:</strong> Instagram Graph API (conta Business).</>,
          <><strong>Messenger:</strong> Meta Messenger Platform.</>,
        ]}
      />
      <DocP>
        Para WhatsApp Cloud API, configure o webhook de verificação apontando para a URL abaixo e use o
        token definido em <code className="rounded bg-secondary px-1 py-0.5 text-xs">WHATSAPP_VERIFY_TOKEN</code>:
      </DocP>
      <DocCode>{`https://app.beely.com/api/webhooks/whatsapp`}</DocCode>

      <DocH2 id="zapier">Zapier & Make</DocH2>
      <DocP>
        Como os webhooks são genéricos (JSON), você conecta facilmente via os módulos &quot;Webhooks&quot; do
        Zapier ou Make, sem necessidade de app dedicado.
      </DocP>
    </>
  );
}
