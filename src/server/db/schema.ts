import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const householdRole = pgEnum("household_role", ["parent", "child"]);
export const choreStatus = pgEnum("chore_status", [
  "active",
  "paused",
  "archived",
]);
export const routineFrequency = pgEnum("routine_frequency", ["daily", "weekly"]);
export const choreSubmissionStatus = pgEnum("chore_submission_status", [
  "pending",
  "approved",
  "needs_work",
]);
export const goalStatus = pgEnum("goal_status", [
  "active",
  "completed",
  "archived",
]);
export const progressCheckInStatus = pgEnum("progress_check_in_status", [
  "pending",
  "approved",
  "needs_work",
]);
export const rewardType = pgEnum("reward_type", [
  "allowance",
  "experience",
  "privilege",
  "custom",
]);
export const rewardStatus = pgEnum("reward_status", ["active", "archived"]);
export const rewardContributionStatus = pgEnum("reward_contribution_status", [
  "active",
  "requested",
  "returned",
]);
export const rewardRequestStatus = pgEnum("reward_request_status", [
  "pending",
  "approved",
  "rejected",
  "canceled",
  "fulfilled",
]);
export const pointLedgerSourceType = pgEnum("point_ledger_source_type", [
  "chore_approval",
  "progress_check_in_approval",
  "goal_completion",
  "reward_contribution",
  "reward_contribution_return",
  "reward_request_reservation",
  "reward_request_approval_spend",
  "reward_request_return",
  "bonus_points",
  "point_adjustment",
]);
export const childWinSourceType = pgEnum("child_win_source_type", [
  "chore",
  "progress_check_in",
  "goal",
  "reward",
]);

export const households = pgTable(
  "households",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameNotBlank: check("households_name_not_blank", sql`length(trim(${table.name})) > 0`),
  }),
).enableRLS();

export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    calendarName: text("calendar_name").notNull(),
    publicFeedUrl: text("public_feed_url").notNull(),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastSyncAttemptAt: timestamp("last_sync_attempt_at", { withTimezone: true }),
    lastSuccessfulSyncAt: timestamp("last_successful_sync_at", {
      withTimezone: true,
    }),
    syncFailureStatus: text("sync_failure_status"),
  },
  (table) => ({
    householdIndex: uniqueIndex("calendar_connections_household_idx").on(
      table.householdId,
    ),
    nameNotBlank: check(
      "calendar_connections_name_not_blank",
      sql`length(trim(${table.calendarName})) > 0`,
    ),
    feedUrlNotBlank: check(
      "calendar_connections_public_feed_url_not_blank",
      sql`length(trim(${table.publicFeedUrl})) > 0`,
    ),
  }),
).enableRLS();

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    appleEventId: text("apple_event_id").notNull(),
    title: text("title").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    location: text("location"),
    syncedAt: timestamp("synced_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    appleEventIndex: uniqueIndex("calendar_events_apple_event_idx").on(
      table.householdId,
      table.appleEventId,
    ),
    householdStartsAtIndex: index("calendar_events_household_starts_at_idx").on(
      table.householdId,
      table.startsAt,
    ),
    householdIdIndex: uniqueIndex("calendar_events_household_id_id_idx").on(
      table.householdId,
      table.id,
    ),
    titleNotBlank: check(
      "calendar_events_title_not_blank",
      sql`length(trim(${table.title})) > 0`,
    ),
  }),
).enableRLS();

export const eventEnrichments = pgTable(
  "event_enrichments",
  {
    eventId: uuid("event_id")
      .primaryKey()
      .references(() => calendarEvents.id),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    participantChildIds: jsonb("participant_child_ids").$type<string[]>().notNull(),
    isAllHousehold: boolean("is_all_household").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventHouseholdReference: foreignKey({
      name: "event_enrichments_household_event_fk",
      columns: [table.householdId, table.eventId],
      foreignColumns: [calendarEvents.householdId, calendarEvents.id],
    }),
  }),
).enableRLS();

export const parents = pgTable(
  "parents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    authUserId: uuid("auth_user_id"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: householdRole("role").notNull().default("parent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    householdEmailIndex: uniqueIndex("parents_household_email_idx").on(
      table.householdId,
      sql`lower(${table.email})`,
    ),
    householdIdIndex: uniqueIndex("parents_household_id_id_idx").on(
      table.householdId,
      table.id,
    ),
    emailIndex: index("parents_email_idx").on(sql`lower(${table.email})`),
    nameNotBlank: check("parents_name_not_blank", sql`length(trim(${table.name})) > 0`),
    emailNotBlank: check(
      "parents_email_not_blank",
      sql`length(trim(${table.email})) > 0`,
    ),
  }),
).enableRLS();

export const children = pgTable(
  "children",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    name: text("name").notNull(),
    pinHash: text("pin_hash").notNull(),
    pinSalt: text("pin_salt").notNull(),
    sessionVersion: integer("session_version").notNull().default(1),
    pointBalance: integer("point_balance").notNull().default(0),
    role: householdRole("role").notNull().default("child"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdIndex: uniqueIndex("children_household_id_id_idx").on(
      table.householdId,
      table.id,
    ),
    householdIndex: index("children_household_idx").on(table.householdId),
    nameNotBlank: check("children_name_not_blank", sql`length(trim(${table.name})) > 0`),
    pinHashNotBlank: check(
      "children_pin_hash_not_blank",
      sql`length(trim(${table.pinHash})) > 0`,
    ),
    pinSaltNotBlank: check(
      "children_pin_salt_not_blank",
      sql`length(trim(${table.pinSalt})) > 0`,
    ),
    sessionVersionPositive: check(
      "children_session_version_positive",
      sql`${table.sessionVersion} > 0`,
    ),
  }),
).enableRLS();

export const chores = pgTable(
  "chores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id),
    title: text("title").notNull(),
    pointValue: integer("point_value").notNull(),
    dueDate: date("due_date").notNull(),
    routineFrequency: routineFrequency("routine_frequency"),
    status: choreStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdIndex: uniqueIndex("chores_household_id_id_idx").on(
      table.householdId,
      table.id,
    ),
    childDueDateIndex: index("chores_child_due_date_idx").on(
      table.householdId,
      table.childId,
      table.dueDate,
    ),
    householdChildReference: foreignKey({
      name: "chores_household_child_fk",
      columns: [table.householdId, table.childId],
      foreignColumns: [children.householdId, children.id],
    }),
    titleNotBlank: check("chores_title_not_blank", sql`length(trim(${table.title})) > 0`),
    pointValuePositive: check("chores_point_value_positive", sql`${table.pointValue} > 0`),
  }),
).enableRLS();

export const choreSubmissions = pgTable(
  "chore_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    choreId: uuid("chore_id")
      .notNull()
      .references(() => chores.id),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id),
    occurrenceDate: date("occurrence_date").notNull(),
    status: choreSubmissionStatus("status").notNull().default("pending"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => ({
    pendingOccurrenceIndex: uniqueIndex(
      "chore_submissions_pending_occurrence_idx",
    ).on(table.choreId, table.childId, table.occurrenceDate, table.status),
    householdChildStatusIndex: index("chore_submissions_household_child_status_idx").on(
      table.householdId,
      table.childId,
      table.status,
    ),
    householdChoreReference: foreignKey({
      name: "chore_submissions_household_chore_fk",
      columns: [table.householdId, table.choreId],
      foreignColumns: [chores.householdId, chores.id],
    }),
    householdChildReference: foreignKey({
      name: "chore_submissions_household_child_fk",
      columns: [table.householdId, table.childId],
      foreignColumns: [children.householdId, children.id],
    }),
  }),
).enableRLS();

export const skippedChoreOccurrences = pgTable(
  "skipped_chore_occurrences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    choreId: uuid("chore_id")
      .notNull()
      .references(() => chores.id),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id),
    occurrenceDate: date("occurrence_date").notNull(),
    skippedAt: timestamp("skipped_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    skippedOccurrenceIndex: uniqueIndex("skipped_chore_occurrences_idx").on(
      table.choreId,
      table.childId,
      table.occurrenceDate,
    ),
    householdChildIndex: index("skipped_chore_occurrences_household_child_idx").on(
      table.householdId,
      table.childId,
    ),
    householdChoreReference: foreignKey({
      name: "skipped_chore_occurrences_household_chore_fk",
      columns: [table.householdId, table.choreId],
      foreignColumns: [chores.householdId, chores.id],
    }),
    householdChildReference: foreignKey({
      name: "skipped_chore_occurrences_household_child_fk",
      columns: [table.householdId, table.childId],
      foreignColumns: [children.householdId, children.id],
    }),
  }),
).enableRLS();

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id),
    title: text("title").notNull(),
    pointValue: integer("point_value").notNull(),
    status: goalStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    householdIdIndex: uniqueIndex("goals_household_id_id_idx").on(
      table.householdId,
      table.id,
    ),
    householdChildStatusIndex: index("goals_household_child_status_idx").on(
      table.householdId,
      table.childId,
      table.status,
    ),
    householdChildReference: foreignKey({
      name: "goals_household_child_fk",
      columns: [table.householdId, table.childId],
      foreignColumns: [children.householdId, children.id],
    }),
    titleNotBlank: check("goals_title_not_blank", sql`length(trim(${table.title})) > 0`),
    pointValuePositive: check("goals_point_value_positive", sql`${table.pointValue} > 0`),
  }),
).enableRLS();

export const progressCheckIns = pgTable(
  "progress_check_ins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id),
    status: progressCheckInStatus("status").notNull().default("pending"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  },
  (table) => ({
    householdChildStatusIndex: index(
      "progress_check_ins_household_child_status_idx",
    ).on(table.householdId, table.childId, table.status),
    householdGoalReference: foreignKey({
      name: "progress_check_ins_household_goal_fk",
      columns: [table.householdId, table.goalId],
      foreignColumns: [goals.householdId, goals.id],
    }),
    householdChildReference: foreignKey({
      name: "progress_check_ins_household_child_fk",
      columns: [table.householdId, table.childId],
      foreignColumns: [children.householdId, children.id],
    }),
  }),
).enableRLS();

export const rewards = pgTable(
  "rewards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    title: text("title").notNull(),
    pointCost: integer("point_cost").notNull(),
    type: rewardType("type").notNull().default("custom"),
    status: rewardStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdIdIndex: uniqueIndex("rewards_household_id_id_idx").on(
      table.householdId,
      table.id,
    ),
    householdStatusIndex: index("rewards_household_status_idx").on(
      table.householdId,
      table.status,
    ),
    titleNotBlank: check("rewards_title_not_blank", sql`length(trim(${table.title})) > 0`),
    pointCostPositive: check("rewards_point_cost_positive", sql`${table.pointCost} > 0`),
  }),
).enableRLS();

export const rewardContributions = pgTable(
  "reward_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    rewardId: uuid("reward_id")
      .notNull()
      .references(() => rewards.id),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id),
    requestId: uuid("request_id"),
    points: integer("points").notNull(),
    status: rewardContributionStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdChildStatusIndex: index(
      "reward_contributions_household_child_status_idx",
    ).on(table.householdId, table.childId, table.status),
    householdRewardReference: foreignKey({
      name: "reward_contributions_household_reward_fk",
      columns: [table.householdId, table.rewardId],
      foreignColumns: [rewards.householdId, rewards.id],
    }),
    householdChildReference: foreignKey({
      name: "reward_contributions_household_child_fk",
      columns: [table.householdId, table.childId],
      foreignColumns: [children.householdId, children.id],
    }),
    householdRequestReference: foreignKey({
      name: "reward_contributions_household_request_fk",
      columns: [table.householdId, table.requestId],
      foreignColumns: [rewardRequests.householdId, rewardRequests.id],
    }),
    pointsPositive: check(
      "reward_contributions_points_positive",
      sql`${table.points} > 0`,
    ),
  }),
).enableRLS();

export const rewardRequests = pgTable(
  "reward_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    rewardId: uuid("reward_id")
      .notNull()
      .references(() => rewards.id),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id),
    status: rewardRequestStatus("status").notNull().default("pending"),
    contributionPoints: integer("contribution_points").notNull().default(0),
    reservedPoints: integer("reserved_points").notNull().default(0),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
  },
  (table) => ({
    householdIdIndex: uniqueIndex("reward_requests_household_id_id_idx").on(
      table.householdId,
      table.id,
    ),
    householdChildStatusIndex: index("reward_requests_household_child_status_idx").on(
      table.householdId,
      table.childId,
      table.status,
    ),
    householdRewardReference: foreignKey({
      name: "reward_requests_household_reward_fk",
      columns: [table.householdId, table.rewardId],
      foreignColumns: [rewards.householdId, rewards.id],
    }),
    householdChildReference: foreignKey({
      name: "reward_requests_household_child_fk",
      columns: [table.householdId, table.childId],
      foreignColumns: [children.householdId, children.id],
    }),
    contributionPointsNonNegative: check(
      "reward_requests_contribution_points_non_negative",
      sql`${table.contributionPoints} >= 0`,
    ),
    reservedPointsNonNegative: check(
      "reward_requests_reserved_points_non_negative",
      sql`${table.reservedPoints} >= 0`,
    ),
  }),
).enableRLS();

export const pointLedger = pgTable(
  "point_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id),
    delta: integer("delta").notNull(),
    description: text("description").notNull(),
    sourceType: pointLedgerSourceType("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdChildCreatedAtIndex: index("point_ledger_household_child_created_at_idx").on(
      table.householdId,
      table.childId,
      table.createdAt,
    ),
    householdChildReference: foreignKey({
      name: "point_ledger_household_child_fk",
      columns: [table.householdId, table.childId],
      foreignColumns: [children.householdId, children.id],
    }),
    deltaNonZero: check("point_ledger_delta_non_zero", sql`${table.delta} <> 0`),
    descriptionNotBlank: check(
      "point_ledger_description_not_blank",
      sql`length(trim(${table.description})) > 0`,
    ),
  }),
).enableRLS();

export const childWins = pgTable(
  "child_wins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    sourceType: childWinSourceType("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    householdChildEarnedAtIndex: index("child_wins_household_child_earned_at_idx").on(
      table.householdId,
      table.childId,
      table.earnedAt,
    ),
    householdChildReference: foreignKey({
      name: "child_wins_household_child_fk",
      columns: [table.householdId, table.childId],
      foreignColumns: [children.householdId, children.id],
    }),
    titleNotBlank: check("child_wins_title_not_blank", sql`length(trim(${table.title})) > 0`),
    descriptionNotBlank: check(
      "child_wins_description_not_blank",
      sql`length(trim(${table.description})) > 0`,
    ),
  }),
).enableRLS();
