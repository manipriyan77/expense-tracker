"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { ListPageSkeleton } from "@/components/ui/skeleton";
import {
  scoreSavings,
  scoreBudget,
  scoreDebt,
  scoreGoals,
  scoreInvestments,
  gradeFromTotal,
  gradeLabelFromTotal,
  ringColorFromTotal,
  pillarRatioColor,
  pillarBarColor,
} from "@/lib/health-score-utils";

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
    what: "Savings rate = (Income − Real Expenses) ÷ Income × 100. Savings/investment-category transactions (Savings, Investments, Goal contributions) are excluded from expenses since they represent money you're keeping, not spending.",
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
    description:
      "How many of your spending budgets are staying within their limits.",
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
    description:
      "Liabilities as a percentage of your total portfolio (assets + liabilities).",
    what: "Debt ratio = Total liabilities ÷ (Total assets + Total liabilities) × 100. This matches the Net Worth page. Lower is better — below 15% earns full 20 pts. No assets tracked gives a neutral 12/20.",
    how: [
      "Pay down high-interest debt first (credit cards, personal loans)",
      "Aim to keep liabilities below 25% of your total portfolio",
      "Below 15% earns full 20 pts",
      "Grow assets (investments, savings) to reduce the ratio even without paying off debt",
    ],
    link: "/debt-tracker",
    linkLabel: "Manage debt",
    ranges: [
      { label: "Liabilities < 15% of portfolio", pts: 20, max: 20 },
      { label: "15 – 25%", pts: 16, max: 20 },
      { label: "25 – 35%", pts: 12, max: 20 },
      { label: "35 – 50%", pts: 8, max: 20 },
      { label: "50 – 67%", pts: 4, max: 20 },
      { label: "≥ 67% or no assets (neutral)", pts: 12, max: 20 },
    ],
  },
  Goals: {
    icon: Target,
    weight: "15 pts",
    description:
      "Average completion percentage across all your active financial goals.",
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
    description:
      "Number of different investment asset types you actively hold.",
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

  const { transactions, loading, fetchTransactions } = useTransactionsStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { assets, liabilities, fetchAssets, fetchLiabilities } =
    useNetWorthStore();
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

  // Savings/investment-category expenses are money being saved, not spent.
  // Exclude them from "real expenses" so the savings rate reflects actual consumption.
  const SAVINGS_CATEGORIES = new Set(["savings", "investment", "investments"]);
  const isSavingsTx = (t: { category?: string; goal_id?: string | null; subtype?: string }) =>
    SAVINGS_CATEGORIES.has((t.category ?? "").toLowerCase()) ||
    !!t.goal_id ||
    (t.subtype ?? "").toLowerCase() === "goal savings";

  const allExpenses = currentMonthTxs
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const savingsExpenses = currentMonthTxs
    .filter((t) => t.type === "expense" && isSavingsTx(t))
    .reduce((s, t) => s + t.amount, 0);
  // Real expenses = spending only (excludes savings/investments recorded as expenses)
  const expenses = allExpenses - savingsExpenses;
  const totalSaved = income - expenses; // includes savings-category "expenses"
  const savingsRate = income > 0 ? (totalSaved / income) * 100 : 0;

  const stocksValue = useMemo(
    () => stocks.reduce((s, x) => s + x.currentValue, 0),
    [stocks],
  );
  const mfValue = useMemo(
    () => mutualFunds.reduce((s, x) => s + x.currentValue, 0),
    [mutualFunds],
  );
  const goldValue = useMemo(
    () =>
      goldHoldings.reduce(
        (s, x) => s + x.currentPricePerGram * x.quantityGrams,
        0,
      ),
    [goldHoldings],
  );
  const forexValue = useMemo(() => {
    const dep = forexEntries
      .filter((e) => e.type === "deposit")
      .reduce((s, e) => s + e.amount, 0);
    const wit = forexEntries
      .filter((e) => e.type === "withdrawal")
      .reduce((s, e) => s + e.amount, 0);
    const pnl = forexEntries
      .filter((e) => e.type === "pnl")
      .reduce((s, e) => s + e.amount, 0);
    return dep - wit + pnl;
  }, [forexEntries]);

  const totalAssets =
    assets.reduce((s, a) => s + a.value, 0) +
    stocksValue +
    mfValue +
    goldValue +
    forexValue;
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  // Debt ratio = liabilities as % of total portfolio (assets + liabilities)
  // This matches the net worth page's formula so both pages show the same %.
  const debtRatio =
    (totalAssets + totalLiabilities) > 0
      ? (totalLiabilities / (totalAssets + totalLiabilities)) * 100
      : 0;

  const budgetUnderCount = budgets.filter(
    (b) => (b.spent_amount || 0) <= b.limit_amount,
  ).length;

  const activeGoals = goals.filter((g) => g.status === "active");
  const avgGoalPct =
    activeGoals.length > 0
      ? activeGoals.reduce(
          (s, g) => s + Math.min((g.currentAmount / g.targetAmount) * 100, 100),
          0,
        ) / activeGoals.length
      : null;

  const investTypes = [stocksValue, mfValue, goldValue, forexValue].filter(
    (v) => v > 0,
  ).length;

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
        current:
          income > 0
            ? `${savingsRate.toFixed(1)}% savings rate`
            : "No income recorded this month",
        detail:
          income > 0
            ? `You saved ${format(totalSaved)} of ${format(income)} this month`
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
    totalSaved,
    budgets,
    budgetUnderCount,
    totalAssets,
    totalLiabilities,
    debtRatio,
    avgGoalPct,
    activeGoals,
    investTypes,
    income,
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

  const [activeTab, setActiveTab] = useState("Savings");

  if (loading && transactions.length === 0) {
    return <ListPageSkeleton />;
  }

  // Build top recommendations
  const tips: { icon: React.ComponentType<{ className?: string }>; title: string; desc: string; href: string; pillar: string }[] = [];
  const savings = pillars.find((p) => p.key === "Savings")!;
  const budgetP = pillars.find((p) => p.key === "Budgets")!;
  const debtP = pillars.find((p) => p.key === "Debt")!;
  const goalsP = pillars.find((p) => p.key === "Goals")!;
  const investP = pillars.find((p) => p.key === "Investments")!;
  if (savings.pts < savings.max) tips.push({ icon: PILLAR_META.Savings.icon, href: "/transactions", pillar: "Savings", title: "Boost your savings rate", desc: income > 0 ? `Saving ${savingsRate.toFixed(1)}% — target 20%+ for full points` : "Add income transactions this month" });
  if (budgetP.pts < budgetP.max && budgets.length === 0) tips.push({ icon: PILLAR_META.Budgets.icon, href: "/budgets", pillar: "Budgets", title: "Set up spending budgets", desc: "No budgets yet — create them to earn up to 20 pts" });
  else if (budgetP.pts < budgetP.max && budgets.length > 0) tips.push({ icon: PILLAR_META.Budgets.icon, href: "/budgets", pillar: "Budgets", title: "Reduce overspending", desc: `${budgets.length - budgetUnderCount} budget(s) over limit this month` });
  if (debtP.pts < debtP.max && totalAssets > 0) tips.push({ icon: PILLAR_META.Debt.icon, href: "/debt-tracker", pillar: "Debt", title: "Pay down high-interest debt", desc: `Debt ratio ${debtRatio.toFixed(1)}% — below 10% earns full 20 pts` });
  if (goalsP.pts < goalsP.max && activeGoals.length === 0) tips.push({ icon: PILLAR_META.Goals.icon, href: "/goals", pillar: "Goals", title: "Create financial goals", desc: "Set at least one goal to start earning up to 15 pts" });
  else if (goalsP.pts < goalsP.max && avgGoalPct !== null && avgGoalPct < 75) tips.push({ icon: PILLAR_META.Goals.icon, href: "/goals", pillar: "Goals", title: "Contribute to your goals", desc: `${avgGoalPct.toFixed(0)}% avg progress — reach 75% for full points` });
  if (investP.pts < investP.max) tips.push({ icon: PILLAR_META.Investments.icon, href: "/investments", pillar: "Investments", title: "Diversify investments", desc: `${investTypes} of 4 asset types tracked — add more to increase score` });

  const activePillar = pillars.find((p) => p.key === activeTab)!;
  const activeMeta = PILLAR_META[activeTab]!;
  const ActiveIcon = activeMeta.icon;
  const activePct = Math.round((activePillar.pts / activePillar.max) * 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1 -ml-1">
          <ArrowLeft className="h-4 w-4" />Back
        </Button>
        <h1 className="font-semibold text-base">Financial Health Score</h1>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 lg:items-start">

          {/* ── LEFT COLUMN ── */}
          <div className="lg:sticky lg:top-16 space-y-4">

            {/* Score hero */}
            <Card className="overflow-hidden">
              <div className="bg-slate-900 dark:bg-slate-950 text-white px-5 py-5">
                <div className="flex items-center gap-5">
                  <div className="relative shrink-0 w-20 h-20">
                    <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#334155" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke={ringColor} strokeWidth="3"
                        strokeDasharray={`${total} ${100 - total}`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-mono font-bold">{total}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-0.5">Overall Score</p>
                    <p className={`text-4xl font-bold font-mono leading-none ${gradeTextColor}`}>{grade}</p>
                    <p className="text-slate-300 text-sm mt-1">{gradeLabel}</p>
                  </div>
                  <div className="text-right hidden sm:block shrink-0">
                    {[["A","85+","#22c55e"],["B","70–84","#10b981"],["C","55–69","#f59e0b"],["D","40–54","#f97316"],["F","<40","#ef4444"]].map(([g,r,c]) => (
                      <div key={g} className="flex items-center gap-2 justify-end text-xs text-slate-500">
                        <span className="font-mono font-bold" style={{ color: c }}>{g}</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Pillar score strip */}
              <div className="grid grid-cols-5 divide-x divide-border border-t">
                {pillars.map((p) => {
                  const Icon = PILLAR_META[p.key]!.icon;
                  const isActive = p.key === activeTab;
                  return (
                    <button key={p.key} onClick={() => setActiveTab(p.key)}
                      className={`px-2 py-2.5 text-center transition-colors hover:bg-muted/50 ${isActive ? "bg-muted" : ""}`}>
                      <Icon className={`h-3.5 w-3.5 mx-auto mb-1 ${isActive ? "text-foreground" : "text-muted-foreground"}`} />
                      <p className={`text-sm font-mono font-bold ${pillarRatioColor(p.pts, p.max)}`}>{p.pts}</p>
                      <p className="text-[9px] text-muted-foreground">/{p.max}</p>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Top Actions */}
            {tips.length > 0 && (
              <Card>
                <CardHeader className="pb-2 border-b border-border pt-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Top Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-3 pb-3 px-3 space-y-2">
                  {tips.slice(0, 4).map((tip, i) => {
                    const Icon = tip.icon;
                    return (
                      <button key={i} onClick={() => setActiveTab(tip.pillar)}
                        className={`w-full flex items-start gap-2.5 text-left p-2.5 rounded-lg border transition-colors hover:bg-muted/50 ${activeTab === tip.pillar ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                        <div className="p-1.5 rounded-md bg-muted shrink-0">
                          <Icon className="h-3 w-3 text-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">{tip.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{tip.desc}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      </button>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Score table */}
            <Card>
              <CardHeader className="pb-2 border-b pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {pillars.map((p) => {
                  const Icon = PILLAR_META[p.key]!.icon;
                  return (
                    <div key={p.key} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs flex-1">{p.key}</span>
                      <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${pillarBarColor(p.pts, p.max)}`} style={{ width: `${(p.pts / p.max) * 100}%` }} />
                      </div>
                      <span className={`font-mono text-xs font-semibold w-10 text-right ${pillarRatioColor(p.pts, p.max)}`}>{p.pts}/{p.max}</span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40">
                  <span className="text-xs font-semibold">Total</span>
                  <span className={`font-mono text-sm font-bold ${gradeTextColor}`}>{total} / 100</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN — Tabbed pillar detail ── */}
          <div className="space-y-0">
            <Card className="overflow-hidden">
              {/* Pillar tab nav */}
              <div className="flex border-b overflow-x-auto">
                {pillars.map((p) => {
                  const Icon = PILLAR_META[p.key]!.icon;
                  const isActive = p.key === activeTab;
                  return (
                    <button key={p.key} onClick={() => setActiveTab(p.key)}
                      className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${isActive ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {p.key}
                      <span className={`ml-1 font-mono text-[10px] font-bold ${pillarRatioColor(p.pts, p.max)}`}>{p.pts}/{p.max}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active pillar content */}
              <div className="px-5 py-4 space-y-5">
                {/* Pillar header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-muted">
                      <ActiveIcon className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">{activeTab}</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">{activeMeta.weight} max · {activeMeta.description}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-3xl font-mono font-bold ${pillarRatioColor(activePillar.pts, activePillar.max)}`}>{activePillar.pts}</span>
                    <span className="text-sm text-muted-foreground">/{activePillar.max}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{activePillar.current}</span>
                    <span>{activePct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pillarBarColor(activePillar.pts, activePillar.max)}`} style={{ width: `${activePct}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{activePillar.detail}</p>
                </div>

                {/* What this measures */}
                <div className="flex gap-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2.5">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">{activeMeta.what}</p>
                </div>

                {/* Score ranges */}
                <div>
                  <p className="text-xs font-medium mb-2">Score breakdown</p>
                  <div className="rounded-lg border overflow-hidden">
                    {activeMeta.ranges.map((r, i) => {
                      const isActive = r.pts === activePillar.pts;
                      return (
                        <div key={i} className={`flex items-center justify-between px-3 py-2 text-xs border-b last:border-b-0 ${isActive ? "bg-primary/8 dark:bg-primary/10" : "bg-background"}`}>
                          <div className="flex items-center gap-2">
                            {isActive ? <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> : <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />}
                            <span className={isActive ? "font-medium text-foreground" : "text-muted-foreground"}>{r.label}</span>
                          </div>
                          <span className={`font-mono font-semibold ${isActive ? pillarRatioColor(r.pts, r.max) : "text-muted-foreground"}`}>{r.pts}/{r.max}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Pillar-specific detail content */}
                <div className="space-y-3">
                  {/* ── SAVINGS ── */}
                  {activeTab === "Savings" && (() => {
                    const p = activePillar;
                    const ptsToFull = 25 - p.pts;
                    const nextTier = savingsRate < 5 ? { target: "5%", pts: 5 } : savingsRate < 10 ? { target: "10%", pts: 10 } : savingsRate < 15 ? { target: "15%", pts: 15 } : savingsRate < 20 ? { target: "20%", pts: 20 } : null;
                    return (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium mb-2">This month&apos;s breakdown</p>
                          <div className="rounded-lg border overflow-hidden divide-y divide-border">
                            {[
                              { label: "Total Income", value: income, color: "text-emerald-600 dark:text-emerald-400", empty: income === 0 },
                              { label: "Real Expenses", value: expenses, color: "text-red-500 dark:text-red-400", empty: expenses === 0, note: "excludes savings/investment transactions" },
                              { label: "Savings & Investments", value: savingsExpenses, color: "text-blue-600 dark:text-blue-400", empty: savingsExpenses === 0, note: "savings-category expenses" },
                              { label: "Total Saved", value: totalSaved, color: totalSaved >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400", empty: income === 0 },
                            ].map((row) => (
                              <div key={row.label} className="flex items-center justify-between px-3 py-2.5 text-xs">
                                <div>
                                  <span className="text-muted-foreground">{row.label}</span>
                                  {"note" in row && row.note && <p className="text-[10px] text-muted-foreground/60">{row.note}</p>}
                                </div>
                                {row.empty ? <span className="text-muted-foreground italic">not recorded</span> : <span className={`font-mono font-semibold ${row.color}`}>{format(row.value)}</span>}
                              </div>
                            ))}
                            <div className="flex items-center justify-between px-3 py-2.5 text-xs bg-muted/30">
                              <span className="font-medium">Savings Rate</span>
                              <span className={`font-mono font-bold ${income > 0 ? pillarRatioColor(p.pts, p.max) : "text-muted-foreground"}`}>{income > 0 ? `${savingsRate.toFixed(1)}%` : "—"}</span>
                            </div>
                          </div>
                        </div>
                        {income > 0 && (
                          <div>
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>0%</span><span>5%</span><span>10%</span><span>15%</span><span>20%+</span></div>
                            <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${pillarBarColor(p.pts, p.max)}`} style={{ width: `${Math.min(savingsRate / 20 * 100, 100)}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>0 pts</span><span>5</span><span>10–15</span><span>20</span><span>25 pts</span></div>
                          </div>
                        )}
                        {ptsToFull > 0 && (
                          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2.5 space-y-1">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">+{ptsToFull} pts available</p>
                            {income === 0 ? <p className="text-xs text-amber-700/80 dark:text-amber-500/80">· Add income transactions this month to start earning savings points.</p>
                              : nextTier && <p className="text-xs text-amber-700/80 dark:text-amber-500/80">· Reach a <strong>{nextTier.target}</strong> savings rate to earn <strong>{nextTier.pts}/25 pts</strong>. Save {format(income * (parseFloat(nextTier.target) / 100) - (income - expenses))} more this month.</p>}
                          </div>
                        )}
                        {ptsToFull === 0 && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 px-3 py-2.5"><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Perfect score! You&apos;re saving 20%+ of your income.</p></div>}
                      </div>
                    );
                  })()}

                  {/* ── BUDGETS ── */}
                  {activeTab === "Budgets" && (() => {
                    const p = activePillar;
                    const over = budgets.filter((b) => (b.spent_amount || 0) > b.limit_amount);
                    const under = budgets.filter((b) => (b.spent_amount || 0) <= b.limit_amount);
                    const ptsToFull = 20 - p.pts;
                    return (
                      <div className="space-y-3">
                        {budgets.length === 0 ? (
                          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2.5">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">No budgets set — you&apos;re getting the neutral 12/20</p>
                            <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1">· Set spending budgets and keep them under limit to earn up to 20/20.</p>
                          </div>
                        ) : (
                          <>
                            {over.length > 0 && (
                              <div>
                                <p className="text-xs font-medium mb-2 text-red-600 dark:text-red-400">Over limit ({over.length})</p>
                                <div className="rounded-lg border border-red-200 dark:border-red-800/40 overflow-hidden divide-y divide-border">
                                  {over.map((b) => { const spent = b.spent_amount || 0; const overBy = spent - b.limit_amount; const pct = Math.min((spent / b.limit_amount) * 100, 999); return (
                                    <div key={b.id} className="px-3 py-2.5 text-xs bg-red-50/40 dark:bg-red-900/10">
                                      <div className="flex items-center justify-between mb-1"><span className="font-medium">{b.category}</span><span className="font-mono text-red-600 dark:text-red-400 font-semibold">{format(spent)} / {format(b.limit_amount)}</span></div>
                                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} /></div>
                                      <p className="text-[10px] text-red-500 mt-0.5">Over by {format(overBy)} ({(pct - 100).toFixed(0)}% over)</p>
                                    </div>
                                  );})}
                                </div>
                              </div>
                            )}
                            {under.length > 0 && (
                              <div>
                                <p className="text-xs font-medium mb-2 text-emerald-600 dark:text-emerald-400">Under limit ({under.length})</p>
                                <div className="rounded-lg border overflow-hidden divide-y divide-border">
                                  {under.map((b) => { const spent = b.spent_amount || 0; const pct = b.limit_amount > 0 ? (spent / b.limit_amount) * 100 : 0; const remaining = b.limit_amount - spent; return (
                                    <div key={b.id} className="px-3 py-2.5 text-xs">
                                      <div className="flex items-center justify-between mb-1"><span className="font-medium">{b.category}</span><span className="font-mono font-semibold">{format(spent)} / {format(b.limit_amount)}</span></div>
                                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${pct > 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} /></div>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">{format(remaining)} remaining · {pct.toFixed(0)}% used</p>
                                    </div>
                                  );})}
                                </div>
                              </div>
                            )}
                            {ptsToFull > 0 && over.length > 0 && <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2.5"><p className="text-xs font-semibold text-amber-700 dark:text-amber-400">+{ptsToFull} pts available</p><p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1">· Bring all {over.length} over-limit budget{over.length > 1 ? "s" : ""} under their limit to reach <strong>20/20</strong>.</p></div>}
                            {ptsToFull === 0 && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 px-3 py-2.5"><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Perfect score! All budgets are within their limits.</p></div>}
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── DEBT ── */}
                  {activeTab === "Debt" && (() => {
                    const p = activePillar;
                    const ptsToFull = 20 - p.pts;
                    const nextTier = debtRatio >= 80 ? { target: "below 80%", num: 80, pts: 4 } : debtRatio >= 50 ? { target: "below 50%", num: 50, pts: 8 } : debtRatio >= 30 ? { target: "below 30%", num: 30, pts: 12 } : debtRatio >= 20 ? { target: "below 20%", num: 20, pts: 16 } : debtRatio >= 10 ? { target: "below 10%", num: 10, pts: 20 } : null;
                    return (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium mb-2">Assets vs Liabilities</p>
                          <div className="rounded-lg border overflow-hidden divide-y divide-border">
                            <div className="flex items-center justify-between px-3 py-2.5 text-xs"><span className="text-muted-foreground">Total Assets</span><span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{format(totalAssets)}</span></div>
                            <div className="flex items-center justify-between px-3 py-2.5 text-xs"><span className="text-muted-foreground">Total Liabilities</span><span className="font-mono font-semibold text-red-500 dark:text-red-400">{format(totalLiabilities)}</span></div>
                            <div className="flex items-center justify-between px-3 py-2.5 text-xs bg-muted/30"><span className="font-medium">Debt-to-Asset Ratio</span><span className={`font-mono font-bold ${pillarRatioColor(p.pts, p.max)}`}>{totalAssets > 0 ? `${debtRatio.toFixed(1)}%` : "—"}</span></div>
                          </div>
                        </div>
                        {liabilities.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-2">Liabilities ({liabilities.length})</p>
                            <div className="rounded-lg border overflow-hidden divide-y divide-border">
                              {liabilities.map((l) => { const pct = totalLiabilities > 0 ? (l.balance / totalLiabilities) * 100 : 0; return (
                                <div key={l.id} className="px-3 py-2.5 text-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <div><span className="font-medium">{l.name}</span>{l.interest_rate && <span className="ml-2 text-[10px] text-orange-500">{l.interest_rate}% APR</span>}</div>
                                    <div className="text-right"><span className="font-mono font-semibold text-red-500 dark:text-red-400">{format(l.balance)}</span><span className="text-muted-foreground ml-1">{pct.toFixed(0)}%</span></div>
                                  </div>
                                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full bg-red-500 transition-all" style={{ width: `${pct}%` }} /></div>
                                </div>
                              );})}
                            </div>
                          </div>
                        )}
                        {totalAssets === 0 && <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2.5"><p className="text-xs font-semibold text-amber-700 dark:text-amber-400">No assets tracked — getting neutral 12/20</p><p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1">· Add assets in Net Worth to calculate your actual debt ratio.</p></div>}
                        {ptsToFull > 0 && totalAssets > 0 && nextTier && (
                          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2.5 space-y-1">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">+{ptsToFull} pts available</p>
                            <p className="text-xs text-amber-700/80 dark:text-amber-500/80">· Get debt ratio <strong>{nextTier.target}</strong> to reach <strong>{nextTier.pts}/20 pts</strong>.</p>
                            <p className="text-xs text-amber-700/80 dark:text-amber-500/80">· Reduce liabilities below <strong>{format(totalAssets * nextTier.num / 100)}</strong> or grow assets above <strong>{format(totalLiabilities / (nextTier.num / 100))}</strong>.</p>
                          </div>
                        )}
                        {ptsToFull === 0 && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 px-3 py-2.5"><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Perfect score! Debt ratio is below 10%.</p></div>}
                      </div>
                    );
                  })()}

                  {/* ── GOALS ── */}
                  {activeTab === "Goals" && (() => {
                    const p = activePillar;
                    const ptsToFull = 15 - p.pts;
                    const nextTier = avgGoalPct === null ? null : avgGoalPct < 10 ? { target: "10%", pts: 6 } : avgGoalPct < 25 ? { target: "25%", pts: 9 } : avgGoalPct < 50 ? { target: "50%", pts: 12 } : avgGoalPct < 75 ? { target: "75%", pts: 15 } : null;
                    return (
                      <div className="space-y-3">
                        {activeGoals.length === 0 ? (
                          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2.5">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">No active goals — getting neutral 8/15</p>
                            <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1">· Create financial goals (emergency fund, vacation, down payment) to start earning full points.</p>
                          </div>
                        ) : (
                          <>
                            <div>
                              <p className="text-xs font-medium mb-2">Active goals ({activeGoals.length})</p>
                              <div className="rounded-lg border overflow-hidden divide-y divide-border">
                                {activeGoals.map((g) => { const pct = Math.min((g.currentAmount / g.targetAmount) * 100, 100); const remaining = Math.max(g.targetAmount - g.currentAmount, 0); return (
                                  <div key={g.id} className="px-3 py-2.5 text-xs">
                                    <div className="flex items-center justify-between mb-1"><span className="font-medium truncate max-w-40">{g.title}</span><div className="text-right shrink-0"><span className="font-mono font-semibold">{format(g.currentAmount)}</span><span className="text-muted-foreground"> / {format(g.targetAmount)}</span></div></div>
                                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${pct >= 75 ? "bg-emerald-500" : pct >= 25 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} /></div>
                                    <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5"><span>{pct.toFixed(1)}% complete</span><span>{format(remaining)} to go</span></div>
                                  </div>
                                );})}
                                <div className="flex items-center justify-between px-3 py-2.5 text-xs bg-muted/30"><span className="font-medium">Average Progress</span><span className={`font-mono font-bold ${pillarRatioColor(p.pts, p.max)}`}>{avgGoalPct?.toFixed(1)}%</span></div>
                              </div>
                            </div>
                            {ptsToFull > 0 && nextTier && <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2.5 space-y-1"><p className="text-xs font-semibold text-amber-700 dark:text-amber-400">+{ptsToFull} pts available</p><p className="text-xs text-amber-700/80 dark:text-amber-500/80">· Reach <strong>{nextTier.target}</strong> average progress across all goals to earn <strong>{nextTier.pts}/15 pts</strong>.</p></div>}
                            {ptsToFull === 0 && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 px-3 py-2.5"><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Perfect score! Average goal progress is 75%+.</p></div>}
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── INVESTMENTS ── */}
                  {activeTab === "Investments" && (() => {
                    const p = activePillar;
                    const investmentClasses = [
                      { name: "Mutual Funds", value: mfValue, href: "/mutual-funds", tracked: mfValue > 0 },
                      { name: "Gold", value: goldValue, href: "/gold", tracked: goldValue > 0 },
                      { name: "Stocks", value: stocksValue, href: "/stocks", tracked: stocksValue > 0 },
                      { name: "Forex", value: forexValue, href: "/forex", tracked: forexValue > 0 },
                    ];
                    const trackedCount = investmentClasses.filter(i => i.tracked).length;
                    const missing = investmentClasses.filter(i => !i.tracked);
                    const ptsToFull = 20 - p.pts;
                    return (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium mb-2">What&apos;s being tracked</p>
                          <div className="rounded-lg border overflow-hidden divide-y divide-border">
                            {investmentClasses.map((ic) => (
                              <div key={ic.name} className={`flex items-center justify-between px-3 py-2.5 text-xs ${ic.tracked ? "bg-background" : "bg-muted/30"}`}>
                                <div className="flex items-center gap-2">
                                  {ic.tracked ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />}
                                  <span className={ic.tracked ? "font-medium" : "text-muted-foreground"}>{ic.name}</span>
                                  {ic.tracked && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full font-medium">tracked</span>}
                                  {!ic.tracked && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">not started</span>}
                                </div>
                                <div className="text-right">
                                  {ic.tracked ? <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{format(ic.value)}</span> : <button onClick={() => router.push(ic.href)} className="text-primary hover:underline text-[10px]">Start tracking →</button>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {ptsToFull > 0 && (
                          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2.5 space-y-1.5">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">+{ptsToFull} pts available — here&apos;s what to do</p>
                            {trackedCount < 2 && <p className="text-xs text-amber-700/80 dark:text-amber-500/80">· Track <strong>2 asset types</strong> to jump from {p.pts} → 15 pts. Add {missing.slice(0, 2).map(m => m.name).join(" or ")}.</p>}
                            {trackedCount === 2 && <p className="text-xs text-amber-700/80 dark:text-amber-500/80">· Track <strong>1 more asset type</strong> ({missing.map(m => m.name).join(" or ")}) to reach <strong>20/20</strong>.</p>}
                            {trackedCount >= 3 && <p className="text-xs text-amber-700/80 dark:text-amber-500/80">· You&apos;re at max score! All 4 asset classes tracked.</p>}
                          </div>
                        )}
                        {ptsToFull === 0 && <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 px-3 py-2.5"><p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Perfect score! All {trackedCount} asset classes tracked.</p></div>}
                      </div>
                    );
                  })()}
                </div>

                {/* How to improve */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    <p className="text-xs font-medium">How to improve</p>
                  </div>
                  <ul className="space-y-1.5">
                    {activeMeta.how.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-primary font-bold shrink-0">·</span>{tip}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button variant="outline" size="sm" className="w-full" onClick={() => router.push(activeMeta.link)}>
                  {activeMeta.linkLabel}<ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>{/* end px-5 py-4 */}
            </Card>{/* end right card */}
          </div>{/* end right col */}
        </div>{/* end grid */}
      </div>{/* end max-w container */}
    </div>
  );
}
