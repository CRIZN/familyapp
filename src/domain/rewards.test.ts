import { describe, expect, it } from "vitest";

import { getApprovalQueue, getChildPointLedger, getChildWins } from "./chores";
import { createHousehold } from "./household";
import {
  approveRewardRequest,
  archiveReward,
  cancelRewardRequest,
  contributeToReward,
  createReward,
  fulfillRewardRequest,
  getChildRewardBoard,
  rejectRewardRequest,
  requestReward,
  returnRewardContribution,
  updateReward,
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

function givePoints(
  household: Awaited<ReturnType<typeof createTestHousehold>>,
  childId: string,
  points: number,
) {
  return {
    ...household,
    children: household.children.map((child) =>
      child.id === childId ? { ...child, pointBalance: points } : child,
    ),
  };
}

describe("Rewards", () => {
  it("lets a Parent create, edit, and Archive shared Rewards with one Point cost", async () => {
    const household = await createTestHousehold();

    const withReward = createReward(household, {
      title: "Ice cream outing",
      pointCost: 12,
      type: "experience",
    });

    expect(withReward.rewards).toEqual([
      expect.objectContaining({
        title: "Ice cream outing",
        pointCost: 12,
        type: "experience",
        status: "active",
      }),
    ]);
    expect(
      getChildRewardBoard(withReward, household.children[0]!.id).catalog,
    ).toEqual([
      expect.objectContaining({
        title: "Ice cream outing",
        pointCost: 12,
      }),
    ]);

    const edited = updateReward(withReward, withReward.rewards[0]!.id, {
      title: "Bookstore trip",
      pointCost: 15,
      type: "experience",
    });

    expect(edited.rewards[0]).toMatchObject({
      title: "Bookstore trip",
      pointCost: 15,
    });

    const archived = archiveReward(edited, edited.rewards[0]!.id);

    expect(archived.rewards[0]).toMatchObject({ status: "archived" });
    expect(
      getChildRewardBoard(archived, household.children[0]!.id).catalog,
    ).toEqual([]);
  });

  it("lets a Child contribute available Points toward a Reward and return them before requesting", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const funded = givePoints(household, child.id, 10);
    const withReward = createReward(funded, {
      title: "Allowance payout",
      pointCost: 8,
      type: "allowance",
    });

    const contributed = contributeToReward(
      withReward,
      {
        childId: child.id,
        rewardId: withReward.rewards[0]!.id,
        points: 3,
      },
      "2026-06-23T12:00:00.000Z",
    );

    expect(contributed.children[0]!.pointBalance).toBe(7);
    expect(getChildRewardBoard(contributed, child.id).catalog).toEqual([
      expect.objectContaining({
        title: "Allowance payout",
        contributedPoints: 3,
        remainingPoints: 5,
      }),
    ]);
    expect(getChildPointLedger(contributed, child.id)).toEqual([
      expect.objectContaining({
        delta: -3,
        description: "Reward Contribution: Allowance payout",
        sourceType: "reward_contribution",
      }),
    ]);

    const returned = returnRewardContribution(
      contributed,
      contributed.rewardContributions[0]!.id,
      "2026-06-23T13:00:00.000Z",
    );

    expect(returned.children[0]!.pointBalance).toBe(10);
    expect(getChildRewardBoard(returned, child.id).catalog).toEqual([
      expect.objectContaining({
        contributedPoints: 0,
        remainingPoints: 8,
      }),
    ]);
    expect(getChildPointLedger(returned, child.id)).toEqual([
      expect.objectContaining({ delta: -3 }),
      expect.objectContaining({
        delta: 3,
        description: "Reward Contribution returned: Allowance payout",
        sourceType: "reward_contribution_return",
      }),
    ]);
  });

  it("reserves Points for a Reward Request and prevents double-spend", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const funded = givePoints(household, child.id, 10);
    const withReward = createReward(funded, {
      title: "Movie night",
      pointCost: 8,
      type: "experience",
    });
    const contributed = contributeToReward(
      withReward,
      {
        childId: child.id,
        rewardId: withReward.rewards[0]!.id,
        points: 3,
      },
      "2026-06-23T12:00:00.000Z",
    );

    const requested = requestReward(
      contributed,
      {
        childId: child.id,
        rewardId: withReward.rewards[0]!.id,
        requestedAt: "2026-06-23T13:00:00.000Z",
      },
    );

    expect(requested.children[0]!.pointBalance).toBe(2);
    expect(requested.rewardContributions[0]).toMatchObject({
      status: "requested",
      requestId: requested.rewardRequests[0]!.id,
    });
    expect(requested.rewardRequests[0]).toMatchObject({
      status: "pending",
      contributionPoints: 3,
      reservedPoints: 5,
    });
    expect(getApprovalQueue(requested)).toEqual([
      expect.objectContaining({
        type: "reward_request",
        childName: "Ada",
        title: "Movie night",
        pointCost: 8,
        contributionPoints: 3,
        reservedPoints: 5,
      }),
    ]);
    expect(getChildPointLedger(requested, child.id)).toEqual([
      expect.objectContaining({ delta: -3 }),
      expect.objectContaining({
        delta: -5,
        description: "Reward Request reserved: Movie night",
        sourceType: "reward_request_reservation",
      }),
    ]);

    expect(() =>
      requestReward(requested, {
        childId: child.id,
        rewardId: withReward.rewards[0]!.id,
      }),
    ).toThrow("This Reward Request is already waiting for Parent review.");
    expect(() =>
      contributeToReward(requested, {
        childId: child.id,
        rewardId: withReward.rewards[0]!.id,
        points: 3,
      }),
    ).toThrow("This Child does not have enough available Points.");
  });

  it("approves and fulfills Reward Requests as separate Parent actions", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const funded = givePoints(household, child.id, 10);
    const withReward = createReward(funded, {
      title: "Choose dinner",
      pointCost: 6,
      type: "privilege",
    });
    const requested = requestReward(withReward, {
      childId: child.id,
      rewardId: withReward.rewards[0]!.id,
      requestedAt: "2026-06-23T12:00:00.000Z",
    });

    const approved = approveRewardRequest(
      requested,
      requested.rewardRequests[0]!.id,
      "2026-06-23T13:00:00.000Z",
    );

    expect(approved.children[0]!.pointBalance).toBe(4);
    expect(getApprovalQueue(approved)).toEqual([]);
    expect(approved.rewardRequests[0]).toMatchObject({
      status: "approved",
      reviewedAt: "2026-06-23T13:00:00.000Z",
    });
    expect(getChildPointLedger(approved, child.id)).toEqual([
      expect.objectContaining({
        delta: -6,
        sourceType: "reward_request_reservation",
      }),
      expect.objectContaining({
        delta: 0,
        description: "Reward Request approved: Choose dinner",
        sourceType: "reward_request_approval_spend",
      }),
    ]);

    const fulfilled = fulfillRewardRequest(
      approved,
      approved.rewardRequests[0]!.id,
      "2026-06-24T12:00:00.000Z",
    );

    expect(fulfilled.rewardRequests[0]).toMatchObject({
      status: "fulfilled",
      fulfilledAt: "2026-06-24T12:00:00.000Z",
    });
    expect(getChildRewardBoard(fulfilled, child.id).fulfilledRequests).toEqual([
      expect.objectContaining({ title: "Choose dinner" }),
    ]);
    expect(getChildWins(fulfilled, child.id)).toEqual([
      expect.objectContaining({
        title: "Choose dinner",
        description: "Reward fulfilled",
        sourceType: "reward",
      }),
    ]);
  });

  it("returns Reserved Points when a Reward Request is rejected or canceled", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const funded = givePoints(household, child.id, 10);
    const withReward = createReward(funded, {
      title: "New puzzle",
      pointCost: 8,
      type: "custom",
    });
    const contributed = contributeToReward(
      withReward,
      {
        childId: child.id,
        rewardId: withReward.rewards[0]!.id,
        points: 3,
      },
      "2026-06-23T11:00:00.000Z",
    );
    const requested = requestReward(contributed, {
      childId: child.id,
      rewardId: withReward.rewards[0]!.id,
      requestedAt: "2026-06-23T12:00:00.000Z",
    });

    const rejected = rejectRewardRequest(
      requested,
      requested.rewardRequests[0]!.id,
      "2026-06-23T13:00:00.000Z",
    );

    expect(rejected.children[0]!.pointBalance).toBe(10);
    expect(rejected.rewardRequests[0]).toMatchObject({ status: "rejected" });
    expect(rejected.rewardContributions[0]).toMatchObject({
      status: "returned",
    });
    expect(getChildPointLedger(rejected, child.id)).toEqual([
      expect.objectContaining({ delta: -3 }),
      expect.objectContaining({ delta: -5 }),
      expect.objectContaining({
        delta: 8,
        description: "Reward Request returned: New puzzle",
        sourceType: "reward_request_return",
      }),
    ]);

    const requestedAgain = requestReward(rejected, {
      childId: child.id,
      rewardId: withReward.rewards[0]!.id,
      requestedAt: "2026-06-23T13:30:00.000Z",
    });
    const canceled = cancelRewardRequest(
      requestedAgain,
      requestedAgain.rewardRequests[1]!.id,
      "2026-06-23T14:00:00.000Z",
    );

    expect(canceled.children[0]!.pointBalance).toBe(10);
    expect(canceled.rewardRequests[1]).toMatchObject({ status: "canceled" });
    expect(getApprovalQueue(canceled)).toEqual([]);
  });
});
