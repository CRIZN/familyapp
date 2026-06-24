import { describe, expect, it, vi } from "vitest";

import { createChore, getChildChoreBoard, type ChoreSubmission } from "@/domain/chores";
import { createHousehold, type Household } from "@/domain/household";

import { submitChoreForChild, type ChildChoreRepository } from "./chores";
import type { ChildSessionClaims } from "./session";

describe("Child chore persistence", () => {
  it("persists a due Child Chore submission and returns a pending-review board", async () => {
    const household = await createHouseholdWithChores();
    const child = household.children[0]!;
    const chore = household.chores.find((candidate) => candidate.childId === child.id)!;
    const createChoreSubmission = vi.fn(
      async (_session: ChildSessionClaims, submission: ChoreSubmission) => ({
        ...household,
        choreSubmissions: [...household.choreSubmissions, submission],
      }),
    );

    const result = await submitChoreForChild(
      {
        getAuthenticatedChild: async () => ({
          household,
          session: createSession(household, child.id),
        }),
        getTodayDateKey: () => "2026-06-24",
        repository: createRepository({ createChoreSubmission }),
      },
      {
        choreId: chore.id,
        occurrenceDate: "2026-06-24",
      },
    );

    expect(result.status).toBe("ok");
    expect(createChoreSubmission).toHaveBeenCalledWith(
      createSession(household, child.id),
      expect.objectContaining({
        childId: child.id,
        choreId: chore.id,
        occurrenceDate: "2026-06-24",
        status: "pending",
      }),
    );
    expect(
      result.status === "ok"
        ? getChildChoreBoard(result.household, child.id, "2026-06-24").pendingReview
        : [],
    ).toHaveLength(1);
  });

  it("persists an Overdue Chore submission", async () => {
    const household = await createHouseholdWithChores();
    const child = household.children[0]!;
    const chore = household.chores.find((candidate) => candidate.childId === child.id)!;
    const createChoreSubmission = vi.fn(
      async (_session: ChildSessionClaims, submission: ChoreSubmission) => ({
        ...household,
        choreSubmissions: [...household.choreSubmissions, submission],
      }),
    );

    const result = await submitChoreForChild(
      {
        getAuthenticatedChild: async () => ({
          household,
          session: createSession(household, child.id),
        }),
        getTodayDateKey: () => "2026-06-25",
        repository: createRepository({ createChoreSubmission }),
      },
      {
        choreId: chore.id,
        occurrenceDate: "2026-06-24",
      },
    );

    expect(result.status).toBe("ok");
    expect(createChoreSubmission).toHaveBeenCalledOnce();
  });

  it("prevents a Child from submitting another Child's Chore", async () => {
    const household = await createHouseholdWithChores();
    const child = household.children[0]!;
    const sibling = household.children[1]!;
    const siblingChore = household.chores.find(
      (candidate) => candidate.childId === sibling.id,
    )!;
    const createChoreSubmission = vi.fn();

    const result = await submitChoreForChild(
      {
        getAuthenticatedChild: async () => ({
          household,
          session: createSession(household, child.id),
        }),
        getTodayDateKey: () => "2026-06-24",
        repository: createRepository({ createChoreSubmission }),
      },
      {
        choreId: siblingChore.id,
        occurrenceDate: "2026-06-24",
      },
    );

    expect(result).toEqual({
      message: "This Chore is not assigned to this Child.",
      status: "error",
    });
    expect(createChoreSubmission).not.toHaveBeenCalled();
  });

  it("rejects upcoming Chore submissions before they are due", async () => {
    const household = await createHouseholdWithChores({ dueDate: "2026-06-25" });
    const child = household.children[0]!;
    const chore = household.chores.find((candidate) => candidate.childId === child.id)!;
    const createChoreSubmission = vi.fn();

    const result = await submitChoreForChild(
      {
        getAuthenticatedChild: async () => ({
          household,
          session: createSession(household, child.id),
        }),
        getTodayDateKey: () => "2026-06-24",
        repository: createRepository({ createChoreSubmission }),
      },
      {
        choreId: chore.id,
        occurrenceDate: "2026-06-25",
      },
    );

    expect(result).toEqual({
      message: "Only due or Overdue Chores can be submitted.",
      status: "error",
    });
    expect(createChoreSubmission).not.toHaveBeenCalled();
  });
});

async function createHouseholdWithChores(
  options: { dueDate?: string } = {},
): Promise<Household> {
  const household = await createHousehold({
    children: [
      { name: "Ada", pin: "1234" },
      { name: "Grace", pin: "5678" },
    ],
    householdName: "Clozcasa",
    parents: [{ email: "first@example.com", name: "First" }],
  });
  const dueDate = options.dueDate ?? "2026-06-24";
  const withFirstChore = createChore(household, {
    childId: household.children[0]!.id,
    dueDate,
    pointValue: 3,
    routine: null,
    title: "Unload dishwasher",
  });

  return createChore(withFirstChore, {
    childId: household.children[1]!.id,
    dueDate,
    pointValue: 2,
    routine: null,
    title: "Practice piano",
  });
}

function createRepository(
  overrides: Partial<ChildChoreRepository>,
): ChildChoreRepository {
  return {
    createChoreSubmission: async () => {
      throw new Error("Unexpected Chore submission.");
    },
    ...overrides,
  };
}

function createSession(
  household: Household,
  childId: string,
): ChildSessionClaims {
  const child = household.children.find((candidate) => candidate.id === childId)!;
  return {
    childId,
    householdId: household.id,
    sessionVersion: child.sessionVersion ?? 1,
  };
}
