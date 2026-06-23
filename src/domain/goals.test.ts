import { describe, expect, it } from "vitest";

import { getApprovalQueue, getChildPointLedger, getChildWins } from "./chores";
import {
  approveProgressCheckIns,
  archiveGoal,
  completeGoal,
  createGoal,
  getChildGoalBoard,
  markProgressCheckInNeedsWork,
  submitProgressCheckIn,
} from "./goals";
import { createHousehold } from "./household";

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

describe("Goals", () => {
  it("lets a Parent create and Archive a Goal for one Child", async () => {
    const household = await createTestHousehold();
    const ada = household.children[0]!;
    const grace = household.children[1]!;

    expect(() =>
      createGoal(household, {
        title: "Read three books",
        childId: "missing-child",
        pointValue: 10,
      }),
    ).toThrow("Child not found in this Household.");

    const withGoal = createGoal(household, {
      title: "Read three books",
      childId: ada.id,
      pointValue: 10,
    });

    expect(withGoal.goals).toEqual([
      expect.objectContaining({
        title: "Read three books",
        childId: ada.id,
        pointValue: 10,
        status: "active",
      }),
    ]);
    expect(
      getChildGoalBoard(withGoal, grace.id).active.map((goal) => goal.title),
    ).toEqual([]);

    const archived = archiveGoal(
      withGoal,
      withGoal.goals[0]!.id,
      "2026-06-23T12:00:00.000Z",
    );

    expect(archived.goals[0]).toMatchObject({ status: "archived" });
    expect(getChildGoalBoard(archived, ada.id).active).toEqual([]);
  });

  it("lets a Child submit a Progress Check-in for an active Goal", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withGoal = createGoal(household, {
      title: "Practice free throws",
      childId: child.id,
      pointValue: 5,
    });

    const submitted = submitProgressCheckIn(withGoal, {
      childId: child.id,
      goalId: withGoal.goals[0]!.id,
      submittedAt: "2026-06-23T12:00:00.000Z",
    });

    expect(submitted.progressCheckIns).toEqual([
      expect.objectContaining({
        goalId: withGoal.goals[0]!.id,
        childId: child.id,
        status: "pending",
      }),
    ]);
    expect(getChildGoalBoard(submitted, child.id).pendingReview).toEqual([
      expect.objectContaining({ title: "Practice free throws" }),
    ]);
    expect(() =>
      submitProgressCheckIn(submitted, {
        childId: child.id,
        goalId: withGoal.goals[0]!.id,
      }),
    ).toThrow("This Goal is already waiting for Parent review.");
  });

  it("shows Progress Check-ins as distinct Approval Queue items", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withGoal = createGoal(household, {
      title: "Learn fractions",
      childId: child.id,
      pointValue: 4,
    });
    const submitted = submitProgressCheckIn(withGoal, {
      childId: child.id,
      goalId: withGoal.goals[0]!.id,
      submittedAt: "2026-06-23T12:00:00.000Z",
    });

    expect(getApprovalQueue(submitted)).toEqual([
      expect.objectContaining({
        type: "progress_check_in",
        childName: "Ada",
        title: "Learn fractions",
        pointValue: 4,
        awardedPoints: 1,
      }),
    ]);
  });

  it("approves Progress Check-ins, awards Points, and records ledger entries and Wins", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withGoal = createGoal(household, {
      title: "Ride without training wheels",
      childId: child.id,
      pointValue: 6,
    });
    const submitted = submitProgressCheckIn(withGoal, {
      childId: child.id,
      goalId: withGoal.goals[0]!.id,
      submittedAt: "2026-06-23T12:00:00.000Z",
    });

    const approved = approveProgressCheckIns(
      submitted,
      [submitted.progressCheckIns[0]!.id],
      "2026-06-23T13:00:00.000Z",
    );

    expect(approved.children[0]!.pointBalance).toBe(1);
    expect(getApprovalQueue(approved)).toEqual([]);
    expect(getChildPointLedger(approved, child.id)).toEqual([
      expect.objectContaining({
        delta: 1,
        description: "Approved Progress Check-in: Ride without training wheels",
        sourceType: "progress_check_in_approval",
      }),
    ]);
    expect(getChildWins(approved, child.id)).toEqual([
      expect.objectContaining({
        title: "Ride without training wheels",
        sourceType: "progress_check_in",
      }),
    ]);
    expect(getChildGoalBoard(approved, child.id).active[0]).toMatchObject({
      awardedPoints: 1,
      remainingPoints: 5,
    });
  });

  it("marks Progress Check-ins Needs Work without awarding Points", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withGoal = createGoal(household, {
      title: "Write a short story",
      childId: child.id,
      pointValue: 5,
    });
    const submitted = submitProgressCheckIn(withGoal, {
      childId: child.id,
      goalId: withGoal.goals[0]!.id,
      submittedAt: "2026-06-23T12:00:00.000Z",
    });

    const needsWork = markProgressCheckInNeedsWork(
      submitted,
      submitted.progressCheckIns[0]!.id,
      "2026-06-23T13:00:00.000Z",
    );

    expect(needsWork.children[0]!.pointBalance).toBe(0);
    expect(needsWork.progressCheckIns[0]).toMatchObject({
      status: "needs_work",
    });
    expect(getApprovalQueue(needsWork)).toEqual([]);
    expect(getChildPointLedger(needsWork, child.id)).toEqual([]);
    expect(getChildGoalBoard(needsWork, child.id).needsWork).toEqual([
      expect.objectContaining({ title: "Write a short story" }),
    ]);
  });

  it("completes a Goal, awards remaining Points, and records a Win", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withGoal = createGoal(household, {
      title: "Memorize recital piece",
      childId: child.id,
      pointValue: 5,
    });
    const submitted = submitProgressCheckIn(withGoal, {
      childId: child.id,
      goalId: withGoal.goals[0]!.id,
      submittedAt: "2026-06-23T12:00:00.000Z",
    });
    const approved = approveProgressCheckIns(
      submitted,
      [submitted.progressCheckIns[0]!.id],
      "2026-06-23T13:00:00.000Z",
    );

    const completed = completeGoal(
      approved,
      approved.goals[0]!.id,
      "2026-06-24T12:00:00.000Z",
    );

    expect(completed.children[0]!.pointBalance).toBe(5);
    expect(completed.goals[0]).toMatchObject({ status: "completed" });
    expect(getChildPointLedger(completed, child.id)).toEqual([
      expect.objectContaining({
        delta: 1,
        description: "Approved Progress Check-in: Memorize recital piece",
      }),
      expect.objectContaining({
        delta: 4,
        description: "Goal Completion: Memorize recital piece",
        sourceType: "goal_completion",
      }),
    ]);
    expect(getChildWins(completed, child.id).map((win) => win.sourceType)).toEqual(
      ["progress_check_in", "goal"],
    );
  });

  it("removes unfinished Progress Check-ins from Child View after Goal Completion", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withGoal = createGoal(household, {
      title: "Finish science project",
      childId: child.id,
      pointValue: 3,
    });
    const submitted = submitProgressCheckIn(withGoal, {
      childId: child.id,
      goalId: withGoal.goals[0]!.id,
      submittedAt: "2026-06-23T12:00:00.000Z",
    });

    const completed = completeGoal(
      submitted,
      submitted.goals[0]!.id,
      "2026-06-23T13:00:00.000Z",
    );

    expect(getApprovalQueue(completed)).toEqual([]);
    expect(getChildGoalBoard(completed, child.id).pendingReview).toEqual([]);
  });
});
