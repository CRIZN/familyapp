import { describe, expect, it, vi } from "vitest";

import { createReward } from "@/domain/rewards";
import { createHousehold, type Household } from "@/domain/household";

import {
  cancelRewardRequestForChild,
  contributeToRewardForChild,
  requestRewardForChild,
  returnRewardContributionForChild,
  type ChildRewardPersistence,
  type ChildRewardRepository,
} from "./rewards";
import type { ChildSessionClaims } from "./session";

describe("Child reward persistence", () => {
  it("contributes and returns Points through persisted reward transitions", async () => {
    const household = await createHouseholdWithReward({ pointBalance: 10 });
    const child = household.children[0]!;
    const reward = household.rewards[0]!;
    const saveRewardTransition = vi.fn(
      async (_session: ChildSessionClaims, input: ChildRewardPersistence) => ({
        ...household,
        children: [{ ...child, pointBalance: 7 }],
        pointLedger: input.pointLedger,
        rewardContributions: input.createdContributions,
      }),
    );

    const contributed = await contributeToRewardForChild(
      {
        getAuthenticatedChild: async () => ({
          household,
          session: createSession(household),
        }),
        repository: createRepository({ saveRewardTransition }),
      },
      { points: 3, rewardId: reward.id },
    );

    expect(contributed.status).toBe("ok");
    expect(saveRewardTransition).toHaveBeenCalledWith(
      createSession(household),
      expect.objectContaining({
        balanceChanges: [{ childId: child.id, delta: -3 }],
        createdContributions: [
          expect.objectContaining({
            childId: child.id,
            points: 3,
            rewardId: reward.id,
            status: "active",
          }),
        ],
        pointLedger: [
          expect.objectContaining({
            delta: -3,
            sourceType: "reward_contribution",
          }),
        ],
      }),
    );

    const contribution =
      contributed.status === "ok"
        ? contributed.household.rewardContributions[0]!
        : undefined;
    const returned = await returnRewardContributionForChild(
      {
        getAuthenticatedChild: async () => ({
          household: contributed.status === "ok" ? contributed.household : household,
          session: createSession(household),
        }),
        repository: createRepository({ saveRewardTransition }),
      },
      { contributionId: contribution?.id ?? "" },
    );

    expect(returned.status).toBe("ok");
    expect(saveRewardTransition).toHaveBeenLastCalledWith(
      createSession(household),
      expect.objectContaining({
        balanceChanges: [{ childId: child.id, delta: 3 }],
        pointLedger: [
          expect.objectContaining({
            delta: 3,
            sourceType: "reward_contribution_return",
          }),
        ],
        updatedContributions: [
          expect.objectContaining({ id: contribution?.id, status: "returned" }),
        ],
      }),
    );
  });

  it("requests and cancels Rewards with reservation and return ledgers", async () => {
    const household = await createHouseholdWithReward({ pointBalance: 10 });
    const child = household.children[0]!;
    const reward = household.rewards[0]!;
    const saveRewardTransition = vi.fn(
      async (_session: ChildSessionClaims, input: ChildRewardPersistence) => ({
        ...household,
        children: [{ ...child, pointBalance: 4 }],
        pointLedger: input.pointLedger,
        rewardRequests: input.createdRequests,
      }),
    );

    const requested = await requestRewardForChild(
      {
        getAuthenticatedChild: async () => ({
          household,
          session: createSession(household),
        }),
        repository: createRepository({ saveRewardTransition }),
      },
      { rewardId: reward.id },
    );

    expect(requested.status).toBe("ok");
    expect(saveRewardTransition).toHaveBeenCalledWith(
      createSession(household),
      expect.objectContaining({
        balanceChanges: [{ childId: child.id, delta: -6 }],
        createdRequests: [
          expect.objectContaining({
            childId: child.id,
            reservedPoints: 6,
            rewardId: reward.id,
            status: "pending",
          }),
        ],
        pointLedger: [
          expect.objectContaining({
            delta: -6,
            sourceType: "reward_request_reservation",
          }),
        ],
      }),
    );

    const request =
      requested.status === "ok" ? requested.household.rewardRequests[0]! : undefined;
    const canceled = await cancelRewardRequestForChild(
      {
        getAuthenticatedChild: async () => ({
          household: requested.status === "ok" ? requested.household : household,
          session: createSession(household),
        }),
        repository: createRepository({ saveRewardTransition }),
      },
      { requestId: request?.id ?? "" },
    );

    expect(canceled.status).toBe("ok");
    expect(saveRewardTransition).toHaveBeenLastCalledWith(
      createSession(household),
      expect.objectContaining({
        balanceChanges: [{ childId: child.id, delta: 6 }],
        pointLedger: [
          expect.objectContaining({
            delta: 6,
            sourceType: "reward_request_return",
          }),
        ],
        updatedRequests: [
          expect.objectContaining({ id: request?.id, status: "canceled" }),
        ],
      }),
    );
  });
});

async function createHouseholdWithReward({
  pointBalance,
}: {
  pointBalance: number;
}): Promise<Household> {
  const household = await createHousehold({
    children: [{ name: "Ada", pin: "1234" }],
    householdName: "Clozcasa",
    parents: [{ email: "first@example.com", name: "First" }],
  });
  return createReward(
    {
      ...household,
      children: [{ ...household.children[0]!, pointBalance }],
    },
    {
      pointCost: 6,
      title: "Movie night",
      type: "experience",
    },
  );
}

function createRepository(
  overrides: Partial<ChildRewardRepository>,
): ChildRewardRepository {
  return {
    saveRewardTransition: async () => {
      throw new Error("Unexpected Reward transition.");
    },
    ...overrides,
  };
}

function createSession(household: Household): ChildSessionClaims {
  const child = household.children[0]!;
  return {
    childId: child.id,
    householdId: household.id,
    sessionVersion: child.sessionVersion ?? 1,
  };
}
