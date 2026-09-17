import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/* ─── Enums ──────────────────────────────────────────────── */
export const planEnum = pgEnum("plan", ["trial", "starter", "pro", "business", "enterprise"]);
export const roleEnum = pgEnum("role", ["owner", "admin", "manager", "rep"]);
export const subStatusEnum = pgEnum("sub_status", ["trialing", "active", "past_due", "canceled"]);
export const dealStatusEnum = pgEnum("deal_status", ["open", "won", "lost"]);
export const activityTypeEnum = pgEnum("activity_type", ["task", "call", "meeting", "email", "note"]);
export const channelTypeEnum = pgEnum("channel_type", ["whatsapp", "instagram", "messenger", "email", "webchat"]);
export const channelProviderEnum = pgEnum("channel_provider", ["meta_cloud", "zapi", "evolution", "native"]);
export const msgDirectionEnum = pgEnum("msg_direction", ["in", "out"]);

/* ─── Remarketing (e-mail) & Ligações IA ─────────────────── */
export const emailProviderEnum = pgEnum("email_provider", ["gmail", "resend"]);
export const emailAccountStatusEnum = pgEnum("email_account_status", ["disconnected", "connected", "error"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "scheduled", "running", "paused", "done"]);
export const emailSendStatusEnum = pgEnum("email_send_status", ["queued", "sent", "opened", "clicked", "bounced", "failed"]);
export const callProviderEnum = pgEnum("call_provider", ["vapi", "twilio"]);
export const callStatusEnum = pgEnum("call_status", ["queued", "ringing", "in_progress", "completed", "no_answer", "failed", "voicemail"]);

/* ─── Playbook Comercial Be Fluent v3 ─────────────────────── */
export const followupSituationEnum = pgEnum("followup_situation", [
  "proposta_sumiu",
  "levar_pro_time",
  "reativacao_frio",
  "pediu_desconto_sumiu",
  "contrato_sem_retorno",
  "pediu_info_sumiu",
  "ultima_tentativa",
]);

/* ─── Tenancy ────────────────────────────────────────────── */
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: planEnum("plan").notNull().default("trial"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  email: text("email").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("rep"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("memberships_org_idx").on(t.orgId)]
);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull(),
  status: subStatusEnum("status").notNull().default("trialing"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
});

/* ─── CRM entities ──────────────────────────────────────── */
export const companies = pgTable(
  "companies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    domain: text("domain"),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("companies_org_idx").on(t.orgId)]
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    ownerId: uuid("owner_id").references(() => profiles.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    source: text("source"),
    score: integer("score").notNull().default(0),
    tags: jsonb("tags").$type<string[]>().default([]),
    customFields: jsonb("custom_fields").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    /* ── Playbook Comercial Be Fluent v3 — BANT 3-de-4 (3.5) + Avenida do Não (6.4) ── */
    bantBudget: boolean("bant_budget"),
    bantAuthority: boolean("bant_authority"),
    bantNeed: boolean("bant_need"),
    bantTiming: boolean("bant_timing"),
    bantNote: text("bant_note"),
    refusalCount: integer("refusal_count").notNull().default(0),
    /** SDR responsável (id solto, sem FK rígida — mesmo padrão de stageId em stage_benchmarks). */
    sdrId: text("sdr_id"),
  },
  (t) => [index("contacts_org_idx").on(t.orgId), index("contacts_email_idx").on(t.email)]
);

export const pipelines = pgTable(
  "pipelines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("pipelines_org_idx").on(t.orgId)]
);

export const stages = pgTable(
  "stages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    probability: integer("probability").notNull().default(0), // 0-100
  },
  (t) => [index("stages_pipeline_idx").on(t.pipelineId)]
);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    pipelineId: uuid("pipeline_id").notNull().references(() => pipelines.id, { onDelete: "cascade" }),
    stageId: uuid("stage_id").notNull().references(() => stages.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    ownerId: uuid("owner_id").references(() => profiles.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    value: numeric("value", { precision: 12, scale: 2 }).notNull().default("0"),
    status: dealStatusEnum("status").notNull().default("open"),
    lostReason: text("lost_reason"),
    position: integer("position").notNull().default(0),
    expectedCloseAt: timestamp("expected_close_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    /* ── Playbook Comercial Be Fluent v3 (aditivo, nullable) ── */
    stageEnteredAt: timestamp("stage_entered_at", { withTimezone: true }),
    slaRespondedAt: timestamp("sla_responded_at", { withTimezone: true }),
    costOfInactionNote: text("cost_of_inaction_note"),
    refusalCount: integer("refusal_count").notNull().default(0),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    bant: jsonb("bant").$type<{ budget?: boolean; authority?: boolean; need?: boolean; timing?: boolean }>(),
    /** SDR responsável (id solto, espelha contacts.sdrId). */
    sdrId: text("sdr_id"),
  },
  (t) => [index("deals_org_idx").on(t.orgId), index("deals_stage_idx").on(t.stageId)]
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull().default("task"),
    title: text("title").notNull(),
    body: text("body"),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id").references(() => profiles.id, { onDelete: "set null" }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("activities_org_idx").on(t.orgId)]
);

/* ─── Omnichannel inbox ─────────────────────────────────── */
export const channels = pgTable("channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type: channelTypeEnum("type").notNull(),
  provider: channelProviderEnum("provider").notNull().default("native"),
  label: text("label").notNull(),
  config: jsonb("config").$type<Record<string, unknown>>().default({}),
  active: boolean("active").notNull().default(true),
});

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    channelId: uuid("channel_id").references(() => channels.id, { onDelete: "set null" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    assigneeId: uuid("assignee_id").references(() => profiles.id, { onDelete: "set null" }),
    status: text("status").notNull().default("open"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow(),
  },
  (t) => [index("conversations_org_idx").on(t.orgId)]
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    direction: msgDirectionEnum("direction").notNull(),
    body: text("body").notNull(),
    senderId: uuid("sender_id").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("messages_conv_idx").on(t.conversationId)]
);

/* ─── Automations, scoring, forms ───────────────────────── */
export const automations = pgTable("automations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  trigger: jsonb("trigger").$type<Record<string, unknown>>().notNull(),
  actions: jsonb("actions").$type<Record<string, unknown>[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scoringRules = pgTable("scoring_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  condition: jsonb("condition").$type<Record<string, unknown>>().notNull(),
  points: integer("points").notNull().default(0),
});

export const forms = pgTable("forms", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  fields: jsonb("fields").$type<Record<string, unknown>[]>().notNull().default([]),
  pipelineId: uuid("pipeline_id").references(() => pipelines.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ─── Remarketing por e-mail ────────────────────────────── */
export const emailAccounts = pgTable(
  "email_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    provider: emailProviderEnum("provider").notNull().default("gmail"),
    fromEmail: text("from_email").notNull(),
    fromName: text("from_name"),
    // Gmail: OAuth refresh token (long-lived). Resend: null (usa API key em env).
    oauthRefreshToken: text("oauth_refresh_token"),
    status: emailAccountStatusEnum("status").notNull().default("disconnected"),
    lastError: text("last_error"),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("email_accounts_org_idx").on(t.orgId)]
);

export const emailTemplates = pgTable(
  "email_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    subject: text("subject").notNull(),
    bodyHtml: text("body_html").notNull(),
    bodyText: text("body_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("email_templates_org_idx").on(t.orgId)]
);

export const emailCampaigns = pgTable(
  "email_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    templateId: uuid("template_id").references(() => emailTemplates.id, { onDelete: "set null" }),
    status: campaignStatusEnum("status").notNull().default("draft"),
    // Filtro de audiência sobre contatos (origem, funil, status, tags, score mínimo…)
    audienceFilter: jsonb("audience_filter").$type<Record<string, unknown>>().notNull().default({}),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    stats: jsonb("stats").$type<{ sent: number; opened: number; clicked: number; bounced: number; failed: number }>()
      .notNull()
      .default({ sent: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("email_campaigns_org_idx").on(t.orgId)]
);

export const emailSends = pgTable(
  "email_sends",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => emailCampaigns.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    toEmail: text("to_email").notNull(),
    status: emailSendStatusEnum("status").notNull().default("queued"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    openedAt: timestamp("opened_at", { withTimezone: true }),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
  },
  (t) => [
    index("email_sends_campaign_idx").on(t.campaignId),
    index("email_sends_contact_idx").on(t.contactId),
  ]
);

/* ─── Ligações com IA ───────────────────────────────────── */
export const callCampaigns = pgTable(
  "call_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    provider: callProviderEnum("provider").notNull().default("vapi"),
    // Configuração do agente de voz: voice, firstMessage, systemPrompt, model…
    assistantConfig: jsonb("assistant_config").$type<Record<string, unknown>>().notNull().default({}),
    audienceFilter: jsonb("audience_filter").$type<Record<string, unknown>>().notNull().default({}),
    status: campaignStatusEnum("status").notNull().default("draft"),
    stats: jsonb("stats").$type<{ dialed: number; answered: number; completed: number; failed: number; totalCostCents: number; totalDurationSec: number }>()
      .notNull()
      .default({ dialed: 0, answered: 0, completed: 0, failed: 0, totalCostCents: 0, totalDurationSec: 0 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("call_campaigns_org_idx").on(t.orgId)]
);

export const callLogs = pgTable(
  "call_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => callCampaigns.id, { onDelete: "set null" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    provider: callProviderEnum("provider").notNull().default("vapi"),
    providerCallId: text("provider_call_id"),
    toNumber: text("to_number").notNull(),
    status: callStatusEnum("status").notNull().default("queued"),
    durationSec: integer("duration_sec").notNull().default(0),
    costCents: integer("cost_cents").notNull().default(0),
    recordingUrl: text("recording_url"),
    transcript: jsonb("transcript").$type<{ role: string; text: string; at?: number }[]>().default([]),
    summary: text("summary"),
    endedReason: text("ended_reason"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("call_logs_campaign_idx").on(t.campaignId),
    index("call_logs_contact_idx").on(t.contactId),
    index("call_logs_provider_call_idx").on(t.providerCallId),
  ]
);

/* ─── Integrations ──────────────────────────────────────── */
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  prefix: text("prefix").notNull(),
  hashedKey: text("hashed_key").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

export const webhooks = pgTable("webhooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  events: jsonb("events").$type<string[]>().notNull().default([]),
  secret: text("secret"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ─── Playbook Comercial Be Fluent v3 — Follow-up por situação (7.2/7.3) ───
 * Paralela a `followup_templates` (5 templates sequenciais), que fica intocada.
 * Dispara por gatilho de situação, não por número de tentativa. */
export const followupPlaybookTemplates = pgTable(
  "followup_playbook_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    situationKey: followupSituationEnum("situation_key").notNull(),
    channel: text("channel").notNull().default("whatsapp"),
    message: text("message").notNull(),
    dayOffset: integer("day_offset").notNull().default(1),
    suggestedTime: text("suggested_time"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("followup_playbook_templates_org_idx").on(t.orgId)]
);

/* ─── Benchmarks de conversão por etapa (Playbook 8.1/8.4) ─── */
export const stageBenchmarks = pgTable(
  "stage_benchmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    // Sem FK rígida: as stages runtime vivem em pipelines.stages (jsonb).
    stageId: text("stage_id").notNull(),
    expectedConversionPct: integer("expected_conversion_pct").notNull().default(50),
    alertFloorPct: integer("alert_floor_pct").notNull().default(40),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("stage_benchmarks_org_idx").on(t.orgId)]
);

/* ─── Inbox multi-SDR — WhatsApp Business por atendente ─────
 * O runtime real persiste em `sdrs`/`inbox_messages` via Supabase REST
 * (src/lib/db.ts, src/lib/message-store.ts), auto-criadas por
 * /api/inbox/init-schema. Esta tabela documenta o schema formalmente. */
export const waProviderEnum = pgEnum("wa_provider", ["zapi", "meta_cloud"]);

export const sdrs = pgTable(
  "sdrs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    avatarColor: text("avatar_color"),
    active: boolean("active").notNull().default(true),
    waProvider: waProviderEnum("wa_provider"),
    // Z-API
    zapiInstanceId: text("zapi_instance_id"),
    zapiToken: text("zapi_token"),
    zapiClientToken: text("zapi_client_token"),
    // Meta Cloud API (oficial)
    metaPhoneNumberId: text("meta_phone_number_id"),
    metaAccessToken: text("meta_access_token"),
    metaWabaId: text("meta_waba_id"),
    metaVerifyToken: text("meta_verify_token"),
    phoneDisplay: text("phone_display"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sdrs_org_idx").on(t.orgId)]
);
