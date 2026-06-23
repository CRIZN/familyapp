CREATE TYPE "public"."reward_contribution_status" AS ENUM('active', 'requested', 'returned');--> statement-breakpoint
CREATE TYPE "public"."reward_request_status" AS ENUM('pending', 'approved', 'rejected', 'canceled', 'fulfilled');--> statement-breakpoint
CREATE TYPE "public"."reward_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."reward_type" AS ENUM('allowance', 'experience', 'privilege', 'custom');--> statement-breakpoint
CREATE TABLE "reward_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"reward_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"request_id" uuid,
	"points" integer NOT NULL,
	"status" "reward_contribution_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"reward_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"status" "reward_request_status" DEFAULT 'pending' NOT NULL,
	"contribution_points" integer DEFAULT 0 NOT NULL,
	"reserved_points" integer DEFAULT 0 NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"fulfilled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"title" text NOT NULL,
	"point_cost" integer NOT NULL,
	"type" "reward_type" DEFAULT 'custom' NOT NULL,
	"status" "reward_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reward_contributions" ADD CONSTRAINT "reward_contributions_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_contributions" ADD CONSTRAINT "reward_contributions_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_contributions" ADD CONSTRAINT "reward_contributions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_requests" ADD CONSTRAINT "reward_requests_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_requests" ADD CONSTRAINT "reward_requests_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_requests" ADD CONSTRAINT "reward_requests_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE no action ON UPDATE no action;