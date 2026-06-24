import { describe, expect, it, vi } from "vitest";

import {
  configureAppleCalendar,
  syncAppleCalendarEvents,
  updateEventParticipants,
} from "@/domain/calendar";
import { createHousehold } from "@/domain/household";

import { syncCalendarFeeds } from "./sync";

describe("calendar feed sync", () => {
  it("upserts parsed Events while preserving separate Event Enrichment", async () => {
    const household = await createConfiguredHousehold();
    const childId = household.children[0]!.id;
    const withExistingEvent = syncAppleCalendarEvents(
      household,
      [
        {
          appleEventId: "apple-1",
          endsAt: "2026-06-24T17:00:00.000Z",
          location: "Field 2",
          startsAt: "2026-06-24T16:00:00.000Z",
          title: "Soccer practice",
        },
        {
          appleEventId: "apple-stale",
          endsAt: "2026-06-26T17:00:00.000Z",
          startsAt: "2026-06-26T16:00:00.000Z",
          title: "Deleted in Apple",
        },
      ],
      "2026-06-24T10:00:00.000Z",
    );
    const enriched = updateEventParticipants(withExistingEvent, {
      eventId: withExistingEvent.calendarEvents[0]!.id,
      isAllHousehold: false,
      participantChildIds: [childId],
    });
    const saveCalendarSync = vi.fn(async (_householdId, input) => ({
      ...enriched,
      calendarEvents: input.calendarEvents,
      eventEnrichments: input.eventEnrichments,
    }));

    const summary = await syncCalendarFeeds({
      fetchFeed: async () => `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:apple-1
SUMMARY:Soccer moved
DTSTART:20260624T163000Z
DTEND:20260624T173000Z
LOCATION:Field 4
END:VEVENT
BEGIN:VEVENT
UID:apple-2
SUMMARY:Dentist
DTSTART:20260625T180000Z
DTEND:20260625T183000Z
END:VEVENT
END:VCALENDAR`,
      now: createClock([
        "2026-06-24T12:00:00.000Z",
        "2026-06-24T12:00:01.000Z",
      ]),
      repository: {
        listHouseholdsWithCalendarConnections: async () => [enriched],
        recordCalendarSyncStatus: vi.fn(),
        saveCalendarSync,
      },
    });

    expect(summary).toEqual({
      failures: [],
      synced: [{ eventCount: 2, householdId: enriched.id }],
    });
    expect(saveCalendarSync).toHaveBeenCalledWith(
      enriched.id,
      expect.objectContaining({
        calendarEvents: [
          expect.objectContaining({
            appleEventId: "apple-1",
            id: withExistingEvent.calendarEvents[0]!.id,
            startsAt: "2026-06-24T16:30:00.000Z",
            title: "Soccer moved",
          }),
          expect.objectContaining({
            appleEventId: "apple-2",
            title: "Dentist",
          }),
        ],
        eventEnrichments: [
          expect.objectContaining({
            eventId: withExistingEvent.calendarEvents[0]!.id,
            isAllHousehold: false,
            participantChildIds: [childId],
          }),
        ],
        status: {
          attemptedAt: "2026-06-24T12:00:00.000Z",
          message: "2 Calendar Events synced.",
          status: "success",
          syncedAt: "2026-06-24T12:00:01.000Z",
        },
      }),
    );
    expect(saveCalendarSync.mock.calls[0]?.[1].calendarEvents).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ appleEventId: "apple-stale" }),
      ]),
    );
  });

  it("records safe sync failures without exposing the feed URL", async () => {
    const household = await createConfiguredHousehold(
      "webcal://p99-caldav.icloud.com/published/2/secret-family",
    );
    const recordCalendarSyncStatus = vi.fn(async () => household);

    const summary = await syncCalendarFeeds({
      fetchFeed: async () => {
        throw new Error("webcal://p99-caldav.icloud.com/published/2/secret-family exploded");
      },
      now: () => "2026-06-24T12:00:00.000Z",
      repository: {
        listHouseholdsWithCalendarConnections: async () => [household],
        recordCalendarSyncStatus,
        saveCalendarSync: vi.fn(),
      },
    });

    expect(summary.failures[0]?.message).toBe(
      "Calendar sync failed. Check the Apple Calendar sharing link.",
    );
    expect(summary.failures[0]?.message).not.toContain("p99-caldav.icloud");
    expect(recordCalendarSyncStatus).toHaveBeenCalledWith(household.id, {
      attemptedAt: "2026-06-24T12:00:00.000Z",
      message: "Calendar sync failed. Check the Apple Calendar sharing link.",
      status: "error",
    });
  });
});

async function createConfiguredHousehold(sourceUrl = "webcal://p01-caldav.icloud.com/published/2/family") {
  const household = await createHousehold({
    children: [{ name: "Ada", pin: "1234" }],
    householdName: "Clozcasa",
    parents: [{ email: "first@example.com", name: "First" }],
  });

  return configureAppleCalendar(
    household,
    { calendarName: "Family", sourceUrl },
    "2026-06-24T09:00:00.000Z",
  );
}

function createClock(values: string[]) {
  let index = 0;
  return () => values[index++] ?? values[values.length - 1]!;
}
