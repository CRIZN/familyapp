import { describe, expect, it } from "vitest";

import {
  configureAppleCalendar,
  syncAppleCalendarEvents,
  updateEventParticipants,
} from "./calendar";
import {
  approveChoreSubmissions,
  createChore,
  submitChore,
} from "./chores";
import { getTodayDateKey } from "./dates";
import { assembleFamilyDisplaySnapshot } from "./family-display";
import { createHousehold, type Household } from "./household";

const TODAY = "2026-06-23";

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

function connectFamilyCalendar(household: Household): Household {
  return configureAppleCalendar(household, {
    calendarName: "Family",
    sourceUrl: "webcal://secret.example.test/family.ics",
  });
}

describe("Family Display snapshot", () => {
  it("assembles an empty Agenda and empty Child Chore lists when nothing is due", async () => {
    const household = await createTestHousehold();

    const snapshot = assembleFamilyDisplaySnapshot(household, TODAY);

    expect(snapshot).toEqual({
      householdName: "Clozcasa",
      dateKey: TODAY,
      agenda: [],
      calendarStatus: { state: "not_connected" },
      children: [
        { childId: household.children[0]!.id, name: "Ada", chores: [] },
        { childId: household.children[1]!.id, name: "Grace", chores: [] },
      ],
    });
  });

  it("keeps all-day Events above timed Events and names Participants", async () => {
    const household = await createTestHousehold();
    const ada = household.children[0]!;
    const connected = connectFamilyCalendar(household);
    const synced = syncAppleCalendarEvents(
      connected,
      [
        {
          appleEventId: "timed-later",
          title: "Soccer practice",
          startsAt: "2026-06-23T21:00:00.000Z",
          endsAt: "2026-06-23T22:00:00.000Z",
          location: "Field 2",
        },
        {
          appleEventId: "all-day",
          title: "No school",
          startsAt: "2026-06-23T00:00:00.000Z",
          endsAt: "2026-06-24T00:00:00.000Z",
          isAllDay: true,
        },
        {
          appleEventId: "timed-earlier",
          title: "Piano lesson",
          startsAt: "2026-06-23T17:00:00.000Z",
          endsAt: "2026-06-23T18:00:00.000Z",
        },
        {
          appleEventId: "tomorrow",
          title: "Weekend trip",
          startsAt: "2026-06-24T16:00:00.000Z",
          endsAt: "2026-06-24T17:00:00.000Z",
        },
      ],
      "2026-06-23T12:00:00.000Z",
    );
    const piano = synced.calendarEvents.find(
      (event) => event.appleEventId === "timed-earlier",
    )!;
    const enriched = updateEventParticipants(synced, {
      eventId: piano.id,
      participantChildIds: [ada.id],
      isAllHousehold: false,
    });

    const snapshot = assembleFamilyDisplaySnapshot(enriched, TODAY);

    expect(snapshot.agenda.map((event) => event.title)).toEqual([
      "No school",
      "Piano lesson",
      "Soccer practice",
    ]);
    expect(snapshot.agenda[0]).toMatchObject({
      title: "No school",
      timeLabel: "All day",
      participantLabel: "All Household",
    });
    expect(snapshot.agenda[1]).toMatchObject({
      title: "Piano lesson",
      timeLabel: "11:00 AM",
      participantLabel: "Ada",
    });
    expect(snapshot.agenda[2]).toMatchObject({
      title: "Soccer practice",
      timeLabel: "3:00 PM",
      location: "Field 2",
      participantLabel: "All Household",
    });
    expect(snapshot.calendarStatus).toEqual({
      state: "connected",
      calendarName: "Family",
      lastSuccessfulSyncAt: expect.any(String),
    });
  });

  it("groups today's Chores and Overdue Chores by Child with wall statuses", async () => {
    const household = await createTestHousehold();
    const ada = household.children[0]!;
    const grace = household.children[1]!;
    const withAdaOverdue = createChore(household, {
      title: "Water plants",
      childId: ada.id,
      pointValue: 2,
      dueDate: "2026-06-22",
      routine: null,
    });
    const withAdaToday = createChore(withAdaOverdue, {
      title: "Unload dishwasher",
      childId: ada.id,
      pointValue: 3,
      dueDate: TODAY,
      routine: null,
    });
    const withAdaPending = createChore(withAdaToday, {
      title: "Pack lunch",
      childId: ada.id,
      pointValue: 1,
      dueDate: TODAY,
      routine: null,
    });
    const withAdaDone = createChore(withAdaPending, {
      title: "Make bed",
      childId: ada.id,
      pointValue: 1,
      dueDate: TODAY,
      routine: null,
    });
    const withGraceToday = createChore(withAdaDone, {
      title: "Feed dog",
      childId: grace.id,
      pointValue: 2,
      dueDate: TODAY,
      routine: null,
    });
    const pendingChore = withGraceToday.chores.find(
      (chore) => chore.title === "Pack lunch",
    )!;
    const doneChore = withGraceToday.chores.find(
      (chore) => chore.title === "Make bed",
    )!;
    const submittedPending = submitChore(withGraceToday, {
      childId: ada.id,
      choreId: pendingChore.id,
      occurrenceDate: TODAY,
      today: TODAY,
    });
    const submittedDone = submitChore(submittedPending, {
      childId: ada.id,
      choreId: doneChore.id,
      occurrenceDate: TODAY,
      today: TODAY,
    });
    const approved = approveChoreSubmissions(submittedDone, [
      submittedDone.choreSubmissions.find(
        (submission) => submission.choreId === doneChore.id,
      )!.id,
    ]);

    const snapshot = assembleFamilyDisplaySnapshot(approved, TODAY);
    const adaChores = snapshot.children.find((child) => child.name === "Ada")!;
    const graceChores = snapshot.children.find((child) => child.name === "Grace")!;

    expect(adaChores.chores.map((chore) => [chore.title, chore.status])).toEqual([
      ["Water plants", "overdue"],
      ["Unload dishwasher", "due"],
      ["Pack lunch", "pending_review"],
      ["Make bed", "done"],
    ]);
    expect(graceChores.chores).toEqual([
      expect.objectContaining({ title: "Feed dog", status: "due" }),
    ]);
    expect(JSON.stringify(snapshot)).not.toContain("pointBalance");
    expect(JSON.stringify(snapshot)).not.toContain("pinHash");
  });

  it("never copies the Family Calendar feed URL into the snapshot", async () => {
    const household = await createTestHousehold();
    const connected = connectFamilyCalendar(household);
    const synced = syncAppleCalendarEvents(
      connected,
      [
        {
          appleEventId: "today-event",
          title: "Dinner",
          startsAt: "2026-06-23T23:00:00.000Z",
          endsAt: "2026-06-24T00:00:00.000Z",
          location: "Home",
        },
      ],
      "2026-06-23T12:00:00.000Z",
    );

    const snapshot = assembleFamilyDisplaySnapshot(synced, TODAY);
    const serialized = JSON.stringify(snapshot);

    expect(serialized).not.toContain("webcal://");
    expect(serialized).not.toContain("sourceUrl");
    expect(serialized).not.toContain("publicFeedUrl");
    expect(serialized).not.toContain("secret.example.test");
    expect(snapshot.calendarStatus).toEqual({
      state: "connected",
      calendarName: "Family",
      lastSuccessfulSyncAt: expect.any(String),
    });
  });

  it("labels a noon Mountain event instead of the UTC hour", async () => {
    const household = await createTestHousehold();
    const connected = connectFamilyCalendar(household);
    const synced = syncAppleCalendarEvents(
      connected,
      [
        {
          appleEventId: "olivia-dentist",
          title: "Olivia dentist",
          startsAt: "2026-08-25T18:00:00.000Z",
          endsAt: "2026-08-25T19:00:00.000Z",
        },
      ],
      "2026-08-25T12:00:00.000Z",
    );

    const snapshot = assembleFamilyDisplaySnapshot(synced, "2026-08-25");

    expect(snapshot.agenda).toEqual([
      expect.objectContaining({
        title: "Olivia dentist",
        timeLabel: "12:00 PM",
      }),
    ]);
  });

  it("uses the supplied date key instead of inventing a separate today", async () => {
    const household = await createTestHousehold();
    const connected = connectFamilyCalendar(household);
    const synced = syncAppleCalendarEvents(
      connected,
      [
        {
          appleEventId: "chosen-day",
          title: "Chosen day Event",
          startsAt: "2026-06-25T16:00:00.000Z",
          endsAt: "2026-06-25T17:00:00.000Z",
        },
      ],
      "2026-06-23T12:00:00.000Z",
    );

    const snapshot = assembleFamilyDisplaySnapshot(synced, "2026-06-25");

    expect(snapshot.dateKey).toBe("2026-06-25");
    expect(snapshot.agenda.map((event) => event.title)).toEqual([
      "Chosen day Event",
    ]);
  });

  it("keeps Display on the Denver date after UTC midnight", async () => {
    const household = await createTestHousehold();
    const connected = connectFamilyCalendar(household);
    const synced = syncAppleCalendarEvents(
      connected,
      [
        {
          appleEventId: "denver-today",
          title: "Piano lesson",
          startsAt: "2026-08-25T17:00:00.000Z",
          endsAt: "2026-08-25T18:00:00.000Z",
        },
        {
          appleEventId: "utc-tomorrow",
          title: "Tomorrow morning",
          startsAt: "2026-08-26T15:00:00.000Z",
          endsAt: "2026-08-26T16:00:00.000Z",
        },
      ],
      "2026-08-25T12:00:00.000Z",
    );

    const snapshot = assembleFamilyDisplaySnapshot(
      synced,
      getTodayDateKey(new Date("2026-08-26T00:30:00.000Z")),
    );

    expect(snapshot.dateKey).toBe("2026-08-25");
    expect(snapshot.agenda.map((event) => event.title)).toEqual([
      "Piano lesson",
    ]);
  });
});
