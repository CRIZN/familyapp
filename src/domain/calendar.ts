import type { ChildProfile, Household } from "./household";

export type CalendarConnection = {
  id: string;
  calendarName: string;
  sourceUrl?: string;
  connectedAt: string;
  updatedAt: string;
  lastSyncAttemptAt?: string | null;
  lastSuccessfulSyncAt?: string | null;
  syncFailureStatus?: string | null;
  eventCount?: number;
};

export type FamilyCalendarEvent = {
  id: string;
  appleEventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  syncedAt: string;
};

export type EventEnrichment = {
  eventId: string;
  participantChildIds: string[];
  isAllHousehold: boolean;
  updatedAt: string;
};

export type AppleCalendarEventInput = {
  appleEventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string;
};

export type ConfigureAppleCalendarInput = {
  calendarName: string;
  sourceUrl: string;
};

export type UpdateEventParticipantsInput = {
  eventId: string;
  participantChildIds: string[];
  isAllHousehold: boolean;
};

export type AgendaEvent = {
  eventId: string;
  appleEventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  location?: string;
  participantChildIds: string[];
  participantNames: string[];
  isAllHousehold: boolean;
};

export type AgendaDay = {
  date: string;
  events: AgendaEvent[];
};

export function configureAppleCalendar(
  household: Household,
  input: ConfigureAppleCalendarInput,
  configuredAt: string = new Date().toISOString(),
): Household {
  const calendarName = input.calendarName.trim();
  const sourceUrl = input.sourceUrl.trim();
  if (!calendarName) {
    throw new Error("Name the Apple Family Calendar.");
  }
  if (!sourceUrl) {
    throw new Error("Add the Apple Calendar source.");
  }

  const normalized = withCalendarCollections(household);
  return {
    ...normalized,
    calendarConnection: {
      id: normalized.calendarConnection?.id ?? createId(),
      calendarName,
      sourceUrl,
      connectedAt: normalized.calendarConnection?.connectedAt ?? configuredAt,
      updatedAt: configuredAt,
      lastSyncAttemptAt: normalized.calendarConnection?.lastSyncAttemptAt ?? null,
      lastSuccessfulSyncAt:
        normalized.calendarConnection?.lastSuccessfulSyncAt ?? null,
      syncFailureStatus: normalized.calendarConnection?.syncFailureStatus ?? null,
      eventCount: normalized.calendarConnection?.eventCount ?? 0,
    },
    updatedAt: configuredAt,
  };
}

export function syncAppleCalendarEvents(
  household: Household,
  events: AppleCalendarEventInput[],
  syncedAt: string = new Date().toISOString(),
): Household {
  const normalized = withCalendarCollections(household);
  if (!normalized.calendarConnection) {
    throw new Error("Connect the Apple Family Calendar before syncing Events.");
  }

  const incoming = events.map(validateAppleCalendarEvent);
  const existingByAppleId = new Map(
    normalized.calendarEvents.map((event) => [event.appleEventId, event]),
  );
  const incomingAppleIds = new Set(incoming.map((event) => event.appleEventId));
  const nextEvents = [
    ...normalized.calendarEvents.filter(
      (event) => !incomingAppleIds.has(event.appleEventId),
    ),
    ...incoming.map((event) => {
      const existing = existingByAppleId.get(event.appleEventId);
      return {
        id: existing?.id ?? createId(),
        ...event,
        syncedAt,
      };
    }),
  ].sort(compareEvents);

  const validEventIds = new Set(nextEvents.map((event) => event.id));
  return {
    ...normalized,
    calendarEvents: nextEvents,
    eventEnrichments: normalized.eventEnrichments.filter((enrichment) =>
      validEventIds.has(enrichment.eventId),
    ),
    updatedAt: syncedAt,
  };
}

export function updateEventParticipants(
  household: Household,
  input: UpdateEventParticipantsInput,
  updatedAt: string = new Date().toISOString(),
): Household {
  const normalized = withCalendarCollections(household);
  const event = normalized.calendarEvents.find(
    (candidate) => candidate.id === input.eventId,
  );
  if (!event) {
    throw new Error("Event not found.");
  }
  const participantChildIds = input.isAllHousehold
    ? []
    : normalizeParticipantChildIds(normalized, input.participantChildIds);
  const nextEnrichment: EventEnrichment = {
    eventId: event.id,
    participantChildIds,
    isAllHousehold: input.isAllHousehold,
    updatedAt,
  };
  const alreadyEnriched = normalized.eventEnrichments.some(
    (enrichment) => enrichment.eventId === event.id,
  );

  return {
    ...normalized,
    eventEnrichments: alreadyEnriched
      ? normalized.eventEnrichments.map((enrichment) =>
          enrichment.eventId === event.id ? nextEnrichment : enrichment,
        )
      : [...normalized.eventEnrichments, nextEnrichment],
    updatedAt,
  };
}

export function getParentAgenda(household: Household): AgendaDay[] {
  const normalized = withCalendarCollections(household);
  return groupAgendaDays(
    normalized.calendarEvents.map((event) => toAgendaEvent(normalized, event)),
  );
}

export function getChildAgenda(
  household: Household,
  childId: string,
): AgendaDay[] {
  const normalized = withCalendarCollections(household);
  assertChildBelongsToHousehold(normalized, childId);
  return groupAgendaDays(
    normalized.calendarEvents
      .map((event) => toAgendaEvent(normalized, event))
      .filter(
        (event) =>
          event.isAllHousehold || event.participantChildIds.includes(childId),
      ),
  );
}

export function withCalendarCollections(household: Household): Household {
  return {
    ...household,
    calendarConnection: household.calendarConnection ?? null,
    calendarEvents: household.calendarEvents ?? [],
    eventEnrichments: household.eventEnrichments ?? [],
  };
}

function toAgendaEvent(
  household: Household,
  event: FamilyCalendarEvent,
): AgendaEvent {
  const enrichment = getEventEnrichment(household, event.id);
  const participants = enrichment.isAllHousehold
    ? []
    : enrichment.participantChildIds
        .map((childId) =>
          household.children.find((child) => child.id === childId),
        )
        .filter((child): child is ChildProfile => Boolean(child));

  return {
    eventId: event.id,
    appleEventId: event.appleEventId,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    location: event.location,
    participantChildIds: enrichment.participantChildIds,
    participantNames: enrichment.isAllHousehold
      ? ["All Household"]
      : participants.map((child) => child.name),
    isAllHousehold: enrichment.isAllHousehold,
  };
}

function getEventEnrichment(
  household: Household,
  eventId: string,
): EventEnrichment {
  return (
    household.eventEnrichments.find(
      (enrichment) => enrichment.eventId === eventId,
    ) ?? {
      eventId,
      participantChildIds: [],
      isAllHousehold: true,
      updatedAt: "",
    }
  );
}

function groupAgendaDays(events: AgendaEvent[]): AgendaDay[] {
  const days = new Map<string, AgendaEvent[]>();
  for (const event of events.sort(compareAgendaEvents)) {
    const date = event.startsAt.slice(0, 10);
    days.set(date, [...(days.get(date) ?? []), event]);
  }
  return Array.from(days, ([date, dayEvents]) => ({
    date,
    events: dayEvents,
  }));
}

function normalizeParticipantChildIds(
  household: Household,
  childIds: string[],
): string[] {
  const uniqueIds = Array.from(new Set(childIds));
  for (const childId of uniqueIds) {
    assertChildBelongsToHousehold(household, childId);
  }
  return uniqueIds;
}

function validateAppleCalendarEvent(
  input: AppleCalendarEventInput,
): Omit<FamilyCalendarEvent, "id" | "syncedAt"> {
  const appleEventId = input.appleEventId.trim();
  const title = input.title.trim();
  const startsAt = input.startsAt.trim();
  const endsAt = input.endsAt.trim();
  if (!appleEventId) {
    throw new Error("Synced Events need an Apple Event ID.");
  }
  if (!title) {
    throw new Error("Synced Events need a title.");
  }
  assertIsoDateTime(startsAt);
  assertIsoDateTime(endsAt);
  if (endsAt <= startsAt) {
    throw new Error("Synced Events need an end time after the start time.");
  }
  const location = input.location?.trim();
  return {
    appleEventId,
    title,
    startsAt,
    endsAt,
    ...(location ? { location } : {}),
  };
}

function compareEvents(
  left: FamilyCalendarEvent,
  right: FamilyCalendarEvent,
): number {
  if (left.startsAt !== right.startsAt) {
    return left.startsAt.localeCompare(right.startsAt);
  }
  return left.title.localeCompare(right.title);
}

function compareAgendaEvents(left: AgendaEvent, right: AgendaEvent): number {
  if (left.startsAt !== right.startsAt) {
    return left.startsAt.localeCompare(right.startsAt);
  }
  return left.title.localeCompare(right.title);
}

function assertChildBelongsToHousehold(
  household: Household,
  childId: string,
): ChildProfile {
  const child = household.children.find((candidate) => candidate.id === childId);
  if (!child) {
    throw new Error("Child not found in this Household.");
  }
  return child;
}

function assertIsoDateTime(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new Error("Synced Events need valid Apple Calendar times.");
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}
