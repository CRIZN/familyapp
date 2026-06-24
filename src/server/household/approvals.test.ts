import { describe, expect, it, vi } from "vitest";

import {
  createChore,
  submitChore,
  type SkippedChoreOccurrence,
} from "@/domain/chores";
import { createHousehold, type Household } from "@/domain/household";

import {
  approveChoreSubmissionsForParent,
  markChoreSubmissionNeedsWorkForParent,
  skipChoreOccurrenceForParent,
  type ChoreApprovalPersistence,
  type HouseholdApprovalRepository,
} from "./approvals";

describe("Household approval persistence", () => {
  it("approves pending Chore Submissions with balance, ledger, and wins persistence", async () => {
    const household = await createHouseholdWithSubmittedChore();
    const submission = household.choreSubmissions[0]!;
    const approveChoreSubmissions = vi.fn(
      async (_householdId: string, input: ChoreApprovalPersistence) => ({
        ...household,
        children: household.children.map((child) =>
          child.id === input.balanceChanges[0]?.childId
            ? {
                ...child,
                pointBalance: child.pointBalance + input.balanceChanges[0]!.delta,
              }
            : child,
        ),
        choreSubmissions: household.choreSubmissions.map((candidate) =>
          candidate.id === submission.id
            ? { ...candidate, status: "approved" as const }
            : candidate,
        ),
        childWins: input.childWins,
        pointLedger: input.pointLedger,
      }),
    );

    const result = await approveChoreSubmissionsForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, { approveChoreSubmissions }),
      },
      { submissionIds: [submission.id] },
    );

    expect(result.status).toBe("ok");
    expect(approveChoreSubmissions).toHaveBeenCalledWith(
      household.id,
      expect.objectContaining({
        approvedSubmissions: [
          expect.objectContaining({ id: submission.id, status: "approved" }),
        ],
        balanceChanges: [
          { childId: household.children[0]!.id, delta: household.chores[0]!.pointValue },
        ],
        childWins: [
          expect.objectContaining({
            childId: household.children[0]!.id,
            sourceId: submission.id,
            sourceType: "chore",
          }),
        ],
        pointLedger: [
          expect.objectContaining({
            childId: household.children[0]!.id,
            delta: household.chores[0]!.pointValue,
            sourceId: submission.id,
            sourceType: "chore_approval",
          }),
        ],
      }),
    );
  });

  it("aggregates balance changes for batch Chore Submission approval", async () => {
    const household = await createHouseholdWithSubmittedChores();
    const approveChoreSubmissions = vi.fn(
      async (_householdId: string, input: ChoreApprovalPersistence) => ({
        ...household,
        children: household.children.map((child) =>
          child.id === input.balanceChanges[0]?.childId
            ? {
                ...child,
                pointBalance: child.pointBalance + input.balanceChanges[0]!.delta,
              }
            : child,
        ),
        choreSubmissions: household.choreSubmissions.map((submission) => ({
          ...submission,
          status: "approved" as const,
        })),
        childWins: input.childWins,
        pointLedger: input.pointLedger,
      }),
    );

    const result = await approveChoreSubmissionsForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, { approveChoreSubmissions }),
      },
      { submissionIds: household.choreSubmissions.map((submission) => submission.id) },
    );

    expect(result.status).toBe("ok");
    expect(approveChoreSubmissions).toHaveBeenCalledWith(
      household.id,
      expect.objectContaining({
        approvedSubmissions: expect.arrayContaining([
          expect.objectContaining({ id: household.choreSubmissions[0]!.id }),
          expect.objectContaining({ id: household.choreSubmissions[1]!.id }),
        ]),
        balanceChanges: [{ childId: household.children[0]!.id, delta: 5 }],
        pointLedger: expect.arrayContaining([
          expect.objectContaining({ sourceId: household.choreSubmissions[0]!.id }),
          expect.objectContaining({ sourceId: household.choreSubmissions[1]!.id }),
        ]),
      }),
    );
  });

  it("marks a pending Chore Submission Needs Work without awarding Points", async () => {
    const household = await createHouseholdWithSubmittedChore();
    const submission = household.choreSubmissions[0]!;
    const markChoreSubmissionNeedsWork = vi.fn(async () => ({
      ...household,
      choreSubmissions: household.choreSubmissions.map((candidate) =>
        candidate.id === submission.id
          ? { ...candidate, status: "needs_work" as const }
          : candidate,
      ),
    }));

    const result = await markChoreSubmissionNeedsWorkForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, { markChoreSubmissionNeedsWork }),
      },
      { submissionId: submission.id },
    );

    expect(result.status).toBe("ok");
    expect(markChoreSubmissionNeedsWork).toHaveBeenCalledWith(
      household.id,
      expect.objectContaining({ submissionId: submission.id }),
    );
  });

  it("persists skipped Chore occurrences without awarding Points", async () => {
    const household = await createHouseholdWithSubmittedChore();
    const chore = household.chores[0]!;
    const child = household.children[0]!;
    const skipChoreOccurrence = vi.fn(
      async (_householdId: string, input: SkippedChoreOccurrence) => ({
        ...household,
        skippedChoreOccurrences: [input],
      }),
    );

    const result = await skipChoreOccurrenceForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, { skipChoreOccurrence }),
      },
      { childId: child.id, choreId: chore.id, occurrenceDate: chore.dueDate },
    );

    expect(result.status).toBe("ok");
    expect(skipChoreOccurrence).toHaveBeenCalledWith(
      household.id,
      expect.objectContaining({
        childId: child.id,
        choreId: chore.id,
        occurrenceDate: chore.dueDate,
      }),
    );
  });

  it("denies approval mutations when the Parent email is not allowlisted", async () => {
    const household = await createHouseholdWithSubmittedChore();
    const approveChoreSubmissions = vi.fn();

    const result = await approveChoreSubmissionsForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "visitor@example.com",
          userId: "user-2",
        }),
        repository: createRepository(household, {
          approveChoreSubmissions,
          findHouseholdForParent: async () => null,
        }),
      },
      { submissionIds: [household.choreSubmissions[0]!.id] },
    );

    expect(result).toEqual({
      message: "This Parent email is not allowed for the Household.",
      status: "error",
    });
    expect(approveChoreSubmissions).not.toHaveBeenCalled();
  });
});

async function createHouseholdWithSubmittedChore(): Promise<Household> {
  const household = await createHousehold({
    children: [{ name: "Ada", pin: "1234" }],
    householdName: "Clozcasa",
    parents: [{ email: "first@example.com", name: "First" }],
  });
  const withChore = createChore(household, {
    childId: household.children[0]!.id,
    dueDate: "2026-06-24",
    pointValue: 3,
    routine: null,
    title: "Unload dishwasher",
  });

  return submitChore(withChore, {
    childId: household.children[0]!.id,
    choreId: withChore.chores[0]!.id,
    occurrenceDate: "2026-06-24",
    today: "2026-06-24",
  });
}

async function createHouseholdWithSubmittedChores(): Promise<Household> {
  const household = await createHousehold({
    children: [{ name: "Ada", pin: "1234" }],
    householdName: "Clozcasa",
    parents: [{ email: "first@example.com", name: "First" }],
  });
  const withFirstChore = createChore(household, {
    childId: household.children[0]!.id,
    dueDate: "2026-06-24",
    pointValue: 3,
    routine: null,
    title: "Unload dishwasher",
  });
  const withSecondChore = createChore(withFirstChore, {
    childId: household.children[0]!.id,
    dueDate: "2026-06-24",
    pointValue: 2,
    routine: null,
    title: "Practice piano",
  });
  const firstSubmission = submitChore(withSecondChore, {
    childId: household.children[0]!.id,
    choreId: withSecondChore.chores[0]!.id,
    occurrenceDate: "2026-06-24",
    today: "2026-06-24",
  });

  return submitChore(firstSubmission, {
    childId: household.children[0]!.id,
    choreId: withSecondChore.chores[1]!.id,
    occurrenceDate: "2026-06-24",
    today: "2026-06-24",
  });
}

function createRepository(
  household: Household,
  overrides: Partial<HouseholdApprovalRepository> = {},
): HouseholdApprovalRepository {
  return {
    approveChoreSubmissions: async () => household,
    findHouseholdForParent: async (email) =>
      email === "first@example.com" ? household : null,
    markChoreSubmissionNeedsWork: async () => household,
    skipChoreOccurrence: async () => household,
    ...overrides,
  };
}
