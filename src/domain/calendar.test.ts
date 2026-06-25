import { describe, expect, it } from "vitest";

import {
  configureAppleCalendar,
  getChildAgenda,
  getParentAgenda,
  syncAppleCalendarEvents,
  updateEventParticipants,
} from "./calendar";
import { createHousehold } from "./household";
import {
  parseAppleCalendarFeed,
  syncAppleCalendarFeed,
} from "@/server/calendar/sync-engine";

async function createTestHousehold() {
  return createHousehold({
    householdName: "Clozcasa",
    parents: [{ name: "Matt", email: "matt@example.com" }],
    children: [
      { name: "Ada", pin: "1234" },
      { name: "Grace", pin: "9876" },
    ],
  });
}

describe("Calendar", () => {
  it("lets a Parent configure the shared Apple Family Calendar", async () => {
    const household = await createTestHousehold();

    const configured = configureAppleCalendar(
      household,
      {
        calendarName: "Family",
        sourceUrl: "webcal://example.test/family.ics",
      },
      "2026-06-23T12:00:00.000Z",
    );

    expect(configured.calendarConnection).toEqual(
      expect.objectContaining({
        calendarName: "Family",
        sourceUrl: "webcal://example.test/family.ics",
        connectedAt: "2026-06-23T12:00:00.000Z",
      }),
    );
  });

  it("keeps synced Events read-only while allowing Apple Calendar to update them", async () => {
    const household = await createTestHousehold();
    const configured = configureAppleCalendar(household, {
      calendarName: "Family",
      sourceUrl: "webcal://example.test/family.ics",
    });
    const synced = syncAppleCalendarEvents(
      configured,
      [
        {
          appleEventId: "apple-1",
          title: "Soccer practice",
          startsAt: "2026-06-24T16:00:00.000Z",
          endsAt: "2026-06-24T17:00:00.000Z",
          location: "Field 2",
        },
      ],
      "2026-06-23T12:00:00.000Z",
    );
    const enriched = updateEventParticipants(synced, {
      eventId: synced.calendarEvents[0]!.id,
      participantChildIds: [household.children[0]!.id],
      isAllHousehold: false,
    });

    expect(enriched.calendarEvents[0]).toMatchObject({
      title: "Soccer practice",
      startsAt: "2026-06-24T16:00:00.000Z",
      location: "Field 2",
    });

    const resynced = syncAppleCalendarEvents(
      enriched,
      [
        {
          appleEventId: "apple-1",
          title: "Soccer practice moved",
          startsAt: "2026-06-24T16:30:00.000Z",
          endsAt: "2026-06-24T17:30:00.000Z",
          location: "Field 4",
        },
      ],
      "2026-06-23T13:00:00.000Z",
    );

    expect(resynced.calendarEvents[0]).toMatchObject({
      title: "Soccer practice moved",
      startsAt: "2026-06-24T16:30:00.000Z",
      location: "Field 4",
    });
    expect(resynced.eventEnrichments[0]).toMatchObject({
      participantChildIds: [household.children[0]!.id],
      isAllHousehold: false,
    });
  });

  it("shows Parent Agenda day-first with Participants", async () => {
    const household = await createTestHousehold();
    const configured = configureAppleCalendar(household, {
      calendarName: "Family",
      sourceUrl: "webcal://example.test/family.ics",
    });
    const synced = syncAppleCalendarEvents(configured, [
      {
        appleEventId: "apple-2",
        title: "Dentist",
        startsAt: "2026-06-24T15:00:00.000Z",
        endsAt: "2026-06-24T16:00:00.000Z",
      },
      {
        appleEventId: "apple-1",
        title: "Breakfast club",
        startsAt: "2026-06-24T13:00:00.000Z",
        endsAt: "2026-06-24T14:00:00.000Z",
      },
    ]);
    const dentist = synced.calendarEvents.find(
      (event) => event.appleEventId === "apple-2",
    )!;
    const enriched = updateEventParticipants(synced, {
      eventId: dentist.id,
      participantChildIds: [household.children[0]!.id],
      isAllHousehold: false,
    });

    expect(getParentAgenda(enriched)).toEqual([
      {
        date: "2026-06-24",
        events: [
          expect.objectContaining({
            title: "Breakfast club",
            participantNames: ["All Household"],
          }),
          expect.objectContaining({
            title: "Dentist",
            participantNames: ["Ada"],
          }),
        ],
      },
    ]);
  });

  it("filters Child Agenda to participant Events and all-Household Events", async () => {
    const household = await createTestHousehold();
    const ada = household.children[0]!;
    const grace = household.children[1]!;
    const configured = configureAppleCalendar(household, {
      calendarName: "Family",
      sourceUrl: "webcal://example.test/family.ics",
    });
    const synced = syncAppleCalendarEvents(configured, [
      {
        appleEventId: "apple-1",
        title: "Family dinner",
        startsAt: "2026-06-24T23:00:00.000Z",
        endsAt: "2026-06-25T00:00:00.000Z",
      },
      {
        appleEventId: "apple-2",
        title: "Ada piano",
        startsAt: "2026-06-25T18:00:00.000Z",
        endsAt: "2026-06-25T18:30:00.000Z",
      },
      {
        appleEventId: "apple-3",
        title: "Grace soccer",
        startsAt: "2026-06-25T20:00:00.000Z",
        endsAt: "2026-06-25T21:00:00.000Z",
      },
    ]);
    const adaEvent = synced.calendarEvents.find(
      (event) => event.appleEventId === "apple-2",
    )!;
    const graceEvent = synced.calendarEvents.find(
      (event) => event.appleEventId === "apple-3",
    )!;
    const withAda = updateEventParticipants(synced, {
      eventId: adaEvent.id,
      participantChildIds: [ada.id],
      isAllHousehold: false,
    });
    const enriched = updateEventParticipants(withAda, {
      eventId: graceEvent.id,
      participantChildIds: [grace.id],
      isAllHousehold: false,
    });

    expect(
      getChildAgenda(enriched, ada.id).flatMap((day) =>
        day.events.map((event) => event.title),
      ),
    ).toEqual(["Family dinner", "Ada piano"]);
  });

  it("parses timed, all-day, and recurring iCalendar Events into external identities", () => {
    const events = parseAppleCalendarFeed(
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:single-1",
        "SUMMARY:Doctor",
        "DTSTART:20260626T160000Z",
        "DTEND:20260626T170000Z",
        "LOCATION:Clinic",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:all-day-1",
        "SUMMARY:No school",
        "DTSTART;VALUE=DATE:20260627",
        "DTEND;VALUE=DATE:20260628",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:recurring-1",
        "SUMMARY:Practice",
        "DTSTART:20260628T150000Z",
        "DTEND:20260628T160000Z",
        "RRULE:FREQ=DAILY;COUNT=2",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\n"),
      "2026-06-25T12:00:00.000Z",
    );

    expect(events).toEqual([
      expect.objectContaining({
        appleEventId: "single-1",
        isAllDay: false,
        location: "Clinic",
        startsAt: "2026-06-26T16:00:00.000Z",
        title: "Doctor",
      }),
      expect.objectContaining({
        appleEventId: "all-day-1",
        endsAt: "2026-06-28T00:00:00.000Z",
        isAllDay: true,
        startsAt: "2026-06-27T00:00:00.000Z",
        title: "No school",
      }),
      expect.objectContaining({
        appleEventId: "recurring-1#2026-06-28T15:00:00.000Z",
        isAllDay: false,
      }),
      expect.objectContaining({
        appleEventId: "recurring-1#2026-06-29T15:00:00.000Z",
        isAllDay: false,
      }),
    ]);
  });

  it("syncs the rolling Event window and removes disappeared Events with enrichment", async () => {
    const household = await createTestHousehold();
    const configured = configureAppleCalendar(household, {
      calendarName: "Family",
      sourceUrl: "webcal://example.test/family.ics",
    });
    const initial = syncAppleCalendarEvents(
      configured,
      [
        {
          appleEventId: "keep-1",
          title: "Keep me",
          startsAt: "2026-06-26T16:00:00.000Z",
          endsAt: "2026-06-26T17:00:00.000Z",
        },
        {
          appleEventId: "disappears-1",
          title: "Gone",
          startsAt: "2026-06-27T16:00:00.000Z",
          endsAt: "2026-06-27T17:00:00.000Z",
        },
        {
          appleEventId: "old-1",
          title: "Too old",
          startsAt: "2026-05-20T16:00:00.000Z",
          endsAt: "2026-05-20T17:00:00.000Z",
        },
        {
          appleEventId: "future-1",
          title: "Too far",
          startsAt: "2026-12-23T16:00:00.000Z",
          endsAt: "2026-12-23T17:00:00.000Z",
        },
      ],
      "2026-06-25T12:00:00.000Z",
    );
    const keep = initial.calendarEvents.find(
      (event) => event.appleEventId === "keep-1",
    )!;
    const disappears = initial.calendarEvents.find(
      (event) => event.appleEventId === "disappears-1",
    )!;
    const enrichedKeep = updateEventParticipants(initial, {
      eventId: keep.id,
      participantChildIds: [household.children[0]!.id],
      isAllHousehold: false,
    });
    const enriched = updateEventParticipants(enrichedKeep, {
      eventId: disappears.id,
      participantChildIds: [household.children[1]!.id],
      isAllHousehold: false,
    });

    const resynced = syncAppleCalendarEvents(
      enriched,
      [
        {
          appleEventId: "keep-1",
          title: "Keep me updated",
          startsAt: "2026-06-26T18:00:00.000Z",
          endsAt: "2026-06-26T19:00:00.000Z",
        },
      ],
      "2026-06-25T13:00:00.000Z",
    );

    expect(resynced.calendarEvents.map((event) => event.appleEventId)).toEqual([
      "keep-1",
    ]);
    expect(resynced.calendarEvents[0]).toMatchObject({
      id: keep.id,
      startsAt: "2026-06-26T18:00:00.000Z",
      title: "Keep me updated",
    });
    expect(resynced.eventEnrichments).toEqual([
      expect.objectContaining({
        eventId: keep.id,
        participantChildIds: [household.children[0]!.id],
      }),
    ]);
  });

  it("sorts All-Day Events above timed Events and defaults new Events to all Household", async () => {
    const household = await createTestHousehold();
    const configured = configureAppleCalendar(household, {
      calendarName: "Family",
      sourceUrl: "webcal://example.test/family.ics",
    });

    const result = syncAppleCalendarFeed(
      configured,
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "BEGIN:VEVENT",
        "UID:timed-1",
        "SUMMARY:Ada piano",
        "DTSTART:20260626T150000Z",
        "DTEND:20260626T160000Z",
        "END:VEVENT",
        "BEGIN:VEVENT",
        "UID:all-day-1",
        "SUMMARY:No school",
        "DTSTART;VALUE=DATE:20260626",
        "DTEND;VALUE=DATE:20260627",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\n"),
      "2026-06-25T12:00:00.000Z",
    );

    expect(result.status).toBe("ok");
    const synced = result.household;
    expect(getParentAgenda(synced)[0]?.events).toEqual([
      expect.objectContaining({
        isAllDay: true,
        participantNames: ["All Household"],
        title: "No school",
      }),
      expect.objectContaining({
        isAllDay: false,
        participantNames: ["All Household"],
        title: "Ada piano",
      }),
    ]);
  });

  it("keeps the last successful Agenda visible after failed Calendar Sync", async () => {
    const household = await createTestHousehold();
    const configured = configureAppleCalendar(household, {
      calendarName: "Family",
      sourceUrl: "webcal://example.test/family.ics",
    });
    const successful = syncAppleCalendarEvents(
      configured,
      [
        {
          appleEventId: "single-1",
          title: "Doctor",
          startsAt: "2026-06-26T16:00:00.000Z",
          endsAt: "2026-06-26T17:00:00.000Z",
        },
      ],
      "2026-06-25T12:00:00.000Z",
    );

    const failed = syncAppleCalendarFeed(
      successful,
      "this is not an ics feed",
      "2026-06-25T13:00:00.000Z",
    );

    expect(failed.status).toBe("error");
    expect(failed.household.calendarEvents).toEqual(successful.calendarEvents);
    expect(failed.household.calendarConnection).toEqual(
      expect.objectContaining({
        eventCount: 1,
        lastSuccessfulSyncAt: "2026-06-25T12:00:00.000Z",
        lastSyncAttemptAt: "2026-06-25T13:00:00.000Z",
        syncFailureStatus: "Calendar feed could not be parsed.",
      }),
    );
  });
});
