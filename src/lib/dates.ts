// All dates are ISO "YYYY-MM-DD" strings, compared as text and computed in UTC.
import holidays from "../../data/holidays-us-2026.json";

export const TODAY = "2026-10-16";
export const TAKEOVER = "2026-12-01";

const DAY_MS = 86_400_000;

export function toMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  return new Date(toMs(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

export function weekday(iso: string): number {
  return new Date(toMs(iso)).getUTCDay();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(toMs(iso)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(toMs(iso)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const HOLIDAYS = new Map<string, string>(
  (holidays as { date: string; name: string; global: boolean }[])
    .filter((h) => h.global)
    .map((h) => [h.date, h.name]),
);

// Assumption: the Friday after Thanksgiving is treated as a closed day.
// It is not a federal holiday, but most offices and vendors are shut.
HOLIDAYS.set("2026-11-27", "the day after Thanksgiving");

export function holidayName(iso: string): string | null {
  return HOLIDAYS.get(iso) ?? null;
}

export function isBusinessDay(iso: string): boolean {
  const day = weekday(iso);
  return day !== 0 && day !== 6 && !HOLIDAYS.has(iso);
}

/** The last business day on or before the given date. */
export function priorBusinessDay(iso: string): string {
  let d = iso;
  while (!isBusinessDay(d)) d = addDays(d, -1);
  return d;
}
