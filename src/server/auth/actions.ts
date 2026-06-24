"use server";

import { headers } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type MagicLinkState = {
  message: string | null;
  status: "error" | "idle" | "sent";
};

export async function requestParentMagicLink(
  _previousState: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!isValidEmail(email)) {
    return {
      message: "Enter the Parent email address that has access to this app.",
      status: "error",
    };
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return {
      message: "Sign-in is not configured yet.",
      status: "error",
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: await getAuthCallbackUrl(),
      shouldCreateUser: true,
    },
  });

  if (error) {
    return {
      message: "The sign-in link could not be sent. Try again in a moment.",
      status: "error",
    };
  }

  return {
    message: "Check your email for the private sign-in link.",
    status: "sent",
  };
}

export async function signOutParent(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

async function getAuthCallbackUrl(): Promise<string> {
  const headerList = await headers();
  const origin = headerList.get("origin") ?? getConfiguredSiteOrigin();

  return new URL("/auth/callback", origin).toString();
}

function getConfiguredSiteOrigin(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) {
    return siteUrl;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

