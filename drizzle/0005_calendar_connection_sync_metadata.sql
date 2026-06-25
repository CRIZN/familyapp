ALTER TABLE "calendar_connections" ADD COLUMN "last_sync_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD COLUMN "last_successful_sync_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD COLUMN "sync_failure_status" text;