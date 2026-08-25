export const HOUSEHOLD_TIME_ZONE = "America/Denver";

export function getTodayDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: HOUSEHOLD_TIME_ZONE,
  }).format(new Date(value));
}

export function formatOptionalDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: HOUSEHOLD_TIME_ZONE,
  }).format(new Date(value));
}
