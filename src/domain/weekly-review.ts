import type { AgendaDay, AgendaEvent } from "./calendar";
import { getParentAgenda } from "./calendar";
import { getChildChoreBoard } from "./chores";
import { getChildGoalBoard } from "./goals";
import type { Household } from "./household";
import type { RewardRequestSummary } from "./rewards";
import { getChildRewardBoard } from "./rewards";

export type ParentWeeklyReview = {
  startsOn: string;
  endsOn: string;
  eventDays: AgendaDay[];
  childSummaries: WeeklyReviewChildSummary[];
  pendingRewardRequests: WeeklyReviewReward[];
  unfulfilledRewards: WeeklyReviewReward[];
};

export type WeeklyReviewChildSummary = {
  childId: string;
  childName: string;
  pointBalance: number;
  chores: {
    dueThisWeek: number;
    overdue: number;
    pendingReview: number;
  };
  goals: {
    active: number;
    pendingCheckIns: number;
    needsWorkCheckIns: number;
    completed: number;
  };
  rewardRequests: {
    pending: number;
    unfulfilled: number;
  };
};

export type WeeklyReviewReward = {
  requestId: string;
  rewardId: string;
  childId: string;
  childName: string;
  title: string;
  points: number;
  requestedAt: string;
  reviewedAt?: string;
};

export function getParentWeeklyReview(
  household: Household,
  today: string = toDateKey(new Date()),
): ParentWeeklyReview {
  assertDate(today);
  const endsOn = toDateKey(addDays(parseDateKey(today), 6));
  const rewardSummaries = household.children.map((child) => {
    const rewardBoard = getChildRewardBoard(household, child.id);
    return {
      child,
      pendingRequests: rewardBoard.pendingRequests,
      unfulfilledRewards: rewardBoard.approvedRequests,
    };
  });

  return {
    startsOn: today,
    endsOn,
    eventDays: getWeeklyEventDays(household, today, endsOn),
    childSummaries: household.children.map((child) => {
      const choreBoard = getChildChoreBoard(household, child.id, today);
      const goalBoard = getChildGoalBoard(household, child.id);
      const rewardSummary = rewardSummaries.find(
        (summary) => summary.child.id === child.id,
      );

      return {
        childId: child.id,
        childName: child.name,
        pointBalance: child.pointBalance,
        chores: {
          dueThisWeek: [...choreBoard.today, ...choreBoard.upcoming].filter(
            (chore) => chore.dueDate <= endsOn,
          ).length,
          overdue: choreBoard.overdue.length,
          pendingReview: choreBoard.pendingReview.length,
        },
        goals: {
          active: goalBoard.active.length,
          pendingCheckIns: goalBoard.pendingReview.length,
          needsWorkCheckIns: goalBoard.needsWork.length,
          completed: goalBoard.completed.length,
        },
        rewardRequests: {
          pending: rewardSummary?.pendingRequests.length ?? 0,
          unfulfilled: rewardSummary?.unfulfilledRewards.length ?? 0,
        },
      };
    }),
    pendingRewardRequests: rewardSummaries.flatMap((summary) =>
      summary.pendingRequests.map((request) =>
        toWeeklyReviewReward(summary.child.name, request),
      ),
    ),
    unfulfilledRewards: rewardSummaries.flatMap((summary) =>
      summary.unfulfilledRewards.map((request) =>
        toWeeklyReviewReward(summary.child.name, request),
      ),
    ),
  };
}

function getWeeklyEventDays(
  household: Household,
  startsOn: string,
  endsOn: string,
): AgendaDay[] {
  return getParentAgenda(household)
    .map((day) => ({
      ...day,
      events: day.events.filter((event) =>
        isEventInWeek(event, startsOn, endsOn),
      ),
    }))
    .filter((day) => day.date >= startsOn && day.date <= endsOn)
    .filter((day) => day.events.length > 0);
}

function toWeeklyReviewReward(
  childName: string,
  request: RewardRequestSummary,
): WeeklyReviewReward {
  return {
    requestId: request.requestId,
    rewardId: request.rewardId,
    childId: request.childId,
    childName,
    title: request.title,
    points: request.contributionPoints + request.reservedPoints,
    requestedAt: request.requestedAt,
    reviewedAt: request.reviewedAt,
  };
}

function isEventInWeek(
  event: Pick<AgendaEvent, "startsAt">,
  startsOn: string,
  endsOn: string,
): boolean {
  const date = event.startsAt.slice(0, 10);
  return date >= startsOn && date <= endsOn;
}

function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Use a valid Weekly Review date.");
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
