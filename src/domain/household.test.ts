import { describe, expect, it } from "vitest";

import {
  createHousehold,
  startChildSession,
  updateChildPin,
} from "./household";

describe("Household Setup", () => {
  it("creates a Household with at least one Parent and one Child", async () => {
    const household = await createHousehold({
      householdName: "Clozcasa",
      parents: [{ name: "Matt", email: "matt@example.com" }],
      children: [{ name: "Ada", pin: "1234" }],
    });

    expect(household.name).toBe("Clozcasa");
    expect(household.parents).toHaveLength(1);
    expect(household.children).toHaveLength(1);
    expect(household.children[0]?.pinHash).not.toBe("1234");
    expect(household.children[0]?.pinSalt).toBeTruthy();
  });

  it("requires a Parent, a Child, and a valid Child PIN", async () => {
    await expect(
      createHousehold({
        householdName: "Clozcasa",
        parents: [],
        children: [{ name: "Ada", pin: "1234" }],
      }),
    ).rejects.toThrow("Add at least one Parent.");

    await expect(
      createHousehold({
        householdName: "Clozcasa",
        parents: [{ name: "Matt", email: "matt@example.com" }],
        children: [],
      }),
    ).rejects.toThrow("Add at least one Child.");

    await expect(
      createHousehold({
        householdName: "Clozcasa",
        parents: [{ name: "Matt", email: "matt@example.com" }],
        children: [{ name: "Ada", pin: "12" }],
      }),
    ).rejects.toThrow("Child PINs must be 4 to 8 digits.");
  });

  it("starts Child View only for the selected Child and correct PIN", async () => {
    const household = await createHousehold({
      householdName: "Clozcasa",
      parents: [{ name: "Matt", email: "matt@example.com" }],
      children: [
        { name: "Ada", pin: "1234" },
        { name: "Grace", pin: "9876" },
      ],
    });

    const ada = household.children[0];
    const grace = household.children[1];
    expect(ada).toBeDefined();
    expect(grace).toBeDefined();

    await expect(startChildSession(household, ada.id, "9876")).rejects.toThrow(
      "That PIN does not match this Child.",
    );

    const session = await startChildSession(household, ada.id, "1234");

    expect(session.childId).toBe(ada.id);
    expect(session.childName).toBe("Ada");
  });

  it("lets a Parent update a Child PIN without keeping the old PIN valid", async () => {
    const household = await createHousehold({
      householdName: "Clozcasa",
      parents: [{ name: "Matt", email: "matt@example.com" }],
      children: [{ name: "Ada", pin: "1234" }],
    });
    const child = household.children[0];
    expect(child).toBeDefined();

    const updated = await updateChildPin(household, child.id, "2468");

    await expect(startChildSession(updated, child.id, "1234")).rejects.toThrow(
      "That PIN does not match this Child.",
    );
    await expect(startChildSession(updated, child.id, "2468")).resolves.toEqual(
      expect.objectContaining({ childId: child.id }),
    );
  });
});
