import "server-only";

import ICAL from "ical.js";

import {
  compareIncomingEvents,
  eventIsInsideSyncWindow,
  getCalendarSyncWindow,
  recordCalendarSyncFailure,
  syncAppleCalendarEvents,
  type AppleCalendarEventInput,
  type CalendarSyncWindow,
} from "@/domain/calendar";
import type { Household } from "@/domain/household";

const MAX_RECURRING_OCCURRENCES_PER_EVENT = 1000;

export type CalendarSyncResult =
  | { household: Household; status: "ok" }
  | { household: Household; message: string; status: "error" };

export function syncAppleCalendarFeed(
  household: Household,
  feedText: string,
  syncedAt: string = new Date().toISOString(),
): CalendarSyncResult {
  try {
    return {
      household: syncAppleCalendarEvents(
        household,
        parseAppleCalendarFeed(feedText, syncedAt),
        syncedAt,
      ),
      status: "ok",
    };
  } catch (caught) {
    return {
      household: recordCalendarSyncFailure(
        household,
        syncedAt,
        "Calendar feed could not be parsed.",
      ),
      message:
        caught instanceof Error ? caught.message : "Calendar feed could not be parsed.",
      status: "error",
    };
  }
}

export function parseAppleCalendarFeed(
  feedText: string,
  syncedAt: string = new Date().toISOString(),
): AppleCalendarEventInput[] {
  const window = getCalendarSyncWindow(syncedAt);
  const calendar = new ICAL.Component(ICAL.parse(feedText));
  const components = calendar.getAllSubcomponents("vevent");
  if (components.length === 0) {
    throw new Error("Calendar feed has no Events.");
  }

  return components
    .flatMap((component) => normalizeIcalEvent(component, window))
    .filter((event) => eventIsInsideSyncWindow(event, window))
    .sort(compareIncomingEvents);
}

function normalizeIcalEvent(
  component: ICAL.Component,
  window: CalendarSyncWindow,
): AppleCalendarEventInput[] {
  const event = new ICAL.Event(component);
  const uid = event.uid?.trim();
  if (!uid) {
    throw new Error("Calendar Event is missing a UID.");
  }

  if (!event.isRecurring()) {
    return [
      normalizeIcalOccurrence({
        endDate: event.endDate,
        isRecurring: false,
        location: event.location,
        startDate: event.startDate,
        summary: event.summary,
        uid,
      }),
    ];
  }

  const events: AppleCalendarEventInput[] = [];
  const iterator = event.iterator();
  let occurrence = iterator.next();
  let occurrenceCount = 0;
  while (occurrence && occurrenceCount < MAX_RECURRING_OCCURRENCES_PER_EVENT) {
    const occurrenceStartsAt = toCalendarIso(occurrence);
    if (occurrenceStartsAt >= window.endIso) break;
    const details = event.getOccurrenceDetails(occurrence);
    events.push(
      normalizeIcalOccurrence({
        endDate: details.endDate,
        isRecurring: true,
        location: details.item.location,
        startDate: details.startDate,
        summary: details.item.summary,
        uid,
      }),
    );
    occurrenceCount += 1;
    occurrence = iterator.next();
  }

  return events;
}

function normalizeIcalOccurrence(input: {
  endDate: ICAL.Time;
  isRecurring: boolean;
  location?: string;
  startDate: ICAL.Time;
  summary: string;
  uid: string;
}): AppleCalendarEventInput {
  const startsAt = toCalendarIso(input.startDate);
  const endsAt = toCalendarIso(input.endDate);
  return {
    appleEventId: input.isRecurring ? `${input.uid}#${startsAt}` : input.uid,
    endsAt,
    isAllDay: input.startDate.isDate,
    ...(input.location?.trim() ? { location: input.location.trim() } : {}),
    startsAt,
    title: input.summary?.trim() || "Untitled Event",
  };
}

function toCalendarIso(value: ICAL.Time): string {
  if (value.isDate) {
    return `${value.year}-${pad2(value.month)}-${pad2(value.day)}T00:00:00.000Z`;
  }
  return value.toJSDate().toISOString();
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
