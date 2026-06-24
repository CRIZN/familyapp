import { describe, expect, it, vi } from "vitest";

import { createHousehold, type Household } from "@/domain/household";

import {
  addAllowedParent,
  archiveChoreForParent,
  createChoreForParent,
  pauseChoreForParent,
  updateChildPinForParent,
  updateChildProfile,
} from "./management";
import type { HouseholdRepository } from "./repository";

describe("Household management", () => {
  it("creates one-time and recurring Chores through the repository", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const createChoreMock = vi.fn(async (_householdId, chore) => ({
      ...household,
      chores: [...household.chores, chore],
    }));

    const oneTime = await createChoreForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, {
          createChore: createChoreMock,
        }),
      },
      {
        childId: child.id,
        dueDate: "2026-06-24",
        pointValue: 3,
        routine: null,
        title: " Unload dishwasher ",
      },
    );

    const recurring = await createChoreForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, {
          createChore: createChoreMock,
        }),
      },
      {
        childId: child.id,
        dueDate: "2026-06-25",
        pointValue: 2,
        routine: { frequency: "weekly" },
        title: "Practice piano",
      },
    );

    expect(oneTime.status).toBe("ok");
    expect(recurring.status).toBe("ok");
    expect(createChoreMock).toHaveBeenNthCalledWith(
      1,
      household.id,
      expect.objectContaining({
        childId: child.id,
        dueDate: "2026-06-24",
        pointValue: 3,
        routine: null,
        status: "active",
        title: "Unload dishwasher",
      }),
    );
    expect(createChoreMock).toHaveBeenNthCalledWith(
      2,
      household.id,
      expect.objectContaining({
        routine: { frequency: "weekly" },
        title: "Practice piano",
      }),
    );
  });

  it("pauses and archives Chores through the repository", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const withChore =
      (await createChoreForParent(
        {
          getAuthenticatedParent: async () => ({
            email: "first@example.com",
            userId: "user-1",
          }),
          repository: createRepository(household, {
            createChore: async (_householdId, chore) => ({
              ...household,
              chores: [...household.chores, chore],
            }),
          }),
        },
        {
          childId: child.id,
          dueDate: "2026-06-24",
          pointValue: 3,
          routine: null,
          title: "Unload dishwasher",
        },
      )) as Extract<Awaited<ReturnType<typeof createChoreForParent>>, { status: "ok" }>;
    const chore = withChore.household.chores[0]!;
    const updateChoreStatusMock = vi.fn(async (_householdId, _choreId, input) => ({
      ...withChore.household,
      chores: withChore.household.chores.map((candidate) =>
        candidate.id === chore.id
          ? { ...candidate, status: input.status }
          : candidate,
      ),
    }));

    const paused = await pauseChoreForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(withChore.household, {
          updateChoreStatus: updateChoreStatusMock,
        }),
      },
      { choreId: chore.id },
    );

    const archived = await archiveChoreForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository({
          ...withChore.household,
          chores: [{ ...chore, status: "paused" }],
        }, {
          updateChoreStatus: updateChoreStatusMock,
        }),
      },
      { choreId: chore.id },
    );

    expect(paused.status).toBe("ok");
    expect(archived.status).toBe("ok");
    expect(updateChoreStatusMock).toHaveBeenNthCalledWith(1, household.id, chore.id, {
      status: "paused",
    });
    expect(updateChoreStatusMock).toHaveBeenNthCalledWith(2, household.id, chore.id, {
      status: "archived",
    });
  });

  it("adds Parent rows for invited email addresses after allowlisted access", async () => {
    const household = await createTestHousehold();
    const addAllowedParentMock = vi.fn(async () => ({
      ...household,
      parents: [
        ...household.parents,
        { email: "second@example.com", id: "parent-2", name: "Second" },
      ],
    }));

    const result = await addAllowedParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, {
          addAllowedParent: addAllowedParentMock,
        }),
      },
      { email: " Second@Example.com ", name: " Second " },
    );

    expect(result.status).toBe("ok");
    expect(addAllowedParentMock).toHaveBeenCalledWith(household.id, {
      email: "second@example.com",
      name: "Second",
    });
  });

  it("denies Household mutations when the authenticated email is not allowlisted", async () => {
    const household = await createTestHousehold();
    const updateChildProfileMock = vi.fn();
    const createChoreMock = vi.fn();

    const result = await updateChildProfile(
      {
        getAuthenticatedParent: async () => ({
          email: "visitor@example.com",
          userId: "user-2",
        }),
        repository: createRepository(household, {
          findHouseholdForParent: async () => null,
          updateChildProfile: updateChildProfileMock,
        }),
      },
      { childId: household.children[0]!.id, name: "Ada" },
    );

    expect(result).toEqual({
      message: "This Parent email is not allowed for the Household.",
      status: "error",
    });
    expect(updateChildProfileMock).not.toHaveBeenCalled();

    const choreResult = await createChoreForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "visitor@example.com",
          userId: "user-2",
        }),
        repository: createRepository(household, {
          createChore: createChoreMock,
          findHouseholdForParent: async () => null,
        }),
      },
      {
        childId: household.children[0]!.id,
        dueDate: "2026-06-24",
        pointValue: 1,
        routine: null,
        title: "Unload dishwasher",
      },
    );

    expect(choreResult).toEqual({
      message: "This Parent email is not allowed for the Household.",
      status: "error",
    });
    expect(createChoreMock).not.toHaveBeenCalled();
  });

  it("updates Child profile names through the repository", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const updateChildProfileMock = vi.fn(async () => ({
      ...household,
      children: household.children.map((candidate) =>
        candidate.id === child.id ? { ...candidate, name: "Ada Lovelace" } : candidate,
      ),
    }));

    const result = await updateChildProfile(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, {
          updateChildProfile: updateChildProfileMock,
        }),
      },
      { childId: child.id, name: " Ada Lovelace " },
    );

    expect(result.status).toBe("ok");
    expect(updateChildProfileMock).toHaveBeenCalledWith(household.id, child.id, {
      name: "Ada Lovelace",
    });
  });

  it("hashes Child PIN updates server-side and returns invalidation data", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const updateChildPinMock = vi.fn(async () => ({
      ...household,
      children: household.children.map((candidate) =>
        candidate.id === child.id
          ? { ...candidate, pinHash: "", pinSalt: "", sessionVersion: 2 }
          : candidate,
      ),
    }));

    const result = await updateChildPinForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, {
          updateChildPin: updateChildPinMock,
        }),
      },
      { childId: child.id, pin: "2468" },
    );

    expect(result.status).toBe("ok");
    expect(updateChildPinMock).toHaveBeenCalledWith(
      household.id,
      child.id,
      expect.objectContaining({
        pinHash: expect.not.stringContaining("2468"),
        pinSalt: expect.any(String),
      }),
    );
    expect(result.status === "ok" && result.household.children[0]).toMatchObject({
      pinHash: "",
      pinSalt: "",
      sessionVersion: 2,
    });
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
  overrides: Partial<HouseholdRepository> = {},
): HouseholdRepository {
  return {
    addAllowedParent: async () => household,
    createChore: async () => household,
    createFirstRunHousehold: async () => undefined,
    findHouseholdForParent: async (email) =>
      email === "first@example.com" ? household : null,
    hasAnyHousehold: async () => true,
    updateChildPin: async () => household,
    updateChildProfile: async () => household,
    updateChoreStatus: async () => household,
    ...overrides,
  };
}
