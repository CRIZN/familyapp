import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDrizzleHouseholdRepository } from "@/server/household/repository";

import { resolveParentAppGate, type ParentAppGate } from "./parent-gate";

export async function getParentAppGate(): Promise<ParentAppGate> {
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  let repository: ReturnType<typeof createDrizzleHouseholdRepository>;

  try {
    supabase = await createSupabaseServerClient();
    repository = createDrizzleHouseholdRepository();
  } catch {
    return { status: "locked" };
  }

  return resolveParentAppGate({
    getUser: async () => {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        return null;
      }

      return {
        email: data.user.email,
        id: data.user.id,
      };
    },
    hasAnyHousehold: () => repository.hasAnyHousehold(),
    isParentAllowlisted: async (email, userId) =>
      (await repository.findHouseholdForParent(email, userId)) !== null,
  });
}
