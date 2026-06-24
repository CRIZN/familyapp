import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { resolveParentAppGate, type ParentAppGate } from "./parent-gate";

export async function getParentAppGate(): Promise<ParentAppGate> {
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;

  try {
    supabase = await createSupabaseServerClient();
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
    isParentAllowlisted: async () => {
      const { data, error } = await supabase
        .from("parents")
        .select("id")
        .limit(1);

      if (error) {
        return false;
      }

      return (data?.length ?? 0) > 0;
    },
  });
}
