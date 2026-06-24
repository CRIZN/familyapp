import "server-only";

import ICAL from "ical.js";

import type { AppleCalendarEventInput } from "@/domain/calendar";

export type ParseIcsOptions = {
  windowEnd?: string;
  windowStart?: string;
};

export function parseIcsCalendarEvents(
  ics: string,
  options: ParseIcsOptions = {},
): AppleCalendarEventInput[] {
  const calendar = new ICAL.Component(ICAL.parse(ics));
  const windowStart = options.windowStart
    ? ICAL.Time.fromJSDate(new Date(options.windowStart), true)
    : ICAL.Time.fromJSDate(new Date(), true);
  const windowEnd = options.windowEnd
    ? ICAL.Time.fromJSDate(new Date(options.windowEnd), true)
    : ICAL.Time.fromJSDate(
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 548),
        true,
      );

  return calendar
    .getAllSubcomponents("vevent")
    .map((component) => new ICAL.Event(component))
    .filter((event) => !event.isRecurrenceException())
    .flatMap((event) => toAppleCalendarEvents(event, windowStart, windowEnd))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function toAppleCalendarEvents(
  event: ICAL.Event,
  windowStart: ICAL.Time,
  windowEnd: ICAL.Time,
): AppleCalendarEventInput[] {
  if (!event.isRecurring()) {
    return [toAppleCalendarEvent(event)];
  }

  const events: AppleCalendarEventInput[] = [];
  const iterator = event.iterator();
  let next: ICAL.Time | null;
  while ((next = iterator.next())) {
    if (next.compare(windowEnd) > 0) break;
    const occurrence = event.getOccurrenceDetails(next);
    if (occurrence.endDate.compare(windowStart) < 0) continue;
    events.push(
      toAppleCalendarEvent(occurrence.item, {
        endDate: occurrence.endDate,
        occurrenceId: occurrence.recurrenceId,
        startDate: occurrence.startDate,
      }),
    );
  }

  return events;
}

function toAppleCalendarEvent(
  event: ICAL.Event,
  occurrence?: {
    endDate: ICAL.Time;
    occurrenceId: ICAL.Time;
    startDate: ICAL.Time;
  },
): AppleCalendarEventInput {
  const appleEventId = event.uid?.trim();
  const title = event.summary?.trim();
  const startsAt = (occurrence?.startDate ?? event.startDate)
    .toJSDate()
    .toISOString();
  const occurrenceId = occurrence?.occurrenceId.toJSDate().toISOString();
  if (!appleEventId) {
    throw new Error("Calendar feed contains an Event without a UID.");
  }
  if (!title) {
    throw new Error("Calendar feed contains an Event without a title.");
  }

  return {
    appleEventId: occurrence ? `${appleEventId}#${occurrenceId}` : appleEventId,
    endsAt: (occurrence?.endDate ?? event.endDate).toJSDate().toISOString(),
    location: event.location?.trim() || undefined,
    startsAt,
    title,
  };
}
