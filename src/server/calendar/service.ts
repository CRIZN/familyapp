import "server-only";

import type { CalendarConnection } from "@/domain/calendar";
import type { Household } from "@/domain/household";
import type { HouseholdRepository } from "@/server/household/repository";

import { fetchCalendarFeed } from "./fetch";
import { parseAppleCalendarFeed } from "./sync-engine";

export const STALE_CALENDAR_SYNC_MS = 15 * 60 * 1000;
const SAFE_SYNC_FAILURE_STATUS = "Calendar Sync failed.";

export type CalendarSyncDependencies = {
  fetchFeed?: (feedUrl: string) => Promise<string>;
  now?: () => Date;
  repository: Pick<
    HouseholdRepository,
    | "findCalendarConnectionSource"
    | "listCalendarConnectionSources"
    | "recordCalendarSyncFailure"
    | "syncCalendarEvents"
  >;
};

export type CalendarSyncAttemptResult =
  | { household: Household; status: "ok" }
  | { household: Household; message: string; status: "error" };

export type CalendarSyncAllResult = {
  attempted: number;
  failed: number;
  succeeded: number;
};

export function shouldAttemptStaleCalendarSync(
  connection: CalendarConnection | null,
  now: Date = new Date(),
): boolean {
  if (!connection) return false;
  if (!connection.lastSyncAttemptAt) return true;
  return now.getTime() - new Date(connection.lastSyncAttemptAt).getTime() >
    STALE_CALENDAR_SYNC_MS;
}

export async function syncCalendarForHousehold(
  dependencies: CalendarSyncDependencies,
  householdId: string,
): Promise<CalendarSyncAttemptResult> {
  const attemptedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const source = await dependencies.repository.findCalendarConnectionSource(
    householdId,
  );

  if (!source) {
    const household = await dependencies.repository.recordCalendarSyncFailure(
      householdId,
      {
        attemptedAt,
        failureStatus: "Calendar is not connected.",
      },
    );
    return { household, message: "Calendar is not connected.", status: "error" };
  }

  try {
    const feedText = await (dependencies.fetchFeed ?? fetchCalendarFeed)(
      source.publicFeedUrl,
    );
    const events = parseAppleCalendarFeed(feedText, attemptedAt);
    const household = await dependencies.repository.syncCalendarEvents(
      householdId,
      events,
      attemptedAt,
    );
    return { household, status: "ok" };
  } catch {
    const household = await dependencies.repository.recordCalendarSyncFailure(
      householdId,
      {
        attemptedAt,
        failureStatus: SAFE_SYNC_FAILURE_STATUS,
      },
    );
    return {
      household,
      message: SAFE_SYNC_FAILURE_STATUS,
      status: "error",
    };
  }
}

export async function syncCalendarIfStale(
  dependencies: CalendarSyncDependencies,
  household: Household,
): Promise<Household> {
  if (
    !shouldAttemptStaleCalendarSync(
      household.calendarConnection,
      dependencies.now?.() ?? new Date(),
    )
  ) {
    return household;
  }

  const result = await syncCalendarForHousehold(dependencies, household.id);
  return result.household;
}

export async function syncAllCalendarConnections(
  dependencies: CalendarSyncDependencies,
): Promise<CalendarSyncAllResult> {
  const sources = await dependencies.repository.listCalendarConnectionSources();
  let succeeded = 0;
  let failed = 0;

  for (const source of sources) {
    const result = await syncCalendarForHousehold(
      dependencies,
      source.householdId,
    );
    if (result.status === "ok") {
      succeeded += 1;
    } else {
      failed += 1;
    }
  }

  return {
    attempted: sources.length,
    failed,
    succeeded,
  };
}
