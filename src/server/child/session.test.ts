import { describe, expect, it, vi } from "vitest";

import { createHousehold, type Household } from "@/domain/household";

import {
  CHILD_SESSION_COOKIE_NAME,
  clearChildSessionCookie,
  parseChildSessionClaims,
  signChildSessionClaims,
  signInChildWithPin,
  validateChildSession,
  writeChildSessionCookie,
  type ChildSessionRepository,
} from "./session";

describe("Child PIN sessions", () => {
  it("verifies the selected Child PIN and creates minimal signed session claims", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;

    const result = await signInChildWithPin(
      {
        repository: createRepository(household),
        sessionSecret: "test-secret",
      },
      { childId: child.id, pin: "1234" },
    );

    expect(result.status).toBe("ok");
    expect(result.status === "ok" && result.maxAgeSeconds).toBe(60 * 60 * 24 * 30);
    expect(
      result.status === "ok"
        ? parseChildSessionClaims(result.cookieValue, "test-secret")
        : null,
    ).toEqual({
      childId: child.id,
      householdId: household.id,
      sessionVersion: 1,
    });
  });

  it("rejects an invalid PIN without creating a session cookie", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;

    const result = await signInChildWithPin(
      {
        repository: createRepository(household),
        sessionSecret: "test-secret",
      },
      { childId: child.id, pin: "9999" },
    );

    expect(result).toEqual({
      message: "Choose a Child and enter the correct PIN.",
      status: "error",
    });
  });

  it("validates the signed cookie against the current Child row before returning data", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const findHouseholdForChildSession = vi.fn(async () => ({
      ...household,
      children: [child],
    }));
    const cookieValue = signChildSessionClaims(
      {
        childId: child.id,
        householdId: household.id,
        sessionVersion: 1,
      },
      "test-secret",
    );

    const result = await validateChildSession(
      {
        repository: createRepository(household, { findHouseholdForChildSession }),
        sessionSecret: "test-secret",
      },
      cookieValue,
    );

    expect(result.status).toBe("authenticated");
    expect(findHouseholdForChildSession).toHaveBeenCalledWith({
      childId: child.id,
      householdId: household.id,
      sessionVersion: 1,
    });
    expect(result.status === "authenticated" && result.household.children).toEqual([
      child,
    ]);
  });

  it("treats older signed cookies as guests after a PIN change increments the session version", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const cookieValue = signChildSessionClaims(
      {
        childId: child.id,
        householdId: household.id,
        sessionVersion: 1,
      },
      "test-secret",
    );

    const result = await validateChildSession(
      {
        repository: createRepository(household, {
          findHouseholdForChildSession: async () => null,
        }),
        sessionSecret: "test-secret",
      },
      cookieValue,
    );

    expect(result).toEqual({ status: "guest" });
  });

  it("writes an httpOnly same-site cookie and clears it on logout", () => {
    const set = vi.fn();
    const deleteCookie = vi.fn();
    const cookieStore = { delete: deleteCookie, set };

    writeChildSessionCookie(cookieStore, "signed-cookie");
    clearChildSessionCookie(cookieStore);

    expect(set).toHaveBeenCalledWith(
      CHILD_SESSION_COOKIE_NAME,
      "signed-cookie",
      expect.objectContaining({
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
        sameSite: "lax",
      }),
    );
    expect(deleteCookie).toHaveBeenCalledWith(CHILD_SESSION_COOKIE_NAME);
  });
});

async function createTestHousehold(): Promise<Household> {
  return createHousehold({
    children: [{ name: "Ada", pin: "1234" }],
    householdName: "Clozcasa",
    parents: [{ email: "first@example.com", name: "First" }],
  });
}

function createRepository(
  household: Household,
  overrides: Partial<ChildSessionRepository> = {},
): ChildSessionRepository {
  const child = household.children[0]!;

  return {
    findChildCredentials: async (childId) =>
      childId === child.id
        ? {
            childId: child.id,
            householdId: household.id,
            pinHash: child.pinHash,
            pinSalt: child.pinSalt,
            sessionVersion: child.sessionVersion ?? 1,
          }
        : null,
    findHouseholdForChildSession: async (claims) =>
      claims.childId === child.id &&
      claims.householdId === household.id &&
      claims.sessionVersion === (child.sessionVersion ?? 1)
        ? {
            ...household,
            children: [child],
          }
        : null,
    ...overrides,
  };
}
