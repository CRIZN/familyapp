import "server-only";

import {
  approveChoreSubmissions,
  markChoreSubmissionNeedsWork,
  skipChoreOccurrence,
  type ChoreSubmission,
  type SkippedChoreOccurrence,
} from "@/domain/chores";
import {
  approveProgressCheckIns,
  markProgressCheckInNeedsWork,
  type ProgressCheckIn,
} from "@/domain/goals";
import type { ChildWin, Household, PointLedgerEntry } from "@/domain/household";

export type ParentApprovalUser = {
  email: string | null | undefined;
  userId: string;
};

export type ChoreApprovalPersistence = {
  approvedSubmissions: ChoreSubmission[];
  balanceChanges: Array<{ childId: string; delta: number }>;
  childWins: ChildWin[];
  pointLedger: PointLedgerEntry[];
};

export type HouseholdApprovalRepository = {
  approveChoreSubmissions: (
    householdId: string,
    input: ChoreApprovalPersistence,
  ) => Promise<Household>;
  findHouseholdForParent: (
    email: string,
    authUserId: string,
  ) => Promise<Household | null>;
  markChoreSubmissionNeedsWork: (
    householdId: string,
    input: { reviewedAt: string; submissionId: string },
  ) => Promise<Household>;
  saveProgressCheckInApproval: (
    householdId: string,
    input: {
      balanceChanges: Array<{ childId: string; delta: number }>;
      childWins: ChildWin[];
      pointLedger: PointLedgerEntry[];
      progressCheckIns: ProgressCheckIn[];
    },
  ) => Promise<Household>;
  saveProgressCheckInNeedsWork: (
    householdId: string,
    input: { checkInId: string; reviewedAt: string },
  ) => Promise<Household>;
  skipChoreOccurrence: (
    householdId: string,
    input: SkippedChoreOccurrence,
  ) => Promise<Household>;
};

export type HouseholdApprovalDependencies = {
  getAuthenticatedParent: () => Promise<ParentApprovalUser | null>;
  repository: HouseholdApprovalRepository;
};

export type HouseholdApprovalResult =
  | { household: Household; message: string; status: "ok" }
  | { message: string; status: "error" };

export async function approveChoreSubmissionsForParent(
  dependencies: HouseholdApprovalDependencies,
  input: { submissionIds: string[] },
): Promise<HouseholdApprovalResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  try {
    const updated = approveChoreSubmissions(
      authorization.household,
      input.submissionIds,
    );
    const persistence = getChoreApprovalPersistence(
      authorization.household,
      updated,
      input.submissionIds,
    );
    const household = await dependencies.repository.approveChoreSubmissions(
      authorization.household.id,
      persistence,
    );

    return { household, message: "Chore Submissions approved.", status: "ok" };
  } catch (caught) {
    return {
      message:
        caught instanceof Error ? caught.message : "Could not approve Chore Submissions.",
      status: "error",
    };
  }
}

export async function markChoreSubmissionNeedsWorkForParent(
  dependencies: HouseholdApprovalDependencies,
  input: { submissionId: string },
): Promise<HouseholdApprovalResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  try {
    const updated = markChoreSubmissionNeedsWork(
      authorization.household,
      input.submissionId,
    );
    const reviewedSubmission = updated.choreSubmissions.find(
      (submission) => submission.id === input.submissionId,
    );
    if (!reviewedSubmission?.reviewedAt) {
      return { message: "Could not update Chore Submission.", status: "error" };
    }

    const household = await dependencies.repository.markChoreSubmissionNeedsWork(
      authorization.household.id,
      {
        reviewedAt: reviewedSubmission.reviewedAt,
        submissionId: input.submissionId,
      },
    );

    return { household, message: "Chore Submission marked Needs Work.", status: "ok" };
  } catch (caught) {
    return {
      message:
        caught instanceof Error
          ? caught.message
          : "Could not mark Chore Submission Needs Work.",
      status: "error",
    };
  }
}

export async function approveProgressCheckInsForParent(
  dependencies: HouseholdApprovalDependencies,
  input: { checkInIds: string[] },
): Promise<HouseholdApprovalResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  try {
    const updated = approveProgressCheckIns(
      authorization.household,
      input.checkInIds,
    );
    const household = await dependencies.repository.saveProgressCheckInApproval(
      authorization.household.id,
      getProgressCheckInApprovalPersistence(
        authorization.household,
        updated,
        input.checkInIds,
      ),
    );

    return { household, message: "Progress Check-ins approved.", status: "ok" };
  } catch (caught) {
    return {
      message:
        caught instanceof Error
          ? caught.message
          : "Could not approve Progress Check-ins.",
      status: "error",
    };
  }
}

export async function markProgressCheckInNeedsWorkForParent(
  dependencies: HouseholdApprovalDependencies,
  input: { checkInId: string },
): Promise<HouseholdApprovalResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  try {
    const updated = markProgressCheckInNeedsWork(
      authorization.household,
      input.checkInId,
    );
    const reviewedCheckIn = updated.progressCheckIns.find(
      (checkIn) => checkIn.id === input.checkInId,
    );
    if (!reviewedCheckIn?.reviewedAt) {
      return { message: "Could not update Progress Check-in.", status: "error" };
    }

    const household = await dependencies.repository.saveProgressCheckInNeedsWork(
      authorization.household.id,
      {
        checkInId: input.checkInId,
        reviewedAt: reviewedCheckIn.reviewedAt,
      },
    );

    return {
      household,
      message: "Progress Check-in marked Needs Work.",
      status: "ok",
    };
  } catch (caught) {
    return {
      message:
        caught instanceof Error
          ? caught.message
          : "Could not mark Progress Check-in Needs Work.",
      status: "error",
    };
  }
}

export async function skipChoreOccurrenceForParent(
  dependencies: HouseholdApprovalDependencies,
  input: { childId: string; choreId: string; occurrenceDate: string },
): Promise<HouseholdApprovalResult> {
  const authorization = await authorizeParent(dependencies);
  if (authorization.status === "error") return authorization;

  try {
    const updated = skipChoreOccurrence(authorization.household, input);
    const skippedOccurrence = findSkippedOccurrence(
      authorization.household,
      updated,
      input,
    );
    if (!skippedOccurrence) {
      return {
        household: authorization.household,
        message: "Chore occurrence already skipped.",
        status: "ok",
      };
    }

    const household = await dependencies.repository.skipChoreOccurrence(
      authorization.household.id,
      skippedOccurrence,
    );

    return { household, message: "Chore occurrence skipped.", status: "ok" };
  } catch (caught) {
    return {
      message: caught instanceof Error ? caught.message : "Could not skip Chore.",
      status: "error",
    };
  }
}

async function authorizeParent(
  dependencies: HouseholdApprovalDependencies,
): Promise<
  | { household: Household; status: "ok" }
  | { message: string; status: "error" }
> {
  const parent = await dependencies.getAuthenticatedParent();
  const email = normalizeEmail(parent?.email);

  if (!parent || !email) {
    return {
      message: "Sign in with an allowed Parent email.",
      status: "error",
    };
  }

  const household = await dependencies.repository.findHouseholdForParent(
    email,
    parent.userId,
  );

  if (!household) {
    return {
      message: "This Parent email is not allowed for the Household.",
      status: "error",
    };
  }

  return { household, status: "ok" };
}

function getChoreApprovalPersistence(
  before: Household,
  after: Household,
  submissionIds: string[],
): ChoreApprovalPersistence {
  const requestedIds = new Set(submissionIds);
  const approvedSubmissions = after.choreSubmissions.filter(
    (submission) => requestedIds.has(submission.id) && submission.status === "approved",
  );
  const beforeLedgerIds = new Set(before.pointLedger.map((entry) => entry.id));
  const beforeWinIds = new Set(before.childWins.map((win) => win.id));

  return {
    approvedSubmissions,
    balanceChanges: after.children.flatMap((child) => {
      const previous = before.children.find((candidate) => candidate.id === child.id);
      const delta = child.pointBalance - (previous?.pointBalance ?? child.pointBalance);
      return delta === 0 ? [] : [{ childId: child.id, delta }];
    }),
    childWins: after.childWins.filter((win) => !beforeWinIds.has(win.id)),
    pointLedger: after.pointLedger.filter((entry) => !beforeLedgerIds.has(entry.id)),
  };
}

function findSkippedOccurrence(
  before: Household,
  after: Household,
  input: { childId: string; choreId: string; occurrenceDate: string },
): SkippedChoreOccurrence | null {
  const beforeIds = new Set(
    before.skippedChoreOccurrences.map((occurrence) => occurrence.id),
  );
  return (
    after.skippedChoreOccurrences.find(
      (occurrence) =>
        !beforeIds.has(occurrence.id) &&
        occurrence.childId === input.childId &&
        occurrence.choreId === input.choreId &&
        occurrence.occurrenceDate === input.occurrenceDate,
    ) ?? null
  );
}

function getProgressCheckInApprovalPersistence(
  before: Household,
  after: Household,
  checkInIds: string[],
): {
  balanceChanges: Array<{ childId: string; delta: number }>;
  childWins: ChildWin[];
  pointLedger: PointLedgerEntry[];
  progressCheckIns: ProgressCheckIn[];
} {
  const requestedIds = new Set(checkInIds);
  const beforeLedgerIds = new Set(before.pointLedger.map((entry) => entry.id));
  const beforeWinIds = new Set(before.childWins.map((win) => win.id));

  return {
    balanceChanges: after.children.flatMap((child) => {
      const previous = before.children.find((candidate) => candidate.id === child.id);
      const delta = child.pointBalance - (previous?.pointBalance ?? child.pointBalance);
      return delta === 0 ? [] : [{ childId: child.id, delta }];
    }),
    childWins: after.childWins.filter((win) => !beforeWinIds.has(win.id)),
    pointLedger: after.pointLedger.filter((entry) => !beforeLedgerIds.has(entry.id)),
    progressCheckIns: after.progressCheckIns.filter(
      (checkIn) => requestedIds.has(checkIn.id) && checkIn.status === "approved",
    ),
  };
}

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}
