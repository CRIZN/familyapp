import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type { ChoreSubmission } from "@/domain/chores";
import type { Household } from "@/domain/household";
import { getDatabase, type AppDatabase } from "@/server/db/client";
import {
  children,
  choreSubmissions,
  chores,
  households,
  skippedChoreOccurrences,
} from "@/server/db/schema";

import type { ChildChoreRepository } from "./chores";
import type { ChildSessionRepository } from "./session";

export type ChildSignInOptions = {
  children: Array<{ id: string; name: string }>;
  householdId: string;
};

export type ChildAppRepository = ChildSessionRepository &
  ChildChoreRepository & {
    getChildSignInOptions: () => Promise<ChildSignInOptions | null>;
  };

export function createDrizzleChildAppRepository(
  db: AppDatabase = getDatabase(),
): ChildAppRepository {
  return {
    async findChildCredentials(childId) {
      const [child] = await db
        .select({
          childId: children.id,
          householdId: children.householdId,
          pinHash: children.pinHash,
          pinSalt: children.pinSalt,
          sessionVersion: children.sessionVersion,
        })
        .from(children)
        .where(eq(children.id, childId))
        .limit(1);

      return child ?? null;
    },

    async findHouseholdForChildSession(claims) {
      const [child] = await db
        .select({
          id: children.id,
          householdId: children.householdId,
          name: children.name,
          pointBalance: children.pointBalance,
          sessionVersion: children.sessionVersion,
        })
        .from(children)
        .where(
          and(
            eq(children.householdId, claims.householdId),
            eq(children.id, claims.childId),
            eq(children.sessionVersion, claims.sessionVersion),
          ),
        )
        .limit(1);

      if (!child) {
        return null;
      }

      return getChildScopedHousehold(db, {
        childId: child.id,
        householdId: child.householdId,
        sessionVersion: child.sessionVersion,
      });
    },

    async createChoreSubmission(session, submission) {
      await db.insert(choreSubmissions).values({
        childId: session.childId,
        choreId: submission.choreId,
        householdId: session.householdId,
        id: submission.id,
        occurrenceDate: submission.occurrenceDate,
        status: submission.status,
        submittedAt: new Date(submission.submittedAt),
      });

      const household = await getChildScopedHousehold(db, {
        childId: session.childId,
        householdId: session.householdId,
        sessionVersion: session.sessionVersion,
      });

      if (!household) {
        throw new Error("Child session expired.");
      }

      return household;
    },

    async getChildSignInOptions() {
      const [household] = await db
        .select({ id: households.id })
        .from(households)
        .limit(1);

      if (!household) {
        return null;
      }

      const childRows = await db
        .select({ id: children.id, name: children.name })
        .from(children)
        .where(eq(children.householdId, household.id))
        .orderBy(asc(children.createdAt));

      return {
        children: childRows,
        householdId: household.id,
      };
    },
  };
}

async function getChildScopedHousehold(
  db: AppDatabase,
  child: {
    childId: string;
    householdId: string;
    sessionVersion: number;
  },
): Promise<Household | null> {
  const [householdRows, childRows] = await Promise.all([
    db
      .select()
      .from(households)
      .where(eq(households.id, child.householdId))
      .limit(1),
    db
      .select()
      .from(children)
      .where(
        and(
          eq(children.householdId, child.householdId),
          eq(children.id, child.childId),
          eq(children.sessionVersion, child.sessionVersion),
        ),
      )
      .limit(1),
  ]);
  const household = householdRows[0];
  const childRow = childRows[0];

  if (!household || !childRow) {
    return null;
  }

  const [choreRows, submissionRows, skippedRows] = await Promise.all([
    db
      .select()
      .from(chores)
      .where(
        and(eq(chores.householdId, child.householdId), eq(chores.childId, child.childId)),
      )
      .orderBy(asc(chores.dueDate), asc(chores.createdAt)),
    db
      .select()
      .from(choreSubmissions)
      .where(
        and(
          eq(choreSubmissions.householdId, child.householdId),
          eq(choreSubmissions.childId, child.childId),
        ),
      )
      .orderBy(asc(choreSubmissions.occurrenceDate), asc(choreSubmissions.submittedAt)),
    db
      .select()
      .from(skippedChoreOccurrences)
      .where(
        and(
          eq(skippedChoreOccurrences.householdId, child.householdId),
          eq(skippedChoreOccurrences.childId, child.childId),
        ),
      )
      .orderBy(asc(skippedChoreOccurrences.occurrenceDate)),
  ]);

  return {
    calendarConnection: null,
    calendarEvents: [],
    childWins: [],
    children: [
      {
        id: childRow.id,
        name: childRow.name,
        pinHash: "",
        pinSalt: "",
        pointBalance: childRow.pointBalance,
        sessionVersion: childRow.sessionVersion,
      },
    ],
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
    parents: [],
    pointLedger: [],
    progressCheckIns: [],
    rewardContributions: [],
    rewardRequests: [],
    rewards: [],
    skippedChoreOccurrences: skippedRows.map((occurrence) => ({
      childId: occurrence.childId,
      choreId: occurrence.choreId,
      id: occurrence.id,
      occurrenceDate: occurrence.occurrenceDate,
      skippedAt: occurrence.skippedAt.toISOString(),
    })),
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
