/** Shared types for projecting recurring pattern dates (client + server). */
export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface RecurringPatternLike {
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
  day_of_month?: number | null;
  is_active: boolean;
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(iso: string): Date {
  const part = iso.split("T")[0];
  const [y, m, d] = part.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function clampDayOfMonth(year: number, monthIndex: number, day: number): number {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(1, day), last);
}

/**
 * All scheduled occurrence dates in a calendar month for an active pattern.
 * Dates are YYYY-MM-DD, sorted ascending.
 */
export function getOccurrenceDatesInMonth(
  pattern: RecurringPatternLike,
  year: number,
  monthIndex: number,
): string[] {
  if (!pattern.is_active) return [];

  const start = parseLocalDate(pattern.start_date);
  const end = pattern.end_date ? parseLocalDate(pattern.end_date) : null;

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);

  const inPatternWindow = (d: Date) => {
    const t = d.getTime();
    if (t < start.getTime()) return false;
    if (end && t > end.getTime()) return false;
    return true;
  };

  const inThisMonth = (d: Date) =>
    d >= monthStart && d <= monthEnd && inPatternWindow(d);

  const results: string[] = [];

  switch (pattern.frequency) {
    case "monthly": {
      const dom =
        pattern.day_of_month != null && pattern.day_of_month >= 1
          ? pattern.day_of_month
          : start.getDate();
      const day = clampDayOfMonth(year, monthIndex, dom);
      const d = new Date(year, monthIndex, day);
      if (inThisMonth(d)) results.push(toISODate(d));
      break;
    }
    case "quarterly": {
      const sy = start.getFullYear();
      const sm = start.getMonth();
      const monthsSince = (year - sy) * 12 + (monthIndex - sm);
      if (monthsSince >= 0 && monthsSince % 3 === 0) {
        const dom =
          pattern.day_of_month != null && pattern.day_of_month >= 1
            ? pattern.day_of_month
            : start.getDate();
        const day = clampDayOfMonth(year, monthIndex, dom);
        const d = new Date(year, monthIndex, day);
        if (inThisMonth(d)) results.push(toISODate(d));
      }
      break;
    }
    case "yearly": {
      if (monthIndex === start.getMonth()) {
        const day = clampDayOfMonth(year, monthIndex, start.getDate());
        const d = new Date(year, monthIndex, day);
        if (inThisMonth(d)) results.push(toISODate(d));
      }
      break;
    }
    case "weekly":
    case "biweekly": {
      const step = pattern.frequency === "weekly" ? 7 : 14;
      const startTime = start.getTime();
      for (let day = 1; day <= monthEnd.getDate(); day++) {
        const d = new Date(year, monthIndex, day);
        if (!inThisMonth(d)) continue;
        const diffDays = Math.round((d.getTime() - startTime) / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays % step === 0) {
          results.push(toISODate(d));
        }
      }
      break;
    }
    case "daily": {
      for (let day = 1; day <= monthEnd.getDate(); day++) {
        const d = new Date(year, monthIndex, day);
        if (inThisMonth(d)) results.push(toISODate(d));
      }
      break;
    }
    default:
      break;
  }

  return [...new Set(results)].sort();
}

/** Next occurrence after `fromIso` (same rules as create-transaction API). */
export function advanceRecurringDate(
  fromIso: string,
  pattern: Pick<RecurringPatternLike, "frequency" | "day_of_month">,
): string {
  const next = parseLocalDate(fromIso);
  switch (pattern.frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly": {
      next.setMonth(next.getMonth() + 1);
      const dayOfMonth = pattern.day_of_month;
      if (dayOfMonth != null && dayOfMonth >= 1 && dayOfMonth <= 31) {
        const lastDay = new Date(
          next.getFullYear(),
          next.getMonth() + 1,
          0,
        ).getDate();
        next.setDate(Math.min(dayOfMonth, lastDay));
      }
      break;
    }
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return toISODate(next);
}

export function isOccurrenceInMonth(
  pattern: RecurringPatternLike,
  occurrenceDate: string,
  year: number,
  monthIndex: number,
): boolean {
  const dates = getOccurrenceDatesInMonth(pattern, year, monthIndex);
  return dates.includes(occurrenceDate.split("T")[0]);
}

export interface RecurringPatternForProjection {
  id: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  subtype: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string | null;
  day_of_month?: number | null;
  is_active: boolean;
}

export interface PendingRecurringOccurrence {
  patternId: string;
  dueDate: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  subtype: string;
  frequency: RecurringFrequency;
}

/** Occurrences in the month that do not yet have a transaction with recurring_pattern_id + date. */
export function getPendingOccurrencesForMonth(
  patterns: RecurringPatternForProjection[],
  transactions: ReadonlyArray<{
    recurring_pattern_id?: string | null;
    date: string;
  }>,
  year: number,
  monthIndex: number,
): PendingRecurringOccurrence[] {
  const completed = new Set<string>();
  for (const t of transactions) {
    const pid = t.recurring_pattern_id;
    if (pid && t.date) {
      completed.add(`${pid}:${t.date.split("T")[0]}`);
    }
  }

  const out: PendingRecurringOccurrence[] = [];
  for (const p of patterns) {
    if (!p.is_active) continue;
    const like: RecurringPatternLike = {
      frequency: p.frequency,
      start_date: p.start_date,
      end_date: p.end_date,
      day_of_month: p.day_of_month,
      is_active: true,
    };
    const dates = getOccurrenceDatesInMonth(like, year, monthIndex);
    for (const dueDate of dates) {
      if (completed.has(`${p.id}:${dueDate}`)) continue;
      out.push({
        patternId: p.id,
        dueDate,
        name: p.name,
        type: p.type,
        amount: p.amount,
        description: p.description,
        category: p.category,
        subtype: p.subtype || "",
        frequency: p.frequency,
      });
    }
  }
  return out;
}
