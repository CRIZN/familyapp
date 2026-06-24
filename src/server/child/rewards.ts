import "server-only";

import type { PointLedgerEntry } from "@/domain/household";
import {
  cancelRewardRequest,
  contributeToReward,
  requestReward,
  returnRewardContribution,
  type RewardContribution,
  type RewardRequest,
} from "@/domain/rewards";
import type { Household } from "@/domain/household";

import type { ChildSessionClaims } from "./session";

export type ChildRewardPersistence = {
  balanceChanges: Array<{ childId: string; delta: number }>;
  createdContributions: RewardContribution[];
  createdRequests: RewardRequest[];
  pointLedger: PointLedgerEntry[];
  updatedContributions: RewardContribution[];
  updatedRequests: RewardRequest[];
};

export type ChildRewardRepository = {
  saveRewardTransition: (
    session: ChildSessionClaims,
    input: ChildRewardPersistence,
  ) => Promise<Household>;
};

export type ChildRewardDependencies = {
  getAuthenticatedChild: () => Promise<{
    household: Household;
    session: ChildSessionClaims;
  } | null>;
  repository: ChildRewardRepository;
};

export type ChildRewardResult =
  | { household: Household; message: string; status: "ok" }
  | { message: string; status: "error" };

export async function contributeToRewardForChild(
  dependencies: ChildRewardDependencies,
  input: { points: number; rewardId: string },
): Promise<ChildRewardResult> {
  return runChildRewardTransition(
    dependencies,
    (household, childId) =>
      contributeToReward(household, {
        childId,
        points: input.points,
        rewardId: input.rewardId,
      }),
    "Reward has saved Points.",
  );
}

export async function returnRewardContributionForChild(
  dependencies: ChildRewardDependencies,
  input: { contributionId: string },
): Promise<ChildRewardResult> {
  return runChildRewardTransition(
    dependencies,
    (household) => returnRewardContribution(household, input.contributionId),
    "Reward Contribution returned.",
  );
}

export async function requestRewardForChild(
  dependencies: ChildRewardDependencies,
  input: { rewardId: string },
): Promise<ChildRewardResult> {
  return runChildRewardTransition(
    dependencies,
    (household, childId) =>
      requestReward(household, {
        childId,
        rewardId: input.rewardId,
      }),
    "Reward Request is waiting for Parent review.",
  );
}

export async function cancelRewardRequestForChild(
  dependencies: ChildRewardDependencies,
  input: { requestId: string },
): Promise<ChildRewardResult> {
  return runChildRewardTransition(
    dependencies,
    (household) => cancelRewardRequest(household, input.requestId),
    "Reward Request canceled.",
  );
}

async function runChildRewardTransition(
  dependencies: ChildRewardDependencies,
  transition: (household: Household, childId: string) => Household,
  message: string,
): Promise<ChildRewardResult> {
  const context = await dependencies.getAuthenticatedChild();
  if (!context) {
    return {
      message: "Enter Child View again before changing Rewards.",
      status: "error",
    };
  }

  try {
    const updated = transition(context.household, context.session.childId);
    const household = await dependencies.repository.saveRewardTransition(
      context.session,
      getRewardPersistence(context.household, updated, context.session.childId),
    );

    return { household, message, status: "ok" };
  } catch (caught) {
    return {
      message:
        caught instanceof Error ? caught.message : "Could not update Reward.",
      status: "error",
    };
  }
}

function getRewardPersistence(
  before: Household,
  after: Household,
  childId: string,
): ChildRewardPersistence {
  const beforeContributionIds = new Set(
    before.rewardContributions.map((contribution) => contribution.id),
  );
  const beforeRequestIds = new Set(before.rewardRequests.map((request) => request.id));
  const beforeLedgerIds = new Set(before.pointLedger.map((entry) => entry.id));

  return {
    balanceChanges: after.children.flatMap((child) => {
      if (child.id !== childId) return [];
      const previous = before.children.find((candidate) => candidate.id === child.id);
      const delta = child.pointBalance - (previous?.pointBalance ?? child.pointBalance);
      return delta === 0 ? [] : [{ childId: child.id, delta }];
    }),
    createdContributions: after.rewardContributions.filter(
      (contribution) =>
        contribution.childId === childId && !beforeContributionIds.has(contribution.id),
    ),
    createdRequests: after.rewardRequests.filter(
      (request) => request.childId === childId && !beforeRequestIds.has(request.id),
    ),
    pointLedger: after.pointLedger.filter(
      (entry) => entry.childId === childId && !beforeLedgerIds.has(entry.id),
    ),
    updatedContributions: after.rewardContributions.filter((contribution) => {
      if (contribution.childId !== childId || !beforeContributionIds.has(contribution.id)) {
        return false;
      }
      const previous = before.rewardContributions.find(
        (candidate) => candidate.id === contribution.id,
      );
      return JSON.stringify(previous) !== JSON.stringify(contribution);
    }),
    updatedRequests: after.rewardRequests.filter((request) => {
      if (request.childId !== childId || !beforeRequestIds.has(request.id)) {
        return false;
      }
      const previous = before.rewardRequests.find(
        (candidate) => candidate.id === request.id,
      );
      return JSON.stringify(previous) !== JSON.stringify(request);
    }),
  };
}
