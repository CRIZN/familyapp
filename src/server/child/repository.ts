import "server-only";

import { and, asc, eq } from "drizzle-orm";

import type { Household } from "@/domain/household";
import { getDatabase, type AppDatabase } from "@/server/db/client";
import { children, households } from "@/server/db/schema";

import type { ChildSessionRepository } from "./session";

export type ChildSignInOptions = {
  children: Array<{ id: string; name: string }>;
  householdId: string;
};

export type ChildAppRepository = ChildSessionRepository & {
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
        name: child.name,
        pointBalance: child.pointBalance,
        sessionVersion: child.sessionVersion,
      });
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
    name: string;
    pointBalance: number;
    sessionVersion: number;
  },
): Promise<Household | null> {
  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.id, child.householdId))
    .limit(1);

  if (!household) {
    return null;
  }

  return {
    calendarConnection: null,
    calendarEvents: [],
    childWins: [],
    children: [
      {
        id: child.childId,
        name: child.name,
        pinHash: "",
        pinSalt: "",
        pointBalance: child.pointBalance,
        sessionVersion: child.sessionVersion,
      },
    ],
    choreSubmissions: [],
    chores: [],
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
    skippedChoreOccurrences: [],
    updatedAt: household.updatedAt.toISOString(),
  };
}
