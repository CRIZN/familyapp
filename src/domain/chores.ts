import type { ChildProfile, Household } from "./household";

export type Routine =
  | {
      frequency: "daily";
    }
  | {
      frequency: "weekly";
    };

export type ChoreStatus = "active" | "paused" | "archived";

export type Chore = {
  id: string;
  childId: string;
  title: string;
  pointValue: number;
  dueDate: string;
  routine: Routine | null;
  status: ChoreStatus;
  createdAt: string;
  updatedAt: string;
};

export type ChoreSubmissionStatus = "pending" | "approved" | "needs_work";

export type ChoreSubmission = {
  id: string;
  choreId: string;
  childId: string;
  occurrenceDate: string;
  status: ChoreSubmissionStatus;
  submittedAt: string;
};

export type ChoreOccurrence = {
  choreId: string;
  childId: string;
  title: string;
  pointValue: number;
  dueDate: string;
  status: "due_today" | "upcoming" | "overdue" | "pending_review";
  routineLabel: string;
};

export type ChildChoreBoard = {
  child: Pick<ChildProfile, "id" | "name">;
  overdue: ChoreOccurrence[];
  today: ChoreOccurrence[];
  upcoming: ChoreOccurrence[];
  pendingReview: ChoreOccurrence[];
};

export type CreateChoreInput = {
  title: string;
  childId: string;
  pointValue: number;
  dueDate: string;
  routine: Routine | null;
};

export type SubmitChoreInput = {
  childId: string;
  choreId: string;
  occurrenceDate: string;
  today?: string;
  submittedAt?: string;
};

const UPCOMING_WINDOW_DAYS = 14;

export function createChore(
  household: Household,
  input: CreateChoreInput,
): Household {
  assertChildBelongsToHousehold(household, input.childId);
  const title = input.title.trim();
  if (!title) {
    throw new Error("Name the Chore.");
  }
  if (!Number.isInteger(input.pointValue) || input.pointValue < 1) {
    throw new Error("Chores must be worth at least 1 Point.");
  }
  assertDate(input.dueDate);

  const now = new Date().toISOString();
  return {
    ...withChoreCollections(household),
    chores: [
      ...getChores(household),
      {
        id: createId(),
        childId: input.childId,
        title,
        pointValue: input.pointValue,
        dueDate: input.dueDate,
        routine: input.routine,
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    updatedAt: now,
  };
}

export function submitChore(
  household: Household,
  input: SubmitChoreInput,
): Household {
  const normalized = withChoreCollections(household);
  const chore = normalized.chores.find(
    (candidate) => candidate.id === input.choreId,
  );
  if (!chore || chore.status !== "active") {
    throw new Error("Chore not found.");
  }
  if (chore.childId !== input.childId) {
    throw new Error("This Chore is not assigned to this Child.");
  }
  assertDate(input.occurrenceDate);

  const today = input.today ?? toDateKey(new Date());
  const board = getChildChoreBoard(normalized, input.childId, today);
  const occurrence = [...board.overdue, ...board.today].find(
    (candidate) =>
      candidate.choreId === input.choreId &&
      candidate.dueDate === input.occurrenceDate,
  );
  if (!occurrence) {
    throw new Error("Only due or Overdue Chores can be submitted.");
  }

  const alreadySubmitted = normalized.choreSubmissions.some(
    (submission) =>
      submission.choreId === input.choreId &&
      submission.childId === input.childId &&
      submission.occurrenceDate === input.occurrenceDate &&
      submission.status === "pending",
  );
  if (alreadySubmitted) {
    throw new Error("This Chore is already waiting for Parent review.");
  }

  return {
    ...normalized,
    choreSubmissions: [
      ...normalized.choreSubmissions,
      {
        id: createId(),
        choreId: input.choreId,
        childId: input.childId,
        occurrenceDate: input.occurrenceDate,
        status: "pending",
        submittedAt: input.submittedAt ?? new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function getChildChoreBoard(
  household: Household,
  childId: string,
  today: string = toDateKey(new Date()),
): ChildChoreBoard {
  const child = assertChildBelongsToHousehold(household, childId);
  assertDate(today);

  const chores = getChores(household)
    .filter((chore) => chore.childId === childId && chore.status === "active")
    .flatMap((chore) => getVisibleOccurrences(chore))
    .sort(compareOccurrences);

  return {
    child: { id: child.id, name: child.name },
    overdue: chores.filter((chore) => chore.status === "overdue"),
    today: chores.filter((chore) => chore.status === "due_today"),
    upcoming: chores.filter((chore) => chore.status === "upcoming"),
    pendingReview: chores.filter((chore) => chore.status === "pending_review"),
  };

  function getVisibleOccurrences(chore: Chore): ChoreOccurrence[] {
    return buildOccurrenceDates(chore, today).map((dueDate) => ({
      choreId: chore.id,
      childId: chore.childId,
      title: chore.title,
      pointValue: chore.pointValue,
      dueDate,
      status: getOccurrenceStatus(household, chore, dueDate, today),
      routineLabel: getRoutineLabel(chore.routine),
    }));
  }
}

export function withChoreCollections(household: Household): Household {
  return {
    ...household,
    chores: getChores(household),
    choreSubmissions: getChoreSubmissions(household),
  };
}

export function getRoutineLabel(routine: Routine | null): string {
  if (!routine) {
    return "One-time";
  }
  return routine.frequency === "daily" ? "Daily" : "Weekly";
}

function getOccurrenceStatus(
  household: Household,
  chore: Chore,
  dueDate: string,
  today: string,
): ChoreOccurrence["status"] {
  const pending = getChoreSubmissions(household).some(
    (submission) =>
      submission.choreId === chore.id &&
      submission.occurrenceDate === dueDate &&
      submission.status === "pending",
  );
  if (pending) {
    return "pending_review";
  }
  if (dueDate < today) {
    return "overdue";
  }
  if (dueDate === today) {
    return "due_today";
  }
  return "upcoming";
}

function buildOccurrenceDates(chore: Chore, today: string): string[] {
  const start = parseDateKey(chore.dueDate);
  const end = addDays(parseDateKey(today), UPCOMING_WINDOW_DAYS);
  const dates: string[] = [];

  if (!chore.routine) {
    if (parseDateKey(chore.dueDate) <= end) {
      dates.push(chore.dueDate);
    }
    return dates;
  }

  let cursor = start;
  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor = addDays(cursor, chore.routine.frequency === "daily" ? 1 : 7);
  }

  return dates;
}

function compareOccurrences(left: ChoreOccurrence, right: ChoreOccurrence) {
  if (left.dueDate !== right.dueDate) {
    return left.dueDate.localeCompare(right.dueDate);
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

function getChores(household: Household): Chore[] {
  return household.chores ?? [];
}

function getChoreSubmissions(household: Household): ChoreSubmission[] {
  return household.choreSubmissions ?? [];
}

function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Use a valid due date.");
  }
}

function parseDateKey(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}
