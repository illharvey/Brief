CREATE TABLE "deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"delivery_date" text NOT NULL,
	"status" text NOT NULL,
	"scheduled_for" text NOT NULL,
	"sent_at" timestamp,
	"briefing_id" text,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "deliveries_user_id_delivery_date_unique" UNIQUE("user_id","delivery_date")
);
--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_briefing_id_briefings_id_fk" FOREIGN KEY ("briefing_id") REFERENCES "public"."briefings"("id") ON DELETE set null ON UPDATE no action;