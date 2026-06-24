import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import type { Household } from "@/domain/household";
import { getDatabase, type AppDatabase } from "@/server/db/client";
import { children, households, parents } from "@/server/db/schema";

export type HouseholdRepository = {
  addAllowedParent: (
    householdId: string,
    input: { email: string; name: string },
  ) => Promise<Household>;
  createFirstRunHousehold: (
    household: Household,
    firstParentAuthUserId: string,
  ) => Promise<void>;
  findHouseholdForParent: (
    email: string,
    authUserId: string,
  ) => Promise<Household | null>;
  hasAnyHousehold: () => Promise<boolean>;
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
      pinHash: "",
      pinSalt: "",
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
