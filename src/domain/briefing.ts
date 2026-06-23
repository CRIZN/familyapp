import type { AgendaDay, AgendaEvent } from "./calendar";
import { getParentAgenda } from "./calendar";
import type { ChoreOccurrence } from "./chores";
import { getApprovalQueue, getChildChoreBoard } from "./chores";
import type { Household } from "./household";

export type ParentBriefing = {
  eventDays: AgendaDay[];
  approvalSummary: ApprovalQueueSummary;
  overdueChores: ParentBriefingChore[];
  unfulfilledRewards: ParentBriefingReward[];
  suggestedActions: SuggestedAction[];
};

export type ApprovalQueueSummary = {
  total: number;
  choreSubmissions: number;
  progressCheckIns: number;
  rewardRequests: number;
};

export type ParentBriefingChore = ChoreOccurrence & {
  childName: string;
};

export type ParentBriefingReward = {
  requestId: string;
  rewardId: string;
  childId: string;
  childName: string;
  title: string;
  points: number;
  reviewedAt?: string;
};

export type SuggestedAction = {
  id: "review-approval-queue" | "handle-overdue-chores" | "fulfill-rewards";
  label: string;
  detail: string;
  href: "#approval-queue" | "#due-chores" | "#reward-fulfillment";
};

export function getParentBriefing(
  household: Household,
  today: string = toDateKey(new Date()),
): ParentBriefing {
  assertDate(today);
  const tomorrow = toDateKey(addDays(parseDateKey(today), 1));
  const approvalSummary = getApprovalQueueSummary(household);
  const overdueChores = getOverdueChores(household, today);
  const unfulfilledRewards = getUnfulfilledRewards(household);

  return {
    eventDays: getTodayAndTomorrowEventDays(household, today, tomorrow),
    approvalSummary,
    overdueChores,
    unfulfilledRewards,
    suggestedActions: getSuggestedActions({
      approvalSummary,
      overdueChores,
      unfulfilledRewards,
    }),
  };
}

function getTodayAndTomorrowEventDays(
  household: Household,
  today: string,
  tomorrow: string,
): AgendaDay[] {
  const importantDates = new Set([today, tomorrow]);
  return getParentAgenda(household)
    .map((day) => ({
      ...day,
      events: day.events.filter((event) =>
        importantDates.has(getEventDate(event)),
      ),
    }))
    .filter((day) => importantDates.has(day.date) && day.events.length > 0);
}

function getApprovalQueueSummary(household: Household): ApprovalQueueSummary {
  const queue = getApprovalQueue(household);
  return {
    total: queue.length,
    choreSubmissions: queue.filter((item) => item.type === "chore_submission")
      .length,
    progressCheckIns: queue.filter((item) => item.type === "progress_check_in")
      .length,
    rewardRequests: queue.filter((item) => item.type === "reward_request")
      .length,
  };
}

function getOverdueChores(
  household: Household,
  today: string,
): ParentBriefingChore[] {
  return household.children.flatMap((child) =>
    getChildChoreBoard(household, child.id, today).overdue.map((chore) => ({
      ...chore,
      childName: child.name,
    })),
  );
}

function getUnfulfilledRewards(household: Household): ParentBriefingReward[] {
  return household.rewardRequests
    .filter((request) => request.status === "approved")
    .flatMap((request) => {
      const reward = household.rewards.find(
        (candidate) => candidate.id === request.rewardId,
      );
      const child = household.children.find(
        (candidate) => candidate.id === request.childId,
      );
      if (!reward || !child) {
        return [];
      }
      return [
        {
          requestId: request.id,
          rewardId: reward.id,
          childId: child.id,
          childName: child.name,
          title: reward.title,
          points: request.contributionPoints + request.reservedPoints,
          reviewedAt: request.reviewedAt,
        },
      ];
    })
    .sort((left, right) =>
      (left.reviewedAt ?? "").localeCompare(right.reviewedAt ?? ""),
    );
}

function getSuggestedActions(input: {
  approvalSummary: ApprovalQueueSummary;
  overdueChores: ParentBriefingChore[];
  unfulfilledRewards: ParentBriefingReward[];
}): SuggestedAction[] {
  const actions: SuggestedAction[] = [];
  if (input.approvalSummary.total > 0) {
    actions.push({
      id: "review-approval-queue",
      label: "Review Approval Queue",
      detail: `${input.approvalSummary.total} item${pluralize(
        input.approvalSummary.total,
      )} waiting`,
      href: "#approval-queue",
    });
  }
  if (input.overdueChores.length > 0) {
    actions.push({
      id: "handle-overdue-chores",
      label: "Check Overdue Chores",
      detail: `${input.overdueChores.length} Chore${pluralize(
        input.overdueChores.length,
      )} overdue`,
      href: "#due-chores",
    });
  }
  if (input.unfulfilledRewards.length > 0) {
    actions.push({
      id: "fulfill-rewards",
      label: "Fulfill Rewards",
      detail: `${input.unfulfilledRewards.length} Reward${pluralize(
        input.unfulfilledRewards.length,
      )} approved`,
      href: "#reward-fulfillment",
    });
  }
  return actions;
}

function getEventDate(event: Pick<AgendaEvent, "startsAt">): string {
  return event.startsAt.slice(0, 10);
}

function pluralize(count: number): string {
  return count === 1 ? "" : "s";
}

function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Use a valid Briefing date.");
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
