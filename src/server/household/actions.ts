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
  addAllowedParent,
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
