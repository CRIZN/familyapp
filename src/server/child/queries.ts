import "server-only";

import { cookies } from "next/headers";

import type { Household } from "@/domain/household";

import { createDrizzleChildAppRepository, type ChildSignInOptions } from "./repository";
import {
  CHILD_SESSION_COOKIE_NAME,
  validateChildSession,
  type ChildSessionClaims,
} from "./session";

export async function getCurrentChildSession(): Promise<
  | {
      household: Household;
      session: ChildSessionClaims;
    }
  | null
> {
  try {
    const cookieValue = (await cookies()).get(CHILD_SESSION_COOKIE_NAME)?.value;
    const result = await validateChildSession(
      {
        repository: createDrizzleChildAppRepository(),
        sessionSecret: process.env.CHILD_SESSION_SECRET,
      },
      cookieValue,
    );

    if (result.status === "guest") {
      return null;
    }

    return {
      household: result.household,
      session: result.session,
    };
  } catch {
    return null;
  }
}

export async function getChildSignInOptions(): Promise<ChildSignInOptions | null> {
  try {
    return createDrizzleChildAppRepository().getChildSignInOptions();
  } catch {
    return null;
  }
}
