import type {
  ChildProfile,
  ChildWin,
  Household,
  PointLedgerEntry,
} from "./household";

export type GoalStatus = "active" | "completed" | "archived";

export type Goal = {
  id: string;
  childId: string;
  title: string;
  pointValue: number;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type ProgressCheckInStatus = "pending" | "approved" | "needs_work";

export type ProgressCheckIn = {
  id: string;
  goalId: string;
  childId: string;
  status: ProgressCheckInStatus;
  submittedAt: string;
  reviewedAt?: string;
};

export type GoalProgress = {
  goalId: string;
  childId: string;
  title: string;
  pointValue: number;
  awardedPoints: number;
  remainingPoints: number;
  status: GoalStatus;
};

export type ProgressCheckInSummary = {
  checkInId: string;
  goalId: string;
  childId: string;
  title: string;
  submittedAt: string;
  status: ProgressCheckInStatus;
};

export type ChildGoalBoard = {
  child: Pick<ChildProfile, "id" | "name">;
  active: GoalProgress[];
  pendingReview: ProgressCheckInSummary[];
  needsWork: ProgressCheckInSummary[];
  completed: GoalProgress[];
};

export type ProgressCheckInApprovalQueueItem = {
  id: string;
  type: "progress_check_in";
  childId: string;
  childName: string;
  goalId: string;
  title: string;
  pointValue: number;
  awardedPoints: number;
  remainingPoints: number;
  submittedAt: string;
};

export type CreateGoalInput = {
  title: string;
  childId: string;
  pointValue: number;
};

export type SubmitProgressCheckInInput = {
  childId: string;
  goalId: string;
  submittedAt?: string;
};

const DEFAULT_PROGRESS_CHECK_IN_POINTS = 1;

export function createGoal(
  household: Household,
  input: CreateGoalInput,
): Household {
  assertChildBelongsToHousehold(household, input.childId);
  const title = input.title.trim();
  if (!title) {
    throw new Error("Name the Goal.");
  }
  if (!Number.isInteger(input.pointValue) || input.pointValue < 1) {
    throw new Error("Goals must be worth at least 1 Point.");
  }

  const now = new Date().toISOString();
  return {
    ...withGoalCollections(household),
    goals: [
      ...getGoals(household),
      {
        id: createId(),
        childId: input.childId,
        title,
        pointValue: input.pointValue,
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    updatedAt: now,
  };
}

export function archiveGoal(
  household: Household,
  goalId: string,
  archivedAt: string = new Date().toISOString(),
): Household {
  const normalized = withGoalCollections(household);
  const goal = normalized.goals.find((candidate) => candidate.id === goalId);
  if (!goal) {
    throw new Error("Goal not found.");
  }
  if (goal.status === "completed") {
    throw new Error("Completed Goals cannot be archived.");
  }

  return {
    ...normalized,
    goals: normalized.goals.map((candidate) =>
      candidate.id === goalId
        ? { ...candidate, status: "archived", updatedAt: archivedAt }
        : candidate,
    ),
    updatedAt: archivedAt,
  };
}

export function submitProgressCheckIn(
  household: Household,
  input: SubmitProgressCheckInInput,
): Household {
  const normalized = withGoalCollections(household);
  const goal = assertGoalBelongsToChild(
    normalized,
    input.goalId,
    input.childId,
  );
  if (goal.status !== "active") {
    throw new Error("Only active Goals can receive Progress Check-ins.");
  }
  const alreadyPending = normalized.progressCheckIns.some(
    (checkIn) =>
      checkIn.goalId === goal.id &&
      checkIn.childId === input.childId &&
      checkIn.status === "pending",
  );
  if (alreadyPending) {
    throw new Error("This Goal is already waiting for Parent review.");
  }

  return {
    ...normalized,
    progressCheckIns: [
      ...normalized.progressCheckIns,
      {
        id: createId(),
        goalId: goal.id,
        childId: input.childId,
        status: "pending",
        submittedAt: input.submittedAt ?? new Date().toISOString(),
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function getChildGoalBoard(
  household: Household,
  childId: string,
): ChildGoalBoard {
  const normalized = withGoalCollections(household);
  const child = assertChildBelongsToHousehold(normalized, childId);
  const goals = normalized.goals
    .filter((goal) => goal.childId === childId && goal.status !== "archived")
    .map((goal) => toGoalProgress(normalized, goal))
    .sort(compareGoalProgress);
  const checkIns = normalized.progressCheckIns
    .filter((checkIn) => checkIn.childId === childId)
    .flatMap((checkIn) => toCheckInSummary(normalized, checkIn))
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));

  return {
    child: { id: child.id, name: child.name },
    active: goals.filter((goal) => goal.status === "active"),
    pendingReview: checkIns.filter((checkIn) => checkIn.status === "pending"),
    needsWork: checkIns.filter((checkIn) => checkIn.status === "needs_work"),
    completed: goals.filter((goal) => goal.status === "completed"),
  };
}

export function getProgressCheckInApprovalQueue(
  household: Household,
): ProgressCheckInApprovalQueueItem[] {
  const normalized = withGoalCollections(household);
  return normalized.progressCheckIns
    .filter((checkIn) => checkIn.status === "pending")
    .flatMap((checkIn) => {
      const goal = normalized.goals.find(
        (candidate) => candidate.id === checkIn.goalId,
      );
      const child = normalized.children.find(
        (candidate) => candidate.id === checkIn.childId,
      );
      if (!goal || !child || goal.status !== "active") {
        return [];
      }
      const remainingPoints = getGoalRemainingPoints(normalized, goal);
      return [
        {
          id: checkIn.id,
          type: "progress_check_in" as const,
          childId: child.id,
          childName: child.name,
          goalId: goal.id,
          title: goal.title,
          pointValue: goal.pointValue,
          awardedPoints: Math.min(
            DEFAULT_PROGRESS_CHECK_IN_POINTS,
            remainingPoints,
          ),
          remainingPoints,
          submittedAt: checkIn.submittedAt,
        },
      ];
    })
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
}

export function approveProgressCheckIns(
  household: Household,
  checkInIds: string[],
  approvedAt: string = new Date().toISOString(),
): Household {
  const normalized = withGoalCollections(household);
  const uniqueIds = Array.from(new Set(checkInIds));
  if (uniqueIds.length === 0) {
    return normalized;
  }

  const approvals = uniqueIds.map((checkInId) => {
    const checkIn = normalized.progressCheckIns.find(
      (candidate) => candidate.id === checkInId,
    );
    if (!checkIn || checkIn.status !== "pending") {
      throw new Error("Only pending Progress Check-ins can be approved.");
    }
    const goal = normalized.goals.find(
      (candidate) => candidate.id === checkIn.goalId,
    );
    if (!goal || goal.status !== "active") {
      throw new Error("Goal not found.");
    }
    const remainingPoints = getGoalRemainingPoints(normalized, goal);
    return {
      checkIn,
      goal,
      pointsAwarded: Math.min(DEFAULT_PROGRESS_CHECK_IN_POINTS, remainingPoints),
    };
  });

  const idsToApprove = new Set(uniqueIds);
  const balanceChanges = new Map<string, number>();
  const ledgerEntries: PointLedgerEntry[] = [];
  const wins: ChildWin[] = [];

  for (const approval of approvals) {
    const current = balanceChanges.get(approval.checkIn.childId) ?? 0;
    balanceChanges.set(
      approval.checkIn.childId,
      current + approval.pointsAwarded,
    );
    if (approval.pointsAwarded > 0) {
      ledgerEntries.push({
        id: createId(),
        childId: approval.checkIn.childId,
        delta: approval.pointsAwarded,
        description: `Approved Progress Check-in: ${approval.goal.title}`,
        sourceType: "progress_check_in_approval",
        sourceId: approval.checkIn.id,
        createdAt: approvedAt,
      });
    }
    wins.push({
      id: createId(),
      childId: approval.checkIn.childId,
      title: approval.goal.title,
      description:
        approval.pointsAwarded > 0
          ? `${approval.pointsAwarded} Progress Point earned`
          : "Progress approved",
      sourceType: "progress_check_in",
      sourceId: approval.checkIn.id,
      earnedAt: approvedAt,
    });
  }

  return {
    ...normalized,
    children: normalized.children.map((child) => ({
      ...child,
      pointBalance: child.pointBalance + (balanceChanges.get(child.id) ?? 0),
    })),
    progressCheckIns: normalized.progressCheckIns.map((checkIn) =>
      idsToApprove.has(checkIn.id)
        ? { ...checkIn, status: "approved", reviewedAt: approvedAt }
        : checkIn,
    ),
    pointLedger: [...normalized.pointLedger, ...ledgerEntries],
    childWins: [...normalized.childWins, ...wins],
    updatedAt: approvedAt,
  };
}

export function markProgressCheckInNeedsWork(
  household: Household,
  checkInId: string,
  reviewedAt: string = new Date().toISOString(),
): Household {
  const normalized = withGoalCollections(household);
  const checkIn = normalized.progressCheckIns.find(
    (candidate) => candidate.id === checkInId,
  );
  if (!checkIn || checkIn.status !== "pending") {
    throw new Error("Only pending Progress Check-ins can be marked Needs Work.");
  }

  return {
    ...normalized,
    progressCheckIns: normalized.progressCheckIns.map((candidate) =>
      candidate.id === checkInId
        ? { ...candidate, status: "needs_work", reviewedAt }
        : candidate,
    ),
    updatedAt: reviewedAt,
  };
}

export function completeGoal(
  household: Household,
  goalId: string,
  completedAt: string = new Date().toISOString(),
): Household {
  const normalized = withGoalCollections(household);
  const goal = normalized.goals.find((candidate) => candidate.id === goalId);
  if (!goal || goal.status !== "active") {
    throw new Error("Only active Goals can be completed.");
  }
  const remainingPoints = getGoalRemainingPoints(normalized, goal);

  const ledgerEntry: PointLedgerEntry | null =
    remainingPoints > 0
      ? {
          id: createId(),
          childId: goal.childId,
          delta: remainingPoints,
          description: `Goal Completion: ${goal.title}`,
          sourceType: "goal_completion",
          sourceId: goal.id,
          createdAt: completedAt,
        }
      : null;

  const win: ChildWin = {
    id: createId(),
    childId: goal.childId,
    title: goal.title,
    description:
      remainingPoints > 0
        ? `${remainingPoints} remaining Points earned`
        : "Goal complete",
    sourceType: "goal",
    sourceId: goal.id,
    earnedAt: completedAt,
  };

  return {
    ...normalized,
    children: normalized.children.map((child) =>
      child.id === goal.childId
        ? { ...child, pointBalance: child.pointBalance + remainingPoints }
        : child,
    ),
    goals: normalized.goals.map((candidate) =>
      candidate.id === goal.id
        ? {
            ...candidate,
            status: "completed",
            completedAt,
            updatedAt: completedAt,
          }
        : candidate,
    ),
    pointLedger: ledgerEntry
      ? [...normalized.pointLedger, ledgerEntry]
      : normalized.pointLedger,
    childWins: [...normalized.childWins, win],
    updatedAt: completedAt,
  };
}

export function withGoalCollections(household: Household): Household {
  return {
    ...household,
    goals: getGoals(household),
    progressCheckIns: getProgressCheckIns(household),
    pointLedger: getPointLedger(household),
    childWins: getChildWinsCollection(household),
  };
}

function toGoalProgress(household: Household, goal: Goal): GoalProgress {
  const awardedPoints = getGoalAwardedPoints(household, goal);
  return {
    goalId: goal.id,
    childId: goal.childId,
    title: goal.title,
    pointValue: goal.pointValue,
    awardedPoints,
    remainingPoints: Math.max(0, goal.pointValue - awardedPoints),
    status: goal.status,
  };
}

function toCheckInSummary(
  household: Household,
  checkIn: ProgressCheckIn,
): ProgressCheckInSummary[] {
  const goal = getGoals(household).find(
    (candidate) => candidate.id === checkIn.goalId,
  );
  if (!goal || goal.status !== "active") {
    return [];
  }
  return [
    {
      checkInId: checkIn.id,
      goalId: goal.id,
      childId: checkIn.childId,
      title: goal.title,
      submittedAt: checkIn.submittedAt,
      status: checkIn.status,
    },
  ];
}

function getGoalRemainingPoints(household: Household, goal: Goal): number {
  return Math.max(0, goal.pointValue - getGoalAwardedPoints(household, goal));
}

function getGoalAwardedPoints(household: Household, goal: Goal): number {
  const checkInIds = new Set(
    getProgressCheckIns(household)
      .filter((checkIn) => checkIn.goalId === goal.id)
      .map((checkIn) => checkIn.id),
  );
  return getPointLedger(household)
    .filter(
      (entry) =>
        (entry.sourceType === "progress_check_in_approval" &&
          checkInIds.has(entry.sourceId)) ||
        (entry.sourceType === "goal_completion" && entry.sourceId === goal.id),
    )
    .reduce((total, entry) => total + entry.delta, 0);
}

function compareGoalProgress(left: GoalProgress, right: GoalProgress): number {
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

function assertGoalBelongsToChild(
  household: Household,
  goalId: string,
  childId: string,
): Goal {
  assertChildBelongsToHousehold(household, childId);
  const goal = getGoals(household).find((candidate) => candidate.id === goalId);
  if (!goal) {
    throw new Error("Goal not found.");
  }
  if (goal.childId !== childId) {
    throw new Error("This Goal is not assigned to this Child.");
  }
  return goal;
}

function getGoals(household: Household): Goal[] {
  return household.goals ?? [];
}

function getProgressCheckIns(household: Household): ProgressCheckIn[] {
  return household.progressCheckIns ?? [];
}

function getPointLedger(household: Household): PointLedgerEntry[] {
  return household.pointLedger ?? [];
}

function getChildWinsCollection(household: Household): ChildWin[] {
  return household.childWins ?? [];
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}
