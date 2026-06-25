import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("Household repository Calendar persistence", () => {
  it("clears synced Events and Event Enrichment when replacing the feed URL", () => {
    const source = readFileSync("src/server/household/repository.ts", "utf8");
    const replacementStart = source.indexOf("const isReplacement");
    const deleteEnrichments = source.indexOf(".delete(eventEnrichments)", replacementStart);
    const deleteEvents = source.indexOf(".delete(calendarEvents)", replacementStart);
    const deleteConnection = source.indexOf(".delete(calendarConnections)", replacementStart);
    const insertConnection = source.indexOf("tx.insert(calendarConnections)", replacementStart);

    expect(replacementStart).toBeGreaterThan(-1);
    expect(deleteEnrichments).toBeGreaterThan(replacementStart);
    expect(deleteEvents).toBeGreaterThan(deleteEnrichments);
    expect(deleteConnection).toBeGreaterThan(deleteEvents);
    expect(insertConnection).toBeGreaterThan(deleteConnection);
  });

  it("hydrates Calendar Connection metadata without the stored feed URL", () => {
    const source = readFileSync("src/server/household/repository.ts", "utf8");
    const metadataStart = source.indexOf("calendarConnection: connection");
    const metadataEnd = source.indexOf("calendarEvents:", metadataStart);
    const metadataSource = source.slice(metadataStart, metadataEnd);

    expect(metadataSource).toContain("calendarName");
    expect(metadataSource).toContain("lastSyncAttemptAt");
    expect(metadataSource).toContain("lastSuccessfulSyncAt");
    expect(metadataSource).toContain("syncFailureStatus");
    expect(metadataSource).toContain("eventCount");
    expect(metadataSource).not.toContain("publicFeedUrl");
    expect(metadataSource).not.toContain("sourceUrl");
  });
});
