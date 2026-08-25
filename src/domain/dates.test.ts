import { describe, expect, it } from "vitest";

import { getTodayDateKey } from "./dates";

describe("getTodayDateKey", () => {
  it("uses the same ISO date-key helper as Parent Today", () => {
    const now = new Date("2026-06-23T15:30:00.000Z");

    expect(getTodayDateKey(now)).toBe("2026-06-23");
    expect(getTodayDateKey(now)).toBe(now.toISOString().slice(0, 10));
  });
});
