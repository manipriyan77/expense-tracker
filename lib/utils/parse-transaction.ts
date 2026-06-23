// Smart natural-language transaction parser.
//
// Turns free text like "bus expense 120" or "got salary 50000" into a
// structured transaction { type, amount, category, subtype, description }.
//
// This is a rule-based (keyword + regex) parser — no external API needed.
// It is intentionally structured so a smarter AI backend could be swapped in
// later behind the same `parseTransaction` signature.

export type TransactionType = "income" | "expense";

export interface ParsedTransaction {
  type: TransactionType;
  amount: number | null;
  category: string;
  subtype: string;
  /** Clean human-readable description for the transaction. */
  description: string;
  /** Rough 0–1 confidence that the category/amount were understood. */
  confidence: number;
  /** The original raw text the user typed for this line. */
  raw: string;
}

// ── Category catalogue (mirrors AddTransactionForm) ─────────────────────────

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transportation",
  "Entertainment",
  "Bills",
  "Shopping",
  "Healthcare",
  "Savings",
  "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Investment",
  "Business",
  "Gift",
  "Other",
] as const;

const INCOME_SUBTYPES = [
  "Salary",
  "Bonus",
  "Freelance",
  "Investment Returns",
  "Business Income",
  "Other",
];

export function getSubtypesFor(category: string, type: TransactionType): string[] {
  if (type === "income") return INCOME_SUBTYPES;
  switch (category) {
    case "Bills":
      return ["Electricity", "Water", "Internet", "Phone", "Rent", "Other"];
    case "Food":
      return ["Groceries", "Dining Out", "Snacks", "Other"];
    case "Transportation":
      return ["Fuel", "Public Transport", "Parking", "Maintenance", "EMI", "Other"];
    case "Shopping":
      return ["Clothing", "Electronics", "Home Items", "Personal Care", "Other"];
    case "Savings":
      return ["Emergency Fund", "Investment", "Fixed Deposit", "Goal Savings", "Other"];
    default:
      return ["EMI", "Bills", "Regular", "One-time", "Other"];
  }
}

// ── Keyword rules ───────────────────────────────────────────────────────────

interface CategoryRule {
  category: string;
  subtype: string;
  keywords: string[];
}

// Ordered from most specific to least. First match wins.
const EXPENSE_RULES: CategoryRule[] = [
  // Transportation
  { category: "Transportation", subtype: "Fuel", keywords: ["petrol", "diesel", "fuel", "gas station", "filling"] },
  { category: "Transportation", subtype: "Parking", keywords: ["parking"] },
  { category: "Transportation", subtype: "Maintenance", keywords: ["car service", "bike service", "vehicle service", "car repair", "puncture", "mechanic", "tyre", "tire", "servicing"] },
  { category: "Transportation", subtype: "Public Transport", keywords: ["bus", "train", "metro", "taxi", "cab", "uber", "ola", "rapido", "auto", "rickshaw", "flight", "travel", "transport", "toll", "fare"] },

  // Food
  { category: "Food", subtype: "Groceries", keywords: ["grocery", "groceries", "supermarket", "vegetable", "veggies", "fruits", "milk", "provision", "kirana", "bigbasket", "dmart"] },
  { category: "Food", subtype: "Snacks", keywords: ["snack", "snacks", "chips", "tea", "juice", "ice cream", "biscuit"] },
  { category: "Food", subtype: "Dining Out", keywords: ["restaurant", "lunch", "dinner", "breakfast", "cafe", "coffee", "dining", "swiggy", "zomato", "food", "meal", "pizza", "burger", "biryani", "hotel", "dosa", "snacks bar"] },

  // Bills
  { category: "Bills", subtype: "Electricity", keywords: ["electricity", "current bill", "power bill", "eb bill", "eb "] },
  { category: "Bills", subtype: "Water", keywords: ["water bill", "water can", "water"] },
  { category: "Bills", subtype: "Internet", keywords: ["internet", "wifi", "broadband", "fiber", "fibre"] },
  { category: "Bills", subtype: "Phone", keywords: ["recharge", "postpaid", "prepaid", "mobile bill", "phone bill", "airtel", "jio", " vi ", "data pack"] },
  { category: "Bills", subtype: "Rent", keywords: ["rent", "house rent", "room rent", "pg "] },

  // Shopping
  { category: "Shopping", subtype: "Clothing", keywords: ["clothes", "clothing", "shirt", "tshirt", "t-shirt", "jeans", "dress", "shoes", "footwear", "apparel", "saree", "kurta"] },
  { category: "Shopping", subtype: "Electronics", keywords: ["laptop", "headphone", "earphone", "earbuds", "gadget", "charger", "mouse", "keyboard", "monitor", "electronics", "tv "] },
  { category: "Shopping", subtype: "Personal Care", keywords: ["salon", "haircut", "cosmetics", "skincare", "grooming", "shampoo", "perfume", "makeup"] },
  { category: "Shopping", subtype: "Home Items", keywords: ["furniture", "kitchen", "utensil", "home item", "cleaning", "detergent", "decor"] },
  { category: "Shopping", subtype: "Other", keywords: ["shopping", "amazon", "flipkart", "myntra", "ajio", "purchase"] },

  // Healthcare
  { category: "Healthcare", subtype: "Regular", keywords: ["doctor", "hospital", "medicine", "medicines", "pharmacy", "medical", "clinic", "dentist", "tablet", "health", "checkup", "lab test", "scan"] },

  // Entertainment
  { category: "Entertainment", subtype: "Regular", keywords: ["netflix", "spotify", "prime", "hotstar", "subscription", "youtube premium"] },
  { category: "Entertainment", subtype: "One-time", keywords: ["movie", "cinema", "concert", "game", "gaming", "amusement", "outing", "party", "club"] },

  // Savings
  { category: "Savings", subtype: "Emergency Fund", keywords: ["emergency fund"] },
  { category: "Savings", subtype: "Fixed Deposit", keywords: ["fixed deposit", " fd ", "recurring deposit", " rd "] },
  { category: "Savings", subtype: "Investment", keywords: ["sip", "mutual fund", "invest", "stocks", "shares"] },
  { category: "Savings", subtype: "Goal Savings", keywords: ["savings", "saved", "save"] },
];

const INCOME_RULES: CategoryRule[] = [
  { category: "Salary", subtype: "Salary", keywords: ["salary", "payday", "paycheck", "stipend", "wage"] },
  { category: "Salary", subtype: "Bonus", keywords: ["bonus", "incentive"] },
  { category: "Freelance", subtype: "Freelance", keywords: ["freelance", "freelancing", "client", "gig", "project payment", "contract"] },
  { category: "Investment", subtype: "Investment Returns", keywords: ["dividend", "interest", "returns", "capital gain", "maturity"] },
  { category: "Business", subtype: "Business Income", keywords: ["business", "sales", "profit", "revenue"] },
  { category: "Other", subtype: "Other", keywords: ["gift", "refund", "cashback", "reimbursement", "rebate"] },
];

// Words that signal the entry is income rather than expense.
const INCOME_SIGNAL_WORDS = [
  "income",
  "salary",
  "received",
  "got paid",
  "earned",
  "credited",
  "credit",
  "refund",
  "cashback",
  "bonus",
  "dividend",
  "stipend",
  "reimbursement",
];

const EXPENSE_SIGNAL_WORDS = ["expense", "spent", "paid", "bought", "debited"];

// ── Amount extraction ───────────────────────────────────────────────────────

function extractAmount(text: string): number | null {
  // Matches: 120, 1,200, ₹120, rs 120, 1.2k, 2k, 1.5l, 1 lakh, 50000
  const re = /(?:₹|rs\.?|inr|\$)?\s*([\d][\d,]*(?:\.\d+)?)\s*(k|l|lakh|lac|cr|crore)?/gi;
  let best: number | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const numeric = parseFloat(match[1].replace(/,/g, ""));
    if (!Number.isFinite(numeric)) continue;
    const unit = (match[2] || "").toLowerCase();
    let value = numeric;
    if (unit === "k") value = numeric * 1_000;
    else if (unit === "l" || unit === "lakh" || unit === "lac") value = numeric * 100_000;
    else if (unit === "cr" || unit === "crore") value = numeric * 10_000_000;
    // Prefer the largest plausible amount in the string (usually the real one).
    if (best === null || value > best) best = value;
  }
  return best;
}

// ── Description cleanup ─────────────────────────────────────────────────────

const NOISE_WORDS = new Set([
  "expense",
  "income",
  "spent",
  "paid",
  "for",
  "on",
  "of",
  "got",
  "received",
  "earned",
  "rs",
  "inr",
  "a",
  "an",
  "the",
]);

function buildDescription(text: string): string {
  // Strip currency / amount tokens, then tidy whitespace.
  const cleaned = text
    .replace(/(?:₹|rs\.?|inr|\$)\s*[\d][\d,]*(?:\.\d+)?\s*(?:k|l|lakh|lac|cr|crore)?/gi, " ")
    .replace(/\b[\d][\d,]*(?:\.\d+)?\s*(?:k|l|lakh|lac|cr|crore)?\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter((w) => w && !NOISE_WORDS.has(w.toLowerCase()));
  const result = (words.length > 0 ? words.join(" ") : cleaned).trim();
  if (!result) return "Transaction";
  // Capitalise first letter.
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Pick the most distinctive keyword from a raw entry — used when the user
 * corrects a category so the system can "learn" which word drives the choice.
 * Strips amounts/noise, then returns the longest remaining meaningful word
 * (falling back to the full cleaned description).
 */
export function extractKeyword(rawInput: string): string {
  const cleaned = rawInput
    .toLowerCase()
    .replace(/(?:₹|rs\.?|inr|\$)\s*[\d][\d,]*(?:\.\d+)?\s*(?:k|l|lakh|lac|cr|crore)?/gi, " ")
    .replace(/\b[\d][\d,]*(?:\.\d+)?\s*(?:k|l|lakh|lac|cr|crore)?\b/gi, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned
    .split(" ")
    .filter((w) => w.length >= 3 && !NOISE_WORDS.has(w));

  if (words.length === 0) return cleaned;
  // Longest word is usually the most specific (e.g. "restaurant" over "at").
  return words.reduce((a, b) => (b.length > a.length ? b : a));
}

// ── Main parser ─────────────────────────────────────────────────────────────

export function parseTransaction(rawInput: string): ParsedTransaction {
  const raw = rawInput.trim();
  const text = ` ${raw.toLowerCase()} `; // pad so " vi " style keywords match edges

  const amount = extractAmount(raw);

  // Decide type.
  const hasIncomeSignal = INCOME_SIGNAL_WORDS.some((w) => text.includes(w));
  const hasExpenseSignal = EXPENSE_SIGNAL_WORDS.some((w) => text.includes(w));
  // Income keywords are fairly strong; default to expense otherwise.
  const type: TransactionType = hasIncomeSignal && !hasExpenseSignal ? "income" : "expense";

  const rules = type === "income" ? INCOME_RULES : EXPENSE_RULES;

  let category = type === "income" ? "Salary" : "Other";
  let subtype = type === "income" ? "Other" : "Other";
  let matched = false;

  for (const rule of rules) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      category = rule.category;
      subtype = rule.subtype;
      matched = true;
      break;
    }
  }

  // For income with no specific match, fall back sensibly.
  if (type === "income" && !matched) {
    category = "Other";
    subtype = "Other";
  }

  const description = buildDescription(raw);

  // Confidence: amount found + category matched.
  let confidence = 0.3;
  if (amount !== null) confidence += 0.35;
  if (matched) confidence += 0.35;
  confidence = Math.min(1, confidence);

  return { type, amount, category, subtype, description, confidence, raw };
}

/** Parse a multi-line block — one transaction per non-empty line. */
export function parseTransactions(block: string): ParsedTransaction[] {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => parseTransaction(line));
}
