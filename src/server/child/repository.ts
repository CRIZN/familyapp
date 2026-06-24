import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import type { ChoreSubmission } from "@/domain/chores";
import type { Goal, ProgressCheckIn } from "@/domain/goals";
import type { ChildWin, PointLedgerEntry } from "@/domain/household";
import type { Household } from "@/domain/household";
import type {
  Reward,
  RewardContribution,
  RewardRequest,
} from "@/domain/rewards";
import { getDatabase, type AppDatabase } from "@/server/db/client";
import {
  children,
  childWins,
  choreSubmissions,
  chores,
  goals,
  households,
  pointLedger,
  progressCheckIns,
  rewardContributions,
  rewardRequests,
  rewards,
  skippedChoreOccurrences,
} from "@/server/db/schema";

import type { ChildChoreRepository } from "./chores";
import type { ChildGoalRepository } from "./goals";
import type { ChildRewardRepository } from "./rewards";
import type { ChildSessionRepository } from "./session";

export type ChildSignInOptions = {
  children: Array<{ id: string; name: string }>;
  householdId: string;
};

export type ChildAppRepository = ChildSessionRepository &
  ChildChoreRepository &
  ChildRewardRepository &
  ChildGoalRepository & {
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

    async createProgressCheckIn(session, checkIn) {
      await db.insert(progressCheckIns).values({
        childId: session.childId,
        goalId: checkIn.goalId,
        householdId: session.householdId,
        id: checkIn.id,
        status: checkIn.status,
        submittedAt: new Date(checkIn.submittedAt),
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

    async saveRewardTransition(session, input) {
      await db.transaction(async (tx) => {
        const rewardIds = Array.from(
          new Set([
            ...input.createdContributions.map((contribution) => contribution.rewardId),
            ...input.updatedContributions.map((contribution) => contribution.rewardId),
            ...input.createdRequests.map((request) => request.rewardId),
            ...input.updatedRequests.map((request) => request.rewardId),
          ]),
        );

        for (const rewardId of rewardIds) {
          await tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${`${session.householdId}:${session.childId}:${rewardId}`}))`,
          );
        }

        for (const contribution of input.createdContributions) {
          const [reward] = await tx
            .select({ pointCost: rewards.pointCost })
            .from(rewards)
            .where(
              and(
                eq(rewards.householdId, session.householdId),
                eq(rewards.id, contribution.rewardId),
                eq(rewards.status, "active"),
              ),
            )
            .limit(1);
          const activeContributionRows = await tx
            .select({ points: rewardContributions.points })
            .from(rewardContributions)
            .where(
              and(
                eq(rewardContributions.householdId, session.householdId),
                eq(rewardContributions.childId, session.childId),
                eq(rewardContributions.rewardId, contribution.rewardId),
                eq(rewardContributions.status, "active"),
              ),
            );
          const activeContributionPoints = activeContributionRows.reduce(
            (total, row) => total + row.points,
            0,
          );

          if (!reward || activeContributionPoints + contribution.points > reward.pointCost) {
            throw new Error("Reward Contributions cannot exceed the Reward cost.");
          }
        }

        for (const request of input.createdRequests) {
          const existingPending = await tx
            .select({ id: rewardRequests.id })
            .from(rewardRequests)
            .where(
              and(
                eq(rewardRequests.householdId, session.householdId),
                eq(rewardRequests.childId, session.childId),
                eq(rewardRequests.rewardId, request.rewardId),
                eq(rewardRequests.status, "pending"),
              ),
            )
            .limit(1);

          if (existingPending.length > 0) {
            throw new Error("This Reward Request is already waiting for Parent review.");
          }
        }

        for (const balanceChange of input.balanceChanges) {
          const updatedRows = await tx
            .update(children)
            .set({
              pointBalance: sql`${children.pointBalance} + ${balanceChange.delta}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(children.householdId, session.householdId),
                eq(children.id, session.childId),
                sql`${children.pointBalance} + ${balanceChange.delta} >= 0`,
              ),
            )
            .returning({ id: children.id });

          if (updatedRows.length === 0) {
            throw new Error("This Child does not have enough available Points.");
          }
        }

        if (input.createdContributions.length > 0) {
          await tx.insert(rewardContributions).values(
            input.createdContributions.map((contribution) => ({
              childId: session.childId,
              createdAt: new Date(contribution.createdAt),
              householdId: session.householdId,
              id: contribution.id,
              points: contribution.points,
              requestId: contribution.requestId ?? null,
              rewardId: contribution.rewardId,
              status: contribution.status,
              updatedAt: new Date(contribution.updatedAt),
            })),
          );
        }

        for (const contribution of input.updatedContributions) {
          const updatedRows = await tx
            .update(rewardContributions)
            .set({
              requestId: contribution.requestId ?? null,
              status: contribution.status,
              updatedAt: new Date(contribution.updatedAt),
            })
            .where(
              and(
                eq(rewardContributions.householdId, session.householdId),
                eq(rewardContributions.childId, session.childId),
                eq(rewardContributions.id, contribution.id),
              ),
            )
            .returning({ id: rewardContributions.id });

          if (updatedRows.length === 0) {
            throw new Error("Reward Contribution not found.");
          }
        }

        if (input.createdRequests.length > 0) {
          await tx.insert(rewardRequests).values(
            input.createdRequests.map((request) => ({
              childId: session.childId,
              contributionPoints: request.contributionPoints,
              householdId: session.householdId,
              id: request.id,
              requestedAt: new Date(request.requestedAt),
              reservedPoints: request.reservedPoints,
              rewardId: request.rewardId,
              status: request.status,
            })),
          );
        }

        for (const request of input.updatedRequests) {
          const updatedRows = await tx
            .update(rewardRequests)
            .set({
              reviewedAt: request.reviewedAt ? new Date(request.reviewedAt) : null,
              status: request.status,
            })
            .where(
              and(
                eq(rewardRequests.householdId, session.householdId),
                eq(rewardRequests.childId, session.childId),
                eq(rewardRequests.id, request.id),
                eq(rewardRequests.status, "pending"),
              ),
            )
            .returning({ id: rewardRequests.id });

          if (updatedRows.length === 0) {
            throw new Error("Only pending Reward Requests can be canceled.");
          }
        }

        if (input.pointLedger.length > 0) {
          await tx.insert(pointLedger).values(
            input.pointLedger.map((entry) => ({
              childId: session.childId,
              createdAt: new Date(entry.createdAt),
              delta: entry.delta,
              description: entry.description,
              householdId: session.householdId,
              id: entry.id,
              sourceId: entry.sourceId,
              sourceType: entry.sourceType,
            })),
          );
        }
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

  const [
    choreRows,
    submissionRows,
    skippedRows,
    goalRows,
    progressRows,
    rewardRows,
    contributionRows,
    requestRows,
    ledgerRows,
    winRows,
  ] = await Promise.all([
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
    db
      .select()
      .from(goals)
      .where(
        and(eq(goals.householdId, child.householdId), eq(goals.childId, child.childId)),
      )
      .orderBy(asc(goals.createdAt)),
    db
      .select()
      .from(progressCheckIns)
      .where(
        and(
          eq(progressCheckIns.householdId, child.householdId),
          eq(progressCheckIns.childId, child.childId),
        ),
      )
      .orderBy(asc(progressCheckIns.submittedAt)),
    db
      .select()
      .from(rewards)
      .where(eq(rewards.householdId, child.householdId))
      .orderBy(asc(rewards.createdAt)),
    db
      .select()
      .from(rewardContributions)
      .where(
        and(
          eq(rewardContributions.householdId, child.householdId),
          eq(rewardContributions.childId, child.childId),
        ),
      )
      .orderBy(asc(rewardContributions.createdAt)),
    db
      .select()
      .from(rewardRequests)
      .where(
        and(
          eq(rewardRequests.householdId, child.householdId),
          eq(rewardRequests.childId, child.childId),
        ),
      )
      .orderBy(asc(rewardRequests.requestedAt)),
    db
      .select()
      .from(pointLedger)
      .where(
        and(
          eq(pointLedger.householdId, child.householdId),
          eq(pointLedger.childId, child.childId),
        ),
      )
      .orderBy(asc(pointLedger.createdAt)),
    db
      .select()
      .from(childWins)
      .where(
        and(
          eq(childWins.householdId, child.householdId),
          eq(childWins.childId, child.childId),
        ),
      )
      .orderBy(asc(childWins.earnedAt)),
  ]);

  return {
    calendarConnection: null,
    calendarEvents: [],
    childWins: winRows.map(mapChildWinRow),
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
    goals: goalRows.map(mapGoalRow),
    id: household.id,
    name: household.name,
    parents: [],
    pointLedger: ledgerRows.map(mapPointLedgerRow),
    progressCheckIns: progressRows.map(mapProgressCheckInRow),
    rewardContributions: contributionRows.map(mapRewardContributionRow),
    rewardRequests: requestRows.map(mapRewardRequestRow),
    rewards: rewardRows.map(mapRewardRow),
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

function mapGoalRow(goal: typeof goals.$inferSelect): Goal {
  return {
    childId: goal.childId,
    completedAt: goal.completedAt?.toISOString(),
    createdAt: goal.createdAt.toISOString(),
    id: goal.id,
    pointValue: goal.pointValue,
    status: goal.status,
    title: goal.title,
    updatedAt: goal.updatedAt.toISOString(),
  };
}

function mapProgressCheckInRow(
  checkIn: typeof progressCheckIns.$inferSelect,
): ProgressCheckIn {
  return {
    childId: checkIn.childId,
    goalId: checkIn.goalId,
    id: checkIn.id,
    reviewedAt: checkIn.reviewedAt?.toISOString(),
    status: checkIn.status,
    submittedAt: checkIn.submittedAt.toISOString(),
  };
}

function mapRewardRow(reward: typeof rewards.$inferSelect): Reward {
  return {
    createdAt: reward.createdAt.toISOString(),
    id: reward.id,
    pointCost: reward.pointCost,
    status: reward.status,
    title: reward.title,
    type: reward.type,
    updatedAt: reward.updatedAt.toISOString(),
  };
}

function mapRewardContributionRow(
  contribution: typeof rewardContributions.$inferSelect,
): RewardContribution {
  return {
    childId: contribution.childId,
    createdAt: contribution.createdAt.toISOString(),
    id: contribution.id,
    points: contribution.points,
    requestId: contribution.requestId ?? undefined,
    rewardId: contribution.rewardId,
    status: contribution.status,
    updatedAt: contribution.updatedAt.toISOString(),
  };
}

function mapRewardRequestRow(
  request: typeof rewardRequests.$inferSelect,
): RewardRequest {
  return {
    childId: request.childId,
    contributionPoints: request.contributionPoints,
    fulfilledAt: request.fulfilledAt?.toISOString(),
    id: request.id,
    requestedAt: request.requestedAt.toISOString(),
    reservedPoints: request.reservedPoints,
    reviewedAt: request.reviewedAt?.toISOString(),
    rewardId: request.rewardId,
    status: request.status,
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
