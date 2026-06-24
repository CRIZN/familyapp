import { describe, expect, it, vi } from "vitest";

import {
  configureAppleCalendar,
  syncAppleCalendarEvents,
} from "@/domain/calendar";
import { getChildPointLedger, getChildWins } from "@/domain/chores";
import { createHousehold, type Household } from "@/domain/household";
import { getPointLedgerDisplay } from "@/domain/points";

import {
  addAllowedParent,
  archiveChoreForParent,
  createChoreForParent,
  pauseChoreForParent,
  updateChildPinForParent,
  updateChildProfile,
  archiveGoalForParent,
  archiveRewardForParent,
  awardBonusPointsForParent,
  configureCalendarForParent,
  completeGoalForParent,
  createPointAdjustmentForParent,
  createGoalForParent,
  createRewardForParent,
  updateEventParticipantsForParent,
  updateRewardForParent,
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

  it("saves Calendar metadata through Parent authorization without echoing the feed URL", async () => {
    const household = await createTestHousehold();
    const saveCalendarConnectionMock = vi.fn(async (_householdId, connection) => ({
      ...household,
      calendarConnection: connection,
    }));

    const saved = await configureCalendarForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, {
          saveCalendarConnection: saveCalendarConnectionMock,
        }),
      },
      {
        calendarName: " Family ",
        sourceUrl: " webcal://p01-caldav.icloud.com/published/2/family ",
      },
    );

    expect(saved.status).toBe("ok");
    expect(saveCalendarConnectionMock).toHaveBeenCalledWith(
      household.id,
      expect.objectContaining({
        calendarName: "Family",
        sourceUrl: "webcal://p01-caldav.icloud.com/published/2/family",
      }),
    );
    expect(
      saved.status === "ok" ? saved.household.calendarConnection?.sourceUrl : null,
    ).toBe("webcal://p01-caldav.icloud.com/published/2/family");

    const missingUrl = await configureCalendarForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, {
          saveCalendarConnection: saveCalendarConnectionMock,
        }),
      },
      { calendarName: "Family", sourceUrl: " " },
    );
    expect(missingUrl).toEqual({
      message: "Add the Apple Calendar source.",
      status: "error",
    });

    const denied = await configureCalendarForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "visitor@example.com",
          userId: "user-2",
        }),
        repository: createRepository(household, {
          findHouseholdForParent: async () => null,
          saveCalendarConnection: saveCalendarConnectionMock,
        }),
      },
      {
        calendarName: "Family",
        sourceUrl: "webcal://p01-caldav.icloud.com/published/2/family",
      },
    );
    expect(denied).toEqual({
      message: "This Parent email is not allowed for the Household.",
      status: "error",
    });
    expect(saveCalendarConnectionMock).toHaveBeenCalledTimes(1);
  });

  it("persists Event Participants through Parent authorization", async () => {
    const household = await createTestHousehold();
    const childId = household.children[0]!.id;
    const withCalendar = configureAppleCalendar(household, {
      calendarName: "Family",
      sourceUrl: "webcal://p01-caldav.icloud.com/published/2/family",
    });
    const withEvent = syncAppleCalendarEvents(withCalendar, [
      {
        appleEventId: "apple-1",
        endsAt: "2026-06-24T17:00:00.000Z",
        startsAt: "2026-06-24T16:00:00.000Z",
        title: "Soccer practice",
      },
    ]);
    const eventId = withEvent.calendarEvents[0]!.id;
    const saveEventEnrichmentMock = vi.fn(async (_householdId, enrichment) => ({
      ...withEvent,
      eventEnrichments: [enrichment],
    }));

    const result = await updateEventParticipantsForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(withEvent, {
          saveEventEnrichment: saveEventEnrichmentMock,
        }),
      },
      {
        eventId,
        isAllHousehold: false,
        participantChildIds: [childId],
      },
    );

    expect(result.status).toBe("ok");
    expect(saveEventEnrichmentMock).toHaveBeenCalledWith(
      withEvent.id,
      expect.objectContaining({
        eventId,
        isAllHousehold: false,
        participantChildIds: [childId],
      }),
    );
  });

  it("creates, completes, and archives Goals through the repository", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const createGoalMock = vi.fn(async (_householdId, goal) => ({
      ...household,
      goals: [...household.goals, goal],
    }));

    const created = await createGoalForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, { createGoal: createGoalMock }),
      },
      { childId: child.id, pointValue: 5, title: " Read daily " },
    );

    expect(created.status).toBe("ok");
    expect(createGoalMock).toHaveBeenCalledWith(
      household.id,
      expect.objectContaining({
        childId: child.id,
        pointValue: 5,
        status: "active",
        title: "Read daily",
      }),
    );

    const withGoal =
      created.status === "ok"
        ? created.household
        : { ...household, goals: [] };
    const goal = withGoal.goals[0]!;
    const saveGoalCompletionMock = vi.fn(async () => ({
      ...withGoal,
      goals: [{ ...goal, status: "completed" as const }],
    }));
    const completed = await completeGoalForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(withGoal, {
          saveGoalCompletion: saveGoalCompletionMock,
        }),
      },
      { goalId: goal.id },
    );

    expect(completed.status).toBe("ok");
    expect(saveGoalCompletionMock).toHaveBeenCalledWith(
      household.id,
      expect.objectContaining({
        balanceChanges: [{ childId: child.id, delta: 5 }],
        goal: expect.objectContaining({ id: goal.id, status: "completed" }),
        pointLedger: [
          expect.objectContaining({
            delta: 5,
            sourceId: goal.id,
            sourceType: "goal_completion",
          }),
        ],
      }),
    );

    const saveGoalStatusMock = vi.fn(async () => ({
      ...withGoal,
      goals: [{ ...goal, status: "archived" as const }],
    }));
    const archived = await archiveGoalForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(withGoal, {
          saveGoalStatus: saveGoalStatusMock,
        }),
      },
      { goalId: goal.id },
    );

    expect(archived.status).toBe("ok");
    expect(saveGoalStatusMock).toHaveBeenCalledWith(
      household.id,
      goal.id,
      expect.objectContaining({ status: "archived" }),
    );
  });

  it("awards Bonus Points and records Point Adjustments through authoritative ledger persistence", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const savePointEffectsMock = vi.fn(async (_householdId, input) => ({
      ...household,
      childWins: [
        {
          childId: child.id,
          description: "Approved Chore",
          earnedAt: "2026-06-23T10:00:00.000Z",
          id: "win-1",
          sourceId: "source-1",
          sourceType: "chore" as const,
          title: "Unload dishwasher",
        },
      ],
      children: household.children.map((candidate) =>
        candidate.id === input.balanceChanges[0]?.childId
          ? {
              ...candidate,
              pointBalance: candidate.pointBalance + input.balanceChanges[0]!.delta,
            }
          : candidate,
      ),
      pointLedger: input.pointLedger,
    }));

    const bonused = await awardBonusPointsForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, {
          savePointEffects: savePointEffectsMock,
        }),
      },
      { childId: child.id, points: 4, reason: "Kindness at breakfast" },
    );

    expect(bonused.status).toBe("ok");
    expect(savePointEffectsMock).toHaveBeenCalledWith(
      household.id,
      expect.objectContaining({
        balanceChanges: [{ childId: child.id, delta: 4 }],
        pointLedger: [
          expect.objectContaining({
            delta: 4,
            description: "Bonus Points: Kindness at breakfast",
            sourceType: "bonus_points",
          }),
        ],
      }),
    );
    expect(
      bonused.status === "ok"
        ? getChildPointLedger(bonused.household, child.id).map(getPointLedgerDisplay)
        : [],
    ).toEqual([
      { label: "Bonus Points", explanation: "Kindness at breakfast" },
    ]);
    expect(
      bonused.status === "ok" ? getChildWins(bonused.household, child.id) : [],
    ).toEqual([expect.objectContaining({ title: "Unload dishwasher" })]);

    const withBalance =
      bonused.status === "ok" ? bonused.household : { ...household };
    const adjustmentMock = vi.fn(async (_householdId, input) => ({
      ...withBalance,
      children: withBalance.children.map((candidate) =>
        candidate.id === input.balanceChanges[0]?.childId
          ? {
              ...candidate,
              pointBalance: candidate.pointBalance + input.balanceChanges[0]!.delta,
            }
          : candidate,
      ),
      pointLedger: [...withBalance.pointLedger, ...input.pointLedger],
    }));

    const adjusted = await createPointAdjustmentForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(withBalance, {
          savePointEffects: adjustmentMock,
        }),
      },
      { childId: child.id, points: -2, reason: "Corrected duplicate entry" },
    );

    expect(adjusted.status).toBe("ok");
    expect(adjustmentMock).toHaveBeenCalledWith(
      household.id,
      expect.objectContaining({
        balanceChanges: [{ childId: child.id, delta: -2 }],
        pointLedger: [
          expect.objectContaining({
            delta: -2,
            description: "Point Adjustment correction: Corrected duplicate entry",
            sourceType: "point_adjustment",
          }),
        ],
      }),
    );
    expect(
      adjusted.status === "ok"
        ? adjusted.household.children.find((candidate) => candidate.id === child.id)
            ?.pointBalance
        : null,
    ).toBe(2);
  });

  it("requires Point Adjustment reasons before persistence and enforces Parent allowlist", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const savePointEffectsMock = vi.fn();

    const missingReason = await createPointAdjustmentForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, {
          savePointEffects: savePointEffectsMock,
        }),
      },
      { childId: child.id, points: 3, reason: " " },
    );

    expect(missingReason).toEqual({
      message: "Point Adjustments need a reason.",
      status: "error",
    });
    expect(savePointEffectsMock).not.toHaveBeenCalled();

    const denied = await awardBonusPointsForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "visitor@example.com",
          userId: "user-2",
        }),
        repository: createRepository(household, {
          findHouseholdForParent: async () => null,
          savePointEffects: savePointEffectsMock,
        }),
      },
      { childId: child.id, points: 1, reason: "Helpful" },
    );

    expect(denied).toEqual({
      message: "This Parent email is not allowed for the Household.",
      status: "error",
    });
    expect(savePointEffectsMock).not.toHaveBeenCalled();
  });

  it("creates, updates, and archives Rewards through the repository", async () => {
    const household = await createTestHousehold();
    const createRewardMock = vi.fn(async (_householdId, reward) => ({
      ...household,
      rewards: [...household.rewards, reward],
    }));

    const created = await createRewardForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(household, {
          createReward: createRewardMock,
        }),
      },
      { pointCost: 10, title: " Movie night ", type: "experience" },
    );

    expect(created.status).toBe("ok");
    expect(createRewardMock).toHaveBeenCalledWith(
      household.id,
      expect.objectContaining({
        pointCost: 10,
        status: "active",
        title: "Movie night",
        type: "experience",
      }),
    );

    const withReward =
      created.status === "ok" ? created.household : { ...household, rewards: [] };
    const reward = withReward.rewards[0]!;
    const saveRewardMock = vi.fn(async () => ({
      ...withReward,
      rewards: [{ ...reward, title: "Movie matinee" }],
    }));

    const updated = await updateRewardForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(withReward, { saveReward: saveRewardMock }),
      },
      {
        pointCost: 8,
        rewardId: reward.id,
        title: "Movie matinee",
        type: "experience",
      },
    );

    expect(updated.status).toBe("ok");
    expect(saveRewardMock).toHaveBeenCalledWith(
      household.id,
      reward.id,
      expect.objectContaining({
        pointCost: 8,
        title: "Movie matinee",
        type: "experience",
      }),
    );

    const archived = await archiveRewardForParent(
      {
        getAuthenticatedParent: async () => ({
          email: "first@example.com",
          userId: "user-1",
        }),
        repository: createRepository(withReward, { saveReward: saveRewardMock }),
      },
      { rewardId: reward.id },
    );

    expect(archived.status).toBe("ok");
    expect(saveRewardMock).toHaveBeenLastCalledWith(
      household.id,
      reward.id,
      expect.objectContaining({ status: "archived" }),
    );
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
    approveChoreSubmissions: async () => household,
    createChore: async () => household,
    createGoal: async () => household,
    createReward: async () => household,
    createFirstRunHousehold: async () => undefined,
    findHouseholdForParent: async (email) =>
      email === "first@example.com" ? household : null,
    hasAnyHousehold: async () => true,
    listHouseholdsWithCalendarConnections: async () => [],
    markChoreSubmissionNeedsWork: async () => household,
    recordCalendarSyncStatus: async () => household,
    saveGoalCompletion: async () => household,
    saveGoalStatus: async () => household,
    saveCalendarConnection: async () => household,
    saveCalendarSync: async () => household,
    saveEventEnrichment: async () => household,
    saveProgressCheckInApproval: async () => household,
    saveProgressCheckInNeedsWork: async () => household,
    savePointEffects: async () => household,
    saveRewardRequestApproval: async () => household,
    saveRewardRequestFulfillment: async () => household,
    saveRewardRequestRejection: async () => household,
    saveReward: async () => household,
    skipChoreOccurrence: async () => household,
    updateChildPin: async () => household,
    updateChildProfile: async () => household,
    updateChoreStatus: async () => household,
    ...overrides,
  };
}
