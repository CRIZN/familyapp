import { describe, expect, it, vi } from "vitest";

import type { Household } from "@/domain/household";

import { createFirstRunHousehold } from "./first-run";
import type { HouseholdRepository } from "./repository";

describe("first-run Household setup", () => {
  it("creates the single production Household for the authenticated Parent", async () => {
    const createdHouseholds: Household[] = [];
    const repository = createRepository({
      createFirstRunHousehold: async (household) => {
        createdHouseholds.push(household);
      },
      hasAnyHousehold: async () => false,
    });

    const result = await createFirstRunHousehold(
      {
        env: { FIRST_RUN_SETUP_TOKEN: "launch-token" },
        getAuthenticatedParent: async () => ({
          email: "  FirstParent@Example.com ",
          userId: "user-1",
        }),
        repository,
      },
      {
        childDrafts: [{ name: "Ada", pin: "1234" }],
        householdName: "Clozcasa",
        parentName: "Matt",
        setupToken: "launch-token",
      },
    );

    expect(result.status).toBe("created");
    expect(createdHouseholds[0]).toMatchObject({
      name: "Clozcasa",
      parents: [{ email: "firstparent@example.com", name: "Matt" }],
    });
    expect(createdHouseholds[0]?.children[0]?.pinHash).not.toBe("1234");
  });

  it("rejects setup when the submitted token does not match the server token", async () => {
    const repository = createRepository({
      createFirstRunHousehold: vi.fn(),
      hasAnyHousehold: async () => false,
    });

    const result = await createFirstRunHousehold(
      {
        env: { FIRST_RUN_SETUP_TOKEN: "launch-token" },
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository,
      },
      {
        childDrafts: [{ name: "Ada", pin: "1234" }],
        householdName: "Clozcasa",
        parentName: "Matt",
        setupToken: "wrong-token",
      },
    );

    expect(result).toEqual({
      message: "The setup token does not match.",
      status: "error",
    });
    expect(repository.createFirstRunHousehold).not.toHaveBeenCalled();
  });

  it("locks setup after a Household exists", async () => {
    const repository = createRepository({
      createFirstRunHousehold: vi.fn(),
      hasAnyHousehold: async () => true,
    });

    const result = await createFirstRunHousehold(
      {
        env: { FIRST_RUN_SETUP_TOKEN: "launch-token" },
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository,
      },
      {
        childDrafts: [{ name: "Ada", pin: "1234" }],
        householdName: "Clozcasa",
        parentName: "Matt",
        setupToken: "launch-token",
      },
    );

    expect(result).toEqual({
      message: "Household setup is already complete.",
      status: "error",
    });
    expect(repository.createFirstRunHousehold).not.toHaveBeenCalled();
  });
});

function createRepository(
  overrides: Partial<HouseholdRepository>,
): HouseholdRepository {
  return {
    addAllowedParent: async () => {
      throw new Error("not used");
    },
    approveChoreSubmissions: async () => {
      throw new Error("not used");
    },
    createChore: async () => {
      throw new Error("not used");
    },
    createGoal: async () => {
      throw new Error("not used");
    },
    createReward: async () => {
      throw new Error("not used");
    },
    createFirstRunHousehold: async () => undefined,
    findHouseholdForParent: async () => null,
    hasAnyHousehold: async () => false,
    listHouseholdsWithCalendarConnections: async () => [],
    markChoreSubmissionNeedsWork: async () => {
      throw new Error("not used");
    },
    recordCalendarSyncStatus: async () => {
      throw new Error("not used");
    },
    saveGoalCompletion: async () => {
      throw new Error("not used");
    },
    saveGoalStatus: async () => {
      throw new Error("not used");
    },
    saveCalendarConnection: async () => {
      throw new Error("not used");
    },
    saveCalendarSync: async () => {
      throw new Error("not used");
    },
    saveEventEnrichment: async () => {
      throw new Error("not used");
    },
    saveProgressCheckInApproval: async () => {
      throw new Error("not used");
    },
    saveProgressCheckInNeedsWork: async () => {
      throw new Error("not used");
    },
    savePointEffects: async () => {
      throw new Error("not used");
    },
    saveRewardRequestApproval: async () => {
      throw new Error("not used");
    },
    saveRewardRequestFulfillment: async () => {
      throw new Error("not used");
    },
    saveRewardRequestRejection: async () => {
      throw new Error("not used");
    },
    saveReward: async () => {
      throw new Error("not used");
    },
    skipChoreOccurrence: async () => {
      throw new Error("not used");
    },
    updateChildPin: async () => {
      throw new Error("not used");
    },
    updateChildProfile: async () => {
      throw new Error("not used");
    },
    updateChoreStatus: async () => {
      throw new Error("not used");
    },
    ...overrides,
  };
}
