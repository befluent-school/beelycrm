import {
  pgTable,
  text,
  timestamp,
  integer,
  bigserial,
  numeric,
  boolean,
  bigint,
  jsonb,
  index,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Fonte real de verdade do schema do Beely CRM — reconciliado a partir do
 * banco Supabase em produção (supabase-schema.sql, supabase-setup.sql, e
 * toda rota init-schema/exec_sql do código), não reescrito do zero.
 *
 * Decisões importantes, todas espelhando a realidade e não um redesenho:
 * - App é single-tenant hoje. NENHUMA tabela tem org_id — a versão anterior
 *   deste arquivo tinha org_id em quase tudo, mas nada no código grava ou lê
 *   esse campo. Adicionar multi-tenant real é fora de escopo desta migração
 *   (sair do Supabase), não uma mudança a fazer de passagem.
 * - A maioria dos IDs é `text` gerado pela própria aplicação (uid() no
 *   store, ou prefixos como sdr_/scr_), não uuid. Tabelas mais novas
 *   (email_*, call_*) usam uuid — mantido como está, não uniformizado.
 * - trigger/action de automations continuam `text` (hoje guardam JSON
 *   stringificado OU texto livre legado) — não virou jsonb pra não quebrar
 *   linhas antigas em formato livre.
 * - Sem enums Postgres onde o código real grava texto livre (status, tipo
 *   de canal, etc.) — enum rígido quebraria qualquer valor fora da lista
 *   que já exista em produção.
 */

/* ─── Pipelines & etapas ─────────────────────────────────── */
export const pipelines = pgTable("pipelines", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // Etapas vivem aqui, não na tabela stages — é o que o app lê de verdade.
  stages: jsonb("stages").$type<{ id: string; name: string; probability: number }[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Espelho desnormalizado — só escrito por /api/migrate, nunca lido pelo app.
// Mantido pela FK real que já existe em produção (deals não referencia,
// pipelines.stages jsonb é a fonte real).
export const stages = pgTable(
  "stages",
  {
    id: text("id").primaryKey(),
    pipelineId: text("pipeline_id").references(() => pipelines.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    probability: integer("probability").default(0),
    position: integer("position").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("stages_pipeline_idx").on(t.pipelineId)]
);

/* ─── Contatos ───────────────────────────────────────────── */
export const contacts = pgTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    company: text("company"),
    fantasyName: text("fantasy_name"),
    source: text("source"),
    campaign: text("campaign"),
    funnel: text("funnel"),
    stage: text("stage"),
    status: text("status"),
    team: text("team"),
    score: integer("score").default(0),
    tags: jsonb("tags").$type<string[]>().default([]),
    owner: text("owner"),
    // Endereço
    cep: text("cep"),
    country: text("country"),
    state: text("state"),
    city: text("city"),
    neighborhood: text("neighborhood"),
    street: text("street"),
    complement: text("complement"),
    number: text("number"),
    // Endereço da empresa
    companyCep: text("company_cep"),
    companyCountry: text("company_country"),
    companyState: text("company_state"),
    companyCity: text("company_city"),
    companyNeighborhood: text("company_neighborhood"),
    companyStreet: text("company_street"),
    companyComplement: text("company_complement"),
    companyNumber: text("company_number"),
    cpfCnpj: text("cpf_cnpj"),
    product: text("product"),
    productValue: numeric("product_value"),
    productDesc: text("product_desc"),
    // Meta Ads
    metaAdId: text("meta_ad_id"),
    metaAdName: text("meta_ad_name"),
    metaAdsetId: text("meta_adset_id"),
    metaAdsetName: text("meta_adset_name"),
    metaCampaignId: text("meta_campaign_id"),
    metaCampaignName: text("meta_campaign_name"),
    metaFormId: text("meta_form_id"),
    metaFormName: text("meta_form_name"),
    metaPageId: text("meta_page_id"),
    metaPageName: text("meta_page_name"),
    metaLeadgenId: text("meta_leadgen_id"),
    metaPlatform: text("meta_platform"),
    // UTM
    utmUrl: text("utm_url"),
    utmMedium: text("utm_medium"),
    utmSource: text("utm_source"),
    utmCampaign: text("utm_campaign"),
    utmTerm: text("utm_term"),
    utmContent: text("utm_content"),
    // Qualificação
    urgency: text("urgency"),
    investmentIntent: text("investment_intent"),
    jobTitle: text("job_title"),
    monthlyBudget: text("monthly_budget"),
    contactPreference: text("contact_preference"),
    mainChallenge: text("main_challenge"),
    sector: text("sector"),
    classFrequency: text("class_frequency"),
    professionalMoment: text("professional_moment"),
    discarded: boolean("discarded").default(false),
    discardReason: text("discard_reason"),
    discardDesc: text("discard_desc"),
    firstNote: text("first_note"),
    firstTask: text("first_task"),
    registeredAt: text("registered_at"),
    externalId: text("external_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    // Playbook Comercial Be Fluent v3 (aditivo, Seção 6/7)
    bantBudget: boolean("bant_budget"),
    bantAuthority: boolean("bant_authority"),
    bantNeed: boolean("bant_need"),
    bantTiming: boolean("bant_timing"),
    bantNote: text("bant_note"),
    refusalCount: integer("refusal_count").default(0),
    // Inbox multi-SDR — vínculo real do contato a um SDR/número.
    sdrId: text("sdr_id"),
  },
  (t) => [
    index("contacts_phone_idx").on(t.phone),
    index("contacts_email_idx").on(t.email),
  ]
);

/* ─── Negócios ───────────────────────────────────────────── */
export const deals = pgTable(
  "deals",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    value: numeric("value").default("0"),
    pipelineId: text("pipeline_id").references(() => pipelines.id, { onDelete: "cascade" }),
    // Sem FK para stages: o id real da etapa vive em pipelines.stages (jsonb).
    stageId: text("stage_id").notNull(),
    contact: text("contact"), // nome do contato — chave de ligação usada em paralelo a contact_id
    contactId: text("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    owner: text("owner"),
    tags: jsonb("tags").$type<string[]>().default([]),
    status: text("status").default("open"), // open | won | lost
    lostReason: text("lost_reason"),
    notes: text("notes"),
    history: jsonb("history").$type<{ ts: string; text: string }[]>().default([]),
    stageEnteredAt: timestamp("stage_entered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    // Playbook Comercial Be Fluent v3
    slaRespondedAt: timestamp("sla_responded_at", { withTimezone: true }),
    costOfInactionNote: text("cost_of_inaction_note"),
    refusalCount: integer("refusal_count").default(0),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    bant: jsonb("bant").$type<{ budget?: boolean; authority?: boolean; need?: boolean; timing?: boolean }>(),
    // Inbox multi-SDR
    sdrId: text("sdr_id"),
  },
  (t) => [
    index("deals_pipeline_idx").on(t.pipelineId),
    index("deals_contact_idx").on(t.contactId),
    index("deals_status_idx").on(t.status),
  ]
);

/* ─── Atividades ─────────────────────────────────────────── */
export const activities = pgTable(
  "activities",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(), // task | call | meeting | email | note
    title: text("title").notNull(),
    due: text("due"), // rótulo livre, ex. "Hoje"
    dueDate: text("due_date"), // YYYY-MM-DD
    dueTime: text("due_time"), // HH:MM
    contact: text("contact"),
    done: boolean("done").default(false),
    dealId: text("deal_id").references(() => deals.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("activities_deal_idx").on(t.dealId)]
);

/* ─── Empresas ───────────────────────────────────────────── */
export const companies = pgTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  domain: text("domain"),
  phone: text("phone"),
  segment: text("segment"),
  notes: text("notes"),
  owner: text("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ─── Automações ─────────────────────────────────────────── */
export const automations = pgTable("automations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // JSON.stringify(AutomationTrigger/Action) em automações novas; texto
  // livre em automações legadas criadas antes do motor estruturado — por
  // isso continua texto solto, não jsonb tipado.
  trigger: text("trigger"),
  action: text("action"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ─── Lead scoring ───────────────────────────────────────── */
export const scoringRules = pgTable("scoring_rules", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  points: integer("points").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ─── Canais conectados (legado, pré multi-SDR) ─────────── */
export const connectedChannels = pgTable("connected_channels", {
  type: text("type").primaryKey(), // whatsapp | instagram | ...
  provider: text("provider"),
  credentials: jsonb("credentials").$type<Record<string, unknown>>().default({}),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow(),
});

/* ─── Integrações genéricas (catálogo em integrations-view.tsx) ── */
export const integrations = pgTable("integrations", {
  id: text("id").primaryKey(), // chave da integração (ex.: "stripe", "asaas")
  credentials: jsonb("credentials").$type<Record<string, unknown>>().default({}),
  connectedAt: timestamp("connected_at", { withTimezone: true }).defaultNow(),
});

/* ─── Configuração financeira (linha única, id='default') ── */
export const financialConfig = pgTable("financial_config", {
  id: text("id").primaryKey().default("default"),
  monthlyMarketingSpend: numeric("monthly_marketing_spend").default("0"),
  avgContractMonths: numeric("avg_contract_months").default("12"),
  monthlyChurnRate: numeric("monthly_churn_rate").default("5"),
  avgCostPerStudent: numeric("avg_cost_per_student").default("0"),
  revenueGoalMonthly: numeric("revenue_goal_monthly").default("0"),
  leadsPerMonth: numeric("leads_per_month").default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  // Playbook Comercial Be Fluent v3
  slaTargetMinutes: integer("sla_target_minutes").default(4),
  dailyTargets: jsonb("daily_targets").$type<{
    leadsContacted: number;
    coldReactivations: number;
    diagnosisMeetings: number;
    followupsExecuted: number;
    b2bProspects: number;
  }>(),
});

/* ─── Organização / usuário único (não é multi-tenant real) ── */
export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  plan: text("plan").default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    role: text("role").default("member"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("profiles_org_idx").on(t.orgId)]
);

/* ─── Inbox — mensagens WhatsApp/Instagram/Messenger ─────── */
export const inboxMessages = pgTable(
  "inbox_messages",
  {
    id: text("id").primaryKey(),
    channel: text("channel").notNull().default("whatsapp"),
    from: text("from").notNull(),
    fromName: text("from_name"),
    text: text("text"),
    timestamp: bigint("timestamp", { mode: "number" }).notNull(),
    fromMe: boolean("from_me").default(false),
    senderPhoto: text("sender_photo"),
    msgType: text("msg_type").default("text"), // text | image | audio | document | video
    mediaUrl: text("media_url"),
    mediaCaption: text("media_caption"),
    fileName: text("file_name"),
    isLid: boolean("is_lid").default(false),
    sdrId: text("sdr_id"),
    threadKey: text("thread_key"),
  },
  (t) => [
    index("inbox_messages_thread_idx").on(t.threadKey),
    index("inbox_messages_sdr_idx").on(t.sdrId),
    index("inbox_messages_timestamp_idx").on(t.timestamp),
  ]
);

// Reservada — criada pelo schema do Inbox multi-SDR, ainda sem uso real
// (nenhum .from() no código lê/escreve nela hoje além da criação da tabela).
export const conversationAssignments = pgTable("conversation_assignments", {
  threadKey: text("thread_key").primaryKey(),
  sdrId: text("sdr_id"),
  contactId: text("contact_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ─── Follow-up sequencial (5 templates, D1-D5) ─────────── */
export const followupTemplates = pgTable("followup_templates", {
  step: integer("step").primaryKey(), // 1-5
  channel: text("channel").notNull().default("whatsapp"),
  message: text("message").notNull(),
  subject: text("subject"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const followupLog = pgTable(
  "followup_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    dealId: text("deal_id").notNull(),
    step: integer("step").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow(),
    channel: text("channel"),
    ok: boolean("ok").default(true),
  },
  (t) => [index("followup_log_deal_idx").on(t.dealId)]
);

/* ─── Follow-up por situação (Playbook Comercial Be Fluent v3) ── */
export const followupPlaybookTemplates = pgTable("followup_playbook_templates", {
  // situation_key é a PK real (upserts conflitam nela) — não um uuid à parte.
  situationKey: text("situation_key").primaryKey(),
  channel: text("channel").notNull().default("whatsapp"),
  message: text("message").notNull(),
  dayOffset: integer("day_offset").notNull().default(1),
  suggestedTime: text("suggested_time"),
  active: boolean("active").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const followupPlaybookLog = pgTable(
  "followup_playbook_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    dealId: text("deal_id").notNull(),
    situationKey: text("situation_key").notNull(),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }).defaultNow(),
    channel: text("channel"),
    ok: boolean("ok").default(true),
  },
  (t) => [index("followup_playbook_log_deal_idx").on(t.dealId)]
);

/* ─── Benchmarks de conversão por etapa (Playbook 8.1/8.4) ─── */
export const stageBenchmarks = pgTable("stage_benchmarks", {
  // Sem FK rígida: as stages runtime vivem em pipelines.stages (jsonb).
  stageId: text("stage_id").primaryKey(),
  expectedConversionPct: integer("expected_conversion_pct").notNull().default(50),
  alertFloorPct: integer("alert_floor_pct").notNull().default(40),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ─── Biblioteca de scripts (Playbook — reativação/objeção/etc.) ── */
export const scripts = pgTable("scripts", {
  id: text("id").primaryKey(),
  category: text("category").notNull().default("vendas"),
  title: text("title").notNull(),
  channel: text("channel").notNull().default("whatsapp"), // whatsapp | email | call
  body: text("body").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ─── SDRs — WhatsApp Business por atendente ────────────── */
export const sdrs = pgTable("sdrs", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  avatarColor: text("avatar_color"),
  active: boolean("active").notNull().default(true),
  waProvider: text("wa_provider"), // zapi | meta_cloud | wa_lite
  zapiInstanceId: text("zapi_instance_id"),
  zapiToken: text("zapi_token"),
  zapiClientToken: text("zapi_client_token"),
  metaPhoneNumberId: text("meta_phone_number_id"),
  metaAccessToken: text("meta_access_token"),
  metaWabaId: text("meta_waba_id"),
  metaVerifyToken: text("meta_verify_token"),
  phoneDisplay: text("phone_display"),
  webhookSecret: text("webhook_secret"),
  // WhatsApp Lite (Baileys, pareamento por QR Code) — status de exibição;
  // as credenciais de sessão (chaves Signal) ficam em wa_lite_sessions,
  // separadas por serem escritas com muito mais frequência.
  waLiteStatus: text("wa_lite_status"), // disconnected | qr_pending | connected
  waLiteConnectedPhone: text("wa_lite_connected_phone"),
  waLiteLastConnectedAt: timestamp("wa_lite_last_connected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * WhatsApp Lite (Baileys) — estado de autenticação por SDR, persistido para
 * sobreviver a restart do PM2 (deploy, crash, OOM) sem exigir novo QR Code.
 * `creds` muda raramente (só em re-pareamento); `keys` (pré-chaves do
 * protocolo Signal) muda a quase toda mensagem — mantidos juntos numa linha
 * por sdrId para simplicidade, mas em colunas separadas para granularidade.
 */
export const waLiteSessions = pgTable("wa_lite_sessions", {
  sdrId: text("sdr_id").primaryKey().references(() => sdrs.id, { onDelete: "cascade" }),
  creds: jsonb("creds").$type<Record<string, unknown>>(),
  keys: jsonb("keys").$type<Record<string, Record<string, unknown>>>().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

/* ─── Google Calendar (integração de agendamento) ───────── */
export const calendarAccounts = pgTable("calendar_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  oauthRefreshToken: text("oauth_refresh_token"),
  status: text("status").notNull().default("disconnected"),
  lastError: text("last_error"),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ─── Remarketing por e-mail (Gmail API / Resend) ───────── */
export const emailAccounts = pgTable("email_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull().default("gmail"), // gmail | resend
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  oauthRefreshToken: text("oauth_refresh_token"),
  status: text("status").notNull().default("disconnected"),
  lastError: text("last_error"),
  connectedAt: timestamp("connected_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  bodyHtml: text("body_html").notNull(),
  bodyText: text("body_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const emailCampaigns = pgTable("email_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  templateId: uuid("template_id"), // sem FK real em produção
  status: text("status").notNull().default("draft"), // draft|scheduled|running|paused|done
  audienceFilter: jsonb("audience_filter").$type<Record<string, unknown>>().notNull().default({}),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  stats: jsonb("stats")
    .$type<{ sent: number; opened: number; clicked: number; bounced: number; failed: number }>()
    .notNull()
    .default({ sent: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const emailSends = pgTable("email_sends", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: uuid("campaign_id"),
  // contacts.id é text; esta coluna é uuid em produção — não cruzam de
  // verdade hoje (sem FK), mantido como está para não divergir do real.
  contactId: uuid("contact_id"),
  toEmail: text("to_email").notNull(),
  status: text("status").notNull().default("queued"), // queued|sent|opened|clicked|bounced|failed
  providerMessageId: text("provider_message_id"),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  clickedAt: timestamp("clicked_at", { withTimezone: true }),
});

/* ─── Ligações com IA (Vapi) ─────────────────────────────── */
export const callCampaigns = pgTable("call_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull().default("vapi"),
  assistantConfig: jsonb("assistant_config").$type<Record<string, unknown>>().notNull().default({}),
  audienceFilter: jsonb("audience_filter").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("draft"),
  stats: jsonb("stats")
    .$type<{ dialed: number; answered: number; completed: number; failed: number; totalCostCents: number; totalDurationSec: number }>()
    .notNull()
    .default({ dialed: 0, answered: 0, completed: 0, failed: 0, totalCostCents: 0, totalDurationSec: 0 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const callLogs = pgTable(
  "call_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    campaignId: uuid("campaign_id"),
    contactId: uuid("contact_id"), // mesmo caso de email_sends.contact_id — sem FK real
    provider: text("provider").notNull().default("vapi"),
    providerCallId: text("provider_call_id"),
    toNumber: text("to_number").notNull(),
    status: text("status").notNull().default("queued"),
    durationSec: integer("duration_sec").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    recordingUrl: text("recording_url"),
    transcript: jsonb("transcript").$type<{ role: string; text: string; at?: number }[]>().default([]),
    summary: text("summary"),
    endedReason: text("ended_reason"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index("call_logs_campaign_idx").on(t.campaignId),
    index("call_logs_contact_idx").on(t.contactId),
    index("call_logs_provider_call_idx").on(t.providerCallId),
  ]
);

/* ─── Log de debug de webhooks (painel /debug) ──────────── */
export const webhookDebugLog = pgTable("webhook_debug_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ts: text("ts"),
  headers: text("headers"), // JSON stringificado
  body: text("body"), // JSON stringificado
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/* ─── Autenticação própria (substitui Supabase Auth) ──────
 * Modelada no padrão já validado em produção pelo BeeFlow: sessão em
 * cookie opaco (hash SHA-256 armazenado, nunca o token em texto puro),
 * senha com scrypt nativo do Node, tokens de reset com expiração curta e
 * uso único. Totalmente separada de `profiles`/`organizations` (que são
 * dados de exibição do CRM, não a fonte de verdade de autenticação) —
 * users.id é o novo id canônico de usuário.
 */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  // Formato auto-descritivo: scrypt$<logN>$<r>$<p>$<saltB64>$<hashB64> —
  // null para contas que só entram via Google (sem senha própria ainda).
  passwordHash: text("password_hash"),
  name: text("name"),
  googleId: text("google_id").unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // SHA-256 do token — o valor bruto só existe no cookie do navegador,
    // nunca persistido. Login = sessão nova; nunca UPDATE num token existente.
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).defaultNow().notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

export const authTokenTypeEnum = ["password_reset"] as const;

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "password_reset" — union acima documenta os valores válidos
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("auth_tokens_user_type_idx").on(t.userId, t.type)]
);
