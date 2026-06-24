import { describe, expect, it } from "vitest";

import { createHousehold } from "@/domain/household";

import { toClientSafeHousehold } from "./client-household";

describe("client-safe household hydration", () => {
  it("redacts Calendar feed URLs from Household data returned to clients", async () => {
    const household = await createHousehold({
      children: [{ name: "Ada", pin: "1234" }],
      householdName: "Clozcasa",
      parents: [{ email: "first@example.com", name: "First" }],
    });

    const safeHousehold = toClientSafeHousehold({
      ...household,
      calendarConnection: {
        calendarName: "Family",
        connectedAt: "2026-06-24T12:00:00.000Z",
        id: "calendar-1",
        sourceUrl: "webcal://example.test/family.ics",
        updatedAt: "2026-06-24T12:00:00.000Z",
      },
    });

    expect(safeHousehold.calendarConnection).toEqual({
      calendarName: "Family",
      connectedAt: "2026-06-24T12:00:00.000Z",
      id: "calendar-1",
      sourceUrl: "",
      updatedAt: "2026-06-24T12:00:00.000Z",
    });
  });
});
