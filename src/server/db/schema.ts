import {
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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
      table.email,
    ),
  }),
);

export const children = pgTable("children", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id),
  name: text("name").notNull(),
  pinHash: text("pin_hash").notNull(),
  pinSalt: text("pin_salt").notNull(),
  pointBalance: integer("point_balance").notNull().default(0),
  role: householdRole("role").notNull().default("child"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chores = pgTable("chores", {
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
});

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
  }),
);

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
  }),
);

export const goals = pgTable("goals", {
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
});

export const progressCheckIns = pgTable("progress_check_ins", {
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
});

export const pointLedger = pgTable("point_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id),
  delta: integer("delta").notNull(),
  description: text("description").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const childWins = pgTable("child_wins", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id),
  childId: uuid("child_id")
    .notNull()
    .references(() => children.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: uuid("source_id").notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
});
