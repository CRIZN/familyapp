import { describe, expect, it } from "vitest";

import {
  configureAppleCalendar,
  getChildAgenda,
  syncAppleCalendarEvents,
  updateEventParticipants,
} from "./calendar";
import {
  approveChoreSubmissions,
  createChore,
  getApprovalQueue,
  getChildChoreBoard,
  getChildPointLedger,
  getChildWins,
  submitChore,
} from "./chores";
import { getParentBriefing } from "./briefing";
import { getParentWeeklyReview } from "./weekly-review";
import {
  approveProgressCheckIns,
  createGoal,
  getChildGoalBoard,
  submitProgressCheckIn,
} from "./goals";
import { createHousehold, getChildView, startChildSession } from "./household";
import { getPointLedgerDisplay } from "./points";
import {
  approveRewardRequest,
  createReward,
  fulfillRewardRequest,
  getChildRewardBoard,
  requestReward,
} from "./rewards";

describe("v1 smoke path", () => {
  it("supports the core Parent and Child happy path from setup through reward fulfillment", async () => {
    const today = "2026-06-23";
    const childPin = "2468";
    let household = await createHousehold({
      householdName: "River Household",
      parents: [{ name: "Avery", email: "avery@example.com" }],
      children: [{ name: "Mika", pin: childPin }],
    });
    const childId = household.children[0].id;

    const session = await startChildSession(household, childId, childPin);
    expect(session.childName).toBe("Mika");
    expect(getChildView(household, childId).child.pointBalance).toBe(0);

    household = configureAppleCalendar(household, {
      calendarName: "Family",
      sourceUrl: "webcal://p01-caldav.icloud.com/published/2/family",
    });
    household = syncAppleCalendarEvents(household, [
      {
        appleEventId: "apple-soccer-practice",
        title: "Soccer practice",
        startsAt: `${today}T16:00:00.000Z`,
        endsAt: `${today}T17:00:00.000Z`,
        location: "Field 2",
      },
    ]);
    household = updateEventParticipants(household, {
      eventId: household.calendarEvents[0].id,
      participantChildIds: [childId],
      isAllHousehold: false,
    });
    expect(getChildAgenda(household, childId)[0].events[0].title).toBe(
      "Soccer practice",
    );

    household = createChore(household, {
      title: "Unload dishwasher",
      childId,
      pointValue: 3,
      dueDate: today,
      routine: null,
    });
    const choreId = household.chores[0].id;
    expect(getChildChoreBoard(household, childId, today).today).toHaveLength(1);

    household = submitChore(household, {
      childId,
      choreId,
      occurrenceDate: today,
      today,
      submittedAt: `${today}T18:00:00.000Z`,
    });
    let queue = getApprovalQueue(household);
    expect(queue.map((item) => item.type)).toEqual(["chore_submission"]);

    household = approveChoreSubmissions(
      household,
      [queue[0].id],
      `${today}T18:05:00.000Z`,
    );
    expect(getChildView(household, childId).child.pointBalance).toBe(3);

    household = createGoal(household, {
      title: "Read three chapters",
      childId,
      pointValue: 2,
    });
    const goalId = household.goals[0].id;
    household = submitProgressCheckIn(household, {
      childId,
      goalId,
      submittedAt: `${today}T19:00:00.000Z`,
    });
    queue = getApprovalQueue(household);
    expect(queue.map((item) => item.type)).toEqual(["progress_check_in"]);

    household = approveProgressCheckIns(
      household,
      [queue[0].id],
      `${today}T19:05:00.000Z`,
    );
    expect(getChildGoalBoard(household, childId).active[0].awardedPoints).toBe(
      1,
    );
    expect(getChildView(household, childId).child.pointBalance).toBe(4);

    household = createReward(household, {
      title: "Allowance payout",
      pointCost: 4,
      type: "allowance",
    });
    const rewardId = household.rewards[0].id;
    expect(getChildRewardBoard(household, childId).catalog[0].remainingPoints).toBe(
      4,
    );

    household = requestReward(household, {
      childId,
      rewardId,
      requestedAt: `${today}T20:00:00.000Z`,
    });
    queue = getApprovalQueue(household);
    expect(queue.map((item) => item.type)).toEqual(["reward_request"]);
    expect(getParentBriefing(household, today).approvalSummary.rewardRequests).toBe(
      1,
    );
    expect(
      getParentWeeklyReview(household, today).pendingRewardRequests,
    ).toHaveLength(1);

    household = approveRewardRequest(
      household,
      queue[0].id,
      `${today}T20:05:00.000Z`,
    );
    expect(getChildRewardBoard(household, childId).approvedRequests).toHaveLength(
      1,
    );

    household = fulfillRewardRequest(
      household,
      queue[0].id,
      `${today}T20:10:00.000Z`,
    );
    expect(getChildRewardBoard(household, childId).fulfilledRequests).toHaveLength(
      1,
    );

    const ledgerLabels = getChildPointLedger(household, childId).map(
      (entry) => getPointLedgerDisplay(entry).label,
    );
    expect(ledgerLabels).toEqual([
      "Chore",
      "Progress Check-in",
      "Reward Request",
      "Reward Approved",
    ]);
    expect(getChildWins(household, childId).map((win) => win.sourceType)).toEqual(
      ["chore", "progress_check_in", "reward"],
    );
  });
});
