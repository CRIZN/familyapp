ALTER TABLE "calendar_connections" ADD COLUMN "last_sync_attempted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD COLUMN "last_sync_message" text;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD COLUMN "last_sync_status" text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_last_sync_status_valid" CHECK ("last_sync_status" in ('idle', 'success', 'error'));--> statement-breakpoint
