import { type NextRequest, NextResponse } from "next/server";

import {
  AUTH_ERROR_INVALID_LINK,
  AUTH_ERROR_PARAM,
  getTokenHash,
  isEmailOtpType,
  safeNextPath,
} from "@/features/auth/magic-link-params";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = getTokenHash(requestUrl.searchParams);
  const type = requestUrl.searchParams.get("type");
  const next = safeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const response = NextResponse.redirect(new URL(next, requestUrl.origin));
    const supabase = await createSupabaseServerClient(response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  } else if (tokenHash && isEmailOtpType(type)) {
    const response = NextResponse.redirect(new URL(next, requestUrl.origin));
    const supabase = await createSupabaseServerClient(response);
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(
    new URL(`/?${AUTH_ERROR_PARAM}=${AUTH_ERROR_INVALID_LINK}`, requestUrl.origin),
  );
}
