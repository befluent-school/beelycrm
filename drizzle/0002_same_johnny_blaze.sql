CREATE TABLE "wa_lite_sessions" (
	"sdr_id" text PRIMARY KEY NOT NULL,
	"creds" jsonb,
	"keys" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sdrs" ADD COLUMN "wa_lite_status" text;--> statement-breakpoint
ALTER TABLE "sdrs" ADD COLUMN "wa_lite_connected_phone" text;--> statement-breakpoint
ALTER TABLE "sdrs" ADD COLUMN "wa_lite_last_connected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "wa_lite_sessions" ADD CONSTRAINT "wa_lite_sessions_sdr_id_sdrs_id_fk" FOREIGN KEY ("sdr_id") REFERENCES "public"."sdrs"("id") ON DELETE cascade ON UPDATE no action;