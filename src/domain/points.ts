import type { ChildProfile, Household, PointLedgerEntry } from "./household";

export type AwardBonusPointsInput = {
  childId: string;
  points: number;
  reason: string;
};

export type CreatePointAdjustmentInput = {
  childId: string;
  points: number;
  reason: string;
};

export type PointLedgerDisplay = {
  label: string;
  explanation: string;
};

export function awardBonusPoints(
  household: Household,
  input: AwardBonusPointsInput,
  awardedAt: string = new Date().toISOString(),
): Household {
  const child = assertChildBelongsToHousehold(household, input.childId);
  const reason = normalizeReason(input.reason, "Bonus Points need a reason.");
  if (!Number.isInteger(input.points) || input.points < 1) {
    throw new Error("Bonus Points must be at least 1 Point.");
  }

  return applyPointChange(
    household,
    child.id,
    input.points,
    `Bonus Points: ${reason}`,
    "bonus_points",
    awardedAt,
  );
}

export function createPointAdjustment(
  household: Household,
  input: CreatePointAdjustmentInput,
  adjustedAt: string = new Date().toISOString(),
): Household {
  const child = assertChildBelongsToHousehold(household, input.childId);
  const reason = normalizeReason(
    input.reason,
    "Point Adjustments need a reason.",
  );
  if (!Number.isInteger(input.points) || input.points === 0) {
    throw new Error("Point Adjustments must add or subtract whole Points.");
  }

  const description =
    input.points < 0
      ? `Point Adjustment correction: ${reason}`
      : `Point Adjustment: ${reason}`;

  return applyPointChange(
    household,
    child.id,
    input.points,
    description,
    "point_adjustment",
    adjustedAt,
  );
}

export function getPointLedgerDisplay(
  entry: Pick<PointLedgerEntry, "description" | "sourceType">,
): PointLedgerDisplay {
  switch (entry.sourceType) {
    case "bonus_points":
      return {
        label: "Bonus Points",
        explanation: stripPrefix(entry.description, "Bonus Points: "),
      };
    case "point_adjustment": {
      const correction = stripPrefix(
        entry.description,
        "Point Adjustment correction: ",
      );
      if (correction !== entry.description) {
        return {
          label: "Point Adjustment",
          explanation: `Correction: ${correction}`,
        };
      }
      return {
        label: "Point Adjustment",
        explanation: stripPrefix(entry.description, "Point Adjustment: "),
      };
    }
    case "chore_approval":
      return {
        label: "Chore",
        explanation: stripPrefix(entry.description, "Approved Chore: "),
      };
    case "progress_check_in_approval":
      return {
        label: "Progress Check-in",
        explanation: stripPrefix(
          entry.description,
          "Approved Progress Check-in: ",
        ),
      };
    case "goal_completion":
      return {
        label: "Goal Completion",
        explanation: stripPrefix(entry.description, "Goal Completion: "),
      };
    case "reward_contribution":
      return {
        label: "Reward Contribution",
        explanation: stripPrefix(entry.description, "Reward Contribution: "),
      };
    case "reward_contribution_return":
      return {
        label: "Reward Contribution Returned",
        explanation: stripPrefix(
          entry.description,
          "Reward Contribution returned: ",
        ),
      };
    case "reward_request_reservation":
      return {
        label: "Reward Request",
        explanation: stripPrefix(
          entry.description,
          "Reward Request reserved: ",
        ),
      };
    case "reward_request_approval_spend":
      return {
        label: "Reward Approved",
        explanation: stripPrefix(
          entry.description,
          "Reward Request approved: ",
        ),
      };
    case "reward_request_return":
      return {
        label: "Reward Points Returned",
        explanation: stripPrefix(entry.description, "Reward Request returned: "),
      };
  }
}

function applyPointChange(
  household: Household,
  childId: string,
  delta: number,
  description: string,
  sourceType: "bonus_points" | "point_adjustment",
  createdAt: string,
): Household {
  return {
    ...household,
    children: household.children.map((child) =>
      child.id === childId
        ? { ...child, pointBalance: child.pointBalance + delta }
        : child,
    ),
    pointLedger: [
      ...(household.pointLedger ?? []),
      {
        id: createId(),
        childId,
        delta,
        description,
        sourceType,
        sourceId: createId(),
        createdAt,
      },
    ],
    updatedAt: createdAt,
  };
}

function normalizeReason(reason: string, message: string): string {
  const normalized = reason.trim();
  if (!normalized) {
    throw new Error(message);
  }
  return normalized;
}

function assertChildBelongsToHousehold(
  household: Household,
  childId: string,
): ChildProfile {
  const child = household.children.find((candidate) => candidate.id === childId);
  if (!child) {
    throw new Error("Child not found in this Household.");
  }
  return child;
}

function stripPrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}
