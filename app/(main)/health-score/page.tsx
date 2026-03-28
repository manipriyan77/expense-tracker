"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PiggyBank,
  Receipt,
  Landmark,
  Target,
  BarChart3,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Info,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTransactionsStore } from "@/store/transactions-store";
import { useGoalsStore } from "@/store/goals-store";
import { useNetWorthStore } from "@/store/net-worth-store";
import { useBudgetsStore } from "@/store/budgets-store";
import { useStocksStore } from "@/store/stocks-store";
import { useMutualFundsStore } from "@/store/mutual-funds-store";
import { useGoldStore } from "@/store/gold-store";
import { useForexStore } from "@/store/forex-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

// ── Scoring functions (mirrors dashboard) ────────────────────────────────────
function scoreSavings(r: number) {
  if (r >= 20) return 25;
  if (r >= 15) return 20;
  if (r >= 10) return 15;
  if (r >= 5) return 10;
  if (r > 0) return 5;
  return 0;
}
function scoreBudget(count: number, under: number) {
  if (count === 0) return 12;
  const rate = (under / count) * 100;
  if (rate >= 100) return 20;
  if (rate >= 80) return 16;
  if (rate >= 60) return 12;
  if (rate >= 40) return 8;
  if (rate >= 20) return 4;
  return 0;
}
function scoreDebt(hasAssets: boolean, ratio: number) {
  if (!hasAssets) return 12;
  if (ratio < 10) return 20;
  if (ratio < 20) return 16;
  if (ratio < 30) return 12;
  if (ratio < 50) return 8;
  if (ratio < 80) return 4;
  return 0;
}
function scoreGoals(avg: number | null) {
  if (avg === null) return 8;
  if (avg >= 75) return 15;
  if (avg >= 50) return 12;
  if (avg >= 25) return 9;
  if (avg >= 10) return 6;
  return 3;
}
function scoreInvestments(types: number) {
  if (types >= 3) return 20;
  if (types >= 2) return 15;
  if (types >= 1) return 10;
  return 5;
}
function gradeFromTotal(t: number) {
  if (t >= 85) return "A";
  if (t >= 70) return "B";
  if (t >= 55) return "C";
  if (t >= 40) return "D";
  return "F";
}
function gradeLabelFromTotal(t: number) {
  if (t >= 85) return "Excellent";
  if (t >= 70) return "Good";
  if (t >= 55) return "Fair";
  if (t >= 40) return "Needs Work";
  return "Critical";
}
function ringColorFromTotal(t: number) {
  if (t >= 85) return "#22c55e";
  if (t >= 70) return "#10b981";
  if (t >= 55) return "#f59e0b";
  if (t >= 40) return "#f97316";
  return "#ef4444";
}
function pillarRatioColor(pts: number, max: number) {
  const r = pts / max;
  if (r >= 0.8) return "text-green-600 dark:text-green-400";
  if (r >= 0.6) return "text-emerald-600 dark:text-emerald-400";
  if (r >= 0.4) return "text-amber-600 dark:text-amber-400";
  if (r >= 0.2) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}
function pillarBarColor(pts: number, max: number) {
  const r = pts / max;
  if (r >= 0.8) return "bg-green-500";
  if (r >= 0.6) return "bg-emerald-500";
  if (r >= 0.4) return "bg-amber-500";
  if (r >= 0.2) return "bg-orange-500";
  return "bg-red-500";
}

// ── Pillar metadata ───────────────────────────────────────────────────────────
const PILLAR_META: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    weight: string;
    description: string;
    what: string;
    how: string[];
    link: string;
    linkLabel: string;
    ranges: { label: string; pts: number; max: number }[];
  }
> = {
  Savings: {
    icon: PiggyBank,
    weight: "25 pts",
    description: "What portion of your monthly income you're actually keeping.",
    what: "Savings rate = (Income − Expenses) ÷ Income × 100. Higher is better. This pillar is worth the most (25 pts) because saving consistently is the foundation of financial health.",
    how: [
      "Track every expense so you know where money goes",
      "Aim for 15%+ savings rate — that earns you 20/25 pts",
      "20%+ gets you the full 25 pts",
      "Cut one recurring subscription or dining-out habit to boost this score",
    ],
    link: "/expenses",
    linkLabel: "View expenses",
    ranges: [
      { label: "≥ 20% saved", pts: 25, max: 25 },
      { label: "15 – 20%", pts: 20, max: 25 },
      { label: "10 – 15%", pts: 15, max: 25 },
      { label: "5 – 10%", pts: 10, max: 25 },
      { label: "> 0%", pts: 5, max: 25 },
      { label: "0% or negative", pts: 0, max: 25 },
    ],
  },
  Budgets: {
    icon: Receipt,
    weight: "20 pts",
    description: "How many of your spending budgets are staying within their limits.",
    what: "We count how many budget categories you've set up and how many are within their monthly limit. If you haven't set any budgets yet, you get a neutral 12/20.",
    how: [
      "Set a budget for every major spending category",
      "Review budgets that are over-limit and reduce discretionary spend",
      "100% of budgets under limit → full 20 pts",
      "Even 80%+ under-limit gets you 16 pts",
    ],
    link: "/budgets",
    linkLabel: "Manage budgets",
    ranges: [
      { label: "All budgets under limit (100%)", pts: 20, max: 20 },
      { label: "≥ 80% under limit", pts: 16, max: 20 },
      { label: "≥ 60% under limit", pts: 12, max: 20 },
      { label: "≥ 40% under limit", pts: 8, max: 20 },
      { label: "≥ 20% under limit", pts: 4, max: 20 },
      { label: "No budgets set (neutral)", pts: 12, max: 20 },
    ],
  },
  Debt: {
    icon: Landmark,
    weight: "20 pts",
    description: "Your total debt as a percentage of your total assets (debt-to-asset ratio).",
    what: "Debt ratio = Total liabilities ÷ Total assets × 100. A lower percentage is better. If you have no assets tracked, you get a neutral 12/20.",
    how: [
      "Pay down high-interest debt first (credit cards, personal loans)",
      "Aim to keep debt below 30% of total assets",
      "Below 10% gets you the full 20 pts",
      "Track all your assets (investments, property) to lower the ratio",
    ],
    link: "/debt-tracker",
    linkLabel: "Manage debt",
    ranges: [
      { label: "Debt < 10% of assets", pts: 20, max: 20 },
      { label: "10 – 20%", pts: 16, max: 20 },
      { label: "20 – 30%", pts: 12, max: 20 },
      { label: "30 – 50%", pts: 8, max: 20 },
      { label: "50 – 80%", pts: 4, max: 20 },
      { label: "≥ 80% or no assets (neutral)", pts: 12, max: 20 },
    ],
  },
  Goals: {
    icon: Target,
    weight: "15 pts",
    description: "Average completion percentage across all your active financial goals.",
    what: "We average the progress % of all active goals. If you have no goals, you get a neutral 8/15. Adding goals and contributing to them regularly improves this score.",
    how: [
      "Create at least one financial goal (emergency fund, vacation, down payment)",
      "Set up recurring contributions via Recurring Patterns",
      "Average 75%+ completion across goals → full 15 pts",
      "Even having goals at 25%+ progress earns 9 pts",
    ],
    link: "/goals",
    linkLabel: "View goals",
    ranges: [
      { label: "Average ≥ 75% progress", pts: 15, max: 15 },
      { label: "50 – 75%", pts: 12, max: 15 },
      { label: "25 – 50%", pts: 9, max: 15 },
      { label: "10 – 25%", pts: 6, max: 15 },
      { label: "< 10%", pts: 3, max: 15 },
      { label: "No goals (neutral)", pts: 8, max: 15 },
    ],
  },
  Investments: {
    icon: BarChart3,
    weight: "20 pts",
    description: "Number of different investment asset types you actively hold.",
    what: "We count how many of the 4 asset classes you have a non-zero balance in: Stocks, Mutual Funds, Gold, Forex. More diversification = higher score.",
    how: [
      "Start with one investment type if you haven't yet (index funds are easiest)",
      "Diversify across stocks, mutual funds, and gold for 3 types → 20 pts",
      "Even 1 investment type earns you 10 pts",
      "Consider SIP (Systematic Investment Plan) for mutual funds",
    ],
    link: "/investments",
    linkLabel: "View investments",
    ranges: [
      { label: "3 or more asset types", pts: 20, max: 20 },
      { label: "2 asset types", pts: 15, max: 20 },
      { label: "1 asset type", pts: 10, max: 20 },
      { label: "No investments", pts: 5, max: 20 },
    ],
  },
};

export default function HealthScorePage() {
  const router = useRouter();
  const { format } = useFormatCurrency();

  const { transactions, fetchTransactions } = useTransactionsStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { assets, liabilities, fetchAssets, fetchLiabilities } = useNetWorthStore();
  const { budgets, fetchBudgets } = useBudgetsStore();
  const { stocks, fetchStocks } = useStocksStore();
  const { mutualFunds, fetchMutualFunds } = useMutualFundsStore();
  const { holdings: goldHoldings, load: loadGold } = useGoldStore();
  const { entries: forexEntries, load: loadForex } = useForexStore();

  useEffect(() => {
    fetchTransactions();
    fetchGoals();
    fetchAssets();
    fetchLiabilities();
    fetchBudgets();
    fetchStocks();
    fetchMutualFunds();
    loadGold();
    loadForex();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const currentMonthTxs = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }),
    [transactions, currentMonth, currentYear],
  );

  const income = currentMonthTxs
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = currentMonthTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  const stocksValue = useMemo(() => stocks.reduce((s, x) => s + x.currentValue, 0), [stocks]);
  const mfValue = useMemo(() => mutualFunds.reduce((s, x) => s + x.currentValue, 0), [mutualFunds]);
  const goldValue = useMemo(
    () => goldHoldings.reduce((s, x) => s + x.currentPricePerGram * x.quantityGrams, 0),
    [goldHoldings],
  );
  const forexValue = useMemo(() => {
    const dep = forexEntries.filter((e) => e.type === "deposit").reduce((s, e) => s + e.amount, 0);
    const wit = forexEntries.filter((e) => e.type === "withdrawal").reduce((s, e) => s + e.amount, 0);
    const pnl = forexEntries.filter((e) => e.type === "pnl").reduce((s, e) => s + e.amount, 0);
    return dep - wit + pnl;
  }, [forexEntries]);

  const totalAssets =
    assets.reduce((s, a) => s + a.value, 0) + stocksValue + mfValue + goldValue + forexValue;
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  const budgetUnderCount = budgets.filter((b) => (b.spent_amount || 0) <= b.limit_amount).length;

  const activeGoals = goals.filter((g) => g.status === "active");
  const avgGoalPct =
    activeGoals.length > 0
      ? activeGoals.reduce(
          (s, g) => s + Math.min((g.currentAmount / g.targetAmount) * 100, 100),
          0,
        ) / activeGoals.length
      : null;

  const investTypes = [stocksValue, mfValue, goldValue, forexValue].filter((v) => v > 0).length;

  const pillars = useMemo(() => {
    const savingsPts = scoreSavings(savingsRate);
    const budgetPts = scoreBudget(budgets.length, budgetUnderCount);
    const debtPts = scoreDebt(totalAssets > 0, debtRatio);
    const goalPts = scoreGoals(avgGoalPct);
    const investPts = scoreInvestments(investTypes);

    return [
      {
        key: "Savings",
        pts: savingsPts,
        max: 25,
        current: income > 0 ? `${savingsRate.toFixed(1)}% savings rate` : "No income recorded this month",
        detail: income > 0
          ? `You saved ${format(income - expenses)} of ${format(income)} this month`
          : "Add income transactions to calculate your savings rate",
      },
      {
        key: "Budgets",
        pts: budgetPts,
        max: 20,
        current:
          budgets.length === 0
            ? "No budgets set"
            : `${budgetUnderCount} of ${budgets.length} budgets under limit`,
        detail:
          budgets.length === 0
            ? "Set up spending budgets to start earning points here"
            : budgetUnderCount === budgets.length
              ? "All budgets are within their limits — great discipline!"
              : `${budgets.length - budgetUnderCount} budget${budgets.length - budgetUnderCount > 1 ? "s" : ""} exceeded this month`,
      },
      {
        key: "Debt",
        pts: debtPts,
        max: 20,
        current:
          totalAssets === 0
            ? "No assets tracked"
            : `${debtRatio.toFixed(1)}% debt-to-asset ratio`,
        detail:
          totalAssets === 0
            ? "Add assets in Net Worth to calculate your debt ratio"
            : `${format(totalLiabilities)} in liabilities vs ${format(totalAssets)} in assets`,
      },
      {
        key: "Goals",
        pts: goalPts,
        max: 15,
        current:
          avgGoalPct === null
            ? "No active goals"
            : `${avgGoalPct.toFixed(0)}% average goal progress`,
        detail:
          avgGoalPct === null
            ? "Create financial goals and track your progress"
            : `${activeGoals.length} active goal${activeGoals.length > 1 ? "s" : ""} — keep contributing!`,
      },
      {
        key: "Investments",
        pts: investPts,
        max: 20,
        current:
          investTypes === 0
            ? "No investments tracked"
            : `${investTypes} asset type${investTypes > 1 ? "s" : ""} held`,
        detail:
          investTypes === 0
            ? "Start investing in any asset class to earn points"
            : `${[stocksValue > 0 && "Stocks", mfValue > 0 && "Mutual Funds", goldValue > 0 && "Gold", forexValue > 0 && "Forex"].filter(Boolean).join(", ")}`,
      },
    ];
  }, [
    savingsRate,
    budgets,
    budgetUnderCount,
    totalAssets,
    totalLiabilities,
    debtRatio,
    avgGoalPct,
    activeGoals,
    investTypes,
    income,
    expenses,
    stocksValue,
    mfValue,
    goldValue,
    forexValue,
    format,
  ]);

  const total = pillars.reduce((s, p) => s + p.pts, 0);
  const grade = gradeFromTotal(total);
  const gradeLabel = gradeLabelFromTotal(total);
  const ringColor = ringColorFromTotal(total);

  const gradeTextColor =
    total >= 85
      ? "text-green-500"
      : total >= 70
        ? "text-emerald-500"
        : total >= 55
          ? "text-amber-500"
          : total >= 40
            ? "text-orange-500"
            : "text-red-500";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 -ml-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="font-semibold text-base">Financial Health Score</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Score hero */}
        <Card className="overflow-hidden">
          <div className="bg-slate-900 dark:bg-slate-950 text-white px-6 py-6">
            <div className="flex items-center gap-6">
              {/* Ring */}
              <div className="relative shrink-0 w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#334155" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9"
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="3"
                    strokeDasharray={`${total} ${100 - total}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-mono font-bold">{total}</span>
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase tracking-widest mb-0.5">Overall Score</p>
                <p className={`text-5xl font-bold font-mono leading-none ${gradeTextColor}`}>{grade}</p>
                <p className="text-slate-300 text-sm mt-1">{gradeLabel}</p>
              </div>
              <div className="ml-auto text-right hidden sm:block">
                <p className="text-slate-400 text-xs mb-1">Out of 100 points</p>
                <div className="text-xs text-slate-500 space-y-0.5">
                  {[["A", "85+", "#22c55e"], ["B", "70–84", "#10b981"], ["C", "55–69", "#f59e0b"], ["D", "40–54", "#f97316"], ["F", "<40", "#ef4444"]].map(([g, r, c]) => (
                    <div key={g} className="flex items-center gap-2 justify-end">
                      <span className="font-mono font-bold" style={{ color: c }}>{g}</span>
                      <span>{r} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Summary bar */}
          <div className="grid grid-cols-5 divide-x divide-border border-t">
            {pillars.map((p) => {
              const Icon = PILLAR_META[p.key]!.icon;
              return (
                <div key={p.key} className="px-2 py-2 text-center">
                  <Icon className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                  <p className={`text-sm font-mono font-bold ${pillarRatioColor(p.pts, p.max)}`}>{p.pts}</p>
                  <p className="text-[9px] text-muted-foreground">/{p.max}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Recommendations */}
        {(() => {
          const tips: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; href: string }[] = [];
          const savings = pillars.find((p) => p.key === "Savings")!;
          const budgetP = pillars.find((p) => p.key === "Budgets")!;
          const debtP = pillars.find((p) => p.key === "Debt")!;
          const goalsP = pillars.find((p) => p.key === "Goals")!;
          const investP = pillars.find((p) => p.key === "Investments")!;

          if (savings.pts < savings.max) {
            const gap = savings.max - savings.pts;
            tips.push({ icon: PILLAR_META.Savings.icon, href: "/transactions", title: "Boost your savings rate", desc: income > 0 ? `You're saving ${savingsRate.toFixed(1)}% — target 20%+ for full points (+${gap} pts available)` : "Add income transactions this month to calculate your savings rate" });
          }
          if (budgetP.pts < budgetP.max && budgets.length === 0) {
            tips.push({ icon: PILLAR_META.Budgets.icon, href: "/budgets", title: "Set up spending budgets", desc: `You have no budgets yet — create category budgets to earn up to ${budgetP.max} pts` });
          } else if (budgetP.pts < budgetP.max && budgets.length > 0) {
            const over = budgets.length - budgetUnderCount;
            tips.push({ icon: PILLAR_META.Budgets.icon, href: "/budgets", title: "Reduce overspending", desc: `${over} budget${over > 1 ? "s are" : " is"} over their limit this month — bring them under to gain points` });
          }
          if (debtP.pts < debtP.max && totalAssets > 0) {
            tips.push({ icon: PILLAR_META.Debt.icon, href: "/debt-tracker", title: "Pay down high-interest debt", desc: `Debt-to-asset ratio is ${debtRatio.toFixed(1)}% — reducing debt below 10% earns full ${debtP.max} pts` });
          }
          if (goalsP.pts < goalsP.max && activeGoals.length === 0) {
            tips.push({ icon: PILLAR_META.Goals.icon, href: "/goals", title: "Create financial goals", desc: "Set at least one savings goal to start earning up to 15 pts in this pillar" });
          } else if (goalsP.pts < goalsP.max && avgGoalPct !== null && avgGoalPct < 75) {
            tips.push({ icon: PILLAR_META.Goals.icon, href: "/goals", title: "Contribute to your goals", desc: `Average goal progress is ${avgGoalPct.toFixed(0)}% — reach 75% to earn full ${goalsP.max} pts` });
          }
          if (investP.pts < investP.max) {
            const needed = investTypes === 0 ? "any investment" : investTypes === 1 ? "a second asset type" : "a third asset type";
            tips.push({ icon: PILLAR_META.Investments.icon, href: "/investments", title: "Diversify investments", desc: `Add ${needed} (stocks, mutual funds, gold, or forex) to increase your investment score` });
          }

          if (tips.length === 0) return null;
          const topTips = tips.slice(0, 3);
          return (
            <Card>
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Top {topTips.length} Action{topTips.length > 1 ? "s" : ""} to Improve Your Score
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {topTips.map((tip, i) => {
                  const Icon = tip.icon;
                  return (
                    <button key={i} onClick={() => router.push(tip.href)} className="w-full flex items-start gap-3 text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <div className="p-2 rounded-lg bg-muted shrink-0">
                        <Icon className="h-3.5 w-3.5 text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{tip.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tip.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          );
        })()}

        {/* Pillar cards */}
        {pillars.map((p) => {
          const meta = PILLAR_META[p.key]!;
          const Icon = meta.icon;
          const pct = Math.round((p.pts / p.max) * 100);

          return (
            <Card key={p.key} className="overflow-hidden">
              <CardHeader className="pb-3 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{p.key}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{meta.weight} max</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-2xl font-mono font-bold ${pillarRatioColor(p.pts, p.max)}`}>
                      {p.pts}
                    </span>
                    <span className="text-sm text-muted-foreground">/{p.max}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{p.current}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pillarBarColor(p.pts, p.max)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{p.detail}</p>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* What this measures */}
                <div className="flex gap-2.5">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium mb-0.5">What this measures</p>
                    <p className="text-xs text-muted-foreground">{meta.what}</p>
                  </div>
                </div>

                {/* Score breakdown table */}
                <div>
                  <p className="text-xs font-medium mb-2">Score breakdown</p>
                  <div className="rounded-lg border overflow-hidden">
                    {meta.ranges.map((r, i) => {
                      const isActive = r.pts === p.pts;
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-3 py-2 text-xs border-b last:border-b-0 ${
                            isActive
                              ? "bg-primary/8 dark:bg-primary/10"
                              : "bg-background"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isActive ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                            ) : (
                              <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                            )}
                            <span className={isActive ? "font-medium text-foreground" : "text-muted-foreground"}>
                              {r.label}
                            </span>
                          </div>
                          <span className={`font-mono font-semibold ${isActive ? pillarRatioColor(r.pts, r.max) : "text-muted-foreground"}`}>
                            {r.pts}/{r.max}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* How to improve */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    <p className="text-xs font-medium">How to improve</p>
                  </div>
                  <ul className="space-y-1.5">
                    {meta.how.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-primary font-bold shrink-0">·</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA link */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push(meta.link)}
                >
                  {meta.linkLabel}
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {/* How total score works */}
        <Card>
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-sm">How the total score works</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 text-xs text-muted-foreground space-y-2">
            <p>Your Financial Health Score is the sum of 5 pillars — each pillar has a maximum point value:</p>
            <div className="rounded-lg border overflow-hidden">
              {pillars.map((p) => {
                const Icon = PILLAR_META[p.key]!.icon;
                return (
                  <div key={p.key} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{p.key}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pillarBarColor(p.pts, p.max)}`}
                          style={{ width: `${(p.pts / p.max) * 100}%` }}
                        />
                      </div>
                      <span className={`font-mono font-semibold w-12 text-right ${pillarRatioColor(p.pts, p.max)}`}>
                        {p.pts}/{p.max}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-3 py-2.5 bg-muted/40">
                <span className="font-semibold text-foreground">Total</span>
                <span className={`font-mono font-bold ${gradeTextColor}`}>{total} / 100</span>
              </div>
            </div>
            <p className="pt-1">Scores update automatically as you add transactions, goals, budgets, and investments.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
