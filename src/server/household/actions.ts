"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  createFirstRunHousehold,
  readFirstRunSetupInput,
  type FirstRunSetupResult,
} from "./first-run";
import {
  approveChoreSubmissionsForParent,
  approveProgressCheckInsForParent,
  approveRewardRequestForParent,
  fulfillRewardRequestForParent,
  markChoreSubmissionNeedsWorkForParent,
  markProgressCheckInNeedsWorkForParent,
  rejectRewardRequestForParent,
  skipChoreOccurrenceForParent,
  type HouseholdApprovalResult,
} from "./approvals";
import {
  addAllowedParent,
  archiveChoreForParent,
  archiveGoalForParent,
  archiveRewardForParent,
  completeGoalForParent,
  createChoreForParent,
  createGoalForParent,
  createRewardForParent,
  pauseChoreForParent,
  updateRewardForParent,
  updateChildPinForParent,
  updateChildProfile,
  type HouseholdManagementResult,
} from "./management";
import { createDrizzleHouseholdRepository } from "./repository";

export type FirstRunSetupActionState = {
  message: string | null;
  status: "error" | "idle";
};

export async function setupFirstRunHousehold(
  _previousState: FirstRunSetupActionState,
  formData: FormData,
): Promise<FirstRunSetupActionState> {
  let result: FirstRunSetupResult;

  try {
    result = await createFirstRunHousehold(
      {
        env: { FIRST_RUN_SETUP_TOKEN: process.env.FIRST_RUN_SETUP_TOKEN },
        getAuthenticatedParent: async () => {
          const supabase = await createSupabaseServerClient();
          const { data, error } = await supabase.auth.getUser();

          if (error || !data.user) {
            return null;
          }

          return {
            email: data.user.email,
            userId: data.user.id,
          };
        },
        repository: createDrizzleHouseholdRepository(),
      },
      readFirstRunSetupInput(formData),
    );
  } catch (caught) {
    return {
      message: caught instanceof Error ? caught.message : "Setup failed.",
      status: "error",
    };
  }

  if (result.status === "error") {
    return {
      message: result.message,
      status: "error",
    };
  }

  redirect("/parent");
}

export async function addAllowedParentAction(input: {
  email: string;
  name: string;
}): Promise<HouseholdManagementResult> {
  return runHouseholdManagementAction((dependencies) =>
    addAllowedParent(dependencies, input),
  );
}

export async function createChoreAction(input: {
  childId: string;
  dueDate: string;
  pointValue: number;
  routine: { frequency: "daily" | "weekly" } | null;
  title: string;
}): Promise<HouseholdManagementResult> {
  return runHouseholdManagementAction((dependencies) =>
    createChoreForParent(dependencies, input),
  );
}

export async function pauseChoreAction(input: {
  choreId: string;
}): Promise<HouseholdManagementResult> {
  return runHouseholdManagementAction((dependencies) =>
    pauseChoreForParent(dependencies, input),
  );
}

export async function archiveChoreAction(input: {
  choreId: string;
}): Promise<HouseholdManagementResult> {
  return runHouseholdManagementAction((dependencies) =>
    archiveChoreForParent(dependencies, input),
  );
}

export async function updateChildProfileAction(input: {
  childId: string;
  name: string;
}): Promise<HouseholdManagementResult> {
  return runHouseholdManagementAction((dependencies) =>
    updateChildProfile(dependencies, input),
  );
}

export async function updateChildPinAction(input: {
  childId: string;
  pin: string;
}): Promise<HouseholdManagementResult> {
  return runHouseholdManagementAction((dependencies) =>
    updateChildPinForParent(dependencies, input),
  );
}

export async function createGoalAction(input: {
  childId: string;
  pointValue: number;
  title: string;
}): Promise<HouseholdManagementResult> {
  return runHouseholdManagementAction((dependencies) =>
    createGoalForParent(dependencies, input),
  );
}

export async function archiveGoalAction(input: {
  goalId: string;
}): Promise<HouseholdManagementResult> {
  return runHouseholdManagementAction((dependencies) =>
    archiveGoalForParent(dependencies, input),
  );
}

export async function completeGoalAction(input: {
  goalId: string;
}): Promise<HouseholdManagementResult> {
  return runHouseholdManagementAction((dependencies) =>
    completeGoalForParent(dependencies, input),
  );
}

export async function createRewardAction(input: {
  pointCost: number;
  title: string;
  type: "allowance" | "experience" | "privilege" | "custom";
}): Promise<HouseholdManagementResult> {
  return runHouseholdManagementAction((dependencies) =>
    createRewardForParent(dependencies, input),
  );
}

export async function updateRewardAction(input: {
  pointCost: number;
  rewardId: string;
  title: string;
  type: "allowance" | "experience" | "privilege" | "custom";
}): Promise<HouseholdManagementResult> {
  return runHouseholdManagementAction((dependencies) =>
    updateRewardForParent(dependencies, input),
  );
}

export async function archiveRewardAction(input: {
  rewardId: string;
}): Promise<HouseholdManagementResult> {
  return runHouseholdManagementAction((dependencies) =>
    archiveRewardForParent(dependencies, input),
  );
}

export async function approveChoreSubmissionsAction(input: {
  submissionIds: string[];
}): Promise<HouseholdApprovalResult> {
  return runHouseholdApprovalAction((dependencies) =>
    approveChoreSubmissionsForParent(dependencies, input),
  );
}

export async function markChoreSubmissionNeedsWorkAction(input: {
  submissionId: string;
}): Promise<HouseholdApprovalResult> {
  return runHouseholdApprovalAction((dependencies) =>
    markChoreSubmissionNeedsWorkForParent(dependencies, input),
  );
}

export async function approveProgressCheckInsAction(input: {
  checkInIds: string[];
}): Promise<HouseholdApprovalResult> {
  return runHouseholdApprovalAction((dependencies) =>
    approveProgressCheckInsForParent(dependencies, input),
  );
}

export async function markProgressCheckInNeedsWorkAction(input: {
  checkInId: string;
}): Promise<HouseholdApprovalResult> {
  return runHouseholdApprovalAction((dependencies) =>
    markProgressCheckInNeedsWorkForParent(dependencies, input),
  );
}

export async function skipChoreOccurrenceAction(input: {
  childId: string;
  choreId: string;
  occurrenceDate: string;
}): Promise<HouseholdApprovalResult> {
  return runHouseholdApprovalAction((dependencies) =>
    skipChoreOccurrenceForParent(dependencies, input),
  );
}

export async function approveRewardRequestAction(input: {
  requestId: string;
}): Promise<HouseholdApprovalResult> {
  return runHouseholdApprovalAction((dependencies) =>
    approveRewardRequestForParent(dependencies, input),
  );
}

export async function rejectRewardRequestAction(input: {
  requestId: string;
}): Promise<HouseholdApprovalResult> {
  return runHouseholdApprovalAction((dependencies) =>
    rejectRewardRequestForParent(dependencies, input),
  );
}

export async function fulfillRewardRequestAction(input: {
  requestId: string;
}): Promise<HouseholdApprovalResult> {
  return runHouseholdApprovalAction((dependencies) =>
    fulfillRewardRequestForParent(dependencies, input),
  );
}

async function runHouseholdManagementAction(
  action: (
    dependencies: Parameters<typeof addAllowedParent>[0],
  ) => Promise<HouseholdManagementResult>,
): Promise<HouseholdManagementResult> {
  try {
    const result = await action({
      getAuthenticatedParent: async () => {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          return null;
        }

        return {
          email: data.user.email,
          userId: data.user.id,
        };
      },
      repository: createDrizzleHouseholdRepository(),
    });

    if (result.status === "ok") {
      revalidatePath("/parent");
      revalidatePath("/parent/chores");
      revalidatePath("/parent/goals");
      revalidatePath("/parent/rewards");
      revalidatePath("/child");
    }

    return result;
  } catch (caught) {
    return {
      message: caught instanceof Error ? caught.message : "Household update failed.",
      status: "error",
    };
  }
}

async function runHouseholdApprovalAction(
  action: (
    dependencies: Parameters<typeof approveChoreSubmissionsForParent>[0],
  ) => Promise<HouseholdApprovalResult>,
): Promise<HouseholdApprovalResult> {
  try {
    const result = await action({
      getAuthenticatedParent: async () => {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
          return null;
        }

        return {
          email: data.user.email,
          userId: data.user.id,
        };
      },
      repository: createDrizzleHouseholdRepository(),
    });

    if (result.status === "ok") {
      revalidatePath("/parent");
      revalidatePath("/parent/approvals");
      revalidatePath("/parent/goals");
      revalidatePath("/parent/points");
      revalidatePath("/parent/rewards");
      revalidatePath("/child");
    }

    return result;
  } catch (caught) {
    return {
      message: caught instanceof Error ? caught.message : "Approval update failed.",
      status: "error",
    };
  }
}
