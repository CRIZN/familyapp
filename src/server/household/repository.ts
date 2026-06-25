import "server-only";

import { and, asc, eq, notInArray, sql } from "drizzle-orm";

import {
  recordCalendarSyncFailure,
  syncAppleCalendarEvents,
  type AppleCalendarEventInput,
} from "@/domain/calendar";
import type { Chore } from "@/domain/chores";
import type { Household } from "@/domain/household";
import { getDatabase, type AppDatabase } from "@/server/db/client";
import {
  calendarConnections,
  calendarEvents,
  children,
  chores,
  eventEnrichments,
  households,
  parents,
} from "@/server/db/schema";

export type HouseholdRepository = {
  addAllowedParent: (
    householdId: string,
    input: { email: string; name: string },
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
  findCalendarConnectionSource: (
    householdId: string,
  ) => Promise<{ publicFeedUrl: string } | null>;
  hasAnyHousehold: () => Promise<boolean>;
  listCalendarConnectionSources: () => Promise<
    Array<{ householdId: string; publicFeedUrl: string }>
  >;
  recordCalendarSyncFailure: (
    householdId: string,
    input: { attemptedAt: string; failureStatus: string },
  ) => Promise<Household>;
  saveCalendarConnection: (
    householdId: string,
    input: { calendarName: string; publicFeedUrl: string },
  ) => Promise<Household>;
  syncCalendarEvents: (
    householdId: string,
    events: AppleCalendarEventInput[],
    syncedAt: string,
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

    async findCalendarConnectionSource(householdId) {
      const [connection] = await db
        .select({ publicFeedUrl: calendarConnections.publicFeedUrl })
        .from(calendarConnections)
        .where(eq(calendarConnections.householdId, householdId))
        .limit(1);

      return connection ?? null;
    },

    async listCalendarConnectionSources() {
      return db
        .select({
          householdId: calendarConnections.householdId,
          publicFeedUrl: calendarConnections.publicFeedUrl,
        })
        .from(calendarConnections)
        .orderBy(asc(calendarConnections.connectedAt));
    },

    async recordCalendarSyncFailure(householdId, input) {
      const current = await requireHouseholdById(db, householdId);
      const updated = recordCalendarSyncFailure(
        current,
        input.attemptedAt,
        input.failureStatus,
      );

      await db
        .update(calendarConnections)
        .set({
          syncFailureStatus: updated.calendarConnection?.syncFailureStatus ?? null,
          lastSyncAttemptAt: updated.calendarConnection?.lastSyncAttemptAt
            ? new Date(updated.calendarConnection.lastSyncAttemptAt)
            : null,
          updatedAt: new Date(input.attemptedAt),
        })
        .where(eq(calendarConnections.householdId, householdId));

      return requireHouseholdById(db, householdId);
    },

    async saveCalendarConnection(householdId, input) {
      await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({
            id: calendarConnections.id,
            publicFeedUrl: calendarConnections.publicFeedUrl,
          })
          .from(calendarConnections)
          .where(eq(calendarConnections.householdId, householdId))
          .limit(1);

        const now = new Date();
        const isReplacement =
          Boolean(existing) && existing.publicFeedUrl !== input.publicFeedUrl;

        if (isReplacement) {
          await tx
            .delete(eventEnrichments)
            .where(eq(eventEnrichments.householdId, householdId));
          await tx
            .delete(calendarEvents)
            .where(eq(calendarEvents.householdId, householdId));
          await tx
            .delete(calendarConnections)
            .where(eq(calendarConnections.householdId, householdId));
        }

        if (!existing || isReplacement) {
          await tx.insert(calendarConnections).values({
            calendarName: input.calendarName,
            connectedAt: now,
            householdId,
            publicFeedUrl: input.publicFeedUrl,
            updatedAt: now,
          });
          return;
        }

        await tx
          .update(calendarConnections)
          .set({
            calendarName: input.calendarName,
            publicFeedUrl: input.publicFeedUrl,
            updatedAt: now,
          })
          .where(eq(calendarConnections.id, existing.id));
      });

      return requireHouseholdById(db, householdId);
    },

    async syncCalendarEvents(householdId, events, syncedAt) {
      const current = await requireHouseholdById(db, householdId);
      const synced = syncAppleCalendarEvents(current, events, syncedAt);

      await db.transaction(async (tx) => {
        const eventIds = synced.calendarEvents.map((event) => event.id);
        if (eventIds.length > 0) {
          await tx
            .delete(eventEnrichments)
            .where(
              and(
                eq(eventEnrichments.householdId, householdId),
                notInArray(eventEnrichments.eventId, eventIds),
              ),
            );
          await tx
            .delete(calendarEvents)
            .where(
              and(
                eq(calendarEvents.householdId, householdId),
                notInArray(calendarEvents.id, eventIds),
              ),
            );
        } else {
          await tx
            .delete(eventEnrichments)
            .where(eq(eventEnrichments.householdId, householdId));
          await tx
            .delete(calendarEvents)
            .where(eq(calendarEvents.householdId, householdId));
        }

        for (const event of synced.calendarEvents) {
          await tx
            .insert(calendarEvents)
            .values({
              appleEventId: event.appleEventId,
              endsAt: new Date(event.endsAt),
              householdId,
              id: event.id,
              isAllDay: event.isAllDay,
              location: event.location ?? null,
              startsAt: new Date(event.startsAt),
              syncedAt: new Date(event.syncedAt),
              title: event.title,
            })
            .onConflictDoUpdate({
              target: calendarEvents.id,
              set: {
                appleEventId: event.appleEventId,
                endsAt: new Date(event.endsAt),
                isAllDay: event.isAllDay,
                location: event.location ?? null,
                startsAt: new Date(event.startsAt),
                syncedAt: new Date(event.syncedAt),
                title: event.title,
              },
            });
        }

        await tx
          .update(calendarConnections)
          .set({
            lastSuccessfulSyncAt: synced.calendarConnection?.lastSuccessfulSyncAt
              ? new Date(synced.calendarConnection.lastSuccessfulSyncAt)
              : null,
            lastSyncAttemptAt: synced.calendarConnection?.lastSyncAttemptAt
              ? new Date(synced.calendarConnection.lastSyncAttemptAt)
              : null,
            syncFailureStatus: synced.calendarConnection?.syncFailureStatus ?? null,
            updatedAt: new Date(syncedAt),
          })
          .where(eq(calendarConnections.householdId, householdId));
      });

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

  const [parentRows, childRows, choreRows, connectionRows, eventRows, enrichmentRows] =
    await Promise.all([
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
      .from(calendarConnections)
      .where(eq(calendarConnections.householdId, household.id))
      .limit(1),
    db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.householdId, household.id))
      .orderBy(asc(calendarEvents.startsAt)),
    db
      .select()
      .from(eventEnrichments)
      .where(eq(eventEnrichments.householdId, household.id)),
  ]);

  const connection = connectionRows[0];

  return {
    calendarConnection: connection
      ? {
          calendarName: connection.calendarName,
          connectedAt: connection.connectedAt.toISOString(),
          eventCount: eventRows.length,
          id: connection.id,
          lastSuccessfulSyncAt:
            connection.lastSuccessfulSyncAt?.toISOString() ?? null,
          lastSyncAttemptAt: connection.lastSyncAttemptAt?.toISOString() ?? null,
          syncFailureStatus: connection.syncFailureStatus,
          updatedAt: connection.updatedAt.toISOString(),
        }
      : null,
    calendarEvents: eventRows.map((event) => ({
      appleEventId: event.appleEventId,
      endsAt: event.endsAt.toISOString(),
      id: event.id,
      isAllDay: event.isAllDay,
      location: event.location ?? undefined,
      startsAt: event.startsAt.toISOString(),
      syncedAt: event.syncedAt.toISOString(),
      title: event.title,
    })),
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
    eventEnrichments: enrichmentRows.map((enrichment) => ({
      eventId: enrichment.eventId,
      isAllHousehold: enrichment.isAllHousehold,
      participantChildIds: enrichment.participantChildIds,
      updatedAt: enrichment.updatedAt.toISOString(),
    })),
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
