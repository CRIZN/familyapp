CREATE TYPE "public"."child_win_source_type" AS ENUM('chore', 'progress_check_in', 'goal', 'reward');--> statement-breakpoint
CREATE TYPE "public"."point_ledger_source_type" AS ENUM('chore_approval', 'progress_check_in_approval', 'goal_completion', 'reward_contribution', 'reward_contribution_return', 'reward_request_reservation', 'reward_request_approval_spend', 'reward_request_return', 'bonus_points', 'point_adjustment');--> statement-breakpoint
ALTER TABLE "calendar_connections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "child_wins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "children" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chore_submissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "chores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "event_enrichments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "households" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "parents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "point_ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "progress_check_ins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reward_contributions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reward_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rewards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "skipped_chore_occurrences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "calendar_connections" RENAME COLUMN "source_url" TO "public_feed_url";--> statement-breakpoint
DROP INDEX "parents_household_email_idx";--> statement-breakpoint
ALTER TABLE "child_wins" ALTER COLUMN "source_type" SET DATA TYPE "public"."child_win_source_type" USING "source_type"::"public"."child_win_source_type";--> statement-breakpoint
ALTER TABLE "point_ledger" ALTER COLUMN "source_type" SET DATA TYPE "public"."point_ledger_source_type" USING "source_type"::"public"."point_ledger_source_type";--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "session_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_household_id_id_idx" ON "calendar_events" USING btree ("household_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "children_household_id_id_idx" ON "children" USING btree ("household_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "chores_household_id_id_idx" ON "chores" USING btree ("household_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "goals_household_id_id_idx" ON "goals" USING btree ("household_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "reward_requests_household_id_id_idx" ON "reward_requests" USING btree ("household_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "rewards_household_id_id_idx" ON "rewards" USING btree ("household_id","id");--> statement-breakpoint
ALTER TABLE "child_wins" ADD CONSTRAINT "child_wins_household_child_fk" FOREIGN KEY ("household_id","child_id") REFERENCES "public"."children"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_submissions" ADD CONSTRAINT "chore_submissions_household_chore_fk" FOREIGN KEY ("household_id","chore_id") REFERENCES "public"."chores"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chore_submissions" ADD CONSTRAINT "chore_submissions_household_child_fk" FOREIGN KEY ("household_id","child_id") REFERENCES "public"."children"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chores" ADD CONSTRAINT "chores_household_child_fk" FOREIGN KEY ("household_id","child_id") REFERENCES "public"."children"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_enrichments" ADD CONSTRAINT "event_enrichments_household_event_fk" FOREIGN KEY ("household_id","event_id") REFERENCES "public"."calendar_events"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_household_child_fk" FOREIGN KEY ("household_id","child_id") REFERENCES "public"."children"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_household_child_fk" FOREIGN KEY ("household_id","child_id") REFERENCES "public"."children"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_check_ins" ADD CONSTRAINT "progress_check_ins_household_goal_fk" FOREIGN KEY ("household_id","goal_id") REFERENCES "public"."goals"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_check_ins" ADD CONSTRAINT "progress_check_ins_household_child_fk" FOREIGN KEY ("household_id","child_id") REFERENCES "public"."children"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_contributions" ADD CONSTRAINT "reward_contributions_household_reward_fk" FOREIGN KEY ("household_id","reward_id") REFERENCES "public"."rewards"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_contributions" ADD CONSTRAINT "reward_contributions_household_child_fk" FOREIGN KEY ("household_id","child_id") REFERENCES "public"."children"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_contributions" ADD CONSTRAINT "reward_contributions_household_request_fk" FOREIGN KEY ("household_id","request_id") REFERENCES "public"."reward_requests"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_requests" ADD CONSTRAINT "reward_requests_household_reward_fk" FOREIGN KEY ("household_id","reward_id") REFERENCES "public"."rewards"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_requests" ADD CONSTRAINT "reward_requests_household_child_fk" FOREIGN KEY ("household_id","child_id") REFERENCES "public"."children"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skipped_chore_occurrences" ADD CONSTRAINT "skipped_chore_occurrences_household_chore_fk" FOREIGN KEY ("household_id","chore_id") REFERENCES "public"."chores"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skipped_chore_occurrences" ADD CONSTRAINT "skipped_chore_occurrences_household_child_fk" FOREIGN KEY ("household_id","child_id") REFERENCES "public"."children"("household_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_connections_household_idx" ON "calendar_connections" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "calendar_events_household_starts_at_idx" ON "calendar_events" USING btree ("household_id","starts_at");--> statement-breakpoint
CREATE INDEX "child_wins_household_child_earned_at_idx" ON "child_wins" USING btree ("household_id","child_id","earned_at");--> statement-breakpoint
CREATE INDEX "children_household_idx" ON "children" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "chore_submissions_household_child_status_idx" ON "chore_submissions" USING btree ("household_id","child_id","status");--> statement-breakpoint
CREATE INDEX "chores_child_due_date_idx" ON "chores" USING btree ("household_id","child_id","due_date");--> statement-breakpoint
CREATE INDEX "goals_household_child_status_idx" ON "goals" USING btree ("household_id","child_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "parents_household_id_id_idx" ON "parents" USING btree ("household_id","id");--> statement-breakpoint
CREATE INDEX "parents_email_idx" ON "parents" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "point_ledger_household_child_created_at_idx" ON "point_ledger" USING btree ("household_id","child_id","created_at");--> statement-breakpoint
CREATE INDEX "progress_check_ins_household_child_status_idx" ON "progress_check_ins" USING btree ("household_id","child_id","status");--> statement-breakpoint
CREATE INDEX "reward_contributions_household_child_status_idx" ON "reward_contributions" USING btree ("household_id","child_id","status");--> statement-breakpoint
CREATE INDEX "reward_requests_household_child_status_idx" ON "reward_requests" USING btree ("household_id","child_id","status");--> statement-breakpoint
CREATE INDEX "rewards_household_status_idx" ON "rewards" USING btree ("household_id","status");--> statement-breakpoint
CREATE INDEX "skipped_chore_occurrences_household_child_idx" ON "skipped_chore_occurrences" USING btree ("household_id","child_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parents_household_email_idx" ON "parents" USING btree ("household_id",lower("email"));--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_name_not_blank" CHECK (length(trim("calendar_connections"."calendar_name")) > 0);--> statement-breakpoint
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_public_feed_url_not_blank" CHECK (length(trim("calendar_connections"."public_feed_url")) > 0);--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_title_not_blank" CHECK (length(trim("calendar_events"."title")) > 0);--> statement-breakpoint
ALTER TABLE "child_wins" ADD CONSTRAINT "child_wins_title_not_blank" CHECK (length(trim("child_wins"."title")) > 0);--> statement-breakpoint
ALTER TABLE "child_wins" ADD CONSTRAINT "child_wins_description_not_blank" CHECK (length(trim("child_wins"."description")) > 0);--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_name_not_blank" CHECK (length(trim("children"."name")) > 0);--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_pin_hash_not_blank" CHECK (length(trim("children"."pin_hash")) > 0);--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_pin_salt_not_blank" CHECK (length(trim("children"."pin_salt")) > 0);--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_session_version_positive" CHECK ("children"."session_version" > 0);--> statement-breakpoint
ALTER TABLE "chores" ADD CONSTRAINT "chores_title_not_blank" CHECK (length(trim("chores"."title")) > 0);--> statement-breakpoint
ALTER TABLE "chores" ADD CONSTRAINT "chores_point_value_positive" CHECK ("chores"."point_value" > 0);--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_title_not_blank" CHECK (length(trim("goals"."title")) > 0);--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_point_value_positive" CHECK ("goals"."point_value" > 0);--> statement-breakpoint
ALTER TABLE "households" ADD CONSTRAINT "households_name_not_blank" CHECK (length(trim("households"."name")) > 0);--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_name_not_blank" CHECK (length(trim("parents"."name")) > 0);--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_email_not_blank" CHECK (length(trim("parents"."email")) > 0);--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_delta_non_zero" CHECK ("point_ledger"."delta" <> 0);--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_description_not_blank" CHECK (length(trim("point_ledger"."description")) > 0);--> statement-breakpoint
ALTER TABLE "reward_contributions" ADD CONSTRAINT "reward_contributions_points_positive" CHECK ("reward_contributions"."points" > 0);--> statement-breakpoint
ALTER TABLE "reward_requests" ADD CONSTRAINT "reward_requests_contribution_points_non_negative" CHECK ("reward_requests"."contribution_points" >= 0);--> statement-breakpoint
ALTER TABLE "reward_requests" ADD CONSTRAINT "reward_requests_reserved_points_non_negative" CHECK ("reward_requests"."reserved_points" >= 0);--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_title_not_blank" CHECK (length(trim("rewards"."title")) > 0);--> statement-breakpoint
ALTER TABLE "rewards" ADD CONSTRAINT "rewards_point_cost_positive" CHECK ("rewards"."point_cost" > 0);--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."familyapp_parent_email"()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '');
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."familyapp_parent_can_access_household"("target_household_id" uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "public"."parents"
    WHERE "parents"."household_id" = "target_household_id"
      AND lower("parents"."email") = "public"."familyapp_parent_email"()
  );
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."familyapp_child_session_claim"("claim_name" text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  WITH "jwt_claims" AS (
    SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb AS "claims"
  )
  SELECT coalesce(
    "jwt_claims"."claims" ->> "claim_name",
    nullif(current_setting('app.' || "claim_name", true), '')
  )
  FROM "jwt_claims";
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."familyapp_child_session_in_household"("target_household_id" uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "public"."children"
    WHERE "children"."household_id" = "target_household_id"
      AND "children"."household_id"::text = coalesce("public"."familyapp_child_session_claim"('household_id'), '')
      AND "children"."id"::text = coalesce("public"."familyapp_child_session_claim"('child_id'), '')
      AND "children"."session_version"::text = coalesce("public"."familyapp_child_session_claim"('session_version'), '')
  );
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."familyapp_child_can_access_child"("target_household_id" uuid, "target_child_id" uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "public"."children"
    WHERE "children"."household_id" = "target_household_id"
      AND "children"."id" = "target_child_id"
      AND "children"."household_id"::text = coalesce("public"."familyapp_child_session_claim"('household_id'), '')
      AND "children"."id"::text = coalesce("public"."familyapp_child_session_claim"('child_id'), '')
      AND "children"."session_version"::text = coalesce("public"."familyapp_child_session_claim"('session_version'), '')
  );
$$;--> statement-breakpoint
CREATE OR REPLACE FUNCTION "public"."familyapp_child_can_access_event"("target_household_id" uuid, "target_event_id" uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "public"."familyapp_child_session_in_household"("target_household_id")
    AND (
      NOT EXISTS (
        SELECT 1
        FROM "public"."event_enrichments"
        WHERE "event_enrichments"."household_id" = "target_household_id"
          AND "event_enrichments"."event_id" = "target_event_id"
      )
      OR EXISTS (
        SELECT 1
        FROM "public"."event_enrichments"
        WHERE "event_enrichments"."household_id" = "target_household_id"
          AND "event_enrichments"."event_id" = "target_event_id"
          AND (
            "event_enrichments"."is_all_household"
            OR "event_enrichments"."participant_child_ids" ? coalesce("public"."familyapp_child_session_claim"('child_id'), '')
          )
      )
    );
$$;--> statement-breakpoint
CREATE POLICY "households_parent_access" ON "households" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("id"));--> statement-breakpoint
CREATE POLICY "households_child_select" ON "households" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_session_in_household"("id"));--> statement-breakpoint
CREATE POLICY "calendar_connections_parent_access" ON "calendar_connections" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "calendar_events_parent_access" ON "calendar_events" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "calendar_events_child_select" ON "calendar_events" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_event"("household_id", "id"));--> statement-breakpoint
CREATE POLICY "event_enrichments_parent_access" ON "event_enrichments" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "event_enrichments_child_select" ON "event_enrichments" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_event"("household_id", "event_id"));--> statement-breakpoint
CREATE POLICY "parents_parent_access" ON "parents" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "children_parent_access" ON "children" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "children_child_select" ON "children" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_child"("household_id", "id"));--> statement-breakpoint
CREATE POLICY "chores_parent_access" ON "chores" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "chores_child_select" ON "chores" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "chore_submissions_parent_access" ON "chore_submissions" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "chore_submissions_child_select" ON "chore_submissions" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "chore_submissions_child_insert" ON "chore_submissions" AS PERMISSIVE FOR INSERT TO public WITH CHECK ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "chore_submissions_child_update" ON "chore_submissions" AS PERMISSIVE FOR UPDATE TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id")) WITH CHECK ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "skipped_chore_occurrences_parent_access" ON "skipped_chore_occurrences" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "skipped_chore_occurrences_child_select" ON "skipped_chore_occurrences" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "goals_parent_access" ON "goals" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "goals_child_select" ON "goals" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "progress_check_ins_parent_access" ON "progress_check_ins" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "progress_check_ins_child_select" ON "progress_check_ins" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "progress_check_ins_child_insert" ON "progress_check_ins" AS PERMISSIVE FOR INSERT TO public WITH CHECK ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "progress_check_ins_child_update" ON "progress_check_ins" AS PERMISSIVE FOR UPDATE TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id")) WITH CHECK ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "rewards_parent_access" ON "rewards" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "rewards_child_select" ON "rewards" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_session_in_household"("household_id"));--> statement-breakpoint
CREATE POLICY "reward_contributions_parent_access" ON "reward_contributions" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "reward_contributions_child_select" ON "reward_contributions" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "reward_contributions_child_insert" ON "reward_contributions" AS PERMISSIVE FOR INSERT TO public WITH CHECK ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "reward_contributions_child_update" ON "reward_contributions" AS PERMISSIVE FOR UPDATE TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id")) WITH CHECK ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "reward_requests_parent_access" ON "reward_requests" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "reward_requests_child_select" ON "reward_requests" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "reward_requests_child_insert" ON "reward_requests" AS PERMISSIVE FOR INSERT TO public WITH CHECK ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "reward_requests_child_update" ON "reward_requests" AS PERMISSIVE FOR UPDATE TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id")) WITH CHECK ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "point_ledger_parent_access" ON "point_ledger" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "point_ledger_child_select" ON "point_ledger" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id"));--> statement-breakpoint
CREATE POLICY "child_wins_parent_access" ON "child_wins" AS PERMISSIVE FOR ALL TO authenticated USING ("public"."familyapp_parent_can_access_household"("household_id")) WITH CHECK ("public"."familyapp_parent_can_access_household"("household_id"));--> statement-breakpoint
CREATE POLICY "child_wins_child_select" ON "child_wins" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_child"("household_id", "child_id"));
