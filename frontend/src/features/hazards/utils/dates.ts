// The backend reads inspection dates as Phoenix calendar days, so the UI does too. A
// preset picked in another time zone still names the same days in a shared link.
export const REPORTING_TIME_ZONE = "America/Phoenix";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real YYYY-MM-DD calendar date (so 2026-02-30 is rejected). */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function todayInReportingZone(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: REPORTING_TIME_ZONE }).format(now);
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export type DatePreset = "last7" | "last30" | "older30";

export const DATE_PRESETS: readonly { id: DatePreset; label: string }[] = [
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "older30", label: "Older than 30 days" },
];

export type DateRange = { from: string | null; to: string | null };

/** Presets become absolute dates when picked, so a shared link shows the same hazards later. */
export function presetRange(preset: DatePreset, now: Date = new Date()): DateRange {
  const today = todayInReportingZone(now);
  if (preset === "last7") return { from: addDays(today, -6), to: today };
  if (preset === "last30") return { from: addDays(today, -29), to: today };
  // More than 30 whole days old, matching the age shown in the list.
  return { from: null, to: addDays(today, -31) };
}

export type DateRangeProblem = "invalid_from" | "invalid_to" | "reversed" | null;

export function dateRangeProblem(from: string, to: string): DateRangeProblem {
  if (from && !isCalendarDate(from)) return "invalid_from";
  if (to && !isCalendarDate(to)) return "invalid_to";
  if (from && to && from > to) return "reversed";
  return null;
}

function formatDay(isoDate: string, withYear: boolean): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: withYear ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatDateRange({ from, to }: DateRange): string {
  if (from && to) {
    const sameYear = from.slice(0, 4) === to.slice(0, 4);
    return `${formatDay(from, !sameYear)} to ${formatDay(to, true)}`;
  }
  if (from) return `from ${formatDay(from, true)}`;
  if (to) return `up to ${formatDay(to, true)}`;
  return "Any time";
}

export function relativeAge(days: number | null): string {
  if (days === null) return "Not recorded";
  if (days === 0) return "Today";
  return days === 1 ? "1 day ago" : `${days.toLocaleString("en-US")} days ago`;
}
