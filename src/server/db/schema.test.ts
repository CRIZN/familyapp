import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

type Snapshot = {
  tables: Record<
    string,
    {
      columns: Record<string, unknown>;
      isRLSEnabled: boolean;
    }
  >;
};

const snapshot = JSON.parse(
  readFileSync(join(process.cwd(), "drizzle/meta/0004_snapshot.json"), "utf8"),
) as Snapshot;
const migration = readFileSync(
  join(process.cwd(), "drizzle/0004_p1_full_v1_schema_rls.sql"),
  "utf8",
);
const p11Migration = readFileSync(
  join(process.cwd(), "drizzle/0005_p11_reward_approval_ledger.sql"),
  "utf8",
);
const migrationJournal = JSON.parse(
  readFileSync(join(process.cwd(), "drizzle/meta/_journal.json"), "utf8"),
) as { entries: Array<{ tag: string }> };
const p11Snapshot = JSON.parse(
  readFileSync(join(process.cwd(), "drizzle/meta/0005_snapshot.json"), "utf8"),
) as {
  tables: Record<
    string,
    { checkConstraints?: Record<string, { value: string }> }
  >;
};

const householdScopedTables = [
  "calendar_connections",
  "calendar_events",
  "child_wins",
  "children",
  "chore_submissions",
  "chores",
  "event_enrichments",
  "goals",
  "parents",
  "point_ledger",
  "progress_check_ins",
  "reward_contributions",
  "reward_requests",
  "rewards",
  "skipped_chore_occurrences",
];

const childScopedTables = [
  "children",
  "chores",
  "chore_submissions",
  "skipped_chore_occurrences",
  "goals",
  "progress_check_ins",
  "reward_contributions",
  "reward_requests",
  "point_ledger",
  "child_wins",
];

describe("production database schema", () => {
  it("keeps every V1 data table under RLS with a Household boundary", () => {
    expect(snapshot.tables["public.households"]?.isRLSEnabled).toBe(true);

    for (const table of householdScopedTables) {
      const tableSnapshot = snapshot.tables[`public.${table}`];

      expect(tableSnapshot?.isRLSEnabled).toBe(true);
      expect(tableSnapshot?.columns).toHaveProperty("household_id");
      expect(migration).toContain(
        `CREATE POLICY "${table}_parent_access" ON "${table}"`,
      );
      expect(migration).toContain(
        `"public"."familyapp_parent_can_access_household"("household_id")`,
      );
    }
  });

  it("models launch-only secrets, session invalidation, and point sources explicitly", () => {
    expect(snapshot.tables["public.calendar_connections"]?.columns).toHaveProperty(
      "public_feed_url",
    );
    expect(snapshot.tables["public.calendar_connections"]?.columns).not.toHaveProperty(
      "source_url",
    );
    expect(snapshot.tables["public.children"]?.columns).toHaveProperty(
      "session_version",
    );

    expect(migration).toContain(
      `CREATE TYPE "public"."point_ledger_source_type" AS ENUM`,
    );
    expect(migration).toContain("reward_request_approval_spend");
    expect(p11Migration).toContain(
      `"source_type" = 'reward_request_approval_spend'`,
    );
    expect(migrationJournal.entries).toContainEqual(
      expect.objectContaining({ tag: "0005_p11_reward_approval_ledger" }),
    );
    expect(
      p11Snapshot.tables["public.point_ledger"]?.checkConstraints
        ?.point_ledger_delta_non_zero?.value,
    ).toContain("reward_request_approval_spend");
    expect(migration).toContain(
      `ALTER TABLE "point_ledger" ALTER COLUMN "source_type" SET DATA TYPE "public"."point_ledger_source_type"`,
    );
    expect(migration).toContain(
      `CREATE TYPE "public"."child_win_source_type" AS ENUM`,
    );
  });

  it("guards child-session access with current Child identity and session version", () => {
    expect(migration).toContain(
      `CREATE OR REPLACE FUNCTION "public"."familyapp_child_session_in_household"`,
    );
    expect(migration).toContain(
      `CREATE OR REPLACE FUNCTION "public"."familyapp_child_can_access_event"`,
    );
    expect(migration).toContain(
      `"children"."session_version"::text = coalesce("public"."familyapp_child_session_claim"('session_version'), '')`,
    );
    expect(migration).not.toContain("children_point_balance_non_negative");

    for (const table of childScopedTables) {
      expect(migration).toContain(
        `CREATE POLICY "${table}_child_select" ON "${table}"`,
      );
      expect(migration).toContain(
        `"public"."familyapp_child_can_access_child"("household_id", "child_id")`,
      );
    }

    expect(migration).toContain(
      `CREATE POLICY "households_child_select" ON "households"`,
    );
    expect(migration).toContain(
      `CREATE POLICY "rewards_child_select" ON "rewards"`,
    );
    expect(migration).toContain(
      `CREATE POLICY "calendar_events_child_select" ON "calendar_events" AS PERMISSIVE FOR SELECT TO public USING ("public"."familyapp_child_can_access_event"("household_id", "id"))`,
    );
    expect(migration).toContain(
      `"event_enrichments"."participant_child_ids" ? coalesce("public"."familyapp_child_session_claim"('child_id'), '')`,
    );
    expect(migration).not.toContain(
      `CREATE POLICY "calendar_connections_child_select"`,
    );
    expect(migration).not.toContain(`CREATE POLICY "parents_child_select"`);
  });

  it("creates composite Household indexes before constraints reference them", () => {
    const requiredReferencedIndexes = [
      "calendar_events_household_id_id_idx",
      "children_household_id_id_idx",
      "chores_household_id_id_idx",
      "goals_household_id_id_idx",
      "reward_requests_household_id_id_idx",
      "rewards_household_id_id_idx",
    ];

    for (const indexName of requiredReferencedIndexes) {
      expect(migration.indexOf(`CREATE UNIQUE INDEX "${indexName}"`)).toBeLessThan(
        migration.indexOf(" ADD CONSTRAINT "),
      );
    }

    expect(migration).toContain(
      `FOREIGN KEY ("household_id","child_id") REFERENCES "public"."children"("household_id","id")`,
    );
    expect(migration).toContain(
      `FOREIGN KEY ("household_id","reward_id") REFERENCES "public"."rewards"("household_id","id")`,
    );
  });
});
