import { describe, expect, it } from "vitest";

import { parseIcsCalendarEvents } from "./ics";

describe("ICS calendar parsing", () => {
  it("normalizes VEVENT entries from an Apple-compatible feed", () => {
    const events = parseIcsCalendarEvents(`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:apple-1
SUMMARY:Soccer practice
DTSTART:20260624T160000Z
DTEND:20260624T170000Z
LOCATION:Field 2
END:VEVENT
BEGIN:VEVENT
UID:apple-2
SUMMARY:Dentist
DTSTART:20260625T180000Z
DTEND:20260625T183000Z
END:VEVENT
END:VCALENDAR`);

    expect(events).toEqual([
      {
        appleEventId: "apple-1",
        endsAt: "2026-06-24T17:00:00.000Z",
        location: "Field 2",
        startsAt: "2026-06-24T16:00:00.000Z",
        title: "Soccer practice",
      },
      {
        appleEventId: "apple-2",
        endsAt: "2026-06-25T18:30:00.000Z",
        startsAt: "2026-06-25T18:00:00.000Z",
        title: "Dentist",
      },
    ]);
  });

  it("expands recurring Events into stable per-occurrence Event IDs", () => {
    const events = parseIcsCalendarEvents(
      `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:apple-recurring
SUMMARY:Piano lesson
DTSTART:20260624T160000Z
DTEND:20260624T163000Z
RRULE:FREQ=WEEKLY;COUNT=2
END:VEVENT
END:VCALENDAR`,
      {
        windowEnd: "2026-07-31T00:00:00.000Z",
        windowStart: "2026-06-01T00:00:00.000Z",
      },
    );

    expect(events).toEqual([
      expect.objectContaining({
        appleEventId: "apple-recurring#2026-06-24T16:00:00.000Z",
        startsAt: "2026-06-24T16:00:00.000Z",
        title: "Piano lesson",
      }),
      expect.objectContaining({
        appleEventId: "apple-recurring#2026-07-01T16:00:00.000Z",
        startsAt: "2026-07-01T16:00:00.000Z",
        title: "Piano lesson",
      }),
    ]);
  });

  it("keeps moved recurring instances keyed by recurrence identity", () => {
    const events = parseIcsCalendarEvents(
      `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:apple-recurring
SUMMARY:Piano lesson
DTSTART:20260624T160000Z
DTEND:20260624T163000Z
RRULE:FREQ=WEEKLY;COUNT=2
END:VEVENT
BEGIN:VEVENT
UID:apple-recurring
RECURRENCE-ID:20260701T160000Z
SUMMARY:Piano moved
DTSTART:20260701T170000Z
DTEND:20260701T173000Z
END:VEVENT
END:VCALENDAR`,
      {
        windowEnd: "2026-07-31T00:00:00.000Z",
        windowStart: "2026-06-01T00:00:00.000Z",
      },
    );

    expect(events).toEqual([
      expect.objectContaining({
        appleEventId: "apple-recurring#2026-06-24T16:00:00.000Z",
        startsAt: "2026-06-24T16:00:00.000Z",
        title: "Piano lesson",
      }),
      expect.objectContaining({
        appleEventId: "apple-recurring#2026-07-01T16:00:00.000Z",
        startsAt: "2026-07-01T17:00:00.000Z",
        title: "Piano moved",
      }),
    ]);
  });
});
