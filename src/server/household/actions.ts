"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  createFirstRunHousehold,
  readFirstRunSetupInput,
  type FirstRunSetupResult,
} from "./first-run";
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
