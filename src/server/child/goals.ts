import "server-only";

import {
  submitProgressCheckIn,
  type ProgressCheckIn,
} from "@/domain/goals";
import type { Household } from "@/domain/household";

import type { ChildSessionClaims } from "./session";

export type ChildGoalRepository = {
  createProgressCheckIn: (
    session: ChildSessionClaims,
    checkIn: ProgressCheckIn,
  ) => Promise<Household>;
};

export type ChildGoalDependencies = {
  getAuthenticatedChild: () => Promise<{
    household: Household;
    session: ChildSessionClaims;
  } | null>;
  repository: ChildGoalRepository;
};

export type ChildGoalResult =
  | { household: Household; message: string; status: "ok" }
  | { message: string; status: "error" };

export async function submitProgressCheckInForChild(
  dependencies: ChildGoalDependencies,
  input: { goalId: string },
): Promise<ChildGoalResult> {
  const context = await dependencies.getAuthenticatedChild();
  if (!context) {
    return {
      message: "Enter Child View again before submitting Progress Check-ins.",
      status: "error",
    };
  }

  try {
    const updated = submitProgressCheckIn(context.household, {
      childId: context.session.childId,
      goalId: input.goalId,
    });
    const checkIn = findCreatedCheckIn(context.household, updated, {
      childId: context.session.childId,
      goalId: input.goalId,
    });

    if (!checkIn) {
      return { message: "Could not submit Progress Check-in.", status: "error" };
    }

    const household = await dependencies.repository.createProgressCheckIn(
      context.session,
      checkIn,
    );

    return {
      household,
      message: "Progress Check-in is waiting for Parent review.",
      status: "ok",
    };
  } catch (caught) {
    return {
      message:
        caught instanceof Error
          ? caught.message
          : "Could not submit Progress Check-in.",
      status: "error",
    };
  }
}

function findCreatedCheckIn(
  before: Household,
  after: Household,
  expected: { childId: string; goalId: string },
): ProgressCheckIn | null {
  const beforeIds = new Set(before.progressCheckIns.map((checkIn) => checkIn.id));
  return (
    after.progressCheckIns.find(
      (checkIn) =>
        !beforeIds.has(checkIn.id) &&
        checkIn.childId === expected.childId &&
        checkIn.goalId === expected.goalId &&
        checkIn.status === "pending",
    ) ?? null
  );
}
