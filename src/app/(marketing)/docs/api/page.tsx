import type { Metadata } from "next";
import { DocTitle, DocLead, DocH2, DocP, DocCode } from "@/components/docs/doc";
import { Badge } from "@/components/ui/badge";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Referência da API" };

export default function ApiDocs() {
  return (
    <>
      <DocTitle>Referência da API</DocTitle>
      <DocLead>API REST para ler e gravar dados do {SITE.name} a partir de qualquer aplicação.</DocLead>

      <DocH2 id="auth">Autenticação</DocH2>
      <DocP>
        Todas as requisições usam uma API key no header <code className="rounded bg-secondary px-1 py-0.5 text-xs">Authorization</code>.
        Gere suas chaves em <strong>Configurações → Integrações</strong>. Nunca exponha a chave no front-end.
      </DocP>
      <DocCode>{`curl https://app.beely.com/api/v1/contacts \\
  -H "Authorization: Bearer bly_live_8Kd2xY7pQ1wEr3Ts9Uv2Bn4"`}</DocCode>

      <DocH2 id="base">URL base & versionamento</DocH2>
      <DocP>Todos os endpoints ficam sob <code className="rounded bg-secondary px-1 py-0.5 text-xs">/api/v1</code>. Respostas são JSON.</DocP>

      <DocH2 id="contacts">Endpoints de Contatos</DocH2>
      <div className="mt-4 space-y-4">
        <Endpoint method="GET" path="/api/v1/contacts" desc="Lista os contatos da organização." />
        <Endpoint method="POST" path="/api/v1/contacts" desc="Cria um novo contato." />
        <Endpoint method="GET" path="/api/v1/contacts/:id" desc="Detalha um contato." />
        <Endpoint method="PATCH" path="/api/v1/contacts/:id" desc="Atualiza um contato." />
      </div>

      <DocP>Exemplo de criação:</DocP>
      <DocCode>{`curl -X POST https://app.beely.com/api/v1/contacts \\
  -H "Authorization: Bearer bly_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "João Silva",
    "email": "joao@empresa.com",
    "phone": "+55 11 99999-0000",
    "source": "api"
  }'`}</DocCode>

      <DocP>Resposta:</DocP>
      <DocCode>{`{
  "object": "contact",
  "id": "ct_a1b2c3",
  "name": "João Silva",
  "email": "joao@empresa.com",
  "score": 0,
  "created_at": "2026-05-28T12:00:00Z"
}`}</DocCode>

      <DocH2 id="deals">Endpoints de Negócios & Atividades</DocH2>
      <div className="mt-4 space-y-4">
        <Endpoint method="GET" path="/api/v1/deals" desc="Lista negócios (filtros: ?stage, ?owner)." />
        <Endpoint method="POST" path="/api/v1/deals" desc="Cria um negócio no funil." />
        <Endpoint method="POST" path="/api/v1/activities" desc="Registra uma atividade (tarefa, ligação, reunião)." />
      </div>

      <DocH2 id="errors">Erros</DocH2>
      <DocP>Códigos HTTP padrão: 200/201 sucesso, 401 não autenticado, 422 validação, 429 limite de taxa.</DocP>
      <DocCode>{`{ "error": "validation", "message": "Campo 'name' é obrigatório." }`}</DocCode>
    </>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const color =
    method === "GET" ? "success" : method === "POST" ? "default" : method === "PATCH" ? "warning" : "secondary";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <Badge variant={color as "success" | "default" | "warning" | "secondary"} className="font-mono">{method}</Badge>
      <code className="font-mono text-sm">{path}</code>
      <span className="text-sm text-muted-foreground">{desc}</span>
    </div>
  );
}
