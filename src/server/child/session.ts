import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { verifyChildPin, type Household } from "@/domain/household";

export const CHILD_SESSION_COOKIE_NAME = "familyapp.child-session.v1";
export const CHILD_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type ChildSessionClaims = {
  childId: string;
  householdId: string;
  sessionVersion: number;
};

export type ChildSessionCookieWriter = {
  delete: (name: string) => void;
  set: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      maxAge: number;
      path: string;
      sameSite: "lax";
      secure: boolean;
    },
  ) => void;
};

export type ChildSessionRepository = {
  findChildCredentials: (
    childId: string,
  ) => Promise<
    | {
        childId: string;
        householdId: string;
        pinHash: string;
        pinSalt: string;
        sessionVersion: number;
      }
    | null
  >;
  findHouseholdForChildSession: (
    claims: ChildSessionClaims,
  ) => Promise<Household | null>;
};

export type ChildSignInResult =
  | {
      cookieValue: string;
      maxAgeSeconds: number;
      status: "ok";
    }
  | { message: string; status: "error" };

export async function signInChildWithPin(
  dependencies: {
    repository: ChildSessionRepository;
    sessionSecret: string | undefined;
  },
  input: { childId: string; pin: string },
): Promise<ChildSignInResult> {
  const sessionSecret = dependencies.sessionSecret?.trim();
  if (!sessionSecret) {
    return {
      message: "Child sessions are not configured yet.",
      status: "error",
    };
  }

  const child = await dependencies.repository.findChildCredentials(input.childId);
  if (!child) {
    return {
      message: "Choose a Child and enter the correct PIN.",
      status: "error",
    };
  }

  const pinMatches = await verifyChildPin(input.pin.trim(), child);
  if (!pinMatches) {
    return {
      message: "Choose a Child and enter the correct PIN.",
      status: "error",
    };
  }

  return {
    cookieValue: signChildSessionClaims(
      {
        childId: child.childId,
        householdId: child.householdId,
        sessionVersion: child.sessionVersion,
      },
      sessionSecret,
    ),
    maxAgeSeconds: CHILD_SESSION_MAX_AGE_SECONDS,
    status: "ok",
  };
}

export async function validateChildSession(
  dependencies: {
    repository: ChildSessionRepository;
    sessionSecret: string | undefined;
  },
  cookieValue: string | undefined,
): Promise<
  | { household: Household; session: ChildSessionClaims; status: "authenticated" }
  | { status: "guest" }
> {
  const sessionSecret = dependencies.sessionSecret?.trim();
  if (!sessionSecret || !cookieValue) {
    return { status: "guest" };
  }

  const claims = parseChildSessionClaims(cookieValue, sessionSecret);
  if (!claims) {
    return { status: "guest" };
  }

  const household = await dependencies.repository.findHouseholdForChildSession(
    claims,
  );
  if (!household) {
    return { status: "guest" };
  }

  return { household, session: claims, status: "authenticated" };
}

export function writeChildSessionCookie(
  cookieStore: ChildSessionCookieWriter,
  cookieValue: string,
): void {
  cookieStore.set(CHILD_SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    maxAge: CHILD_SESSION_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearChildSessionCookie(
  cookieStore: ChildSessionCookieWriter,
): void {
  cookieStore.delete(CHILD_SESSION_COOKIE_NAME);
}

export function signChildSessionClaims(
  claims: ChildSessionClaims,
  secret: string,
): string {
  const payload = base64UrlEncode(JSON.stringify(claims));
  const signature = signPayload(payload, secret);

  return `${payload}.${signature}`;
}

export function parseChildSessionClaims(
  cookieValue: string,
  secret: string,
): ChildSessionClaims | null {
  const [payload, signature, extra] = cookieValue.split(".");
  if (!payload || !signature || extra) {
    return null;
  }

  const expectedSignature = signPayload(payload, secret);
  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as Partial<ChildSessionClaims>;
    if (
      typeof parsed.childId !== "string" ||
      typeof parsed.householdId !== "string" ||
      typeof parsed.sessionVersion !== "number"
    ) {
      return null;
    }

    return {
      childId: parsed.childId,
      householdId: parsed.householdId,
      sessionVersion: parsed.sessionVersion,
    };
  } catch {
    return null;
  }
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function constantTimeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}
