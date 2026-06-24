import { describe, expect, it, vi } from "vitest";

import { resolveParentAppGate, type ParentGateUser } from "./parent-gate";

describe("parent app gate", () => {
  it("locks anonymous visitors before checking the Parent allowlist", async () => {
    const isParentAllowlisted = vi.fn();

    await expect(
      resolveParentAppGate({
        getUser: async () => null,
        isParentAllowlisted,
      }),
    ).resolves.toEqual({ status: "locked" });

    expect(isParentAllowlisted).not.toHaveBeenCalled();
  });

  it("allows authenticated Parents only when their normalized email is allowlisted", async () => {
    const user: ParentGateUser = {
      email: "  Parent@Example.com ",
      id: "user-1",
    };
    const isParentAllowlisted = vi.fn(async () => true);

    await expect(
      resolveParentAppGate({
        getUser: async () => user,
        isParentAllowlisted,
      }),
    ).resolves.toEqual({
      email: "parent@example.com",
      status: "allowed",
      userId: "user-1",
    });

    expect(isParentAllowlisted).toHaveBeenCalledWith("parent@example.com", "user-1");
  });

  it("denies authenticated users without allowlisted Parent access", async () => {
    await expect(
      resolveParentAppGate({
        getUser: async () => ({ email: "visitor@example.com", id: "user-2" }),
        isParentAllowlisted: async () => false,
      }),
    ).resolves.toEqual({ status: "denied" });
  });

  it("fails closed when the allowlist cannot be checked", async () => {
    await expect(
      resolveParentAppGate({
        getUser: async () => ({ email: "parent@example.com", id: "user-3" }),
        isParentAllowlisted: async () => {
          throw new Error("database unavailable");
        },
      }),
    ).resolves.toEqual({ status: "denied" });
  });
});

