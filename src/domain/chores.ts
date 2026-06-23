import type {
  ChildProfile,
  ChildWin,
  Household,
  PointLedgerEntry,
} from "./household";
import {
  getProgressCheckInApprovalQueue,
  type ProgressCheckInApprovalQueueItem,
} from "./goals";
import {
  getRewardRequestApprovalQueue,
  type RewardRequestApprovalQueueItem,
} from "./rewards";

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
  reviewedAt?: string;
};

export type SkippedChoreOccurrence = {
  id: string;
  choreId: string;
  childId: string;
  occurrenceDate: string;
  skippedAt: string;
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

export type ChoreSubmissionApprovalQueueItem = {
  id: string;
  type: "chore_submission";
  childId: string;
  childName: string;
  choreId: string;
  title: string;
  pointValue: number;
  occurrenceDate: string;
  submittedAt: string;
};

export type ApprovalQueueItem =
  | ChoreSubmissionApprovalQueueItem
  | ProgressCheckInApprovalQueueItem
  | RewardRequestApprovalQueueItem;

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

export type SkipChoreOccurrenceInput = {
  childId: string;
  choreId: string;
  occurrenceDate: string;
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
    return buildOccurrenceDates(chore, today).flatMap((dueDate) => {
      const status = getOccurrenceStatus(household, chore, dueDate, today);
      if (!status) {
        return [];
      }
      return [
        {
          choreId: chore.id,
          childId: chore.childId,
          title: chore.title,
          pointValue: chore.pointValue,
          dueDate,
          status,
          routineLabel: getRoutineLabel(chore.routine),
        },
      ];
    });
  }
}

export function getApprovalQueue(household: Household): ApprovalQueueItem[] {
  const normalized = withChoreCollections(household);
  const choreItems = normalized.choreSubmissions
    .filter(
      (submission) =>
        submission.status === "pending" &&
        !isChoreOccurrenceSkipped(
          normalized,
          submission.choreId,
          submission.occurrenceDate,
        ),
    )
    .flatMap((submission) => {
      const chore = normalized.chores.find(
        (candidate) => candidate.id === submission.choreId,
      );
      const child = normalized.children.find(
        (candidate) => candidate.id === submission.childId,
      );
      if (!chore || !child) {
        return [];
      }
      return [
        {
          id: submission.id,
          type: "chore_submission" as const,
          childId: child.id,
          childName: child.name,
          choreId: chore.id,
          title: chore.title,
          pointValue: chore.pointValue,
          occurrenceDate: submission.occurrenceDate,
          submittedAt: submission.submittedAt,
        },
      ];
    })
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
  return [
    ...choreItems,
    ...getProgressCheckInApprovalQueue(household),
    ...getRewardRequestApprovalQueue(household),
  ].sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
}

export function approveChoreSubmissions(
  household: Household,
  submissionIds: string[],
  approvedAt: string = new Date().toISOString(),
): Household {
  const normalized = withChoreCollections(household);
  const uniqueIds = Array.from(new Set(submissionIds));
  if (uniqueIds.length === 0) {
    return normalized;
  }

  const approvals = uniqueIds.map((submissionId) => {
    const submission = normalized.choreSubmissions.find(
      (candidate) => candidate.id === submissionId,
    );
    if (!submission || submission.status !== "pending") {
      throw new Error("Only pending Chore Submissions can be approved.");
    }
    const chore = normalized.chores.find(
      (candidate) => candidate.id === submission.choreId,
    );
    if (!chore) {
      throw new Error("Chore not found.");
    }
    return { submission, chore };
  });

  const submissionIdsToApprove = new Set(uniqueIds);
  const balanceChanges = new Map<string, number>();
  const ledgerEntries: PointLedgerEntry[] = [];
  const wins: ChildWin[] = [];

  for (const approval of approvals) {
    const current = balanceChanges.get(approval.submission.childId) ?? 0;
    balanceChanges.set(
      approval.submission.childId,
      current + approval.chore.pointValue,
    );
    ledgerEntries.push({
      id: createId(),
      childId: approval.submission.childId,
      delta: approval.chore.pointValue,
      description: `Approved Chore: ${approval.chore.title}`,
      sourceType: "chore_approval",
      sourceId: approval.submission.id,
      createdAt: approvedAt,
    });
    wins.push({
      id: createId(),
      childId: approval.submission.childId,
      title: approval.chore.title,
      description: `${approval.chore.pointValue} Points earned`,
      sourceType: "chore",
      sourceId: approval.submission.id,
      earnedAt: approvedAt,
    });
  }

  return {
    ...normalized,
    children: normalized.children.map((child) => ({
      ...child,
      pointBalance: child.pointBalance + (balanceChanges.get(child.id) ?? 0),
    })),
    choreSubmissions: normalized.choreSubmissions.map((submission) =>
      submissionIdsToApprove.has(submission.id)
        ? { ...submission, status: "approved", reviewedAt: approvedAt }
        : submission,
    ),
    pointLedger: [...normalized.pointLedger, ...ledgerEntries],
    childWins: [...normalized.childWins, ...wins],
    updatedAt: approvedAt,
  };
}

export function markChoreSubmissionNeedsWork(
  household: Household,
  submissionId: string,
  reviewedAt: string = new Date().toISOString(),
): Household {
  const normalized = withChoreCollections(household);
  const submission = normalized.choreSubmissions.find(
    (candidate) => candidate.id === submissionId,
  );
  if (!submission || submission.status !== "pending") {
    throw new Error("Only pending Chore Submissions can be marked Needs Work.");
  }

  return {
    ...normalized,
    choreSubmissions: normalized.choreSubmissions.map((candidate) =>
      candidate.id === submissionId
        ? { ...candidate, status: "needs_work", reviewedAt }
        : candidate,
    ),
    updatedAt: reviewedAt,
  };
}

export function skipChoreOccurrence(
  household: Household,
  input: SkipChoreOccurrenceInput,
  skippedAt: string = new Date().toISOString(),
): Household {
  const normalized = withChoreCollections(household);
  const chore = assertChoreBelongsToChild(
    normalized,
    input.choreId,
    input.childId,
  );
  assertDate(input.occurrenceDate);

  const alreadySkipped = normalized.skippedChoreOccurrences.some(
    (occurrence) =>
      occurrence.choreId === chore.id &&
      occurrence.childId === input.childId &&
      occurrence.occurrenceDate === input.occurrenceDate,
  );

  return {
    ...normalized,
    skippedChoreOccurrences: alreadySkipped
      ? normalized.skippedChoreOccurrences
      : [
          ...normalized.skippedChoreOccurrences,
          {
            id: createId(),
            choreId: chore.id,
            childId: input.childId,
            occurrenceDate: input.occurrenceDate,
            skippedAt,
          },
        ],
    updatedAt: skippedAt,
  };
}

export function pauseChore(
  household: Household,
  choreId: string,
  pausedAt: string = new Date().toISOString(),
): Household {
  return updateChoreStatus(household, choreId, "paused", pausedAt);
}

export function archiveChore(
  household: Household,
  choreId: string,
  archivedAt: string = new Date().toISOString(),
): Household {
  const normalized = withChoreCollections(household);
  const chore = normalized.chores.find((candidate) => candidate.id === choreId);
  if (!chore) {
    throw new Error("Chore not found.");
  }
  if (chore.status === "active") {
    throw new Error("Pause a Chore before archiving it.");
  }
  return updateChoreStatus(normalized, choreId, "archived", archivedAt);
}

export function getChildPointLedger(
  household: Household,
  childId: string,
): PointLedgerEntry[] {
  assertChildBelongsToHousehold(household, childId);
  return getPointLedger(household)
    .filter((entry) => entry.childId === childId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function getChildWins(household: Household, childId: string): ChildWin[] {
  assertChildBelongsToHousehold(household, childId);
  return getChildWinsCollection(household)
    .filter((win) => win.childId === childId)
    .sort((left, right) => left.earnedAt.localeCompare(right.earnedAt));
}

export function withChoreCollections(household: Household): Household {
  return {
    ...household,
    chores: getChores(household),
    choreSubmissions: getChoreSubmissions(household),
    skippedChoreOccurrences: getSkippedChoreOccurrences(household),
    pointLedger: getPointLedger(household),
    childWins: getChildWinsCollection(household),
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
): ChoreOccurrence["status"] | null {
  if (isChoreOccurrenceSkipped(household, chore.id, dueDate)) {
    return null;
  }
  const approved = getChoreSubmissions(household).some(
    (submission) =>
      submission.choreId === chore.id &&
      submission.occurrenceDate === dueDate &&
      submission.status === "approved",
  );
  if (approved) {
    return null;
  }
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

function isChoreOccurrenceSkipped(
  household: Household,
  choreId: string,
  occurrenceDate: string,
): boolean {
  return getSkippedChoreOccurrences(household).some(
    (occurrence) =>
      occurrence.choreId === choreId &&
      occurrence.occurrenceDate === occurrenceDate,
  );
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

function updateChoreStatus(
  household: Household,
  choreId: string,
  status: ChoreStatus,
  updatedAt: string,
): Household {
  const normalized = withChoreCollections(household);
  if (!normalized.chores.some((chore) => chore.id === choreId)) {
    throw new Error("Chore not found.");
  }
  return {
    ...normalized,
    chores: normalized.chores.map((chore) =>
      chore.id === choreId ? { ...chore, status, updatedAt } : chore,
    ),
    updatedAt,
  };
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

function assertChoreBelongsToChild(
  household: Household,
  choreId: string,
  childId: string,
): Chore {
  assertChildBelongsToHousehold(household, childId);
  const chore = getChores(household).find((candidate) => candidate.id === choreId);
  if (!chore) {
    throw new Error("Chore not found.");
  }
  if (chore.childId !== childId) {
    throw new Error("This Chore is not assigned to this Child.");
  }
  return chore;
}

function getChores(household: Household): Chore[] {
  return household.chores ?? [];
}

function getChoreSubmissions(household: Household): ChoreSubmission[] {
  return household.choreSubmissions ?? [];
}

function getSkippedChoreOccurrences(
  household: Household,
): SkippedChoreOccurrence[] {
  return household.skippedChoreOccurrences ?? [];
}

function getPointLedger(household: Household): PointLedgerEntry[] {
  return household.pointLedger ?? [];
}

function getChildWinsCollection(household: Household): ChildWin[] {
  return household.childWins ?? [];
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
