# Beely CRM

CRM comercial white-label (Next.js 16 + Supabase). Identidade visual própria, sem referência de
marca exceto a linha legal obrigatória no rodapé.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Supabase** — Postgres, Auth (Google + e-mail/senha), Storage, Realtime
- **Drizzle ORM** — schema e migrations (`src/db/schema.ts`)
- **Tailwind CSS v4** + componentes próprios (estilo shadcn) + Recharts + dnd-kit
- **Stripe** (assinaturas + trial 14d) · **Resend** (e-mails) · **N8N/webhooks** (integrações)

## Rodando localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

O projeto inicia em **modo demo** (`NEXT_PUBLIC_DEMO_MODE=true` em `.env.local`): todo o produto
é navegável com dados mockados, sem precisar de Supabase/Stripe. Login/cadastro/Google entram
direto no app; "Esqueci minha senha" simula o envio.

### Ativando o backend real

1. Copie `.env.example` para `.env.local` e preencha as credenciais (Supabase, Stripe, Resend).
2. Defina `NEXT_PUBLIC_DEMO_MODE=false`.
3. Gere e aplique o schema no Postgres do Supabase:
   ```bash
   npm run db:generate
   npm run db:push
   ```
4. Habilite o provedor Google em Authentication → Providers no painel Supabase.

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run typecheck` | Checagem de tipos |
| `npm run lint` | ESLint |
| `npm run db:push` | Aplica o schema Drizzle no banco |
| `npm run db:studio` | Drizzle Studio (explorar o banco) |

## Estrutura

```
src/
  app/
    (marketing)/   landing, planos, /docs (documentação pública)
    (auth)/        login, signup, forgot-password
    (app)/         dashboard, contatos, empresas, pipeline, inbox,
                   atividades, automacoes, relatorios, configuracoes
    api/           v1/ (API REST pública), auth/ (senha temporária), auth/callback
  components/      ui/ (primitivos), app/ (shell+features), marketing/, docs/, auth/
  db/              schema Drizzle + conexão
  lib/             site config, demo data, env, supabase clients, auth actions
  proxy.ts         proteção de rotas (Middleware do Next 16)
```

## Marca

- Paleta: laranja `#E59313`, grafite `#2B2B2B`, navy `#001E3C`, branco `#FFFFFF`.
- Fontes: Plus Jakarta Sans (títulos) + Inter (corpo).
- Rodapé obrigatório em todo o sistema: **Desenvolvido por Be Fluent Idiomas & Ensino LTDA.**

## Fluxo "Esqueci minha senha"

`/api/auth/forgot-password` gera uma **senha temporária**, marca `must_change_password` e a envia
via Resend. O usuário entra com ela e é obrigado a definir uma nova senha dentro do app.
