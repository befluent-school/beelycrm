-- ============================================================
-- BEELY CRM — Schema Supabase
-- Cole este SQL no Supabase SQL Editor e clique em Run
-- ============================================================

-- Extensão para UUID
create extension if not exists "pgcrypto";

-- ── Pipelines ────────────────────────────────────────────────
create table if not exists pipelines (
  id          text primary key,
  name        text not null,
  stages      jsonb not null default '[]',
  created_at  timestamptz default now()
);

-- ── Contacts ─────────────────────────────────────────────────
create table if not exists contacts (
  id                   text primary key,
  name                 text not null,
  email                text,
  phone                text,
  company              text,
  fantasy_name         text,
  source               text,
  campaign             text,
  funnel               text,
  stage                text,
  status               text,
  team                 text,
  score                int default 0,
  tags                 jsonb default '[]',
  owner                text,
  cep                  text,
  country              text,
  state                text,
  city                 text,
  neighborhood         text,
  street               text,
  complement           text,
  number               text,
  company_cep          text,
  company_country      text,
  company_state        text,
  company_city         text,
  company_neighborhood text,
  company_street       text,
  company_complement   text,
  company_number       text,
  cpf_cnpj             text,
  product              text,
  product_value        numeric,
  product_desc         text,
  meta_ad_id           text,
  meta_ad_name         text,
  meta_adset_id        text,
  meta_adset_name      text,
  meta_campaign_id     text,
  meta_campaign_name   text,
  meta_form_id         text,
  meta_form_name       text,
  meta_page_id         text,
  meta_page_name       text,
  meta_leadgen_id      text,
  meta_platform        text,
  utm_url              text,
  utm_medium           text,
  utm_source           text,
  utm_campaign         text,
  utm_term             text,
  utm_content          text,
  urgency              text,
  investment_intent    text,
  job_title            text,
  monthly_budget       text,
  contact_preference   text,
  main_challenge       text,
  sector               text,
  class_frequency      text,
  professional_moment  text,
  discarded            boolean default false,
  discard_reason       text,
  discard_desc         text,
  first_note           text,
  first_task           text,
  registered_at        text,
  external_id          text,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ── Deals ─────────────────────────────────────────────────────
create table if not exists deals (
  id               text primary key,
  title            text not null,
  value            numeric default 0,
  pipeline_id      text references pipelines(id) on delete cascade,
  stage_id         text not null,
  contact          text,
  contact_id       text references contacts(id) on delete set null,
  owner            text,
  tags             jsonb default '[]',
  status           text default 'open',
  lost_reason      text,
  notes            text,
  history          jsonb default '[]',
  stage_entered_at timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── Activities ────────────────────────────────────────────────
create table if not exists activities (
  id         text primary key,
  type       text not null,
  title      text not null,
  due        text,
  due_date   text,
  due_time   text,
  contact    text,
  done       boolean default false,
  deal_id    text references deals(id) on delete set null,
  notes      text,
  created_at timestamptz default now()
);

-- ── Companies ─────────────────────────────────────────────────
create table if not exists companies (
  id         text primary key,
  name       text not null,
  domain     text,
  phone      text,
  segment    text,
  notes      text,
  owner      text,
  created_at timestamptz default now()
);

-- ── Automations ───────────────────────────────────────────────
create table if not exists automations (
  id         text primary key,
  name       text not null,
  trigger    text,
  action     text,
  active     boolean default true,
  created_at timestamptz default now()
);

-- ── Scoring Rules ─────────────────────────────────────────────
create table if not exists scoring_rules (
  id         text primary key,
  label      text not null,
  points     int default 0,
  created_at timestamptz default now()
);

-- ── Connected Channels ────────────────────────────────────────
create table if not exists connected_channels (
  type          text primary key,
  provider      text,
  credentials   jsonb default '{}',
  connected_at  timestamptz default now()
);

-- ── Integrations ─────────────────────────────────────────────
create table if not exists integrations (
  id            text primary key,
  credentials   jsonb default '{}',
  connected_at  timestamptz default now()
);

-- ── Financial Config (linha única por organização) ────────────
create table if not exists financial_config (
  id                      text primary key default 'default',
  monthly_marketing_spend numeric default 0,
  avg_contract_months     numeric default 12,
  monthly_churn_rate      numeric default 5,
  avg_cost_per_student    numeric default 0,
  revenue_goal_monthly    numeric default 0,
  leads_per_month         numeric default 0,
  updated_at              timestamptz default now()
);

-- Garante que existe a linha default
insert into financial_config (id) values ('default') on conflict do nothing;

-- ── Row Level Security — desabilita (app single-tenant) ───────
-- Se quiser multi-tenant futuramente, habilite RLS e adicione políticas.
alter table pipelines          disable row level security;
alter table contacts           disable row level security;
alter table deals              disable row level security;
alter table activities         disable row level security;
alter table companies          disable row level security;
alter table automations        disable row level security;
alter table scoring_rules      disable row level security;
alter table connected_channels disable row level security;
alter table integrations       disable row level security;
alter table financial_config   disable row level security;

-- ── Índices úteis ─────────────────────────────────────────────
create index if not exists idx_deals_pipeline    on deals(pipeline_id);
create index if not exists idx_deals_contact_id  on deals(contact_id);
create index if not exists idx_deals_status      on deals(status);
create index if not exists idx_contacts_phone    on contacts(phone);
create index if not exists idx_contacts_email    on contacts(email);
create index if not exists idx_activities_deal   on activities(deal_id);
