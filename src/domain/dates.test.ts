import { describe, expect, it } from "vitest";

import {
  formatOptionalDateTime,
  formatTime,
  getTodayDateKey,
} from "./dates";

describe("getTodayDateKey", () => {
  it("uses the same ISO date-key helper as Parent Today", () => {
    const now = new Date("2026-06-23T15:30:00.000Z");

    expect(getTodayDateKey(now)).toBe("2026-06-23");
    expect(getTodayDateKey(now)).toBe(now.toISOString().slice(0, 10));
  });
});

describe("household time labels", () => {
  it("formats a UTC instant as America/Denver wall time", () => {
    expect(formatTime("2026-08-25T18:00:00.000Z")).toBe("12:00 PM");
  });

  it("formats last-synced instants in America/Denver, matching Parent style", () => {
    expect(formatOptionalDateTime("2026-08-25T16:30:00.000Z")).toBe(
      "Aug 25, 2026, 10:30 AM",
    );
    expect(formatOptionalDateTime(null)).toBe("Not yet");
    expect(formatOptionalDateTime(undefined)).toBe("Not yet");
  });
});
