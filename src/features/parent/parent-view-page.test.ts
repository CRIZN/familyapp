import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createChore, submitChore } from "@/domain/chores";
import { createGoal, submitProgressCheckIn } from "@/domain/goals";
import { createHousehold, type Household } from "@/domain/household";
import {
  approveRewardRequest,
  createReward,
  requestReward,
} from "@/domain/rewards";
import {
  mapPersistedHouseholdRows,
  type PersistedHouseholdRows,
} from "@/server/household/repository";

import { ParentViewPage } from "./parent-view-page";

function givePoints(household: Household, childId: string, points: number) {
  return {
    ...household,
    children: household.children.map((child) =>
      child.id === childId ? { ...child, pointBalance: points } : child,
    ),
  };
}

async function createAggregatedHousehold(): Promise<Household> {
  const household = await createHousehold({
    children: [{ name: "Ada", pin: "1234" }],
    householdName: "Clozcasa",
    parents: [{ email: "first@example.com", name: "First" }],
  });
  const child = household.children[0]!;
  const withOverdueChore = createChore(household, {
    childId: child.id,
    dueDate: "2026-06-23",
    pointValue: 2,
    routine: null,
    title: "Water plants",
  });
  const withSubmittedChore = createChore(withOverdueChore, {
    childId: child.id,
    dueDate: "2026-06-24",
    pointValue: 1,
    routine: null,
    title: "Pack lunch",
  });
  const submittedChore = submitChore(withSubmittedChore, {
    childId: child.id,
    choreId: withSubmittedChore.chores[1]!.id,
    occurrenceDate: "2026-06-24",
    submittedAt: "2026-06-24T12:00:00.000Z",
    today: "2026-06-24",
  });
  const withGoal = createGoal(submittedChore, {
    childId: child.id,
    pointValue: 5,
    title: "Read three chapters",
  });
  const submittedCheckIn = submitProgressCheckIn(withGoal, {
    childId: child.id,
    goalId: withGoal.goals[0]!.id,
    submittedAt: "2026-06-24T12:10:00.000Z",
  });
  const funded = givePoints(submittedCheckIn, child.id, 30);
  const withPendingReward = createReward(funded, {
    pointCost: 8,
    title: "Movie night",
    type: "experience",
  });
  const pendingReward = requestReward(withPendingReward, {
    childId: child.id,
    rewardId: withPendingReward.rewards[0]!.id,
    requestedAt: "2026-06-24T12:20:00.000Z",
  });
  const withApprovedReward = createReward(pendingReward, {
    pointCost: 6,
    title: "Choose dinner",
    type: "privilege",
  });
  const requestedApprovedReward = requestReward(withApprovedReward, {
    childId: child.id,
    rewardId: withApprovedReward.rewards[1]!.id,
    requestedAt: "2026-06-24T12:30:00.000Z",
  });

  return approveRewardRequest(
    requestedApprovedReward,
    requestedApprovedReward.rewardRequests[1]!.id,
    "2026-06-24T13:00:00.000Z",
  );
}

function toPersistedRows(household: Household): PersistedHouseholdRows {
  return {
    childWins: household.childWins.map((win) => ({
      ...win,
      earnedAt: new Date(win.earnedAt),
      householdId: household.id,
    })),
    children: household.children.map((child) => ({
      createdAt: new Date(household.createdAt),
      householdId: household.id,
      id: child.id,
      name: child.name,
      pinHash: child.pinHash || "hash",
      pinSalt: child.pinSalt || "salt",
      pointBalance: child.pointBalance,
      role: "child" as const,
      sessionVersion: child.sessionVersion ?? 1,
      updatedAt: new Date(household.updatedAt),
    })),
    choreSubmissions: household.choreSubmissions.map((submission) => ({
      childId: submission.childId,
      choreId: submission.choreId,
      householdId: household.id,
      id: submission.id,
      occurrenceDate: submission.occurrenceDate,
      reviewedAt: submission.reviewedAt ? new Date(submission.reviewedAt) : null,
      status: submission.status,
      submittedAt: new Date(submission.submittedAt),
    })),
    chores: household.chores.map((chore) => ({
      childId: chore.childId,
      createdAt: new Date(chore.createdAt),
      dueDate: chore.dueDate,
      householdId: household.id,
      id: chore.id,
      pointValue: chore.pointValue,
      routineFrequency: chore.routine?.frequency ?? null,
      status: chore.status,
      title: chore.title,
      updatedAt: new Date(chore.updatedAt),
    })),
    goals: household.goals.map((goal) => ({
      childId: goal.childId,
      completedAt: goal.completedAt ? new Date(goal.completedAt) : null,
      createdAt: new Date(goal.createdAt),
      householdId: household.id,
      id: goal.id,
      pointValue: goal.pointValue,
      status: goal.status,
      title: goal.title,
      updatedAt: new Date(goal.updatedAt),
    })),
    household: {
      createdAt: new Date(household.createdAt),
      id: household.id,
      name: household.name,
      updatedAt: new Date(household.updatedAt),
    },
    parents: household.parents.map((parent) => ({
      authUserId: null,
      createdAt: new Date(household.createdAt),
      email: parent.email,
      householdId: household.id,
      id: parent.id,
      name: parent.name,
      role: "parent" as const,
    })),
    pointLedger: household.pointLedger.map((entry) => ({
      ...entry,
      createdAt: new Date(entry.createdAt),
      householdId: household.id,
    })),
    progressCheckIns: household.progressCheckIns.map((checkIn) => ({
      childId: checkIn.childId,
      goalId: checkIn.goalId,
      householdId: household.id,
      id: checkIn.id,
      reviewedAt: checkIn.reviewedAt ? new Date(checkIn.reviewedAt) : null,
      status: checkIn.status,
      submittedAt: new Date(checkIn.submittedAt),
    })),
    rewardContributions: household.rewardContributions.map((contribution) => ({
      childId: contribution.childId,
      createdAt: new Date(contribution.createdAt),
      householdId: household.id,
      id: contribution.id,
      points: contribution.points,
      requestId: contribution.requestId ?? null,
      rewardId: contribution.rewardId,
      status: contribution.status,
      updatedAt: new Date(contribution.updatedAt),
    })),
    rewardRequests: household.rewardRequests.map((request) => ({
      childId: request.childId,
      contributionPoints: request.contributionPoints,
      fulfilledAt: request.fulfilledAt ? new Date(request.fulfilledAt) : null,
      householdId: household.id,
      id: request.id,
      requestedAt: new Date(request.requestedAt),
      reservedPoints: request.reservedPoints,
      reviewedAt: request.reviewedAt ? new Date(request.reviewedAt) : null,
      rewardId: request.rewardId,
      status: request.status,
    })),
    rewards: household.rewards.map((reward) => ({
      createdAt: new Date(reward.createdAt),
      householdId: household.id,
      id: reward.id,
      pointCost: reward.pointCost,
      status: reward.status,
      title: reward.title,
      type: reward.type,
      updatedAt: new Date(reward.updatedAt),
    })),
    skippedChoreOccurrences: household.skippedChoreOccurrences.map((occurrence) => ({
      childId: occurrence.childId,
      choreId: occurrence.choreId,
      householdId: household.id,
      id: occurrence.id,
      occurrenceDate: occurrence.occurrenceDate,
      skippedAt: new Date(occurrence.skippedAt),
    })),
  };
}

function hydratePersistedRows(household: Household): Household {
  return mapPersistedHouseholdRows(toPersistedRows(household));
}

describe("ParentViewPage aggregation", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders Parent Today from the server-loaded Household snapshot", async () => {
    vi.setSystemTime(new Date("2026-06-24T18:00:00.000Z"));
    const household = hydratePersistedRows(await createAggregatedHousehold());

    const markup = renderToStaticMarkup(
      createElement(ParentViewPage, {
        initialHousehold: household,
        workflow: "today",
      }),
    );

    expect(markup).toContain("Needs Attention");
    expect(markup).toContain("Approval Queue Preview");
    expect(markup).toContain("Chores Needing Parent Handling");
    expect(markup).toContain("Reward Fulfillment Preview");
    expect(markup).toContain("Child Status");
    expect(markup).toContain("Review Approval Queue");
    expect(markup).toContain("/parent/approvals");
    expect(markup).toContain("Check Overdue Chores");
    expect(markup).toContain("/parent/chores");
    expect(markup).toContain("Fulfill Rewards");
    expect(markup).toContain("/parent/rewards");
    expect(markup).toContain("Pack lunch");
    expect(markup).toContain("Progress Check-in");
    expect(markup).toContain("Movie night");
    expect(markup).toContain("Water plants");
    expect(markup).toContain("Choose dinner");
    expect(markup).toContain("Ada");
  });

  it("renders Weekly Review summaries and empty states from the same Household snapshot", async () => {
    vi.setSystemTime(new Date("2026-06-24T18:00:00.000Z"));
    const household = hydratePersistedRows(await createAggregatedHousehold());

    const markup = renderToStaticMarkup(
      createElement(ParentViewPage, {
        initialHousehold: household,
        workflow: "weekly-review",
      }),
    );

    expect(markup).toContain("Weekly Review");
    expect(markup).toContain("Pending Reward Requests");
    expect(markup).toContain("Movie night");
    expect(markup).toContain("Unfulfilled Rewards");
    expect(markup).toContain("Choose dinner");
    expect(markup).toContain("Child Progress");
    expect(markup).toContain("Ada");
    expect(markup).toContain("No synced Events in the upcoming week.");
  });

  it("keeps Parent Today and Weekly Review empty states useful for an empty persisted Household", async () => {
    vi.setSystemTime(new Date("2026-06-24T18:00:00.000Z"));
    const household = hydratePersistedRows(
      await createHousehold({
        children: [{ name: "Ada", pin: "1234" }],
        householdName: "Clozcasa",
        parents: [{ email: "first@example.com", name: "First" }],
      }),
    );

    const todayMarkup = renderToStaticMarkup(
      createElement(ParentViewPage, {
        initialHousehold: household,
        workflow: "today",
      }),
    );
    const weeklyMarkup = renderToStaticMarkup(
      createElement(ParentViewPage, {
        initialHousehold: household,
        workflow: "weekly-review",
      }),
    );

    expect(todayMarkup).toContain("No Suggested Actions right now.");
    expect(todayMarkup).toContain("Nothing is waiting for approval.");
    expect(todayMarkup).toContain("No Chores need Parent handling.");
    expect(todayMarkup).toContain("No Rewards are waiting for fulfillment.");
    expect(weeklyMarkup).toContain("No synced Events in the upcoming week.");
    expect(weeklyMarkup).toContain("No Reward Requests waiting.");
    expect(weeklyMarkup).toContain("No Rewards need fulfillment.");
  });
});
