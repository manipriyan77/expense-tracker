// Rule-based investment advisor.
//
// Given a snapshot of someone's monthly cash flow, debts, emergency fund and
// goals, it produces a *prioritised* plan for where each rupee of surplus
// should go — following the widely-accepted personal-finance waterfall:
//
//   1. A starter emergency buffer (1 month of expenses)
//   2. Paying down high-interest debt (credit cards / costly loans)
//   3. Topping the emergency fund up to a full ~6 months
//   4. Funding priority goals
//   5. Long-term investing, split across avenues by risk appetite
//
// It is deliberately transparent (every number has a rationale) and pure, so a
// smarter AI backend could later replace `buildInvestmentPlan` if desired.

export type RiskProfile = "conservative" | "balanced" | "aggressive";

export type AvenueKey =
  | "emergency"
  | "debt"
  | "goal"
  | "mutual_funds"
  | "stocks"
  | "gold"
  | "fd";

export type Urgency = "critical" | "high" | "medium" | "low";

export interface AdvisorGoal {
  title: string;
  priority: "high" | "medium" | "low";
  /** Suggested monthly contribution to stay on track. */
  monthlyNeeded: number;
}

export interface AdvisorInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  /** Current liquid savings available as an emergency fund. */
  emergencyFund: number;
  /** Total balance on high-interest debt (cards / costly loans). */
  highInterestDebt: number;
  /** Highest interest rate among those debts, for messaging. */
  topDebtRate: number;
  goals: AdvisorGoal[];
  riskProfile: RiskProfile;
  emergencyMonthsTarget?: number; // default 6
}

export interface Recommendation {
  id: string;
  rank: number;
  avenue: AvenueKey;
  title: string;
  monthlyAmount: number;
  rationale: string;
  urgency: Urgency;
  /** Optional progress note, e.g. "Funded 2 of 6 months". */
  meta?: string;
}

export interface InvestmentPlan {
  surplus: number;
  allocated: number;
  unallocated: number;
  savingsRate: number; // surplus / income
  recommendations: Recommendation[];
  summary: string;
  warnings: string[];
}

const round = (n: number) => Math.max(0, Math.round(n / 100) * 100);

// Long-term investing split per risk profile. Values are percentages.
const INVEST_SPLITS: Record<RiskProfile, { avenue: AvenueKey; label: string; pct: number }[]> = {
  conservative: [
    { avenue: "fd", label: "Fixed Deposit / PPF", pct: 35 },
    { avenue: "mutual_funds", label: "Debt & Hybrid Mutual Funds (SIP)", pct: 35 },
    { avenue: "gold", label: "Gold (Sovereign Gold Bonds / Fund)", pct: 20 },
    { avenue: "stocks", label: "Bluechip Stocks", pct: 10 },
  ],
  balanced: [
    { avenue: "mutual_funds", label: "Index & Equity Mutual Funds (SIP)", pct: 55 },
    { avenue: "stocks", label: "Stocks", pct: 20 },
    { avenue: "gold", label: "Gold", pct: 15 },
    { avenue: "fd", label: "Debt Funds / FD", pct: 10 },
  ],
  aggressive: [
    { avenue: "mutual_funds", label: "Equity & Index Mutual Funds (SIP)", pct: 50 },
    { avenue: "stocks", label: "Direct Stocks", pct: 35 },
    { avenue: "gold", label: "Gold", pct: 10 },
    { avenue: "fd", label: "Liquid Fund (buffer)", pct: 5 },
  ],
};

export function buildInvestmentPlan(input: AdvisorInput): InvestmentPlan {
  const {
    monthlyIncome,
    monthlyExpenses,
    emergencyFund,
    highInterestDebt,
    topDebtRate,
    goals,
    riskProfile,
  } = input;
  const emergencyMonths = input.emergencyMonthsTarget ?? 6;

  const surplus = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? surplus / monthlyIncome : 0;
  const warnings: string[] = [];
  const recommendations: Recommendation[] = [];

  if (surplus <= 0) {
    warnings.push(
      monthlyIncome <= 0
        ? "No income detected — add some income transactions to get a plan."
        : "Your expenses meet or exceed your income, so there is nothing left to invest yet. Focus on trimming expenses first.",
    );
    return {
      surplus,
      allocated: 0,
      unallocated: 0,
      savingsRate,
      recommendations,
      summary:
        surplus < 0
          ? `You're overspending by ${Math.abs(surplus).toLocaleString()} a month. Cut back before investing.`
          : "You're breaking even. Free up some surplus before investing.",
      warnings,
    };
  }

  let remaining = surplus;
  let rank = 1;

  const push = (r: Omit<Recommendation, "id" | "rank">) => {
    if (r.monthlyAmount <= 0) return;
    recommendations.push({ ...r, id: `rec-${rank}`, rank });
    rank += 1;
    remaining -= r.monthlyAmount;
  };

  // ── 1. Starter emergency buffer (1 month of expenses) ─────────────────────
  const oneMonth = monthlyExpenses;
  if (emergencyFund < oneMonth && monthlyExpenses > 0) {
    const gap = oneMonth - emergencyFund;
    // Build it quickly: up to 60% of surplus, but no more than the gap.
    const amount = round(Math.min(remaining, gap, surplus * 0.6));
    push({
      avenue: "emergency",
      title: "Build a starter emergency fund",
      monthlyAmount: amount,
      urgency: "critical",
      rationale: `You have less than one month of expenses set aside. Park this in a high-yield savings account or liquid fund before anything else.`,
      meta: `${emergencyFund.toLocaleString()} of ${oneMonth.toLocaleString()} (1-month buffer)`,
    });
  }

  // ── 2. High-interest debt ─────────────────────────────────────────────────
  if (highInterestDebt > 0 && remaining > 0) {
    const amount = round(Math.min(remaining, surplus * 0.5));
    push({
      avenue: "debt",
      title: "Attack high-interest debt",
      monthlyAmount: amount,
      urgency: "critical",
      rationale: `Paying down debt at ${topDebtRate || 18}% is a guaranteed, tax-free return that beats almost any investment. Clear this before investing in markets.`,
      meta: `${highInterestDebt.toLocaleString()} outstanding`,
    });
  }

  // ── 3. Full emergency fund (up to N months) ───────────────────────────────
  const fullTarget = emergencyMonths * monthlyExpenses;
  const afterStarter = Math.max(emergencyFund, Math.min(oneMonth, emergencyFund));
  if (afterStarter < fullTarget && monthlyExpenses > 0 && remaining > 0) {
    const gap = fullTarget - Math.max(emergencyFund, oneMonth);
    const amount = round(Math.min(remaining, gap, surplus * 0.3));
    if (amount > 0) {
      push({
        avenue: "emergency",
        title: `Grow emergency fund toward ${emergencyMonths} months`,
        monthlyAmount: amount,
        urgency: "high",
        rationale: `A full ${emergencyMonths}-month cushion protects your investments from being sold in an emergency. Keep it liquid.`,
        meta: `Target ${fullTarget.toLocaleString()}`,
      });
    }
  }

  // ── 4. Priority goals ─────────────────────────────────────────────────────
  const priorityRank = { high: 0, medium: 1, low: 2 } as const;
  const sortedGoals = [...goals]
    .filter((g) => g.monthlyNeeded > 0)
    .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  for (const g of sortedGoals) {
    if (remaining <= 0) break;
    const amount = round(Math.min(remaining, g.monthlyNeeded));
    push({
      avenue: "goal",
      title: `Fund goal: ${g.title}`,
      monthlyAmount: amount,
      urgency: g.priority === "high" ? "high" : "medium",
      rationale: `Set aside the monthly amount needed to hit this ${g.priority}-priority goal on time. Match the vehicle to the timeline (liquid for <3 yrs, equity for longer).`,
    });
  }

  // ── 5. Long-term investing — split the rest by risk profile ───────────────
  if (remaining > 0) {
    const investable = remaining;
    const split = INVEST_SPLITS[riskProfile];
    for (const part of split) {
      const amount = round((investable * part.pct) / 100);
      if (amount <= 0) continue;
      push({
        avenue: part.avenue,
        title: part.label,
        monthlyAmount: amount,
        urgency: "low",
        rationale: `${part.pct}% of your investable surplus, matched to a ${riskProfile} risk profile.`,
      });
    }
  }

  const allocated = recommendations.reduce((s, r) => s + r.monthlyAmount, 0);
  const unallocated = Math.max(0, surplus - allocated);

  // Contextual warnings.
  if (savingsRate < 0.1) {
    warnings.push(
      "Your savings rate is under 10%. Aim for 20%+ by trimming discretionary spending.",
    );
  }
  if (emergencyFund < oneMonth) {
    warnings.push(
      "Avoid market investments until you have at least one month of expenses saved.",
    );
  }

  const summary =
    `From a monthly surplus of ${round(surplus).toLocaleString()} ` +
    `(${Math.round(savingsRate * 100)}% savings rate), here's where each rupee should go, in priority order.`;

  return {
    surplus,
    allocated,
    unallocated,
    savingsRate,
    recommendations,
    summary,
    warnings,
  };
}
