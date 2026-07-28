export type DetectedCadence = "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
export type DetectionConfidence = "high" | "likely";
export type SuggestionKind = "subscription" | "recurring" | "other";

const SUBSCRIPTION_HINTS = [
  "netflix", "spotify", "hulu", "disney", "youtube", "icloud", "dropbox",
  "adobe", "microsoft", "amazon prime", "patreon", "membership", "studio",
  "gym", "openai", "chatgpt", "canva", "notion", "zoom", "slack", "github",
];

const RECURRING_BILL_HINTS = [
  "mortgage", "rent", "loan", "insurance", "utility", "utilities", "electric",
  "water", "internet", "phone", "mobile", "daycare", "tuition", "lease",
  "car payment", "auto payment", "hoa", "property tax",
];

/** Lowercase/trim, strip punctuation, trailing "#1234", and long reference digit runs. */
export function normalizeMerchant(description: string): string {
  return description
    .toLowerCase()
    .trim()
    .replace(/#\s*\d+\s*$/, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b\d{4,}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifySuggestionKind(normalizedMerchant: string, category: string, tags: string[] = []): SuggestionKind {
  const haystack = `${normalizedMerchant} ${category} ${tags.join(" ")}`.toLowerCase();
  if (SUBSCRIPTION_HINTS.some((h) => haystack.includes(h))) return "subscription";
  if (RECURRING_BILL_HINTS.some((h) => haystack.includes(h))) return "recurring";
  return "other";
}

/** Classify the dominant interval between consecutive dates (ms) into a cadence, or null if none fits. */
export function classifyCadence(sortedTimestamps: number[]): DetectedCadence | null {
  if (sortedTimestamps.length < 2) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  const intervalsDays: number[] = [];
  for (let i = 1; i < sortedTimestamps.length; i++) {
    intervalsDays.push((sortedTimestamps[i] - sortedTimestamps[i - 1]) / dayMs);
  }

  const bucketOf = (days: number): DetectedCadence | null => {
    if (days >= 5 && days <= 9) return "weekly";
    if (days >= 12 && days <= 17) return "biweekly";
    if (days >= 24 && days <= 40) return "monthly";
    if (days >= 75 && days <= 110) return "quarterly";
    if (days >= 330 && days <= 400) return "yearly";
    return null;
  };

  const counts = new Map<DetectedCadence, number>();
  for (const d of intervalsDays) {
    const bucket = bucketOf(d);
    if (bucket) counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let dominant: DetectedCadence | null = null;
  let max = 0;
  for (const [cadence, count] of counts) {
    if (count > max) {
      max = count;
      dominant = cadence;
    }
  }
  // Majority of intervals must agree with the dominant cadence.
  if (max / intervalsDays.length < 0.5) return null;
  return dominant;
}

export function amountVariation(amounts: number[]): number {
  if (amounts.length === 0) return 0;
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (avg === 0) return 0;
  const max = Math.max(...amounts);
  const min = Math.min(...amounts);
  return (max - min) / avg;
}

function intervalJitterDays(sortedTimestamps: number[]): number {
  const dayMs = 24 * 60 * 60 * 1000;
  const intervals: number[] = [];
  for (let i = 1; i < sortedTimestamps.length; i++) {
    intervals.push((sortedTimestamps[i] - sortedTimestamps[i - 1]) / dayMs);
  }
  if (intervals.length === 0) return 0;
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return Math.max(...intervals.map((v) => Math.abs(v - avg)));
}

export function computeConfidence(
  count: number,
  amounts: number[],
  sortedTimestamps: number[],
): DetectionConfidence {
  const variation = amountVariation(amounts);
  const jitter = intervalJitterDays(sortedTimestamps);
  if (count >= 3 && variation <= 0.12 && jitter <= 5) return "high";
  return "likely";
}

export function monthlyEquivalent(amount: number, cadence: DetectedCadence): number {
  switch (cadence) {
    case "weekly":
      return (amount * 52) / 12;
    case "biweekly":
      return (amount * 26) / 12;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
  }
}

export function nextExpectedDate(lastDate: Date, cadence: DetectedCadence): Date {
  const d = new Date(lastDate);
  switch (cadence) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      return d;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      return d;
    case "monthly": {
      const day = d.getDate();
      d.setMonth(d.getMonth() + 1);
      const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDayOfMonth));
      return d;
    }
    case "quarterly": {
      const day = d.getDate();
      d.setMonth(d.getMonth() + 3);
      const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDayOfMonth));
      return d;
    }
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      return d;
  }
}

export function patternKey(normalizedMerchant: string, cadence: DetectedCadence): string {
  return `${normalizedMerchant}::${cadence}`;
}

export const CADENCE_TO_DB_FREQUENCY: Record<DetectedCadence, "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly"> = {
  weekly: "weekly",
  biweekly: "biweekly",
  monthly: "monthly",
  quarterly: "quarterly",
  yearly: "yearly",
};
