export type SelectedPeriod =
  | "all-time"
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "this-year";

export const PERIOD_OPTIONS: { value: SelectedPeriod; label: string }[] = [
  { value: "all-time", label: "All time" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-3-months", label: "Last 3 months" },
  { value: "last-6-months", label: "Last 6 months" },
  { value: "this-year", label: "This year" },
];

/** Inclusive [start, end] range for the given period, or null start for "all-time". */
export function getPeriodRange(period: SelectedPeriod, now: Date = new Date()): { start: Date | null; end: Date } {
  const year = now.getFullYear();
  const month = now.getMonth();

  switch (period) {
    case "all-time":
      return { start: null, end: now };
    case "this-month":
      return { start: new Date(year, month, 1), end: now };
    case "last-month":
      return { start: new Date(year, month - 1, 1), end: new Date(year, month, 0, 23, 59, 59, 999) };
    case "last-3-months":
      return { start: new Date(year, month - 2, 1), end: now };
    case "last-6-months":
      return { start: new Date(year, month - 5, 1), end: now };
    case "this-year":
      return { start: new Date(year, 0, 1), end: now };
  }
}

export function isDateInPeriod(dateStr: string, period: SelectedPeriod, now: Date = new Date()): boolean {
  const { start, end } = getPeriodRange(period, now);
  const d = new Date(dateStr);
  if (start && d < start) return false;
  return d <= end;
}
