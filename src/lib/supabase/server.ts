import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseConfig } from "./config";

export async function createSupabaseServerClient(response?: NextResponse) {
  const cookieStore = await cookies();
  const config = getSupabaseConfig();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Server Components cannot write refreshed auth cookies. Route handlers
            // and server actions still can, so the auth boundary remains server-side.
          }

          response?.cookies.set(name, value, options);
        });
      },
    },
  });
}
