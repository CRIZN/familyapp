import { getParentAgenda, type AgendaEvent } from "./calendar";
import { getChildChoreBoard, type ChoreOccurrence } from "./chores";
import { getTodayDateKey } from "./dates";
import type { Household } from "./household";

export type FamilyDisplayChoreStatus =
  | "due"
  | "overdue"
  | "pending_review"
  | "done";

export type FamilyDisplayCalendarStatus =
  | {
      state: "not_connected";
    }
  | {
      state: "connected";
      calendarName: string;
      lastSuccessfulSyncAt: string | null;
    };

export type FamilyDisplayAgendaEvent = {
  eventId: string;
  title: string;
  timeLabel: string;
  location?: string;
  participantLabel: string;
};

export type FamilyDisplayChore = {
  choreId: string;
  title: string;
  dueDate: string;
  status: FamilyDisplayChoreStatus;
};

export type FamilyDisplayChild = {
  childId: string;
  name: string;
  chores: FamilyDisplayChore[];
};

export type FamilyDisplaySnapshot = {
  householdName: string;
  dateKey: string;
  agenda: FamilyDisplayAgendaEvent[];
  children: FamilyDisplayChild[];
  calendarStatus: FamilyDisplayCalendarStatus;
};

const CHORE_STATUS_ORDER: Record<FamilyDisplayChoreStatus, number> = {
  overdue: 0,
  due: 1,
  pending_review: 2,
  done: 3,
};

export function assembleFamilyDisplaySnapshot(
  household: Household,
  todayDateKey: string = getTodayDateKey(),
): FamilyDisplaySnapshot {
  assertDateKey(todayDateKey);

  return {
    householdName: household.name,
    dateKey: todayDateKey,
    agenda: getTodayAgenda(household, todayDateKey),
    children: household.children.map((child) => ({
      childId: child.id,
      name: child.name,
      chores: getChildDisplayChores(household, child.id, todayDateKey),
    })),
    calendarStatus: getCalendarStatus(household),
  };
}

function getTodayAgenda(
  household: Household,
  todayDateKey: string,
): FamilyDisplayAgendaEvent[] {
  const today = getParentAgenda(household).find((day) => day.date === todayDateKey);
  return (today?.events ?? []).map(toDisplayAgendaEvent);
}

function toDisplayAgendaEvent(event: AgendaEvent): FamilyDisplayAgendaEvent {
  return {
    eventId: event.eventId,
    title: event.title,
    timeLabel: event.isAllDay ? "All day" : formatTime(event.startsAt),
    ...(event.location ? { location: event.location } : {}),
    participantLabel:
      event.participantNames.length > 0
        ? event.participantNames.join(", ")
        : "All Household",
  };
}

function getChildDisplayChores(
  household: Household,
  childId: string,
  todayDateKey: string,
): FamilyDisplayChore[] {
  const board = getChildChoreBoard(household, childId, todayDateKey);
  const openChores = [
    ...board.overdue.map((chore) => toDisplayChore(chore, "overdue")),
    ...board.today.map((chore) => toDisplayChore(chore, "due")),
    ...board.pendingReview.map((chore) =>
      toDisplayChore(chore, "pending_review"),
    ),
  ];
  const seen = new Set(
    openChores.map((chore) => `${chore.choreId}:${chore.dueDate}`),
  );
  const doneChores = getDoneTodayChores(household, childId, todayDateKey).filter(
    (chore) => !seen.has(`${chore.choreId}:${chore.dueDate}`),
  );

  return [...openChores, ...doneChores].sort(compareDisplayChores);
}

function getDoneTodayChores(
  household: Household,
  childId: string,
  todayDateKey: string,
): FamilyDisplayChore[] {
  return household.choreSubmissions
    .filter(
      (submission) =>
        submission.childId === childId &&
        submission.status === "approved" &&
        submission.occurrenceDate === todayDateKey,
    )
    .flatMap((submission) => {
      const chore = household.chores.find(
        (candidate) => candidate.id === submission.choreId,
      );
      if (!chore) {
        return [];
      }
      return [
        {
          choreId: chore.id,
          title: chore.title,
          dueDate: submission.occurrenceDate,
          status: "done" as const,
        },
      ];
    });
}

function toDisplayChore(
  chore: ChoreOccurrence,
  status: FamilyDisplayChoreStatus,
): FamilyDisplayChore {
  return {
    choreId: chore.choreId,
    title: chore.title,
    dueDate: chore.dueDate,
    status,
  };
}

function compareDisplayChores(
  left: FamilyDisplayChore,
  right: FamilyDisplayChore,
): number {
  const statusComparison =
    CHORE_STATUS_ORDER[left.status] - CHORE_STATUS_ORDER[right.status];
  if (statusComparison !== 0) {
    return statusComparison;
  }
  if (left.dueDate !== right.dueDate) {
    return left.dueDate.localeCompare(right.dueDate);
  }
  return left.title.localeCompare(right.title);
}

function getCalendarStatus(household: Household): FamilyDisplayCalendarStatus {
  const connection = household.calendarConnection;
  if (!connection) {
    return { state: "not_connected" };
  }

  return {
    state: "connected",
    calendarName: connection.calendarName,
    lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt ?? null,
  };
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function assertDateKey(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Family Display needs a valid date key.");
  }
}
