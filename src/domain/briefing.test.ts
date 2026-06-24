import { describe, expect, it } from "vitest";

import {
  configureAppleCalendar,
  syncAppleCalendarEvents,
} from "./calendar";
import { createChore, submitChore } from "./chores";
import { createGoal, submitProgressCheckIn } from "./goals";
import { createHousehold, type Household } from "./household";
import { getParentBriefing } from "./briefing";
import {
  approveRewardRequest,
  createReward,
  requestReward,
} from "./rewards";

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

describe("Parent Briefing", () => {
  it("shows today and tomorrow Events and summarizes items that need attention", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const configured = configureAppleCalendar(household, {
      calendarName: "Family",
      sourceUrl: "webcal://example.test/family.ics",
    });
    const withEvents = syncAppleCalendarEvents(configured, [
      {
        appleEventId: "apple-yesterday",
        title: "Yesterday appointment",
        startsAt: "2026-06-22T15:00:00.000Z",
        endsAt: "2026-06-22T16:00:00.000Z",
      },
      {
        appleEventId: "apple-today",
        title: "Piano lesson",
        startsAt: "2026-06-23T17:00:00.000Z",
        endsAt: "2026-06-23T18:00:00.000Z",
      },
      {
        appleEventId: "apple-tomorrow",
        title: "Soccer practice",
        startsAt: "2026-06-24T21:00:00.000Z",
        endsAt: "2026-06-24T22:00:00.000Z",
      },
      {
        appleEventId: "apple-later",
        title: "Weekend trip",
        startsAt: "2026-06-27T16:00:00.000Z",
        endsAt: "2026-06-27T17:00:00.000Z",
      },
    ]);
    const withOverdue = createChore(withEvents, {
      title: "Water plants",
      childId: child.id,
      pointValue: 2,
      dueDate: "2026-06-22",
      routine: null,
    });
    const withSubmittedChore = createChore(withOverdue, {
      title: "Pack lunch",
      childId: child.id,
      pointValue: 1,
      dueDate: "2026-06-23",
      routine: null,
    });
    const submittedChore = submitChore(withSubmittedChore, {
      childId: child.id,
      choreId: withSubmittedChore.chores[1]!.id,
      occurrenceDate: "2026-06-23",
      submittedAt: "2026-06-23T12:00:00.000Z",
      today: "2026-06-23",
    });
    const withGoal = createGoal(submittedChore, {
      title: "Read three chapters",
      childId: child.id,
      pointValue: 5,
    });
    const submittedCheckIn = submitProgressCheckIn(withGoal, {
      childId: child.id,
      goalId: withGoal.goals[0]!.id,
      submittedAt: "2026-06-23T12:10:00.000Z",
    });
    const funded = givePoints(submittedCheckIn, child.id, 30);
    const withRewardRequest = createReward(funded, {
      title: "Movie night",
      pointCost: 8,
      type: "experience",
    });
    const pendingReward = requestReward(withRewardRequest, {
      childId: child.id,
      rewardId: withRewardRequest.rewards[0]!.id,
      requestedAt: "2026-06-23T12:20:00.000Z",
    });
    const withApprovedReward = createReward(pendingReward, {
      title: "Choose dinner",
      pointCost: 6,
      type: "privilege",
    });
    const secondRewardRequest = requestReward(withApprovedReward, {
      childId: child.id,
      rewardId: withApprovedReward.rewards[1]!.id,
      requestedAt: "2026-06-23T12:30:00.000Z",
    });
    const approvedReward = approveRewardRequest(
      secondRewardRequest,
      secondRewardRequest.rewardRequests[1]!.id,
      "2026-06-23T13:00:00.000Z",
    );

    const briefing = getParentBriefing(approvedReward, "2026-06-23");

    expect(briefing.eventDays.map((day) => day.date)).toEqual([
      "2026-06-23",
      "2026-06-24",
    ]);
    expect(
      briefing.eventDays.flatMap((day) =>
        day.events.map((event) => event.title),
      ),
    ).toEqual(["Piano lesson", "Soccer practice"]);
    expect(briefing.approvalSummary).toEqual({
      total: 3,
      choreSubmissions: 1,
      progressCheckIns: 1,
      rewardRequests: 1,
    });
    expect(briefing.overdueChores).toEqual([
      expect.objectContaining({
        childName: "Ada",
        title: "Water plants",
        dueDate: "2026-06-22",
      }),
    ]);
    expect(briefing.unfulfilledRewards).toEqual([
      expect.objectContaining({
        childName: "Ada",
        title: "Choose dinner",
        points: 6,
      }),
    ]);
    expect(briefing.suggestedActions.map((action) => action.id)).toEqual([
      "review-approval-queue",
      "handle-overdue-chores",
      "fulfill-rewards",
    ]);
    expect(briefing.suggestedActions.map((action) => action.href)).toEqual([
      "/parent/approvals",
      "/parent/chores",
      "/parent/rewards",
    ]);
  });

  it("returns an empty Briefing when nothing needs attention", async () => {
    const household = await createTestHousehold();

    const briefing = getParentBriefing(household, "2026-06-23");

    expect(briefing.eventDays).toEqual([]);
    expect(briefing.approvalSummary.total).toBe(0);
    expect(briefing.overdueChores).toEqual([]);
    expect(briefing.unfulfilledRewards).toEqual([]);
    expect(briefing.suggestedActions).toEqual([]);
  });
});
