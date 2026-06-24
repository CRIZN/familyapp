import {
  configureAppleCalendar,
  type ConfigureAppleCalendarInput,
  updateEventParticipants,
  type UpdateEventParticipantsInput,
} from "@/domain/calendar";
import {
  archiveChore,
  createChore,
  pauseChore,
  type Routine,
} from "@/domain/chores";
import {
  archiveGoal,
  completeGoal,
  createGoal,
} from "@/domain/goals";
import {
  archiveReward,
  createReward,
  updateReward,
  type RewardType,
} from "@/domain/rewards";
import {
  awardBonusPoints,
  createPointAdjustment,
} from "@/domain/points";
import {
  createChildPinCredentials,
  type ChildWin,
  type Household,
  type PointLedgerEntry,
} from "@/domain/household";

import type { HouseholdRepository } from "./repository";

export type ParentManagementUser = {
  email: string | null | undefined;
  userId: string;
};

export type HouseholdManagementDependencies = {
  getAuthenticatedParent: () => Promise<ParentManagementUser | null>;
  repository: HouseholdRepository;
};

export type HouseholdManagementResult =
  | { household: Household; message: string; status: "ok" }
  | { message: string; status: "error" };

export async function createChoreForParent(
  dependencies: HouseholdManagementDependencies,
  input: {
    childId: string;
    dueDate: string;
    pointValue: number;
    routine: Routine | null;
    title: string;
  },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const updatedHousehold = createChore(authorization.household, input);
  const createdChore = updatedHousehold.chores.at(-1);
  if (!createdChore) {
    return { message: "Could not create Chore.", status: "error" };
  }

  const household = await dependencies.repository.createChore(
    authorization.household.id,
    createdChore,
  );

  return { household, message: "Chore created.", status: "ok" };
}

export async function createGoalForParent(
  dependencies: HouseholdManagementDependencies,
  input: {
    childId: string;
    pointValue: number;
    title: string;
  },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const updatedHousehold = createGoal(authorization.household, input);
  const createdGoal = updatedHousehold.goals.at(-1);
  if (!createdGoal) {
    return { message: "Could not create Goal.", status: "error" };
  }

  const household = await dependencies.repository.createGoal(
    authorization.household.id,
    createdGoal,
  );

  return { household, message: "Goal created.", status: "ok" };
}

export async function createRewardForParent(
  dependencies: HouseholdManagementDependencies,
  input: { pointCost: number; title: string; type: RewardType },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const updatedHousehold = createReward(authorization.household, input);
  const createdReward = updatedHousehold.rewards.at(-1);
  if (!createdReward) {
    return { message: "Could not create Reward.", status: "error" };
  }

  const household = await dependencies.repository.createReward(
    authorization.household.id,
    createdReward,
  );

  return { household, message: "Reward created.", status: "ok" };
}

export async function addAllowedParent(
  dependencies: HouseholdManagementDependencies,
  input: { email: string; name: string },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name) {
    return { message: "Enter the Parent name.", status: "error" };
  }
  if (!email || !email.includes("@")) {
    return { message: "Enter the Parent email address.", status: "error" };
  }

  const household = await dependencies.repository.addAllowedParent(
    authorization.household.id,
    { email, name },
  );

  return { household, message: "Parent added.", status: "ok" };
}

export async function updateChildProfile(
  dependencies: HouseholdManagementDependencies,
  input: { childId: string; name: string },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const name = input.name.trim();
  if (!name) {
    return { message: "Enter the Child name.", status: "error" };
  }

  const household = await dependencies.repository.updateChildProfile(
    authorization.household.id,
    input.childId,
    { name },
  );

  return { household, message: "Child profile updated.", status: "ok" };
}

export async function updateChildPinForParent(
  dependencies: HouseholdManagementDependencies,
  input: { childId: string; pin: string },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const credentials = await createChildPinCredentials(input.pin);
  const household = await dependencies.repository.updateChildPin(
    authorization.household.id,
    input.childId,
    credentials,
  );

  return { household, message: "Child PIN updated.", status: "ok" };
}

export async function configureCalendarForParent(
  dependencies: HouseholdManagementDependencies,
  input: ConfigureAppleCalendarInput,
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  try {
    const updatedHousehold = configureAppleCalendar(authorization.household, input);
    const connection = updatedHousehold.calendarConnection;
    if (!connection) {
      return { message: "Could not save Apple Calendar.", status: "error" };
    }

    const household = await dependencies.repository.saveCalendarConnection(
      authorization.household.id,
      connection,
    );

    return { household, message: "Apple Family Calendar connected.", status: "ok" };
  } catch (caught) {
    return {
      message:
        caught instanceof Error
          ? caught.message
          : "Could not configure Apple Calendar.",
      status: "error",
    };
  }
}

export async function updateEventParticipantsForParent(
  dependencies: HouseholdManagementDependencies,
  input: UpdateEventParticipantsInput,
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  try {
    const updatedHousehold = updateEventParticipants(authorization.household, input);
    const enrichment = updatedHousehold.eventEnrichments.find(
      (candidate) => candidate.eventId === input.eventId,
    );
    if (!enrichment) {
      return { message: "Could not update Event Participants.", status: "error" };
    }

    const household = await dependencies.repository.saveEventEnrichment(
      authorization.household.id,
      enrichment,
    );

    return { household, message: "Event Participants updated.", status: "ok" };
  } catch (caught) {
    return {
      message:
        caught instanceof Error
          ? caught.message
          : "Could not update Event Participants.",
      status: "error",
    };
  }
}

export async function pauseChoreForParent(
  dependencies: HouseholdManagementDependencies,
  input: { choreId: string },
): Promise<HouseholdManagementResult> {
  return updateParentChoreStatus(dependencies, input.choreId, pauseChore, "Chore paused.");
}

export async function archiveChoreForParent(
  dependencies: HouseholdManagementDependencies,
  input: { choreId: string },
): Promise<HouseholdManagementResult> {
  return updateParentChoreStatus(
    dependencies,
    input.choreId,
    archiveChore,
    "Chore archived.",
  );
}

export async function archiveGoalForParent(
  dependencies: HouseholdManagementDependencies,
  input: { goalId: string },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const updatedHousehold = archiveGoal(authorization.household, input.goalId);
  const updatedGoal = updatedHousehold.goals.find(
    (goal) => goal.id === input.goalId,
  );
  if (!updatedGoal) {
    return { message: "Goal not found.", status: "error" };
  }

  const household = await dependencies.repository.saveGoalStatus(
    authorization.household.id,
    input.goalId,
    {
      status: updatedGoal.status,
      updatedAt: updatedGoal.updatedAt,
    },
  );

  return { household, message: "Goal archived.", status: "ok" };
}

export async function completeGoalForParent(
  dependencies: HouseholdManagementDependencies,
  input: { goalId: string },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const updatedHousehold = completeGoal(authorization.household, input.goalId);
  const completedGoal = updatedHousehold.goals.find(
    (goal) => goal.id === input.goalId,
  );
  if (!completedGoal) {
    return { message: "Goal not found.", status: "error" };
  }

  const household = await dependencies.repository.saveGoalCompletion(
    authorization.household.id,
    {
      balanceChanges: getBalanceChanges(
        authorization.household,
        updatedHousehold,
      ),
      childWins: getNewWins(authorization.household, updatedHousehold),
      goal: completedGoal,
      pointLedger: getNewLedgerEntries(authorization.household, updatedHousehold),
    },
  );

  return { household, message: "Goal completed.", status: "ok" };
}

export async function awardBonusPointsForParent(
  dependencies: HouseholdManagementDependencies,
  input: { childId: string; points: number; reason: string },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  try {
    const updatedHousehold = awardBonusPoints(authorization.household, input);
    const household = await dependencies.repository.savePointEffects(
      authorization.household.id,
      {
        balanceChanges: getBalanceChanges(
          authorization.household,
          updatedHousehold,
        ),
        childWins: [],
        pointLedger: getNewLedgerEntries(authorization.household, updatedHousehold),
      },
    );

    return { household, message: "Bonus Points awarded.", status: "ok" };
  } catch (caught) {
    return {
      message:
        caught instanceof Error ? caught.message : "Could not award Bonus Points.",
      status: "error",
    };
  }
}

export async function createPointAdjustmentForParent(
  dependencies: HouseholdManagementDependencies,
  input: { childId: string; points: number; reason: string },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  try {
    const updatedHousehold = createPointAdjustment(authorization.household, input);
    const household = await dependencies.repository.savePointEffects(
      authorization.household.id,
      {
        balanceChanges: getBalanceChanges(
          authorization.household,
          updatedHousehold,
        ),
        childWins: [],
        pointLedger: getNewLedgerEntries(authorization.household, updatedHousehold),
      },
    );

    return { household, message: "Point Adjustment recorded.", status: "ok" };
  } catch (caught) {
    return {
      message:
        caught instanceof Error
          ? caught.message
          : "Could not record Point Adjustment.",
      status: "error",
    };
  }
}

export async function updateRewardForParent(
  dependencies: HouseholdManagementDependencies,
  input: {
    pointCost: number;
    rewardId: string;
    title: string;
    type: RewardType;
  },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const updatedHousehold = updateReward(
    authorization.household,
    input.rewardId,
    {
      pointCost: input.pointCost,
      title: input.title,
      type: input.type,
    },
  );
  const reward = updatedHousehold.rewards.find(
    (candidate) => candidate.id === input.rewardId,
  );
  if (!reward) {
    return { message: "Reward not found.", status: "error" };
  }

  const household = await dependencies.repository.saveReward(
    authorization.household.id,
    input.rewardId,
    {
      pointCost: reward.pointCost,
      status: reward.status,
      title: reward.title,
      type: reward.type,
      updatedAt: reward.updatedAt,
    },
  );

  return { household, message: "Reward updated.", status: "ok" };
}

export async function archiveRewardForParent(
  dependencies: HouseholdManagementDependencies,
  input: { rewardId: string },
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const updatedHousehold = archiveReward(authorization.household, input.rewardId);
  const reward = updatedHousehold.rewards.find(
    (candidate) => candidate.id === input.rewardId,
  );
  if (!reward) {
    return { message: "Reward not found.", status: "error" };
  }

  const household = await dependencies.repository.saveReward(
    authorization.household.id,
    input.rewardId,
    {
      pointCost: reward.pointCost,
      status: reward.status,
      title: reward.title,
      type: reward.type,
      updatedAt: reward.updatedAt,
    },
  );

  return { household, message: "Reward archived.", status: "ok" };
}

async function updateParentChoreStatus(
  dependencies: HouseholdManagementDependencies,
  choreId: string,
  update: (household: Household, choreId: string) => Household,
  message: string,
): Promise<HouseholdManagementResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  const updatedHousehold = update(authorization.household, choreId);
  const updatedChore = updatedHousehold.chores.find((chore) => chore.id === choreId);
  if (!updatedChore) {
    return { message: "Chore not found.", status: "error" };
  }

  const household = await dependencies.repository.updateChoreStatus(
    authorization.household.id,
    choreId,
    { status: updatedChore.status },
  );

  return { household, message, status: "ok" };
}

async function authorizeParent(
  dependencies: HouseholdManagementDependencies,
): Promise<
  | { household: Household; status: "ok" }
  | { message: string; status: "error" }
> {
  const parent = await dependencies.getAuthenticatedParent();
  const email = normalizeEmail(parent?.email);

  if (!parent || !email) {
    return {
      message: "Sign in with an allowed Parent email.",
      status: "error",
    };
  }

  const household = await dependencies.repository.findHouseholdForParent(
    email,
    parent.userId,
  );

  if (!household) {
    return {
      message: "This Parent email is not allowed for the Household.",
      status: "error",
    };
  }

  return { household, status: "ok" };
}

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function getBalanceChanges(
  before: Household,
  after: Household,
): Array<{ childId: string; delta: number }> {
  return after.children.flatMap((child) => {
    const previous = before.children.find((candidate) => candidate.id === child.id);
    const delta = child.pointBalance - (previous?.pointBalance ?? child.pointBalance);
    return delta === 0 ? [] : [{ childId: child.id, delta }];
  });
}

function getNewLedgerEntries(
  before: Household,
  after: Household,
): PointLedgerEntry[] {
  const beforeIds = new Set(before.pointLedger.map((entry) => entry.id));
  return after.pointLedger.filter((entry) => !beforeIds.has(entry.id));
}

function getNewWins(before: Household, after: Household): ChildWin[] {
  const beforeIds = new Set(before.childWins.map((win) => win.id));
  return after.childWins.filter((win) => !beforeIds.has(win.id));
}
