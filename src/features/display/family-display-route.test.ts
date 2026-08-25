import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parentWorkflowNavItems } from "@/features/parent/parent-view-page";

describe("Family Display route", () => {
  it("is a Parent-authorized kiosk route outside the workflow nav", () => {
    const routeSource = readFileSync("src/app/parent/display/page.tsx", "utf8");
    const pageSource = readFileSync(
      "src/features/display/family-display-page.tsx",
      "utf8",
    );
    const refreshSource = readFileSync(
      "src/features/display/family-display-refresh.tsx",
      "utf8",
    );

    expect(routeSource).toContain("getCurrentParentHousehold");
    expect(routeSource).toContain("assembleFamilyDisplaySnapshot");
    expect(routeSource).toContain("getTodayDateKey");
    expect(routeSource).not.toContain("ParentWorkflowRoute");
    expect(routeSource).not.toContain("ParentViewPage");
    expect(routeSource).not.toContain("syncCalendarIfStale");
    expect(pageSource).toContain('href="/parent"');
    expect(pageSource).toContain("Exit");
    expect(pageSource).not.toContain("Sync Now");
    expect(pageSource).not.toContain("approve");
    expect(pageSource).not.toContain("sourceUrl");
    expect(pageSource).not.toContain("publicFeedUrl");
    expect(refreshSource).toContain("router.refresh");
    expect(refreshSource).toContain("60_000");
    expect(parentWorkflowNavItems.map((item) => item.href)).not.toContain(
      "/parent/display",
    );

    const shellSource = readFileSync("src/components/app-shell.tsx", "utf8");
    expect(shellSource).toContain('href="/parent/display"');
    expect(shellSource).toContain("Family Display");
  });
});
