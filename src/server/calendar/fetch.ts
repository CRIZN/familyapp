import "server-only";

export async function fetchCalendarFeed(feedUrl: string): Promise<string> {
  const response = await fetch(toFetchableFeedUrl(feedUrl), {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Calendar feed could not be fetched.");
  }
  return response.text();
}

function toFetchableFeedUrl(feedUrl: string): string {
  return feedUrl.startsWith("webcal://")
    ? `https://${feedUrl.slice("webcal://".length)}`
    : feedUrl;
}
