CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"due" text,
	"due_date" text,
	"due_time" text,
	"contact" text,
	"done" boolean DEFAULT false,
	"deal_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"trigger" text,
	"action" text,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calendar_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"oauth_refresh_token" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"last_error" text,
	"connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"provider" text DEFAULT 'vapi' NOT NULL,
	"assistant_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"audience_filter" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"stats" jsonb DEFAULT '{"dialed":0,"answered":0,"completed":0,"failed":0,"totalCostCents":0,"totalDurationSec":0}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "call_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"contact_id" uuid,
	"provider" text DEFAULT 'vapi' NOT NULL,
	"provider_call_id" text,
	"to_number" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"duration_sec" integer DEFAULT 0 NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"recording_url" text,
	"transcript" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"ended_reason" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"phone" text,
	"segment" text,
	"notes" text,
	"owner" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "connected_channels" (
	"type" text PRIMARY KEY NOT NULL,
	"provider" text,
	"credentials" jsonb DEFAULT '{}'::jsonb,
	"connected_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"company" text,
	"fantasy_name" text,
	"source" text,
	"campaign" text,
	"funnel" text,
	"stage" text,
	"status" text,
	"team" text,
	"score" integer DEFAULT 0,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"owner" text,
	"cep" text,
	"country" text,
	"state" text,
	"city" text,
	"neighborhood" text,
	"street" text,
	"complement" text,
	"number" text,
	"company_cep" text,
	"company_country" text,
	"company_state" text,
	"company_city" text,
	"company_neighborhood" text,
	"company_street" text,
	"company_complement" text,
	"company_number" text,
	"cpf_cnpj" text,
	"product" text,
	"product_value" numeric,
	"product_desc" text,
	"meta_ad_id" text,
	"meta_ad_name" text,
	"meta_adset_id" text,
	"meta_adset_name" text,
	"meta_campaign_id" text,
	"meta_campaign_name" text,
	"meta_form_id" text,
	"meta_form_name" text,
	"meta_page_id" text,
	"meta_page_name" text,
	"meta_leadgen_id" text,
	"meta_platform" text,
	"utm_url" text,
	"utm_medium" text,
	"utm_source" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"urgency" text,
	"investment_intent" text,
	"job_title" text,
	"monthly_budget" text,
	"contact_preference" text,
	"main_challenge" text,
	"sector" text,
	"class_frequency" text,
	"professional_moment" text,
	"discarded" boolean DEFAULT false,
	"discard_reason" text,
	"discard_desc" text,
	"first_note" text,
	"first_task" text,
	"registered_at" text,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"bant_budget" boolean,
	"bant_authority" boolean,
	"bant_need" boolean,
	"bant_timing" boolean,
	"bant_note" text,
	"refusal_count" integer DEFAULT 0,
	"sdr_id" text
);
--> statement-breakpoint
CREATE TABLE "conversation_assignments" (
	"thread_key" text PRIMARY KEY NOT NULL,
	"sdr_id" text,
	"contact_id" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"value" numeric DEFAULT '0',
	"pipeline_id" text,
	"stage_id" text NOT NULL,
	"contact" text,
	"contact_id" text,
	"owner" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'open',
	"lost_reason" text,
	"notes" text,
	"history" jsonb DEFAULT '[]'::jsonb,
	"stage_entered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"sla_responded_at" timestamp with time zone,
	"cost_of_inaction_note" text,
	"refusal_count" integer DEFAULT 0,
	"last_activity_at" timestamp with time zone,
	"bant" jsonb,
	"sdr_id" text
);
--> statement-breakpoint
CREATE TABLE "email_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text DEFAULT 'gmail' NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text,
	"oauth_refresh_token" text,
	"status" text DEFAULT 'disconnected' NOT NULL,
	"last_error" text,
	"connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"template_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"audience_filter" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"scheduled_at" timestamp with time zone,
	"stats" jsonb DEFAULT '{"sent":0,"opened":0,"clicked":0,"bounced":0,"failed":0}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_sends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid,
	"contact_id" uuid,
	"to_email" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider_message_id" text,
	"error" text,
	"sent_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body_html" text NOT NULL,
	"body_text" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "financial_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"monthly_marketing_spend" numeric DEFAULT '0',
	"avg_contract_months" numeric DEFAULT '12',
	"monthly_churn_rate" numeric DEFAULT '5',
	"avg_cost_per_student" numeric DEFAULT '0',
	"revenue_goal_monthly" numeric DEFAULT '0',
	"leads_per_month" numeric DEFAULT '0',
	"updated_at" timestamp with time zone DEFAULT now(),
	"sla_target_minutes" integer DEFAULT 4,
	"daily_targets" jsonb
);
--> statement-breakpoint
CREATE TABLE "followup_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"step" integer NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now(),
	"channel" text,
	"ok" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "followup_playbook_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"situation_key" text NOT NULL,
	"triggered_at" timestamp with time zone DEFAULT now(),
	"channel" text,
	"ok" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "followup_playbook_templates" (
	"situation_key" text PRIMARY KEY NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"message" text NOT NULL,
	"day_offset" integer DEFAULT 1 NOT NULL,
	"suggested_time" text,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "followup_templates" (
	"step" integer PRIMARY KEY NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"message" text NOT NULL,
	"subject" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"from" text NOT NULL,
	"from_name" text,
	"text" text,
	"timestamp" bigint NOT NULL,
	"from_me" boolean DEFAULT false,
	"sender_photo" text,
	"msg_type" text DEFAULT 'text',
	"media_url" text,
	"media_caption" text,
	"file_name" text,
	"is_lid" boolean DEFAULT false,
	"sdr_id" text,
	"thread_key" text
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" text PRIMARY KEY NOT NULL,
	"credentials" jsonb DEFAULT '{}'::jsonb,
	"connected_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"plan" text DEFAULT 'free',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipelines" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text,
	"name" text NOT NULL,
	"email" text,
	"role" text DEFAULT 'member',
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scoring_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"points" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scripts" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text DEFAULT 'vendas' NOT NULL,
	"title" text NOT NULL,
	"channel" text DEFAULT 'whatsapp' NOT NULL,
	"body" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sdrs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"avatar_color" text,
	"active" boolean DEFAULT true NOT NULL,
	"wa_provider" text,
	"zapi_instance_id" text,
	"zapi_token" text,
	"zapi_client_token" text,
	"meta_phone_number_id" text,
	"meta_access_token" text,
	"meta_waba_id" text,
	"meta_verify_token" text,
	"phone_display" text,
	"webhook_secret" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stage_benchmarks" (
	"stage_id" text PRIMARY KEY NOT NULL,
	"expected_conversion_pct" integer DEFAULT 50 NOT NULL,
	"alert_floor_pct" integer DEFAULT 40 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" text PRIMARY KEY NOT NULL,
	"pipeline_id" text,
	"name" text NOT NULL,
	"probability" integer DEFAULT 0,
	"position" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "webhook_debug_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ts" text,
	"headers" text,
	"body" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stages" ADD CONSTRAINT "stages_pipeline_id_pipelines_id_fk" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_deal_idx" ON "activities" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "call_logs_campaign_idx" ON "call_logs" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "call_logs_contact_idx" ON "call_logs" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "call_logs_provider_call_idx" ON "call_logs" USING btree ("provider_call_id");--> statement-breakpoint
CREATE INDEX "contacts_phone_idx" ON "contacts" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "deals_pipeline_idx" ON "deals" USING btree ("pipeline_id");--> statement-breakpoint
CREATE INDEX "deals_contact_idx" ON "deals" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "deals_status_idx" ON "deals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "followup_log_deal_idx" ON "followup_log" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "followup_playbook_log_deal_idx" ON "followup_playbook_log" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "inbox_messages_thread_idx" ON "inbox_messages" USING btree ("thread_key");--> statement-breakpoint
CREATE INDEX "inbox_messages_sdr_idx" ON "inbox_messages" USING btree ("sdr_id");--> statement-breakpoint
CREATE INDEX "inbox_messages_timestamp_idx" ON "inbox_messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "profiles_org_idx" ON "profiles" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "stages_pipeline_idx" ON "stages" USING btree ("pipeline_id");