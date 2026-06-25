import { describe, expect, it, vi } from "vitest";

import { configureAppleCalendar } from "@/domain/calendar";
import { createHousehold, type Household } from "@/domain/household";

import {
  shouldAttemptStaleCalendarSync,
  syncAllCalendarConnections,
  syncCalendarForHousehold,
} from "./service";
import type { HouseholdRepository } from "@/server/household/repository";

describe("Calendar sync service", () => {
  it("detects stale Calendar Sync attempts after the 15 minute threshold", async () => {
    const household = configureAppleCalendar(await createTestHousehold(), {
      calendarName: "Family",
      sourceUrl: "webcal://example.test/family.ics",
    });

    expect(
      shouldAttemptStaleCalendarSync(household.calendarConnection, new Date(
        "2026-06-25T12:00:00.000Z",
      )),
    ).toBe(true);
    expect(
      shouldAttemptStaleCalendarSync(
        {
          ...household.calendarConnection!,
          lastSyncAttemptAt: "2026-06-25T11:50:00.000Z",
        },
        new Date("2026-06-25T12:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      shouldAttemptStaleCalendarSync(
        {
          ...household.calendarConnection!,
          lastSyncAttemptAt: "2026-06-25T11:44:59.000Z",
        },
        new Date("2026-06-25T12:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("fetches the stored feed URL server-side and persists parsed Events", async () => {
    const household = configureAppleCalendar(await createTestHousehold(), {
      calendarName: "Family",
      sourceUrl: "webcal://example.test/family.ics",
    });
    const syncCalendarEvents = vi.fn(async () => household);

    const result = await syncCalendarForHousehold(
      {
        fetchFeed: async (feedUrl) => {
          expect(feedUrl).toBe("webcal://example.test/family.ics");
          return [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "BEGIN:VEVENT",
            "UID:single-1",
            "SUMMARY:Doctor",
            "DTSTART:20260626T160000Z",
            "DTEND:20260626T170000Z",
            "END:VEVENT",
            "END:VCALENDAR",
          ].join("\n");
        },
        now: () => new Date("2026-06-25T12:00:00.000Z"),
        repository: createRepository(household, {
          syncCalendarEvents,
        }),
      },
      household.id,
    );

    expect(result.status).toBe("ok");
    expect(syncCalendarEvents).toHaveBeenCalledWith(
      household.id,
      [
        expect.objectContaining({
          appleEventId: "single-1",
          title: "Doctor",
        }),
      ],
      "2026-06-25T12:00:00.000Z",
    );
  });

  it("records safe failure metadata without clearing the last synced Household", async () => {
    const household = configureAppleCalendar(await createTestHousehold(), {
      calendarName: "Family",
      sourceUrl: "webcal://example.test/family.ics",
    });
    const recordCalendarSyncFailure = vi.fn(async () => household);

    const result = await syncCalendarForHousehold(
      {
        fetchFeed: async () => {
          throw new Error("network");
        },
        now: () => new Date("2026-06-25T12:00:00.000Z"),
        repository: createRepository(household, {
          recordCalendarSyncFailure,
        }),
      },
      household.id,
    );

    expect(result.status).toBe("error");
    expect(recordCalendarSyncFailure).toHaveBeenCalledWith(household.id, {
      attemptedAt: "2026-06-25T12:00:00.000Z",
      failureStatus: "Calendar Sync failed.",
    });
  });

  it("runs scheduled sync across stored Calendar Connection sources", async () => {
    const household = await createTestHousehold();
    const syncCalendarEvents = vi.fn(async () => household);
    const result = await syncAllCalendarConnections({
      fetchFeed: async () =>
        [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "BEGIN:VEVENT",
          "UID:single-1",
          "SUMMARY:Doctor",
          "DTSTART:20260626T160000Z",
          "DTEND:20260626T170000Z",
          "END:VEVENT",
          "END:VCALENDAR",
        ].join("\n"),
      now: () => new Date("2026-06-25T12:00:00.000Z"),
      repository: createRepository(household, {
        listCalendarConnectionSources: async () => [
          {
            householdId: household.id,
            publicFeedUrl: "webcal://example.test/family.ics",
          },
        ],
        syncCalendarEvents,
      }),
    });

    expect(result).toEqual({ attempted: 1, failed: 0, succeeded: 1 });
    expect(syncCalendarEvents).toHaveBeenCalledOnce();
  });
});

async function createTestHousehold(): Promise<Household> {
  return createHousehold({
    children: [{ name: "Ada", pin: "1234" }],
    householdName: "Clozcasa",
    parents: [{ email: "first@example.com", name: "First" }],
  });
}

function createRepository(
  household: Household,
  overrides: Partial<HouseholdRepository> = {},
): HouseholdRepository {
  return {
    addAllowedParent: async () => household,
    createChore: async () => household,
    createFirstRunHousehold: async () => undefined,
    findCalendarConnectionSource: async () => ({
      publicFeedUrl: "webcal://example.test/family.ics",
    }),
    findHouseholdForParent: async () => household,
    hasAnyHousehold: async () => true,
    listCalendarConnectionSources: async () => [],
    recordCalendarSyncFailure: async () => household,
    saveCalendarConnection: async () => household,
    syncCalendarEvents: async () => household,
    updateChildPin: async () => household,
    updateChildProfile: async () => household,
    updateChoreStatus: async () => household,
    ...overrides,
  };
}
