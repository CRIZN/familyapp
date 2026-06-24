import { describe, expect, it, vi } from "vitest";

import { createGoal } from "@/domain/goals";
import { createHousehold, type Household } from "@/domain/household";

import { submitProgressCheckInForChild, type ChildGoalRepository } from "./goals";
import type { ChildSessionClaims } from "./session";

describe("Child goal persistence", () => {
  it("persists a Child-owned Progress Check-in", async () => {
    const household = await createHouseholdWithGoals();
    const child = household.children[0]!;
    const goal = household.goals[0]!;
    const createProgressCheckIn = vi.fn(async (_session, checkIn) => ({
      ...household,
      progressCheckIns: [...household.progressCheckIns, checkIn],
    }));

    const result = await submitProgressCheckInForChild(
      {
        getAuthenticatedChild: async () => ({
          household,
          session: createSession(household, child.id),
        }),
        repository: createRepository({ createProgressCheckIn }),
      },
      { goalId: goal.id },
    );

    expect(result.status).toBe("ok");
    expect(createProgressCheckIn).toHaveBeenCalledWith(
      createSession(household, child.id),
      expect.objectContaining({
        childId: child.id,
        goalId: goal.id,
        status: "pending",
      }),
    );
  });

  it("prevents a Child from submitting another Child's Goal", async () => {
    const household = await createHouseholdWithGoals();
    const child = household.children[0]!;
    const siblingGoal = household.goals[1]!;
    const createProgressCheckIn = vi.fn();

    const result = await submitProgressCheckInForChild(
      {
        getAuthenticatedChild: async () => ({
          household,
          session: createSession(household, child.id),
        }),
        repository: createRepository({ createProgressCheckIn }),
      },
      { goalId: siblingGoal.id },
    );

    expect(result).toEqual({
      message: "This Goal is not assigned to this Child.",
      status: "error",
    });
    expect(createProgressCheckIn).not.toHaveBeenCalled();
  });

  it("rejects Progress Check-ins after a Goal has earned all available Points", async () => {
    const household = await createHouseholdWithGoals();
    const child = household.children[0]!;
    const goal = household.goals[0]!;
    const fullyAwarded = {
      ...household,
      pointLedger: [
        {
          childId: child.id,
          createdAt: "2026-06-24T00:00:00.000Z",
          delta: goal.pointValue,
          description: "Approved Progress Check-in: Read a chapter",
          id: "ledger-1",
          sourceId: "check-in-1",
          sourceType: "progress_check_in_approval" as const,
        },
      ],
      progressCheckIns: [
        {
          childId: child.id,
          goalId: goal.id,
          id: "check-in-1",
          reviewedAt: "2026-06-24T00:00:00.000Z",
          status: "approved" as const,
          submittedAt: "2026-06-23T00:00:00.000Z",
        },
      ],
    };
    const createProgressCheckIn = vi.fn();

    const result = await submitProgressCheckInForChild(
      {
        getAuthenticatedChild: async () => ({
          household: fullyAwarded,
          session: createSession(fullyAwarded, child.id),
        }),
        repository: createRepository({ createProgressCheckIn }),
      },
      { goalId: goal.id },
    );

    expect(result).toEqual({
      message: "This Goal has already earned all available Points.",
      status: "error",
    });
    expect(createProgressCheckIn).not.toHaveBeenCalled();
  });
});

async function createHouseholdWithGoals(): Promise<Household> {
  const household = await createHousehold({
    children: [
      { name: "Ada", pin: "1234" },
      { name: "Grace", pin: "5678" },
    ],
    householdName: "Clozcasa",
    parents: [{ email: "first@example.com", name: "First" }],
  });
  const withFirstGoal = createGoal(household, {
    childId: household.children[0]!.id,
    pointValue: 5,
    title: "Read a chapter",
  });

  return createGoal(withFirstGoal, {
    childId: household.children[1]!.id,
    pointValue: 4,
    title: "Practice scales",
  });
}

function createRepository(
  overrides: Partial<ChildGoalRepository>,
): ChildGoalRepository {
  return {
    createProgressCheckIn: async () => {
      throw new Error("Unexpected Progress Check-in.");
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
