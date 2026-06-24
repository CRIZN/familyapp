import "server-only";

import {
  normalizeAppleCalendarFeedUrl,
  syncAppleCalendarEvents,
} from "@/domain/calendar";

import type {
  CalendarSyncStatusInput,
  HouseholdRepository,
} from "@/server/household/repository";

import { parseIcsCalendarEvents } from "./ics";

export type CalendarSyncSummary = {
  failures: Array<{ householdId: string; message: string }>;
  synced: Array<{ eventCount: number; householdId: string }>;
};

export type CalendarFeedFetcher = (sourceUrl: string) => Promise<string>;

export async function syncCalendarFeeds({
  fetchFeed = fetchCalendarFeed,
  now = () => new Date().toISOString(),
  repository,
}: {
  fetchFeed?: CalendarFeedFetcher;
  now?: () => string;
  repository: Pick<
    HouseholdRepository,
    | "listHouseholdsWithCalendarConnections"
    | "recordCalendarSyncStatus"
    | "saveCalendarSync"
  >;
}): Promise<CalendarSyncSummary> {
  const households = await repository.listHouseholdsWithCalendarConnections();
  const summary: CalendarSyncSummary = { failures: [], synced: [] };

  for (const household of households) {
    const connection = household.calendarConnection;
    if (!connection) continue;
    const attemptedAt = now();

    try {
      const ics = await fetchFeed(connection.sourceUrl);
      const parsedEvents = parseIcsCalendarEvents(ics);
      const syncedAt = now();
      const syncedHousehold = syncAppleCalendarEvents(
        household,
        parsedEvents,
        syncedAt,
      );
      await repository.saveCalendarSync(household.id, {
        calendarEvents: syncedHousehold.calendarEvents,
        eventEnrichments: syncedHousehold.eventEnrichments,
        status: {
          attemptedAt,
          message: `${parsedEvents.length} Calendar Events synced.`,
          status: "success",
          syncedAt,
        },
      });
      summary.synced.push({
        eventCount: parsedEvents.length,
        householdId: household.id,
      });
    } catch (caught) {
      const message = getSafeCalendarSyncError(caught);
      console.error("Calendar sync failed", {
        householdId: household.id,
        message,
      });
      await repository.recordCalendarSyncStatus(household.id, {
        attemptedAt,
        message,
        status: "error",
      } satisfies CalendarSyncStatusInput);
      summary.failures.push({ householdId: household.id, message });
    }
  }

  return summary;
}

export async function fetchCalendarFeed(sourceUrl: string): Promise<string> {
  const response = await fetch(toFetchableCalendarUrl(sourceUrl), {
    headers: { accept: "text/calendar,*/*;q=0.8" },
  });
  if (!response.ok) {
    throw new Error(`Calendar feed returned ${response.status}.`);
  }
  return response.text();
}

function toFetchableCalendarUrl(sourceUrl: string): string {
  const normalized = normalizeAppleCalendarFeedUrl(sourceUrl);
  if (normalized.startsWith("webcal://")) {
    return `https://${normalized.slice("webcal://".length)}`;
  }
  return normalized;
}

function getSafeCalendarSyncError(caught: unknown): string {
  if (caught instanceof Error && caught.message.startsWith("Calendar feed returned")) {
    return caught.message;
  }
  return "Calendar sync failed. Check the Apple Calendar sharing link.";
}
