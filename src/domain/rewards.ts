import type {
  ChildProfile,
  ChildWin,
  Household,
  PointLedgerEntry,
} from "./household";

export type RewardType = "allowance" | "experience" | "privilege" | "custom";
export type RewardStatus = "active" | "archived";

export type Reward = {
  id: string;
  title: string;
  pointCost: number;
  type: RewardType;
  status: RewardStatus;
  createdAt: string;
  updatedAt: string;
};

export type RewardContributionStatus = "active" | "requested" | "returned";

export type RewardContribution = {
  id: string;
  rewardId: string;
  childId: string;
  points: number;
  status: RewardContributionStatus;
  createdAt: string;
  updatedAt: string;
  requestId?: string;
};

export type RewardRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "canceled"
  | "fulfilled";

export type RewardRequest = {
  id: string;
  rewardId: string;
  childId: string;
  status: RewardRequestStatus;
  contributionPoints: number;
  reservedPoints: number;
  requestedAt: string;
  reviewedAt?: string;
  fulfilledAt?: string;
};

export type ChildRewardCatalogItem = {
  rewardId: string;
  title: string;
  pointCost: number;
  type: RewardType;
  contributedPoints: number;
  remainingPoints: number;
  status: RewardStatus;
};

export type RewardRequestSummary = {
  requestId: string;
  rewardId: string;
  childId: string;
  title: string;
  status: RewardRequestStatus;
  pointCost: number;
  contributionPoints: number;
  reservedPoints: number;
  requestedAt: string;
  reviewedAt?: string;
  fulfilledAt?: string;
};

export type ChildRewardBoard = {
  child: Pick<ChildProfile, "id" | "name">;
  catalog: ChildRewardCatalogItem[];
  activeContributions: RewardContributionSummary[];
  pendingRequests: RewardRequestSummary[];
  approvedRequests: RewardRequestSummary[];
  fulfilledRequests: RewardRequestSummary[];
};

export type RewardContributionSummary = {
  contributionId: string;
  rewardId: string;
  childId: string;
  title: string;
  points: number;
  createdAt: string;
};

export type RewardRequestApprovalQueueItem = {
  id: string;
  type: "reward_request";
  childId: string;
  childName: string;
  rewardId: string;
  title: string;
  pointCost: number;
  contributionPoints: number;
  reservedPoints: number;
  submittedAt: string;
};

export type CreateRewardInput = {
  title: string;
  pointCost: number;
  type: RewardType;
};

export type UpdateRewardInput = CreateRewardInput;

export type ContributeToRewardInput = {
  childId: string;
  rewardId: string;
  points: number;
};

export type RequestRewardInput = {
  childId: string;
  rewardId: string;
  requestedAt?: string;
};

export function createReward(
  household: Household,
  input: CreateRewardInput,
): Household {
  const reward = validateRewardInput(input);
  const now = new Date().toISOString();
  return {
    ...withRewardCollections(household),
    rewards: [
      ...getRewards(household),
      {
        id: createId(),
        ...reward,
        status: "active",
        createdAt: now,
        updatedAt: now,
      },
    ],
    updatedAt: now,
  };
}

export function updateReward(
  household: Household,
  rewardId: string,
  input: UpdateRewardInput,
  updatedAt: string = new Date().toISOString(),
): Household {
  const normalized = withRewardCollections(household);
  const reward = normalized.rewards.find((candidate) => candidate.id === rewardId);
  if (!reward) {
    throw new Error("Reward not found.");
  }
  if (reward.status !== "active") {
    throw new Error("Only active Rewards can be edited.");
  }
  const next = validateRewardInput(input);

  return {
    ...normalized,
    rewards: normalized.rewards.map((candidate) =>
      candidate.id === rewardId
        ? {
            ...candidate,
            ...next,
            updatedAt,
          }
        : candidate,
    ),
    updatedAt,
  };
}

export function archiveReward(
  household: Household,
  rewardId: string,
  archivedAt: string = new Date().toISOString(),
): Household {
  const normalized = withRewardCollections(household);
  if (!normalized.rewards.some((reward) => reward.id === rewardId)) {
    throw new Error("Reward not found.");
  }

  return {
    ...normalized,
    rewards: normalized.rewards.map((reward) =>
      reward.id === rewardId
        ? { ...reward, status: "archived", updatedAt: archivedAt }
        : reward,
    ),
    updatedAt: archivedAt,
  };
}

export function contributeToReward(
  household: Household,
  input: ContributeToRewardInput,
  contributedAt: string = new Date().toISOString(),
): Household {
  const normalized = withRewardCollections(household);
  const child = assertChildBelongsToHousehold(normalized, input.childId);
  const reward = assertActiveReward(normalized, input.rewardId);
  if (!Number.isInteger(input.points) || input.points < 1) {
    throw new Error("Reward Contributions must be at least 1 Point.");
  }
  if (child.pointBalance < input.points) {
    throw new Error("This Child does not have enough available Points.");
  }
  const remaining = getRewardRemainingPoints(normalized, reward, child.id);
  if (input.points > remaining) {
    throw new Error("Reward Contributions cannot exceed the Reward cost.");
  }

  const contribution: RewardContribution = {
    id: createId(),
    rewardId: reward.id,
    childId: child.id,
    points: input.points,
    status: "active",
    createdAt: contributedAt,
    updatedAt: contributedAt,
  };

  return {
    ...normalized,
    children: normalized.children.map((candidate) =>
      candidate.id === child.id
        ? { ...candidate, pointBalance: candidate.pointBalance - input.points }
        : candidate,
    ),
    rewardContributions: [...normalized.rewardContributions, contribution],
    pointLedger: [
      ...normalized.pointLedger,
      {
        id: createId(),
        childId: child.id,
        delta: -input.points,
        description: `Reward Contribution: ${reward.title}`,
        sourceType: "reward_contribution",
        sourceId: contribution.id,
        createdAt: contributedAt,
      },
    ],
    updatedAt: contributedAt,
  };
}

export function returnRewardContribution(
  household: Household,
  contributionId: string,
  returnedAt: string = new Date().toISOString(),
): Household {
  const normalized = withRewardCollections(household);
  const contribution = normalized.rewardContributions.find(
    (candidate) => candidate.id === contributionId,
  );
  if (!contribution || contribution.status !== "active") {
    throw new Error("Only active Reward Contributions can be returned.");
  }
  const reward = normalized.rewards.find(
    (candidate) => candidate.id === contribution.rewardId,
  );
  if (!reward) {
    throw new Error("Reward not found.");
  }

  return {
    ...normalized,
    children: normalized.children.map((child) =>
      child.id === contribution.childId
        ? { ...child, pointBalance: child.pointBalance + contribution.points }
        : child,
    ),
    rewardContributions: normalized.rewardContributions.map((candidate) =>
      candidate.id === contribution.id
        ? { ...candidate, status: "returned", updatedAt: returnedAt }
        : candidate,
    ),
    pointLedger: [
      ...normalized.pointLedger,
      {
        id: createId(),
        childId: contribution.childId,
        delta: contribution.points,
        description: `Reward Contribution returned: ${reward.title}`,
        sourceType: "reward_contribution_return",
        sourceId: contribution.id,
        createdAt: returnedAt,
      },
    ],
    updatedAt: returnedAt,
  };
}

export function getChildRewardBoard(
  household: Household,
  childId: string,
): ChildRewardBoard {
  const normalized = withRewardCollections(household);
  const child = assertChildBelongsToHousehold(normalized, childId);
  const requests = normalized.rewardRequests
    .filter((request) => request.childId === childId)
    .flatMap((request) => toRewardRequestSummary(normalized, request))
    .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt));

  return {
    child: { id: child.id, name: child.name },
    catalog: normalized.rewards
      .filter((reward) => reward.status === "active")
      .map((reward) => toChildRewardCatalogItem(normalized, reward, child.id))
      .sort((left, right) => left.title.localeCompare(right.title)),
    activeContributions: normalized.rewardContributions
      .filter(
        (contribution) =>
          contribution.childId === childId && contribution.status === "active",
      )
      .flatMap((contribution) =>
        toRewardContributionSummary(normalized, contribution),
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    pendingRequests: requests.filter((request) => request.status === "pending"),
    approvedRequests: requests.filter((request) => request.status === "approved"),
    fulfilledRequests: requests.filter(
      (request) => request.status === "fulfilled",
    ),
  };
}

function toRewardContributionSummary(
  household: Household,
  contribution: RewardContribution,
): RewardContributionSummary[] {
  const reward = getRewards(household).find(
    (candidate) => candidate.id === contribution.rewardId,
  );
  if (!reward) {
    return [];
  }
  return [
    {
      contributionId: contribution.id,
      rewardId: reward.id,
      childId: contribution.childId,
      title: reward.title,
      points: contribution.points,
      createdAt: contribution.createdAt,
    },
  ];
}

export function getRewardRequestApprovalQueue(
  household: Household,
): RewardRequestApprovalQueueItem[] {
  const normalized = withRewardCollections(household);
  return normalized.rewardRequests
    .filter((request) => request.status === "pending")
    .flatMap((request) => {
      const reward = normalized.rewards.find(
        (candidate) => candidate.id === request.rewardId,
      );
      const child = normalized.children.find(
        (candidate) => candidate.id === request.childId,
      );
      if (!reward || !child) {
        return [];
      }
      return [
        {
          id: request.id,
          type: "reward_request" as const,
          childId: child.id,
          childName: child.name,
          rewardId: reward.id,
          title: reward.title,
          pointCost: reward.pointCost,
          contributionPoints: request.contributionPoints,
          reservedPoints: request.reservedPoints,
          submittedAt: request.requestedAt,
        },
      ];
    })
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
}

export function requestReward(
  household: Household,
  input: RequestRewardInput,
): Household {
  const normalized = withRewardCollections(household);
  const child = assertChildBelongsToHousehold(normalized, input.childId);
  const reward = assertActiveReward(normalized, input.rewardId);
  const alreadyPending = normalized.rewardRequests.some(
    (request) =>
      request.childId === child.id &&
      request.rewardId === reward.id &&
      request.status === "pending",
  );
  if (alreadyPending) {
    throw new Error("This Reward Request is already waiting for Parent review.");
  }

  const activeContributions = normalized.rewardContributions.filter(
    (contribution) =>
      contribution.childId === child.id &&
      contribution.rewardId === reward.id &&
      contribution.status === "active",
  );
  const contributionPoints = activeContributions.reduce(
    (total, contribution) => total + contribution.points,
    0,
  );
  const reservedPoints = Math.max(0, reward.pointCost - contributionPoints);
  if (child.pointBalance < reservedPoints) {
    throw new Error("This Child does not have enough Points for this Reward.");
  }

  const requestedAt = input.requestedAt ?? new Date().toISOString();
  const request: RewardRequest = {
    id: createId(),
    rewardId: reward.id,
    childId: child.id,
    status: "pending",
    contributionPoints,
    reservedPoints,
    requestedAt,
  };
  const contributionIds = new Set(
    activeContributions.map((contribution) => contribution.id),
  );
  const reservationLedgerEntry: PointLedgerEntry | null =
    reservedPoints > 0
      ? {
          id: createId(),
          childId: child.id,
          delta: -reservedPoints,
          description: `Reward Request reserved: ${reward.title}`,
          sourceType: "reward_request_reservation",
          sourceId: request.id,
          createdAt: requestedAt,
        }
      : null;

  return {
    ...normalized,
    children: normalized.children.map((candidate) =>
      candidate.id === child.id
        ? { ...candidate, pointBalance: candidate.pointBalance - reservedPoints }
        : candidate,
    ),
    rewardContributions: normalized.rewardContributions.map((contribution) =>
      contributionIds.has(contribution.id)
        ? {
            ...contribution,
            status: "requested",
            requestId: request.id,
            updatedAt: requestedAt,
          }
        : contribution,
    ),
    rewardRequests: [...normalized.rewardRequests, request],
    pointLedger: reservationLedgerEntry
      ? [...normalized.pointLedger, reservationLedgerEntry]
      : normalized.pointLedger,
    updatedAt: requestedAt,
  };
}

export function approveRewardRequest(
  household: Household,
  requestId: string,
  approvedAt: string = new Date().toISOString(),
): Household {
  const normalized = withRewardCollections(household);
  const { request, reward } = assertPendingRewardRequest(normalized, requestId);

  return {
    ...normalized,
    rewardRequests: normalized.rewardRequests.map((candidate) =>
      candidate.id === request.id
        ? { ...candidate, status: "approved", reviewedAt: approvedAt }
        : candidate,
    ),
    pointLedger: [
      ...normalized.pointLedger,
      {
        id: createId(),
        childId: request.childId,
        delta: 0,
        description: `Reward Request approved: ${reward.title}`,
        sourceType: "reward_request_approval_spend",
        sourceId: request.id,
        createdAt: approvedAt,
      },
    ],
    updatedAt: approvedAt,
  };
}

export function rejectRewardRequest(
  household: Household,
  requestId: string,
  rejectedAt: string = new Date().toISOString(),
): Household {
  return returnRewardRequestPoints(household, requestId, "rejected", rejectedAt);
}

export function cancelRewardRequest(
  household: Household,
  requestId: string,
  canceledAt: string = new Date().toISOString(),
): Household {
  return returnRewardRequestPoints(household, requestId, "canceled", canceledAt);
}

export function fulfillRewardRequest(
  household: Household,
  requestId: string,
  fulfilledAt: string = new Date().toISOString(),
): Household {
  const normalized = withRewardCollections(household);
  const request = normalized.rewardRequests.find(
    (candidate) => candidate.id === requestId,
  );
  if (!request || request.status !== "approved") {
    throw new Error("Only approved Reward Requests can be fulfilled.");
  }
  const reward = normalized.rewards.find(
    (candidate) => candidate.id === request.rewardId,
  );
  if (!reward) {
    throw new Error("Reward not found.");
  }
  const win: ChildWin = {
    id: createId(),
    childId: request.childId,
    title: reward.title,
    description: "Reward fulfilled",
    sourceType: "reward",
    sourceId: request.id,
    earnedAt: fulfilledAt,
  };

  return {
    ...normalized,
    rewardRequests: normalized.rewardRequests.map((candidate) =>
      candidate.id === request.id
        ? { ...candidate, status: "fulfilled", fulfilledAt }
        : candidate,
    ),
    childWins: [...normalized.childWins, win],
    updatedAt: fulfilledAt,
  };
}

export function withRewardCollections(household: Household): Household {
  return {
    ...household,
    rewards: getRewards(household),
    rewardContributions: getRewardContributions(household),
    rewardRequests: getRewardRequests(household),
    pointLedger: getPointLedger(household),
    childWins: getChildWinsCollection(household),
  };
}

function toChildRewardCatalogItem(
  household: Household,
  reward: Reward,
  childId: string,
): ChildRewardCatalogItem {
  const contributedPoints = getActiveContributionPoints(
    household,
    reward.id,
    childId,
  );
  return {
    rewardId: reward.id,
    title: reward.title,
    pointCost: reward.pointCost,
    type: reward.type,
    contributedPoints,
    remainingPoints: Math.max(0, reward.pointCost - contributedPoints),
    status: reward.status,
  };
}

function toRewardRequestSummary(
  household: Household,
  request: RewardRequest,
): RewardRequestSummary[] {
  const reward = getRewards(household).find(
    (candidate) => candidate.id === request.rewardId,
  );
  if (!reward) {
    return [];
  }
  return [
    {
      requestId: request.id,
      rewardId: reward.id,
      childId: request.childId,
      title: reward.title,
      status: request.status,
      pointCost: reward.pointCost,
      contributionPoints: request.contributionPoints,
      reservedPoints: request.reservedPoints,
      requestedAt: request.requestedAt,
      reviewedAt: request.reviewedAt,
      fulfilledAt: request.fulfilledAt,
    },
  ];
}

function validateRewardInput(input: CreateRewardInput): {
  title: string;
  pointCost: number;
  type: RewardType;
} {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Name the Reward.");
  }
  if (!Number.isInteger(input.pointCost) || input.pointCost < 1) {
    throw new Error("Rewards must cost at least 1 Point.");
  }
  return {
    title,
    pointCost: input.pointCost,
    type: input.type,
  };
}

function getRewardRemainingPoints(
  household: Household,
  reward: Reward,
  childId: string,
): number {
  return Math.max(
    0,
    reward.pointCost - getActiveContributionPoints(household, reward.id, childId),
  );
}

function getActiveContributionPoints(
  household: Household,
  rewardId: string,
  childId: string,
): number {
  return getRewardContributions(household)
    .filter(
      (contribution) =>
        contribution.rewardId === rewardId &&
        contribution.childId === childId &&
        contribution.status === "active",
    )
    .reduce((total, contribution) => total + contribution.points, 0);
}

function assertChildBelongsToHousehold(
  household: Household,
  childId: string,
): ChildProfile {
  const child = household.children.find((candidate) => candidate.id === childId);
  if (!child) {
    throw new Error("Child not found in this Household.");
  }
  return child;
}

function assertActiveReward(household: Household, rewardId: string): Reward {
  const reward = getRewards(household).find((candidate) => candidate.id === rewardId);
  if (!reward || reward.status !== "active") {
    throw new Error("Reward not found.");
  }
  return reward;
}

function assertPendingRewardRequest(
  household: Household,
  requestId: string,
): { request: RewardRequest; reward: Reward } {
  const request = getRewardRequests(household).find(
    (candidate) => candidate.id === requestId,
  );
  if (!request || request.status !== "pending") {
    throw new Error("Only pending Reward Requests can be reviewed.");
  }
  const reward = getRewards(household).find(
    (candidate) => candidate.id === request.rewardId,
  );
  if (!reward) {
    throw new Error("Reward not found.");
  }
  return { request, reward };
}

function returnRewardRequestPoints(
  household: Household,
  requestId: string,
  status: "rejected" | "canceled",
  returnedAt: string,
): Household {
  const normalized = withRewardCollections(household);
  const { request, reward } = assertPendingRewardRequest(normalized, requestId);
  const pointsToReturn = request.contributionPoints + request.reservedPoints;

  return {
    ...normalized,
    children: normalized.children.map((child) =>
      child.id === request.childId
        ? { ...child, pointBalance: child.pointBalance + pointsToReturn }
        : child,
    ),
    rewardContributions: normalized.rewardContributions.map((contribution) =>
      contribution.requestId === request.id
        ? { ...contribution, status: "returned", updatedAt: returnedAt }
        : contribution,
    ),
    rewardRequests: normalized.rewardRequests.map((candidate) =>
      candidate.id === request.id
        ? { ...candidate, status, reviewedAt: returnedAt }
        : candidate,
    ),
    pointLedger: [
      ...normalized.pointLedger,
      {
        id: createId(),
        childId: request.childId,
        delta: pointsToReturn,
        description: `Reward Request returned: ${reward.title}`,
        sourceType: "reward_request_return",
        sourceId: request.id,
        createdAt: returnedAt,
      },
    ],
    updatedAt: returnedAt,
  };
}

function getRewards(household: Household): Reward[] {
  return household.rewards ?? [];
}

function getRewardContributions(household: Household): RewardContribution[] {
  return household.rewardContributions ?? [];
}

function getRewardRequests(household: Household): RewardRequest[] {
  return household.rewardRequests ?? [];
}

function getPointLedger(household: Household): PointLedgerEntry[] {
  return household.pointLedger ?? [];
}

function getChildWinsCollection(household: Household): ChildWin[] {
  return household.childWins ?? [];
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}
