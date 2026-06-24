const APP_TIME_ZONE = "America/Denver";

export function getAppDateKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: APP_TIME_ZONE,
    year: "numeric",
  }).format(date);
}
