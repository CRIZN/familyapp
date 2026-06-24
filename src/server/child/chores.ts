import "server-only";

import { submitChore, type ChoreSubmission } from "@/domain/chores";
import type { Household } from "@/domain/household";

import type { ChildSessionClaims } from "./session";

export type AuthenticatedChildContext = {
  household: Household;
  session: ChildSessionClaims;
};

export type ChildChoreRepository = {
  createChoreSubmission: (
    session: ChildSessionClaims,
    submission: ChoreSubmission,
  ) => Promise<Household>;
};

export type ChildChoreDependencies = {
  getAuthenticatedChild: () => Promise<AuthenticatedChildContext | null>;
  getTodayDateKey?: () => string;
  repository: ChildChoreRepository;
};

export type ChildChoreResult =
  | { household: Household; message: string; status: "ok" }
  | { message: string; status: "error" };

export async function submitChoreForChild(
  dependencies: ChildChoreDependencies,
  input: {
    choreId: string;
    occurrenceDate: string;
  },
): Promise<ChildChoreResult> {
  const context = await dependencies.getAuthenticatedChild();
  if (!context) {
    return { message: "Enter Child View again before submitting Chores.", status: "error" };
  }

  try {
    const updatedHousehold = submitChore(context.household, {
      childId: context.session.childId,
      choreId: input.choreId,
      occurrenceDate: input.occurrenceDate,
      today: dependencies.getTodayDateKey?.() ?? toDateKey(new Date()),
    });
    const createdSubmission = findCreatedPendingSubmission(
      context.household,
      updatedHousehold,
      {
        childId: context.session.childId,
        choreId: input.choreId,
        occurrenceDate: input.occurrenceDate,
      },
    );

    if (!createdSubmission) {
      return { message: "Could not submit Chore.", status: "error" };
    }

    const household = await dependencies.repository.createChoreSubmission(
      context.session,
      createdSubmission,
    );

    return { household, message: "Chore is waiting for Parent review.", status: "ok" };
  } catch (caught) {
    return {
      message: caught instanceof Error ? caught.message : "Could not submit Chore.",
      status: "error",
    };
  }
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function findCreatedPendingSubmission(
  before: Household,
  after: Household,
  expected: {
    childId: string;
    choreId: string;
    occurrenceDate: string;
  },
): ChoreSubmission | null {
  const existingIds = new Set(before.choreSubmissions.map((submission) => submission.id));
  return (
    after.choreSubmissions.find(
      (submission) =>
        !existingIds.has(submission.id) &&
        submission.childId === expected.childId &&
        submission.choreId === expected.choreId &&
        submission.occurrenceDate === expected.occurrenceDate &&
        submission.status === "pending",
    ) ?? null
  );
}
