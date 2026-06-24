import { describe, expect, it } from "vitest";

import { getAppDateKey } from "./date-key";

describe("getAppDateKey", () => {
  it("uses the app timezone instead of UTC rollover", () => {
    expect(getAppDateKey(new Date("2026-06-25T03:30:00.000Z"))).toBe(
      "2026-06-24",
    );
  });
});
