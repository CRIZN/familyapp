import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncCalendarIfStale } from "@/server/calendar/service";

import { createDrizzleHouseholdRepository } from "./repository";

export async function getCurrentParentHousehold(options?: {
  syncCalendarIfStale?: boolean;
}) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.email) {
      return null;
    }

    const repository = createDrizzleHouseholdRepository();
    const household = await repository.findHouseholdForParent(
      data.user.email,
      data.user.id,
    );
    if (!household || !options?.syncCalendarIfStale) {
      return household;
    }

    return syncCalendarIfStale({ repository }, household);
  } catch {
    return null;
  }
}

export async function getFirstRunSetupAccess(): Promise<
  | { email: string; status: "available" }
  | { message: string; status: "unavailable" }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.email) {
      return {
        message: "Sign in with the first Parent email before setup.",
        status: "unavailable",
      };
    }

    if (await createDrizzleHouseholdRepository().hasAnyHousehold()) {
      return {
        message: "Household setup is already complete.",
        status: "unavailable",
      };
    }

    return {
      email: data.user.email.trim().toLowerCase(),
      status: "available",
    };
  } catch {
    return {
      message: "Setup is not configured yet.",
      status: "unavailable",
    };
  }
}
