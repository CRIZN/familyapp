export const AUTH_ERROR_PARAM = "authError";
export const AUTH_ERROR_INVALID_LINK = "invalid_link";

const EMAIL_OTP_TYPES = [
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
] as const;

export type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number];

export function isEmailOtpType(
  value: string | null | undefined,
): value is EmailOtpType {
  return !!value && (EMAIL_OTP_TYPES as readonly string[]).includes(value);
}

export function hasRedeemableAuthParams(searchParams: URLSearchParams): boolean {
  if (searchParams.get("code")) {
    return true;
  }

  const tokenHash = getTokenHash(searchParams);
  return Boolean(tokenHash && isEmailOtpType(searchParams.get("type")));
}

export function getTokenHash(searchParams: URLSearchParams): string | null {
  return searchParams.get("token_hash") ?? searchParams.get("token");
}

export function getAuthCallbackForwardHref(currentUrl: string): string | null {
  const url = new URL(currentUrl);

  if (url.pathname === "/auth/callback") {
    return null;
  }

  if (!hasRedeemableAuthParams(url.searchParams)) {
    return null;
  }

  return new URL(`/auth/callback${url.search}`, url.origin).toString();
}

export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

export function readAuthLinkErrorMessage(search: string): string | null {
  const searchParams = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );

  if (
    searchParams.get(AUTH_ERROR_PARAM) === AUTH_ERROR_INVALID_LINK ||
    searchParams.has("error") ||
    searchParams.has("error_code")
  ) {
    return "This sign-in link is invalid or has expired. Request a new one.";
  }

  return null;
}
