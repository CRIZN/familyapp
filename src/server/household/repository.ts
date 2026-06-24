import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import type { Chore, ChoreSubmission, SkippedChoreOccurrence } from "@/domain/chores";
import type { ChildWin, Household, PointLedgerEntry } from "@/domain/household";
import { getDatabase, type AppDatabase } from "@/server/db/client";
import {
  childWins,
  children,
  choreSubmissions,
  chores,
  households,
  parents,
  pointLedger,
  skippedChoreOccurrences,
} from "@/server/db/schema";

import type { ChoreApprovalPersistence } from "./approvals";

export type HouseholdRepository = {
  addAllowedParent: (
    householdId: string,
    input: { email: string; name: string },
  ) => Promise<Household>;
  approveChoreSubmissions: (
    householdId: string,
    input: ChoreApprovalPersistence,
  ) => Promise<Household>;
  createChore: (householdId: string, chore: Chore) => Promise<Household>;
  createFirstRunHousehold: (
    household: Household,
    firstParentAuthUserId: string,
  ) => Promise<void>;
  findHouseholdForParent: (
    email: string,
    authUserId: string,
  ) => Promise<Household | null>;
  hasAnyHousehold: () => Promise<boolean>;
  markChoreSubmissionNeedsWork: (
    householdId: string,
    input: { reviewedAt: string; submissionId: string },
  ) => Promise<Household>;
  skipChoreOccurrence: (
    householdId: string,
    input: SkippedChoreOccurrence,
  ) => Promise<Household>;
  updateChildPin: (
    householdId: string,
    childId: string,
    input: { pinHash: string; pinSalt: string },
  ) => Promise<Household>;
  updateChildProfile: (
    householdId: string,
    childId: string,
    input: { name: string },
  ) => Promise<Household>;
  updateChoreStatus: (
    householdId: string,
    choreId: string,
    input: { status: Chore["status"] },
  ) => Promise<Household>;
};

export function createDrizzleHouseholdRepository(
  db: AppDatabase = getDatabase(),
): HouseholdRepository {
  return {
    async addAllowedParent(householdId, input) {
      await db.insert(parents).values({
        email: input.email.trim().toLowerCase(),
        householdId,
        name: input.name.trim(),
      });

      return requireHouseholdById(db, householdId);
    },

    async approveChoreSubmissions(householdId, input) {
      if (input.approvedSubmissions.length === 0) {
        return requireHouseholdById(db, householdId);
      }

      await db.transaction(async (tx) => {
        for (const submission of input.approvedSubmissions) {
          const updatedRows = await tx
            .update(choreSubmissions)
            .set({
              reviewedAt: submission.reviewedAt
                ? new Date(submission.reviewedAt)
                : new Date(),
              status: "approved",
            })
            .where(
              and(
                eq(choreSubmissions.householdId, householdId),
                eq(choreSubmissions.id, submission.id),
                eq(choreSubmissions.status, "pending"),
              ),
            )
            .returning({ id: choreSubmissions.id });

          if (updatedRows.length === 0) {
            throw new Error("Only pending Chore Submissions can be approved.");
          }
        }

        for (const balanceChange of input.balanceChanges) {
          await tx
            .update(children)
            .set({
              pointBalance: sql`${children.pointBalance} + ${balanceChange.delta}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(children.householdId, householdId),
                eq(children.id, balanceChange.childId),
              ),
            );
        }

        if (input.pointLedger.length > 0) {
          await tx.insert(pointLedger).values(
            input.pointLedger.map((entry) => ({
              childId: entry.childId,
              createdAt: new Date(entry.createdAt),
              delta: entry.delta,
              description: entry.description,
              householdId,
              id: entry.id,
              sourceId: entry.sourceId,
              sourceType: entry.sourceType,
            })),
          );
        }

        if (input.childWins.length > 0) {
          await tx.insert(childWins).values(
            input.childWins.map((win) => ({
              childId: win.childId,
              description: win.description,
              earnedAt: new Date(win.earnedAt),
              householdId,
              id: win.id,
              sourceId: win.sourceId,
              sourceType: win.sourceType,
              title: win.title,
            })),
          );
        }

        await tx
          .update(households)
          .set({ updatedAt: new Date() })
          .where(eq(households.id, householdId));
      });

      return requireHouseholdById(db, householdId);
    },

    async createChore(householdId, chore) {
      await db.insert(chores).values({
        childId: chore.childId,
        createdAt: new Date(chore.createdAt),
        dueDate: chore.dueDate,
        householdId,
        id: chore.id,
        pointValue: chore.pointValue,
        routineFrequency: chore.routine?.frequency ?? null,
        status: chore.status,
        title: chore.title,
        updatedAt: new Date(chore.updatedAt),
      });

      return requireHouseholdById(db, householdId);
    },

    async createFirstRunHousehold(household, firstParentAuthUserId) {
      await db.transaction(async (tx) => {
        await tx.insert(households).values({
          createdAt: new Date(household.createdAt),
          id: household.id,
          name: household.name,
          updatedAt: new Date(household.updatedAt),
        });

        await tx.insert(parents).values(
          household.parents.map((parent, index) => ({
            authUserId: index === 0 ? firstParentAuthUserId : null,
            email: parent.email,
            householdId: household.id,
            id: parent.id,
            name: parent.name,
          })),
        );

        await tx.insert(children).values(
          household.children.map((child) => ({
            householdId: household.id,
            id: child.id,
            name: child.name,
            pinHash: child.pinHash,
            pinSalt: child.pinSalt,
            pointBalance: child.pointBalance,
            sessionVersion: 1,
          })),
        );
      });
    },

    async findHouseholdForParent(email, _authUserId) {
      void _authUserId;
      const normalizedEmail = email.trim().toLowerCase();
      const [parent] = await db
        .select({
          householdId: parents.householdId,
        })
        .from(parents)
        .where(
          and(
            eq(sql`lower(${parents.email})`, normalizedEmail),
          ),
        )
        .limit(1);

      if (!parent) {
        return null;
      }

      return getHouseholdById(db, parent.householdId);
    },

    async hasAnyHousehold() {
      const existing = await db.select({ id: households.id }).from(households).limit(1);
      return existing.length > 0;
    },

    async markChoreSubmissionNeedsWork(householdId, input) {
      const updatedRows = await db
        .update(choreSubmissions)
        .set({
          reviewedAt: new Date(input.reviewedAt),
          status: "needs_work",
        })
        .where(
          and(
            eq(choreSubmissions.householdId, householdId),
            eq(choreSubmissions.id, input.submissionId),
            eq(choreSubmissions.status, "pending"),
          ),
        )
        .returning({ id: choreSubmissions.id });

      if (updatedRows.length === 0) {
        throw new Error("Only pending Chore Submissions can be marked Needs Work.");
      }

      return requireHouseholdById(db, householdId);
    },

    async skipChoreOccurrence(householdId, input) {
      await db.insert(skippedChoreOccurrences).values({
        childId: input.childId,
        choreId: input.choreId,
        householdId,
        id: input.id,
        occurrenceDate: input.occurrenceDate,
        skippedAt: new Date(input.skippedAt),
      }).onConflictDoNothing();

      return requireHouseholdById(db, householdId);
    },

    async updateChildPin(householdId, childId, input) {
      const updatedRows = await db
        .update(children)
        .set({
          pinHash: input.pinHash,
          pinSalt: input.pinSalt,
          sessionVersion: sql`${children.sessionVersion} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(children.householdId, householdId), eq(children.id, childId)))
        .returning({ id: children.id });

      if (updatedRows.length === 0) {
        throw new Error("Child not found in this Household.");
      }

      return requireHouseholdById(db, householdId);
    },

    async updateChildProfile(householdId, childId, input) {
      const updatedRows = await db
        .update(children)
        .set({
          name: input.name.trim(),
          updatedAt: new Date(),
        })
        .where(and(eq(children.householdId, householdId), eq(children.id, childId)))
        .returning({ id: children.id });

      if (updatedRows.length === 0) {
        throw new Error("Child not found in this Household.");
      }

      return requireHouseholdById(db, householdId);
    },

    async updateChoreStatus(householdId, choreId, input) {
      const updatedRows = await db
        .update(chores)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(and(eq(chores.householdId, householdId), eq(chores.id, choreId)))
        .returning({ id: chores.id });

      if (updatedRows.length === 0) {
        throw new Error("Chore not found.");
      }

      return requireHouseholdById(db, householdId);
    },
  };
}

async function requireHouseholdById(
  db: AppDatabase,
  householdId: string,
): Promise<Household> {
  const household = await getHouseholdById(db, householdId);
  if (!household) {
    throw new Error("Household not found.");
  }

  return household;
}

async function getHouseholdById(
  db: AppDatabase,
  householdId: string,
): Promise<Household | null> {
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  if (!household) {
    return null;
  }

  const [
    parentRows,
    childRows,
    choreRows,
    submissionRows,
    skippedRows,
    ledgerRows,
    winRows,
  ] = await Promise.all([
    db
      .select()
      .from(parents)
      .where(eq(parents.householdId, household.id))
      .orderBy(asc(parents.createdAt)),
    db
      .select()
      .from(children)
      .where(eq(children.householdId, household.id))
      .orderBy(asc(children.createdAt)),
    db
      .select()
      .from(chores)
      .where(eq(chores.householdId, household.id))
      .orderBy(asc(chores.dueDate), asc(chores.createdAt)),
    db
      .select()
      .from(choreSubmissions)
      .where(eq(choreSubmissions.householdId, household.id))
      .orderBy(asc(choreSubmissions.occurrenceDate), asc(choreSubmissions.submittedAt)),
    db
      .select()
      .from(skippedChoreOccurrences)
      .where(eq(skippedChoreOccurrences.householdId, household.id))
      .orderBy(asc(skippedChoreOccurrences.occurrenceDate)),
    db
      .select()
      .from(pointLedger)
      .where(eq(pointLedger.householdId, household.id))
      .orderBy(asc(pointLedger.createdAt)),
    db
      .select()
      .from(childWins)
      .where(eq(childWins.householdId, household.id))
      .orderBy(asc(childWins.earnedAt)),
  ]);

  return {
    calendarConnection: null,
    calendarEvents: [],
    childWins: winRows.map(mapChildWinRow),
    children: childRows.map((child) => ({
      id: child.id,
      name: child.name,
      pinHash: "",
      pinSalt: "",
      pointBalance: child.pointBalance,
      sessionVersion: child.sessionVersion,
    })),
    choreSubmissions: submissionRows.map(mapChoreSubmissionRow),
    chores: choreRows.map((chore) => ({
      childId: chore.childId,
      createdAt: chore.createdAt.toISOString(),
      dueDate: chore.dueDate,
      id: chore.id,
      pointValue: chore.pointValue,
      routine: chore.routineFrequency
        ? { frequency: chore.routineFrequency }
        : null,
      status: chore.status,
      title: chore.title,
      updatedAt: chore.updatedAt.toISOString(),
    })),
    createdAt: household.createdAt.toISOString(),
    eventEnrichments: [],
    goals: [],
    id: household.id,
    name: household.name,
    parents: parentRows.map((parent) => ({
      email: parent.email,
      id: parent.id,
      name: parent.name,
    })),
    pointLedger: ledgerRows.map(mapPointLedgerRow),
    progressCheckIns: [],
    rewardContributions: [],
    rewardRequests: [],
    rewards: [],
    skippedChoreOccurrences: skippedRows.map(mapSkippedChoreOccurrenceRow),
    updatedAt: household.updatedAt.toISOString(),
  };
}

function mapChoreSubmissionRow(
  submission: typeof choreSubmissions.$inferSelect,
): ChoreSubmission {
  return {
    childId: submission.childId,
    choreId: submission.choreId,
    id: submission.id,
    occurrenceDate: submission.occurrenceDate,
    reviewedAt: submission.reviewedAt?.toISOString(),
    status: submission.status,
    submittedAt: submission.submittedAt.toISOString(),
  };
}

function mapSkippedChoreOccurrenceRow(
  occurrence: typeof skippedChoreOccurrences.$inferSelect,
): SkippedChoreOccurrence {
  return {
    childId: occurrence.childId,
    choreId: occurrence.choreId,
    id: occurrence.id,
    occurrenceDate: occurrence.occurrenceDate,
    skippedAt: occurrence.skippedAt.toISOString(),
  };
}

function mapPointLedgerRow(
  entry: typeof pointLedger.$inferSelect,
): PointLedgerEntry {
  return {
    childId: entry.childId,
    createdAt: entry.createdAt.toISOString(),
    delta: entry.delta,
    description: entry.description,
    id: entry.id,
    sourceId: entry.sourceId,
    sourceType: entry.sourceType,
  };
}

function mapChildWinRow(win: typeof childWins.$inferSelect): ChildWin {
  return {
    childId: win.childId,
    description: win.description,
    earnedAt: win.earnedAt.toISOString(),
    id: win.id,
    sourceId: win.sourceId,
    sourceType: win.sourceType,
    title: win.title,
  };
}
