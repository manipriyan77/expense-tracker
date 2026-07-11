import type { Transaction } from "@/store/transactions-store";
import type { RecurringPattern } from "@/store/recurring-patterns-store";

export type InsightSeverity = "critical" | "warning" | "positive" | "neutral";

export interface ReviewTransaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  subtype?: string | null;
  date: string;
  type: "income" | "expense";
  recurring_pattern_id?: string | null;
}

export interface DuplicateGroup {
  id: string;
  transactions: ReviewTransaction[];
  amount: number;
  description: string;
  date: string;
  confidence: number;
}

export interface UnusualSpend {
  transaction: ReviewTransaction;
  baseline: number;
  liftPct: number;
  reason: string;
}

export interface UncategorizedItem {
  transaction: ReviewTransaction;
  suggestedCategory: string;
  confidence: number;
}

export interface RecurringCandidate {
  id: string;
  description: string;
  category: string;
  amount: number;
  count: number;
  cadence: "monthly" | "weekly" | "irregular";
  lastDate: string;
  confidence: number;
}

export interface MerchantSuggestion {
  merchant: string;
  suggestedCategory: string;
  transactions: ReviewTransaction[];
  confidence: number;
}

export interface MoneyInsight {
  id: string;
  title: string;
  detail: string;
  severity: InsightSeverity;
  metric: string;
  href: string;
}

export interface TransactionReviewResult {
  duplicates: DuplicateGroup[];
  unusualSpends: UnusualSpend[];
  uncategorized: UncategorizedItem[];
  recurringCandidates: RecurringCandidate[];
  merchantSuggestions: MerchantSuggestion[];
  insights: MoneyInsight[];
  score: number;
  counts: {
    needsReview: number;
    duplicates: number;
    unusual: number;
    uncategorized: number;
    recurringCandidates: number;
    suggestions: number;
  };
}

const UNCATEGORIZED = new Set(["", "other", "misc", "miscellaneous", "uncategorized"]);

const CATEGORY_KEYWORDS: Array<{ category: string; words: string[] }> = [
  { category: "Food", words: ["swiggy", "zomato", "restaurant", "cafe", "coffee", "food", "dining"] },
  { category: "Groceries", words: ["grocery", "dmart", "bigbasket", "blinkit", "zepto", "instamart"] },
  { category: "Transport", words: ["uber", "ola", "rapido", "metro", "fuel", "petrol", "diesel", "parking"] },
  { category: "Shopping", words: ["amazon", "flipkart", "myntra", "nykaa", "shopping"] },
  { category: "Bills", words: ["electricity", "water", "gas", "broadband", "wifi", "mobile", "recharge", "bill"] },
  { category: "Entertainment", words: ["netflix", "prime", "hotstar", "spotify", "movie", "bookmyshow"] },
  { category: "Health", words: ["pharmacy", "medical", "hospital", "doctor", "clinic", "apollo"] },
  { category: "Savings", words: ["sip", "mutual fund", "investment", "nps", "ppf", "rd", "fd"] },
  { category: "Rent", words: ["rent", "landlord"] },
  { category: "Salary", words: ["salary", "payroll", "income"] },
];

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function merchantKey(description: string): string {
  return normalizeText(description).split(" ").slice(0, 3).join(" ") || "unknown";
}

function daysBetween(a: string, b: string): number {
  const start = new Date(a).getTime();
  const end = new Date(b).getTime();
  return Math.abs(end - start) / 86_400_000;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function suggestCategory(description: string): { category: string; confidence: number } {
  const text = normalizeText(description);
  for (const item of CATEGORY_KEYWORDS) {
    const hit = item.words.find((word) => text.includes(word));
    if (hit) {
      return { category: item.category, confidence: hit.length >= 6 ? 86 : 72 };
    }
  }
  return { category: "Other", confidence: 45 };
}

function toReviewTransaction(t: Transaction): ReviewTransaction {
  return {
    id: t.id,
    amount: t.amount,
    description: t.description,
    category: t.category,
    subtype: t.subtype,
    date: t.date,
    type: t.type,
    recurring_pattern_id: t.recurring_pattern_id,
  };
}

function currentMonthBounds(now: Date): { start: Date; previousStart: Date } {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { start, previousStart };
}

export function buildTransactionReview(
  transactions: Transaction[],
  patterns: RecurringPattern[] = [],
  now: Date = new Date(),
): TransactionReviewResult {
  const txns = transactions.map(toReviewTransaction);
  const expenses = txns.filter((t) => t.type === "expense");
  const activePatternNames = new Set(patterns.filter((p) => p.is_active).map((p) => merchantKey(p.description || p.name)));

  const duplicateBuckets = new Map<string, ReviewTransaction[]>();
  for (const t of txns) {
    const day = new Date(t.date).toISOString().slice(0, 10);
    const key = `${t.type}:${Math.round(t.amount)}:${merchantKey(t.description)}:${day}`;
    duplicateBuckets.set(key, [...(duplicateBuckets.get(key) ?? []), t]);
  }
  const duplicates = Array.from(duplicateBuckets.entries())
    .filter(([, group]) => group.length > 1)
    .map(([id, group]) => ({
      id,
      transactions: group.sort((a, b) => a.date.localeCompare(b.date)),
      amount: group[0].amount,
      description: group[0].description || group[0].category,
      date: group[0].date,
      confidence: 94,
    }))
    .slice(0, 8);

  const categoryAmounts = new Map<string, number[]>();
  for (const t of expenses) {
    const key = normalizeText(t.category) || "other";
    categoryAmounts.set(key, [...(categoryAmounts.get(key) ?? []), t.amount]);
  }
  const unusualSpends = expenses
    .map((transaction) => {
      const categoryKey = normalizeText(transaction.category) || "other";
      const baseline = median((categoryAmounts.get(categoryKey) ?? []).filter((v) => v !== transaction.amount));
      const liftPct = baseline > 0 ? ((transaction.amount - baseline) / baseline) * 100 : 0;
      return {
        transaction,
        baseline,
        liftPct,
        reason:
          baseline > 0
            ? `${transaction.category || "Expense"} is ${Math.round(liftPct)}% above its usual amount`
            : "Large transaction with limited category history",
      };
    })
    .filter((item) => item.transaction.amount >= 1000 && (item.liftPct >= 75 || item.transaction.amount >= median(expenses.map((t) => t.amount)) * 3))
    .sort((a, b) => b.transaction.amount - a.transaction.amount)
    .slice(0, 8);

  const uncategorized = txns
    .filter((t) => UNCATEGORIZED.has(normalizeText(t.category)))
    .map((transaction) => {
      const suggestion = suggestCategory(transaction.description);
      return { transaction, suggestedCategory: suggestion.category, confidence: suggestion.confidence };
    })
    .sort((a, b) => b.transaction.amount - a.transaction.amount)
    .slice(0, 12);

  const merchantBuckets = new Map<string, ReviewTransaction[]>();
  for (const t of expenses) {
    const key = merchantKey(t.description || t.category);
    merchantBuckets.set(key, [...(merchantBuckets.get(key) ?? []), t]);
  }

  const recurringCandidates = Array.from(merchantBuckets.entries())
    .map(([key, group]) => {
      const sorted = group.sort((a, b) => a.date.localeCompare(b.date));
      const gaps = sorted.slice(1).map((t, i) => daysBetween(sorted[i].date, t.date));
      const avgGap = gaps.length > 0 ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 0;
      const cadence = avgGap >= 25 && avgGap <= 35 ? "monthly" : avgGap >= 6 && avgGap <= 8 ? "weekly" : "irregular";
      const avgAmount = group.reduce((s, t) => s + t.amount, 0) / group.length;
      const amountVariance =
        avgAmount > 0
          ? group.reduce((s, t) => s + Math.abs(t.amount - avgAmount), 0) / group.length / avgAmount
          : 1;
      return {
        id: key,
        description: sorted[0].description || sorted[0].category,
        category: sorted[0].category,
        amount: Math.round(avgAmount),
        count: group.length,
        cadence: cadence as RecurringCandidate["cadence"],
        lastDate: sorted[sorted.length - 1].date,
        confidence: Math.round(Math.max(45, 96 - amountVariance * 100 - (cadence === "irregular" ? 25 : 0))),
      };
    })
    .filter((item) => item.count >= 3 && item.confidence >= 55 && !activePatternNames.has(item.id))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);

  const merchantSuggestions = Array.from(merchantBuckets.entries())
    .map(([merchant, group]) => {
      const categoryCounts = new Map<string, number>();
      for (const t of group) {
        const key = t.category || "Other";
        categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
      }
      const [suggestedCategory, count] = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["Other", 0];
      const mismatched = group.filter((t) => t.category !== suggestedCategory);
      return {
        merchant,
        suggestedCategory,
        transactions: mismatched,
        confidence: group.length > 0 ? Math.round((count / group.length) * 100) : 0,
      };
    })
    .filter((item) => item.transactions.length > 0 && item.confidence >= 60)
    .sort((a, b) => b.transactions.length - a.transactions.length)
    .slice(0, 8);

  const { start, previousStart } = currentMonthBounds(now);
  const currentMonthExpenses = expenses.filter((t) => new Date(t.date) >= start);
  const previousMonthExpenses = expenses.filter((t) => {
    const d = new Date(t.date);
    return d >= previousStart && d < start;
  });
  const currentSpend = currentMonthExpenses.reduce((s, t) => s + t.amount, 0);
  const previousSpend = previousMonthExpenses.reduce((s, t) => s + t.amount, 0);
  const deltaPct = previousSpend > 0 ? ((currentSpend - previousSpend) / previousSpend) * 100 : 0;

  const insights: MoneyInsight[] = [];
  if (previousSpend > 0 && Math.abs(deltaPct) >= 15) {
    insights.push({
      id: "monthly-spend-delta",
      title: deltaPct > 0 ? "Spending is trending higher" : "Spending is down",
      detail: `${Math.abs(deltaPct).toFixed(0)}% ${deltaPct > 0 ? "above" : "below"} last month so far.`,
      severity: deltaPct > 0 ? "warning" : "positive",
      metric: `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(0)}%`,
      href: "/analytics",
    });
  }
  if (duplicates.length > 0) {
    insights.push({
      id: "duplicates",
      title: "Possible duplicate transactions",
      detail: `${duplicates.length} group${duplicates.length === 1 ? "" : "s"} look identical by amount, merchant, and date.`,
      severity: "warning",
      metric: String(duplicates.length),
      href: "/transaction-review",
    });
  }
  if (recurringCandidates.length > 0) {
    insights.push({
      id: "recurring-candidates",
      title: "Recurring payments detected",
      detail: `${recurringCandidates.length} merchant${recurringCandidates.length === 1 ? "" : "s"} may be converted to recurring rules.`,
      severity: "neutral",
      metric: String(recurringCandidates.length),
      href: "/recurring",
    });
  }
  if (uncategorized.length > 0) {
    insights.push({
      id: "uncategorized",
      title: "Transactions need categories",
      detail: `${uncategorized.length} item${uncategorized.length === 1 ? "" : "s"} can be cleaned up for better reports.`,
      severity: "warning",
      metric: String(uncategorized.length),
      href: "/transaction-review",
    });
  }

  const needsReview =
    duplicates.length +
    unusualSpends.length +
    uncategorized.length +
    recurringCandidates.length +
    merchantSuggestions.length;
  const score = Math.max(0, Math.min(100, 100 - needsReview * 5));

  return {
    duplicates,
    unusualSpends,
    uncategorized,
    recurringCandidates,
    merchantSuggestions,
    insights: insights.slice(0, 6),
    score,
    counts: {
      needsReview,
      duplicates: duplicates.length,
      unusual: unusualSpends.length,
      uncategorized: uncategorized.length,
      recurringCandidates: recurringCandidates.length,
      suggestions: merchantSuggestions.length,
    },
  };
}
