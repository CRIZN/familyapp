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
        publicFeedUrl: "webcal://example.test/family.ics",
        updatedAt: now,
      },
      childWins: [],
      children: [],
      choreSubmissions: [],
      chores: [],
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

    expect(mapPersistedHouseholdRows(rows).calendarConnection).toEqual({
      calendarName: "Family",
      connectedAt: "2026-06-24T12:00:00.000Z",
      id: "calendar-1",
      sourceUrl: "webcal://example.test/family.ics",
      updatedAt: "2026-06-24T12:00:00.000Z",
    });
  });
});
