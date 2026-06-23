import { describe, expect, it } from "vitest";

import { createHousehold } from "./household";
import {
  approveChoreSubmissions,
  archiveChore,
  createChore,
  getApprovalQueue,
  getChildChoreBoard,
  getChildPointLedger,
  getChildWins,
  markChoreSubmissionNeedsWork,
  pauseChore,
  skipChoreOccurrence,
  submitChore,
} from "./chores";

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

describe("Chores", () => {
  it("lets a Parent create a one-time Chore for one Child", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;

    const updated = createChore(household, {
      title: "Unload dishwasher",
      childId: child.id,
      pointValue: 3,
      dueDate: "2026-06-23",
      routine: null,
    });

    expect(updated.chores).toHaveLength(1);
    expect(updated.chores[0]).toMatchObject({
      title: "Unload dishwasher",
      childId: child.id,
      pointValue: 3,
      dueDate: "2026-06-23",
      routine: null,
      status: "active",
    });
  });

  it("shows today's one-time Chores before upcoming Chores", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withToday = createChore(household, {
      title: "Feed plants",
      childId: child.id,
      pointValue: 2,
      dueDate: "2026-06-23",
      routine: null,
    });
    const withUpcoming = createChore(withToday, {
      title: "Clean desk",
      childId: child.id,
      pointValue: 4,
      dueDate: "2026-06-25",
      routine: null,
    });

    const board = getChildChoreBoard(withUpcoming, child.id, "2026-06-23");

    expect(board.today.map((chore) => chore.title)).toEqual(["Feed plants"]);
    expect(board.upcoming.map((chore) => chore.title)).toEqual(["Clean desk"]);
  });

  it("creates recurring Chore occurrences from the Chore Routine", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const updated = createChore(household, {
      title: "Practice piano",
      childId: child.id,
      pointValue: 5,
      dueDate: "2026-06-22",
      routine: { frequency: "daily" },
    });

    const board = getChildChoreBoard(updated, child.id, "2026-06-23");

    expect(board.today).toEqual([
      expect.objectContaining({
        title: "Practice piano",
        dueDate: "2026-06-23",
        routineLabel: "Daily",
      }),
    ]);
    expect(board.overdue).toEqual([
      expect.objectContaining({
        title: "Practice piano",
        dueDate: "2026-06-22",
      }),
    ]);
  });

  it("only lets a Child submit their own due or Overdue Chore", async () => {
    const household = await createTestHousehold();
    const ada = household.children[0]!;
    const grace = household.children[1]!;
    const updated = createChore(household, {
      title: "Take out recycling",
      childId: ada.id,
      pointValue: 2,
      dueDate: "2026-06-22",
      routine: null,
    });
    const chore = updated.chores[0]!;

    expect(() =>
      submitChore(updated, {
        childId: grace.id,
        choreId: chore.id,
        occurrenceDate: "2026-06-22",
        submittedAt: "2026-06-23T12:00:00.000Z",
        today: "2026-06-23",
      }),
    ).toThrow("This Chore is not assigned to this Child.");

    const submitted = submitChore(updated, {
      childId: ada.id,
      choreId: chore.id,
      occurrenceDate: "2026-06-22",
      submittedAt: "2026-06-23T12:00:00.000Z",
      today: "2026-06-23",
    });

    expect(submitted.choreSubmissions).toEqual([
      expect.objectContaining({
        choreId: chore.id,
        childId: ada.id,
        occurrenceDate: "2026-06-22",
        status: "pending",
      }),
    ]);
  });

  it("moves submitted Chores into pending review and keeps missed Chores Overdue", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withSubmitted = createChore(household, {
      title: "Pack backpack",
      childId: child.id,
      pointValue: 1,
      dueDate: "2026-06-22",
      routine: null,
    });
    const withMissed = createChore(withSubmitted, {
      title: "Water garden",
      childId: child.id,
      pointValue: 2,
      dueDate: "2026-06-21",
      routine: null,
    });
    const submitted = submitChore(withMissed, {
      childId: child.id,
      choreId: withMissed.chores[0]!.id,
      occurrenceDate: "2026-06-22",
      submittedAt: "2026-06-23T12:00:00.000Z",
      today: "2026-06-23",
    });

    const board = getChildChoreBoard(submitted, child.id, "2026-06-23");

    expect(board.pendingReview.map((chore) => chore.title)).toEqual([
      "Pack backpack",
    ]);
    expect(board.overdue.map((chore) => chore.title)).toEqual(["Water garden"]);
  });

  it("shows pending Chore Submissions in one Approval Queue", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withChore = createChore(household, {
      title: "Pack lunch",
      childId: child.id,
      pointValue: 2,
      dueDate: "2026-06-23",
      routine: null,
    });
    const submitted = submitChore(withChore, {
      childId: child.id,
      choreId: withChore.chores[0]!.id,
      occurrenceDate: "2026-06-23",
      submittedAt: "2026-06-23T12:00:00.000Z",
      today: "2026-06-23",
    });

    expect(getApprovalQueue(submitted)).toEqual([
      expect.objectContaining({
        type: "chore_submission",
        childName: "Ada",
        title: "Pack lunch",
        pointValue: 2,
        occurrenceDate: "2026-06-23",
      }),
    ]);
  });

  it("batch approves Chore Submissions, awards Points, and records ledger entries and Wins", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withFirst = createChore(household, {
      title: "Make bed",
      childId: child.id,
      pointValue: 1,
      dueDate: "2026-06-23",
      routine: null,
    });
    const withSecond = createChore(withFirst, {
      title: "Sweep porch",
      childId: child.id,
      pointValue: 4,
      dueDate: "2026-06-23",
      routine: null,
    });
    const firstSubmission = submitChore(withSecond, {
      childId: child.id,
      choreId: withSecond.chores[0]!.id,
      occurrenceDate: "2026-06-23",
      submittedAt: "2026-06-23T12:00:00.000Z",
      today: "2026-06-23",
    });
    const secondSubmission = submitChore(firstSubmission, {
      childId: child.id,
      choreId: withSecond.chores[1]!.id,
      occurrenceDate: "2026-06-23",
      submittedAt: "2026-06-23T12:05:00.000Z",
      today: "2026-06-23",
    });

    const approved = approveChoreSubmissions(
      secondSubmission,
      secondSubmission.choreSubmissions.map((submission) => submission.id),
      "2026-06-23T13:00:00.000Z",
    );

    expect(approved.children[0]!.pointBalance).toBe(5);
    expect(getApprovalQueue(approved)).toEqual([]);
    expect(getChildPointLedger(approved, child.id)).toEqual([
      expect.objectContaining({
        delta: 1,
        description: "Approved Chore: Make bed",
      }),
      expect.objectContaining({
        delta: 4,
        description: "Approved Chore: Sweep porch",
      }),
    ]);
    expect(getChildWins(approved, child.id).map((win) => win.title)).toEqual([
      "Make bed",
      "Sweep porch",
    ]);
  });

  it("marks a Chore Submission Needs Work without awarding Points", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withChore = createChore(household, {
      title: "Fold towels",
      childId: child.id,
      pointValue: 3,
      dueDate: "2026-06-23",
      routine: null,
    });
    const submitted = submitChore(withChore, {
      childId: child.id,
      choreId: withChore.chores[0]!.id,
      occurrenceDate: "2026-06-23",
      submittedAt: "2026-06-23T12:00:00.000Z",
      today: "2026-06-23",
    });

    const needsWork = markChoreSubmissionNeedsWork(
      submitted,
      submitted.choreSubmissions[0]!.id,
      "2026-06-23T13:00:00.000Z",
    );

    expect(needsWork.children[0]!.pointBalance).toBe(0);
    expect(needsWork.choreSubmissions[0]).toMatchObject({
      status: "needs_work",
    });
    expect(getApprovalQueue(needsWork)).toEqual([]);
    expect(getChildPointLedger(needsWork, child.id)).toEqual([]);
  });

  it("skips a Chore occurrence without awarding Points", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withChore = createChore(household, {
      title: "Take trash bins in",
      childId: child.id,
      pointValue: 2,
      dueDate: "2026-06-22",
      routine: null,
    });
    const submitted = submitChore(withChore, {
      childId: child.id,
      choreId: withChore.chores[0]!.id,
      occurrenceDate: "2026-06-22",
      submittedAt: "2026-06-23T12:00:00.000Z",
      today: "2026-06-23",
    });

    const skipped = skipChoreOccurrence(
      submitted,
      {
        childId: child.id,
        choreId: submitted.chores[0]!.id,
        occurrenceDate: "2026-06-22",
      },
      "2026-06-23T13:00:00.000Z",
    );

    expect(skipped.children[0]!.pointBalance).toBe(0);
    expect(getChildPointLedger(skipped, child.id)).toEqual([]);
    expect(getApprovalQueue(skipped)).toEqual([]);
    expect(skipped.choreSubmissions[0]).toMatchObject({ status: "pending" });
    expect(getChildChoreBoard(skipped, child.id, "2026-06-23").overdue).toEqual(
      [],
    );
  });

  it("pauses expected Chore occurrences and archives inactive Chores", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withDaily = createChore(household, {
      title: "Read",
      childId: child.id,
      pointValue: 2,
      dueDate: "2026-06-23",
      routine: { frequency: "daily" },
    });

    expect(() =>
      archiveChore(
        withDaily,
        withDaily.chores[0]!.id,
        "2026-06-23T12:00:00.000Z",
      ),
    ).toThrow("Pause a Chore before archiving it.");

    const paused = pauseChore(
      withDaily,
      withDaily.chores[0]!.id,
      "2026-06-23T13:00:00.000Z",
    );
    expect(paused.chores[0]).toMatchObject({ status: "paused" });
    expect(getChildChoreBoard(paused, child.id, "2026-06-23").today).toEqual([]);

    const archived = archiveChore(
      paused,
      paused.chores[0]!.id,
      "2026-06-23T14:00:00.000Z",
    );
    expect(archived.chores[0]).toMatchObject({ status: "archived" });
    expect(getChildChoreBoard(archived, child.id, "2026-06-23").today).toEqual(
      [],
    );
  });
});
