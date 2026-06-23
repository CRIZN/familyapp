import { describe, expect, it } from "vitest";

import {
  configureAppleCalendar,
  syncAppleCalendarEvents,
} from "./calendar";
import { createChore, submitChore } from "./chores";
import {
  approveProgressCheckIns,
  completeGoal,
  createGoal,
  submitProgressCheckIn,
} from "./goals";
import { createHousehold, type Household } from "./household";
import {
  approveRewardRequest,
  createReward,
  requestReward,
} from "./rewards";
import { getParentWeeklyReview } from "./weekly-review";

async function createTestHousehold() {
  return createHousehold({
    householdName: "Clozcasa",
    parents: [{ name: "Matt", email: "matt@example.com" }],
    children: [
      { name: "Ada", pin: "1234" },
      { name: "Grace", pin: "9876" },
    ],
  });
}

function givePoints(household: Household, childId: string, points: number) {
  return {
    ...household,
    children: household.children.map((child) =>
      child.id === childId ? { ...child, pointBalance: points } : child,
    ),
  };
}

describe("Parent Weekly Review", () => {
  it("summarizes the upcoming week across Events, child progress, and Rewards", async () => {
    const household = await createTestHousehold();
    const ada = household.children[0]!;
    const grace = household.children[1]!;
    const configured = configureAppleCalendar(household, {
      calendarName: "Family",
      sourceUrl: "webcal://example.test/family.ics",
    });
    const withEvents = syncAppleCalendarEvents(configured, [
      {
        appleEventId: "apple-today",
        title: "Piano lesson",
        startsAt: "2026-06-23T17:00:00.000Z",
        endsAt: "2026-06-23T18:00:00.000Z",
      },
      {
        appleEventId: "apple-weekend",
        title: "Tournament",
        startsAt: "2026-06-28T15:00:00.000Z",
        endsAt: "2026-06-28T18:00:00.000Z",
      },
      {
        appleEventId: "apple-next-week",
        title: "Camp starts",
        startsAt: "2026-06-30T15:00:00.000Z",
        endsAt: "2026-06-30T18:00:00.000Z",
      },
    ]);
    const withOverdueChore = createChore(withEvents, {
      title: "Water plants",
      childId: ada.id,
      pointValue: 2,
      dueDate: "2026-06-22",
      routine: null,
    });
    const withWeeklyChore = createChore(withOverdueChore, {
      title: "Take bins out",
      childId: ada.id,
      pointValue: 3,
      dueDate: "2026-06-26",
      routine: null,
    });
    const withPendingChore = createChore(withWeeklyChore, {
      title: "Pack lunch",
      childId: grace.id,
      pointValue: 1,
      dueDate: "2026-06-23",
      routine: null,
    });
    const submittedChore = submitChore(withPendingChore, {
      childId: grace.id,
      choreId: withPendingChore.chores[2]!.id,
      occurrenceDate: "2026-06-23",
      submittedAt: "2026-06-23T12:00:00.000Z",
      today: "2026-06-23",
    });
    const withAdaGoal = createGoal(submittedChore, {
      title: "Read three chapters",
      childId: ada.id,
      pointValue: 5,
    });
    const withGraceGoal = createGoal(withAdaGoal, {
      title: "Practice scales",
      childId: grace.id,
      pointValue: 3,
    });
    const withCheckIn = submitProgressCheckIn(withGraceGoal, {
      childId: grace.id,
      goalId: withGraceGoal.goals[1]!.id,
      submittedAt: "2026-06-23T12:10:00.000Z",
    });
    const approvedCheckIn = approveProgressCheckIns(
      withCheckIn,
      [withCheckIn.progressCheckIns[0]!.id],
      "2026-06-23T13:00:00.000Z",
    );
    const completedGoal = completeGoal(
      approvedCheckIn,
      approvedCheckIn.goals[1]!.id,
      "2026-06-23T14:00:00.000Z",
    );
    const funded = givePoints(completedGoal, ada.id, 30);
    const withReward = createReward(funded, {
      title: "Movie night",
      pointCost: 8,
      type: "experience",
    });
    const pendingReward = requestReward(withReward, {
      childId: ada.id,
      rewardId: withReward.rewards[0]!.id,
      requestedAt: "2026-06-23T15:00:00.000Z",
    });
    const withSecondReward = createReward(pendingReward, {
      title: "Choose dinner",
      pointCost: 6,
      type: "privilege",
    });
    const secondRequest = requestReward(withSecondReward, {
      childId: ada.id,
      rewardId: withSecondReward.rewards[1]!.id,
      requestedAt: "2026-06-23T15:30:00.000Z",
    });
    const approvedReward = approveRewardRequest(
      secondRequest,
      secondRequest.rewardRequests[1]!.id,
      "2026-06-23T16:00:00.000Z",
    );

    const review = getParentWeeklyReview(approvedReward, "2026-06-23");

    expect(review.startsOn).toBe("2026-06-23");
    expect(review.endsOn).toBe("2026-06-29");
    expect(review.eventDays.map((day) => day.date)).toEqual([
      "2026-06-23",
      "2026-06-28",
    ]);
    expect(
      review.eventDays.flatMap((day) =>
        day.events.map((event) => event.title),
      ),
    ).toEqual(["Piano lesson", "Tournament"]);
    expect(review.childSummaries).toEqual([
      expect.objectContaining({
        childName: "Ada",
        pointBalance: 16,
        chores: {
          dueThisWeek: 1,
          overdue: 1,
          pendingReview: 0,
        },
        goals: {
          active: 1,
          pendingCheckIns: 0,
          needsWorkCheckIns: 0,
          completed: 0,
        },
        rewardRequests: {
          pending: 1,
          unfulfilled: 1,
        },
      }),
      expect.objectContaining({
        childName: "Grace",
        pointBalance: 3,
        chores: {
          dueThisWeek: 0,
          overdue: 0,
          pendingReview: 1,
        },
        goals: {
          active: 0,
          pendingCheckIns: 0,
          needsWorkCheckIns: 0,
          completed: 1,
        },
        rewardRequests: {
          pending: 0,
          unfulfilled: 0,
        },
      }),
    ]);
    expect(review.pendingRewardRequests).toEqual([
      expect.objectContaining({
        childName: "Ada",
        title: "Movie night",
        points: 8,
      }),
    ]);
    expect(review.unfulfilledRewards).toEqual([
      expect.objectContaining({
        childName: "Ada",
        title: "Choose dinner",
        points: 6,
      }),
    ]);
  });

  it("returns empty Weekly Review sections when the week is clear", async () => {
    const household = await createTestHousehold();

    const review = getParentWeeklyReview(household, "2026-06-23");

    expect(review.eventDays).toEqual([]);
    expect(review.pendingRewardRequests).toEqual([]);
    expect(review.unfulfilledRewards).toEqual([]);
    expect(review.childSummaries).toEqual([
      expect.objectContaining({
        childName: "Ada",
        pointBalance: 0,
        chores: {
          dueThisWeek: 0,
          overdue: 0,
          pendingReview: 0,
        },
        goals: {
          active: 0,
          pendingCheckIns: 0,
          needsWorkCheckIns: 0,
          completed: 0,
        },
        rewardRequests: {
          pending: 0,
          unfulfilled: 0,
        },
      }),
      expect.objectContaining({
        childName: "Grace",
        pointBalance: 0,
      }),
    ]);
  });
});
