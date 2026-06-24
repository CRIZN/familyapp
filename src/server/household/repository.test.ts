import { describe, expect, it } from "vitest";

import {
  mapPersistedHouseholdRows,
  type PersistedHouseholdRows,
} from "./repository";

describe("Household repository mapping", () => {
  it("hydrates Calendar metadata with the stored public feed URL for server workflows", () => {
    const now = new Date("2026-06-24T12:00:00.000Z");
    const rows = {
      calendarConnection: {
        calendarName: "Family",
        connectedAt: now,
        householdId: "household-1",
        id: "calendar-1",
        lastSyncAttemptedAt: now,
        lastSyncMessage: "1 Calendar Events synced.",
        lastSyncStatus: "success",
        lastSyncedAt: now,
        publicFeedUrl: "webcal://p01-caldav.icloud.com/published/2/family",
        updatedAt: now,
      },
      calendarEvents: [
        {
          appleEventId: "apple-1",
          endsAt: new Date("2026-06-24T17:00:00.000Z"),
          householdId: "household-1",
          id: "event-1",
          location: "Field 2",
          startsAt: new Date("2026-06-24T16:00:00.000Z"),
          syncedAt: now,
          title: "Soccer practice",
        },
      ],
      childWins: [],
      children: [],
      choreSubmissions: [],
      chores: [],
      eventEnrichments: [
        {
          eventId: "event-1",
          householdId: "household-1",
          isAllHousehold: false,
          participantChildIds: ["child-1"],
          updatedAt: now,
        },
      ],
      goals: [],
      household: {
        createdAt: now,
        id: "household-1",
        name: "Clozcasa",
        updatedAt: now,
      },
      parents: [],
      pointLedger: [],
      progressCheckIns: [],
      rewardContributions: [],
      rewardRequests: [],
      rewards: [],
      skippedChoreOccurrences: [],
    } satisfies PersistedHouseholdRows;

    const household = mapPersistedHouseholdRows(rows);
    expect(household.calendarConnection).toEqual({
      calendarName: "Family",
      connectedAt: "2026-06-24T12:00:00.000Z",
      id: "calendar-1",
      lastSyncAttemptedAt: "2026-06-24T12:00:00.000Z",
      lastSyncMessage: "1 Calendar Events synced.",
      lastSyncStatus: "success",
      lastSyncedAt: "2026-06-24T12:00:00.000Z",
      sourceUrl: "webcal://p01-caldav.icloud.com/published/2/family",
      updatedAt: "2026-06-24T12:00:00.000Z",
    });
    expect(household.calendarEvents).toEqual([
      {
        appleEventId: "apple-1",
        endsAt: "2026-06-24T17:00:00.000Z",
        id: "event-1",
        location: "Field 2",
        startsAt: "2026-06-24T16:00:00.000Z",
        syncedAt: "2026-06-24T12:00:00.000Z",
        title: "Soccer practice",
      },
    ]);
    expect(household.eventEnrichments).toEqual([
      {
        eventId: "event-1",
        isAllHousehold: false,
        participantChildIds: ["child-1"],
        updatedAt: "2026-06-24T12:00:00.000Z",
      },
    ]);
  });
});
