-- ============================================================
-- Beely CRM — setup/reparo de persistência no Supabase
-- Rode este script uma vez no SQL Editor do Supabase (Project > SQL Editor).
-- É 100% aditivo/idempotente — seguro rodar mais de uma vez, não apaga nada.
-- ============================================================

-- 1) Função RPC exec_sql — pré-requisito de TODO o auto-schema do Beely
--    (rotas /api/*/init-schema, message-store.ts, followup-store.ts etc.
--    criam/alteram tabelas em runtime chamando esta função). Sem ela, o
--    app falha silenciosamente e nada é persistido de verdade.
create or replace function exec_sql(sql text)
returns void
language plpgsql
security definer
as $$
begin
  execute sql;
end;
$$;

-- 2) Tabela sdrs — SDRs com WhatsApp Business (Z-API ou Meta Cloud API).
create table if not exists sdrs (
  id text primary key,
  name text not null,
  email text,
  avatar_color text,
  active boolean not null default true,
  wa_provider text,
  zapi_instance_id text,
  zapi_token text,
  zapi_client_token text,
  meta_phone_number_id text,
  meta_access_token text,
  meta_waba_id text,
  meta_verify_token text,
  phone_display text,
  created_at timestamptz default now()
);

-- 3) Tabela conversation_assignments (reservada para uso futuro).
create table if not exists conversation_assignments (
  thread_key text primary key,
  sdr_id text,
  contact_id text,
  updated_at timestamptz default now()
);

-- 4) inbox_messages — garante todas as colunas usadas pelo app,
--    incluindo sdr_id/thread_key do Inbox multi-SDR.
create table if not exists inbox_messages (
  id text primary key,
  channel text not null default 'whatsapp',
  "from" text not null,
  from_name text,
  text text,
  timestamp bigint not null,
  from_me boolean default false,
  sender_photo text,
  msg_type text default 'text',
  media_url text,
  media_caption text,
  file_name text,
  is_lid boolean default false,
  sdr_id text,
  thread_key text
);

alter table inbox_messages add column if not exists sender_photo text;
alter table inbox_messages add column if not exists from_me boolean default false;
alter table inbox_messages add column if not exists msg_type text default 'text';
alter table inbox_messages add column if not exists media_url text;
alter table inbox_messages add column if not exists media_caption text;
alter table inbox_messages add column if not exists file_name text;
alter table inbox_messages add column if not exists is_lid boolean default false;
alter table inbox_messages add column if not exists sdr_id text;
alter table inbox_messages add column if not exists thread_key text;

-- 5) Limpeza: apaga as conversas "órfãs" sem SDR vinculado — histórico
--    anterior ao Inbox multi-SDR, que hoje só polui a lista de conversas.
--    Rode manualmente quando quiser (não está no fluxo automático do app).
-- delete from inbox_messages where sdr_id is null;

-- 6) Índices básicos de performance.
create index if not exists inbox_messages_thread_idx on inbox_messages (thread_key);
create index if not exists inbox_messages_sdr_idx on inbox_messages (sdr_id);
create index if not exists inbox_messages_timestamp_idx on inbox_messages (timestamp);

-- 7) RLS (Row Level Security) — CAUSA RAIZ do "SDR não salva".
--    O Beely faz as mutações do CRM (contacts, deals, sdrs, etc.) direto do
--    NAVEGADOR usando a anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) — é assim
--    que o app inteiro sempre funcionou, sem tabela de policy nenhuma. Tabelas
--    antigas (deals, contacts, pipelines...) provavelmente foram criadas sem
--    RLS habilitado. A tabela "sdrs" é nova — se o Supabase ligou RLS nela
--    por padrão (comportamento comum em projetos recentes), a anon key fica
--    SEM PERMISSÃO NENHUMA de escrever, e o INSERT falha silenciosamente
--    (o app engolia esse erro; agora já loga, mas o problema é este aqui).
--    Desabilita RLS nas tabelas novas do Inbox multi-SDR e do Playbook,
--    alinhando com o padrão (sem RLS) do resto do banco.
alter table sdrs disable row level security;
alter table inbox_messages disable row level security;
alter table conversation_assignments disable row level security;

-- Se as tabelas abaixo existirem (Playbook Comercial Be Fluent v3 / módulos
-- de e-mail e ligações), garante o mesmo padrão — idempotente, não falha se
-- a tabela ainda não existir.
do $$
begin
  if to_regclass('public.followup_playbook_templates') is not null then
    execute 'alter table followup_playbook_templates disable row level security';
  end if;
  if to_regclass('public.followup_playbook_log') is not null then
    execute 'alter table followup_playbook_log disable row level security';
  end if;
  if to_regclass('public.stage_benchmarks') is not null then
    execute 'alter table stage_benchmarks disable row level security';
  end if;
end $$;

-- ============================================================
-- Depois de rodar este script, acesse (no navegador, logado no app):
--   https://SEU-APP.onrender.com/api/debug/supabase-status
-- Deve responder { "ok": true, "execSql": { "available": true }, ... }
-- ============================================================
