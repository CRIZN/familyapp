import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createHousehold } from "@/domain/household";

import { ChildViewPage } from "./child-view-page";

describe("ChildViewPage", () => {
  it("renders child-visible Point Ledger entries and Wins from hydrated Household data", async () => {
    const household = await createHousehold({
      children: [{ name: "Ada", pin: "1234" }],
      householdName: "Clozcasa",
      parents: [{ email: "first@example.com", name: "First" }],
    });
    const child = household.children[0]!;
    const hydratedHousehold = {
      ...household,
      childWins: [
        {
          childId: child.id,
          description: "Approved Chore",
          earnedAt: "2026-06-24T12:00:00.000Z",
          id: "win-1",
          sourceId: "source-1",
          sourceType: "chore" as const,
          title: "Unload dishwasher",
        },
      ],
      pointLedger: [
        {
          childId: child.id,
          createdAt: "2026-06-24T11:00:00.000Z",
          delta: 4,
          description: "Bonus Points: Kindness at breakfast",
          id: "ledger-1",
          sourceId: "source-2",
          sourceType: "bonus_points" as const,
        },
      ],
    };

    const markup = renderToStaticMarkup(
      createElement(ChildViewPage, {
        initialHousehold: hydratedHousehold,
        initialSession: {
          childId: child.id,
          householdId: household.id,
          sessionVersion: child.sessionVersion ?? 1,
        },
        signInOptions: null,
      }),
    );

    expect(markup).toContain("Bonus Points");
    expect(markup).toContain("Kindness at breakfast");
    expect(markup).toContain("+4");
    expect(markup).toContain("Unload dishwasher");
    expect(markup).toContain("Approved Chore");
  });
});
