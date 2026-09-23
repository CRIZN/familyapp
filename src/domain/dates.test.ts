import { describe, expect, it } from "vitest";

import {
  formatOptionalDateTime,
  formatTime,
  getTodayDateKey,
} from "./dates";

describe("getTodayDateKey", () => {
  it("stays on the Denver date after UTC midnight during Mountain evening", () => {
    const eveningInDenver = new Date("2026-08-26T00:30:00.000Z");

    expect(eveningInDenver.toISOString().slice(0, 10)).toBe("2026-08-26");
    expect(getTodayDateKey(eveningInDenver)).toBe("2026-08-25");
  });

  it("stays on the Denver date during Mountain morning on the same UTC day", () => {
    const morningInDenver = new Date("2026-08-25T12:00:00.000Z");

    expect(morningInDenver.toISOString().slice(0, 10)).toBe("2026-08-25");
    expect(getTodayDateKey(morningInDenver)).toBe("2026-08-25");
  });

  it("uses the Denver date in winter MST after UTC midnight", () => {
    const eveningInDenver = new Date("2026-01-16T00:30:00.000Z");

    expect(eveningInDenver.toISOString().slice(0, 10)).toBe("2026-01-16");
    expect(getTodayDateKey(eveningInDenver)).toBe("2026-01-15");
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
