import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  eventNeedsParentAttention,
  getChildStatusWorkflowLink,
  parentWorkflowNavItems,
} from "./parent-view-page";

describe("parent workflow IA", () => {
  it("exposes the expected Parent workflow navigation in order", () => {
    expect(parentWorkflowNavItems).toEqual([
      { href: "/parent", label: "Today", workflow: "today" },
      { href: "/parent/approvals", label: "Approvals", workflow: "approvals" },
      { href: "/parent/chores", label: "Chores", workflow: "chores" },
      { href: "/parent/goals", label: "Goals", workflow: "goals" },
      { href: "/parent/rewards", label: "Rewards", workflow: "rewards" },
      { href: "/parent/calendar", label: "Calendar", workflow: "calendar" },
      { href: "/parent/points", label: "Points", workflow: "points" },
      { href: "/parent/household", label: "Household", workflow: "household" },
      {
        href: "/parent/weekly-review",
        label: "Weekly Review",
        workflow: "weekly-review",
      },
    ]);
  });

  it("routes focused Parent workflow pages to their matching workflow", () => {
    const workflows = parentWorkflowNavItems.filter(
      (item) => item.workflow !== "today",
    );

    for (const item of workflows) {
      const routePath = item.href.replace("/parent/", "src/app/parent/");
      const source = readFileSync(`${routePath}/page.tsx`, "utf8");

      expect(source).toContain(
        `<ParentWorkflowRoute workflow="${item.workflow}" />`,
      );
    }
  });

  it("loads Parent workflow Household data through the server route wrapper", () => {
    const source = readFileSync(
      "src/app/parent/parent-workflow-route.tsx",
      "utf8",
    );

    expect(source).toContain("getCurrentParentHousehold");
    expect(source).toContain(
      "<ParentViewPage initialHousehold={household} workflow={workflow} />",
    );
  });

  it("keeps Today agenda-first with management forms outside the Today branch", () => {
    const source = readFileSync(
      "src/features/parent/parent-view-page.tsx",
      "utf8",
    );
    const todayStart = source.indexOf('workflow === "today"');
    const todayAgenda = source.indexOf("<TodayAgendaSection", todayStart);
    const needsAttention = source.indexOf("<NeedsAttentionSection", todayStart);
    const approvalPreview = source.indexOf("<ApprovalQueueSection", todayStart);
    const todayEnd = source.indexOf('{workflow === "approvals"', todayStart);
    const todaySource = source.slice(todayStart, todayEnd);

    expect(todayStart).toBeGreaterThan(-1);
    expect(todayAgenda).toBeLessThan(needsAttention);
    expect(needsAttention).toBeLessThan(approvalPreview);
    expect(todaySource).not.toContain("<CreateChoreForm");
    expect(todaySource).not.toContain("<CreateGoalForm");
    expect(todaySource).not.toContain("<CreateRewardForm");
    expect(todaySource).not.toContain("<CalendarConnectionForm");
    expect(todaySource).not.toContain("<BonusPointsForm");
    expect(todaySource).not.toContain("<PointAdjustmentForm");
    expect(source).toContain('href="/parent/approvals"');
    expect(source).toContain('href="/parent/chores"');
    expect(source).toContain('href="/parent/rewards"');
  });

  it("derives Parent Today and Weekly Review aggregation from the loaded Household", () => {
    const source = readFileSync(
      "src/features/parent/parent-view-page.tsx",
      "utf8",
    );

    expect(source).toContain("getParentBriefing(household, todayDateKey)");
    expect(source).toContain("getParentWeeklyReview(household, todayDateKey)");
    expect(source).toContain("<NeedsAttentionSection briefing={parentBriefing} />");
    expect(source).toContain("<ChildStatusSection household={household}");
    expect(source).toContain("<WeeklyReviewSection review={parentWeeklyReview} />");
  });

  it("keeps creation and management surfaces in focused workflows", () => {
    const source = readFileSync(
      "src/features/parent/parent-view-page.tsx",
      "utf8",
    );

    expect(source).toContain('workflow === "chores"');
    expect(source).toContain("<CreateChoreForm");
    expect(source).toContain("<ChoreListSection");
    expect(source).toContain('workflow === "goals"');
    expect(source).toContain("<CreateGoalForm");
    expect(source).toContain("<GoalListSection");
    expect(source).toContain('workflow === "rewards"');
    expect(source).toContain("<CreateRewardForm");
    expect(source).toContain("<RewardCatalogSection");
    expect(source).toContain("<RewardFulfillmentHistorySection");
    expect(source).toContain('workflow === "calendar"');
    expect(source).toContain("<CalendarConnectionForm");
    expect(source).toContain("<HouseholdAgendaSection");
    expect(source).toContain('workflow === "points"');
    expect(source).toContain("<BonusPointsForm");
    expect(source).toContain("<PointAdjustmentForm");
  });

  it("routes Parent Chore management through server actions", () => {
    const source = readFileSync(
      "src/features/parent/parent-view-page.tsx",
      "utf8",
    );

    expect(source).toContain("createChoreAction");
    expect(source).toContain("pauseChoreAction");
    expect(source).toContain("archiveChoreAction");
    expect(source).not.toContain("createChore(household");
    expect(source).not.toContain("pauseChore(household");
    expect(source).not.toContain("archiveChore(household");
  });

  it("routes Parent Points management through server actions", () => {
    const source = readFileSync(
      "src/features/parent/parent-view-page.tsx",
      "utf8",
    );

    expect(source).toContain("awardBonusPointsAction");
    expect(source).toContain("createPointAdjustmentAction");
    expect(source).not.toContain("awardBonusPoints(household");
    expect(source).not.toContain("createPointAdjustment(household");
  });

  it("flags ambiguous or missing Event Participants for Parent attention", () => {
    expect(
      eventNeedsParentAttention({
        appleEventId: "apple-1",
        endsAt: "2026-06-23T10:00:00.000Z",
        eventId: "event-1",
        isAllHousehold: true,
        participantChildIds: [],
        participantNames: ["All Household"],
        startsAt: "2026-06-23T09:00:00.000Z",
        title: "Practice",
      }),
    ).toBe(true);
    expect(
      eventNeedsParentAttention({
        appleEventId: "apple-2",
        endsAt: "2026-06-23T10:00:00.000Z",
        eventId: "event-2",
        isAllHousehold: false,
        participantChildIds: [],
        participantNames: [],
        startsAt: "2026-06-23T09:00:00.000Z",
        title: "Lesson",
      }),
    ).toBe(true);
    expect(
      eventNeedsParentAttention({
        appleEventId: "apple-3",
        endsAt: "2026-06-23T10:00:00.000Z",
        eventId: "event-3",
        isAllHousehold: false,
        participantChildIds: ["child-1"],
        participantNames: ["Mika"],
        startsAt: "2026-06-23T09:00:00.000Z",
        title: "Class",
      }),
    ).toBe(false);
  });

  it("chooses one contextual workflow link for each Child status summary", () => {
    expect(
      getChildStatusWorkflowLink({
        activeGoals: 0,
        overdueChores: 0,
        pendingGoalCheckIns: 0,
        pendingRewards: 1,
        todayChores: 0,
      }),
    ).toEqual({ href: "/parent/rewards", label: "Open Rewards" });
    expect(
      getChildStatusWorkflowLink({
        activeGoals: 1,
        overdueChores: 2,
        pendingGoalCheckIns: 0,
        pendingRewards: 0,
        todayChores: 1,
      }),
    ).toEqual({ href: "/parent/goals", label: "Open Goals" });
    expect(
      getChildStatusWorkflowLink({
        activeGoals: 0,
        overdueChores: 1,
        pendingGoalCheckIns: 0,
        pendingRewards: 0,
        todayChores: 0,
      }),
    ).toEqual({ href: "/parent/chores", label: "Open Chores" });
  });
});
