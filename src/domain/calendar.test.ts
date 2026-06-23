import { describe, expect, it } from "vitest";

import {
  configureAppleCalendar,
  getChildAgenda,
  getParentAgenda,
  syncAppleCalendarEvents,
  updateEventParticipants,
} from "./calendar";
import { createHousehold } from "./household";

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
});
