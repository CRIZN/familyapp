import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import type { Household } from "@/domain/household";
import { getDatabase, type AppDatabase } from "@/server/db/client";
import { children, households, parents } from "@/server/db/schema";

export type HouseholdRepository = {
  createFirstRunHousehold: (
    household: Household,
    firstParentAuthUserId: string,
  ) => Promise<void>;
  findHouseholdForParent: (
    email: string,
    authUserId: string,
  ) => Promise<Household | null>;
  hasAnyHousehold: () => Promise<boolean>;
};

export function createDrizzleHouseholdRepository(
  db: AppDatabase = getDatabase(),
): HouseholdRepository {
  return {
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

    async findHouseholdForParent(email, authUserId) {
      const normalizedEmail = email.trim().toLowerCase();
      const [parent] = await db
        .select({
          householdId: parents.householdId,
        })
        .from(parents)
        .where(
          and(
            eq(sql`lower(${parents.email})`, normalizedEmail),
            eq(parents.authUserId, authUserId),
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
  };
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

  const [parentRows, childRows] = await Promise.all([
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
  ]);

  return {
    calendarConnection: null,
    calendarEvents: [],
    childWins: [],
    children: childRows.map((child) => ({
      id: child.id,
      name: child.name,
      pinHash: child.pinHash,
      pinSalt: child.pinSalt,
      pointBalance: child.pointBalance,
      sessionVersion: child.sessionVersion,
    })),
    choreSubmissions: [],
    chores: [],
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
    pointLedger: [],
    progressCheckIns: [],
    rewardContributions: [],
    rewardRequests: [],
    rewards: [],
    skippedChoreOccurrences: [],
    updatedAt: household.updatedAt.toISOString(),
  };
}
