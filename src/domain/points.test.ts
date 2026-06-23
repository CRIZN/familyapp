import { describe, expect, it } from "vitest";

import { getChildPointLedger } from "./chores";
import { createHousehold } from "./household";
import {
  awardBonusPoints,
  createPointAdjustment,
  getPointLedgerDisplay,
} from "./points";

async function createTestHousehold() {
  return createHousehold({
    householdName: "Clozcasa",
    parents: [{ name: "Matt", email: "matt@example.com" }],
    children: [
      { name: "Ada", pin: "1234" },
      { name: "Grace", pin: "9876" },
    ],
  });
}

describe("Points", () => {
  it("lets a Parent award Bonus Points to a Child", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;

    const updated = awardBonusPoints(
      household,
      {
        childId: child.id,
        points: 4,
        reason: "Kindness at breakfast",
      },
      "2026-06-23T12:00:00.000Z",
    );

    expect(updated.children[0]!.pointBalance).toBe(4);
    expect(getChildPointLedger(updated, child.id)).toEqual([
      expect.objectContaining({
        delta: 4,
        description: "Bonus Points: Kindness at breakfast",
        sourceType: "bonus_points",
      }),
    ]);
  });

  it("requires a reason for positive and negative Point Adjustments", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;

    expect(() =>
      createPointAdjustment(household, {
        childId: child.id,
        points: 3,
        reason: " ",
      }),
    ).toThrow("Point Adjustments need a reason.");

    expect(() =>
      createPointAdjustment(household, {
        childId: child.id,
        points: -1,
        reason: "",
      }),
    ).toThrow("Point Adjustments need a reason.");
  });

  it("records negative Point Adjustments as corrections, not penalties", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const credited = createPointAdjustment(
      household,
      {
        childId: child.id,
        points: 6,
        reason: "Corrected missing chore approval",
      },
      "2026-06-23T12:00:00.000Z",
    );

    const corrected = createPointAdjustment(
      credited,
      {
        childId: child.id,
        points: -2,
        reason: "Corrected duplicate entry",
      },
      "2026-06-23T13:00:00.000Z",
    );

    expect(corrected.children[0]!.pointBalance).toBe(4);
    expect(getChildPointLedger(corrected, child.id)).toEqual([
      expect.objectContaining({
        delta: 6,
        description: "Point Adjustment: Corrected missing chore approval",
        sourceType: "point_adjustment",
      }),
      expect.objectContaining({
        delta: -2,
        description: "Point Adjustment correction: Corrected duplicate entry",
        sourceType: "point_adjustment",
      }),
    ]);
  });

  it("gives Children simplified Point Ledger labels for Bonus Points and Point Adjustments", async () => {
    const household = await createTestHousehold();
    const child = household.children[0]!;
    const bonused = awardBonusPoints(
      household,
      {
        childId: child.id,
        points: 2,
        reason: "Helping your sibling",
      },
      "2026-06-23T12:00:00.000Z",
    );
    const adjusted = createPointAdjustment(
      bonused,
      {
        childId: child.id,
        points: -1,
        reason: "Corrected the Point Balance",
      },
      "2026-06-23T13:00:00.000Z",
    );

    expect(
      getChildPointLedger(adjusted, child.id).map(getPointLedgerDisplay),
    ).toEqual([
      {
        label: "Bonus Points",
        explanation: "Helping your sibling",
      },
      {
        label: "Point Adjustment",
        explanation: "Correction: Corrected the Point Balance",
      },
    ]);
  });
});
