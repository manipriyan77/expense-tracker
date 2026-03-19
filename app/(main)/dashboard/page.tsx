"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target as TargetIcon,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Trophy,
  Wallet,
  Camera,
  X,
  PiggyBank,
  Receipt,
  Landmark,
  BarChart3,
  Lightbulb,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useTransactionsStore } from "@/store/transactions-store";
import { useGoalsStore } from "@/store/goals-store";
import { useNetWorthStore } from "@/store/net-worth-store";
import { useDebtTrackerStore } from "@/store/debt-tracker-store";
import { useStocksStore } from "@/store/stocks-store";
import { useMutualFundsStore } from "@/store/mutual-funds-store";
import { useGoldStore } from "@/store/gold-store";
import { useForexStore } from "@/store/forex-store";
import { useOtherInvestmentsStore } from "@/store/other-investments-store";
import { useBudgetsStore } from "@/store/budgets-store";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { RecentTransactionsWidget } from "@/components/dashboard/RecentTransactionsWidget";
import { QuickAddButton } from "@/components/QuickAddButton";
import { DashboardCustomizer } from "@/components/dashboard/DashboardCustomizer";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { StatsSkeleton } from "@/components/ui/skeleton";
import { useDashboardPreferencesStore } from "@/store/dashboard-preferences-store";
// financial health card removed
// achievements removed from dashboard
// import { StreaksBadges } from "@/components/streaks-badges";

// ── Financial Health Score helpers (module-level to avoid cognitive complexity) ──
// 5 pillars, 25+20+20+15+20 = 100 pts max
function scoreSavings(savingsRate: number): number {
  if (savingsRate >= 20) return 25;
  if (savingsRate >= 15) return 20;
  if (savingsRate >= 10) return 15;
  if (savingsRate >= 5) return 10;
  if (savingsRate > 0) return 5;
  return 0;
}
function scoreBudget(budgetCount: number, underCount: number): number {
  if (budgetCount === 0) return 12;
  const rate = (underCount / budgetCount) * 100;
  if (rate >= 100) return 20;
  if (rate >= 80) return 16;
  if (rate >= 60) return 12;
  if (rate >= 40) return 8;
  if (rate >= 20) return 4;
  return 0;
}
function scoreDebt(hasAssets: boolean, debtRatio: number): number {
  if (!hasAssets) return 12;
  if (debtRatio < 10) return 20;
  if (debtRatio < 20) return 16;
  if (debtRatio < 30) return 12;
  if (debtRatio < 50) return 8;
  if (debtRatio < 80) return 4;
  return 0;
}
function scoreGoals(avgPct: number | null): number {
  if (avgPct === null) return 8;
  if (avgPct >= 75) return 15;
  if (avgPct >= 50) return 12;
  if (avgPct >= 25) return 9;
  if (avgPct >= 10) return 6;
  return 3;
}
function scoreInvestments(activeTypes: number): number {
  if (activeTypes >= 3) return 20;
  if (activeTypes >= 2) return 15;
  if (activeTypes >= 1) return 10;
  return 5;
}
function gradeFromTotal(total: number): string {
  if (total >= 85) return "A";
  if (total >= 70) return "B";
  if (total >= 55) return "C";
  if (total >= 40) return "D";
  return "F";
}
function gradeLabelFromTotal(total: number): string {
  if (total >= 85) return "Excellent";
  if (total >= 70) return "Good";
  if (total >= 55) return "Fair";
  if (total >= 40) return "Needs Work";
  return "Critical";
}
function gradeColorFromTotal(total: number): string {
  if (total >= 85) return "text-green-400";
  if (total >= 70) return "text-emerald-400";
  if (total >= 55) return "text-amber-400";
  if (total >= 40) return "text-orange-400";
  return "text-red-400";
}
function ringColorFromTotal(total: number): string {
  if (total >= 85) return "#22c55e";
  if (total >= 70) return "#10b981";
  if (total >= 55) return "#f59e0b";
  if (total >= 40) return "#f97316";
  return "#ef4444";
}
function pillarRatioColor(pts: number, max: number): string {
  const r = pts / max;
  if (r >= 0.8) return "#22c55e";
  if (r >= 0.6) return "#10b981";
  if (r >= 0.4) return "#f59e0b";
  if (r >= 0.2) return "#f97316";
  return "#ef4444";
}
function trendColorClass(delta: number | null): string {
  if (delta === null || delta === 0) return "text-slate-500";
  return delta > 0 ? "text-green-400" : "text-red-400";
}
function trendStr(delta: number | null): string {
  if (delta === null || delta === 0) return "Same as last month";
  return delta > 0 ? `+${delta} vs last month` : `${delta} vs last month`;
}
function tipSavings(rate: number): string {
  if (rate < 15) return `Savings rate ${rate.toFixed(1)}% — aim for 15%+ to earn top score`;
  return "";
}
function tipBudget(count: number, underCount: number): string {
  if (count === 0) return "Set spending budgets to unlock the Budget score";
  if (underCount < count) return `${count - underCount} budget(s) are over limit — review spending`;
  return "";
}
function tipDebt(ratio: number): string {
  if (ratio >= 30) return `Debt ratio ${ratio.toFixed(1)}% — pay down debt to aim under 30%`;
  return "";
}
function tipGoals(avgPct: number | null): string {
  if (avgPct === null) return "Add financial goals to track your progress";
  if (avgPct < 25) return "Goals are early-stage — keep contributing regularly";
  return "";
}
function tipInvestments(types: number): string {
  if (types === 0) return "Start investing to diversify and grow your wealth";
  if (types === 1) return "Diversify across stocks, mutual funds, gold, or forex";
  return "";
}
function getTopTips(items: Array<{ ratio: number; tip: string }>): string[] {
  return items
    .filter((t) => t.ratio < 0.75 && t.tip.length > 0)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 2)
    .map((t) => t.tip);
}

const PILLAR_ICONS = {
  Savings: PiggyBank,
  Budgets: Receipt,
  Debt: Landmark,
  Goals: TargetIcon,
  Investments: BarChart3,
};

const PILLAR_INFO: Record<string, { description: string; how: string }> = {
  Savings: {
    description: "% of monthly income you save after all expenses.",
    how: "Aim for 15%+ savings rate. Cut discretionary spending or add income streams.",
  },
  Budgets: {
    description: "How many of your budget categories stay within their spending limits.",
    how: "Review overspent categories and tighten limits. Set budgets if you haven't yet.",
  },
  Debt: {
    description: "Your total liabilities as a percentage of total assets (debt-to-asset ratio).",
    how: "Pay down high-interest debt first. Aim to keep debt below 30% of assets.",
  },
  Goals: {
    description: "Average completion % across all active financial goals.",
    how: "Create goals and contribute consistently. Even small monthly amounts compound fast.",
  },
  Investments: {
    description: "Number of investment asset types you actively hold (stocks, MF, gold, forex).",
    how: "Diversify across 3+ asset types. Start with index funds or gold SIP for easy diversification.",
  },
};

const PILLAR_RANGES: Record<string, string[]> = {
  Savings: [
    "≥ 20% saved  →  25 / 25 pts",
    "15 – 20%     →  20 / 25 pts",
    "10 – 15%     →  15 / 25 pts",
    " 5 – 10%     →  10 / 25 pts",
    " > 0%         →   5 / 25 pts",
    "0% or less   →   0 / 25 pts",
  ],
  Budgets: [
    "All under limit  →  20 / 20 pts",
    "≥ 80% under      →  16 / 20 pts",
    "≥ 60% under      →  12 / 20 pts",
    "≥ 40% under      →   8 / 20 pts",
    "≥ 20% under      →   4 / 20 pts",
    "None set          →  12 / 20 pts (neutral)",
  ],
  Debt: [
    "Debt < 10% of assets  →  20 / 20 pts",
    "10 – 20%               →  16 / 20 pts",
    "20 – 30%               →  12 / 20 pts",
    "30 – 50%               →   8 / 20 pts",
    "50 – 80%               →   4 / 20 pts",
    "≥ 80% or no assets     →  12 / 20 pts (neutral)",
  ],
  Goals: [
    "≥ 75% avg progress  →  15 / 15 pts",
    "50 – 75%             →  12 / 15 pts",
    "25 – 50%             →   9 / 15 pts",
    "10 – 25%             →   6 / 15 pts",
    "< 10%                →   3 / 15 pts",
    "No goals             →   8 / 15 pts (neutral)",
  ],
  Investments: [
    "3 + types  →  20 / 20 pts",
    "2 types    →  15 / 20 pts",
    "1 type     →  10 / 20 pts",
    "None       →   5 / 20 pts",
  ],
};

function budgetSliceColor(pct: number, idx: number): string {
  if (pct >= 100) return "#dc2626";
  if (pct >= 80) return "#f97316";
  if (pct >= 60) return "#eab308";
  return ALLOCATION_COLORS[idx % ALLOCATION_COLORS.length];
}
function budgetPctTextColor(pct: number): string {
  if (pct >= 100) return "text-red-600 dark:text-red-400";
  if (pct >= 80) return "text-orange-500";
  return "text-muted-foreground";
}

const ALLOCATION_COLORS = [
  "#16a34a",
  "#2563eb",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
];

export default function Dashboard() {
  const router = useRouter();
  const { format } = useFormatCurrency();
  useAuthStore();
  const { transactions, loading, error, fetchTransactions } =
    useTransactionsStore();
  const { goals, fetchGoals } = useGoalsStore();
  const {
    assets,
    liabilities,
    snapshots,
    fetchAssets,
    fetchLiabilities,
    fetchSnapshots,
    createSnapshot,
    clearSnapshots,
  } = useNetWorthStore();
  const { debts, fetchDebts } = useDebtTrackerStore();
  const { budgets, fetchBudgets } = useBudgetsStore();
  const { stocks, fetchStocks } = useStocksStore();
  const { mutualFunds, fetchMutualFunds } = useMutualFundsStore();
  const { holdings: goldHoldings, load: loadGold } = useGoldStore();
  const { entries: forexEntries, load: loadForex } = useForexStore();
  const { investments: otherInvestments, load: loadOtherInvestments } = useOtherInvestmentsStore();

  const { isVisible, hydrateFromStorage } = useDashboardPreferencesStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [goalBannerDismissed, setGoalBannerDismissed] = useState(false);
  const [takingSnapshot, setTakingSnapshot] = useState(false);

  useEffect(() => {
    hydrateFromStorage();
    fetchTransactions();
    fetchGoals();
    fetchAssets();
    fetchLiabilities();
    fetchDebts();
    fetchSnapshots();
    fetchStocks();
    fetchMutualFunds();
    loadGold();
    loadForex();
    loadOtherInvestments();
    fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const date = new Date(t.date);
      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      );
    });
  }, [transactions, currentMonth, currentYear]);

  const currentMonthIncome = currentMonthTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const currentMonthExpenses = currentMonthTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // Net Worth calculations
  // include investments tracked in other modules (stocks, mutual funds, gold, forex)
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
    const deposits = forexEntries
      .filter((e) => e.type === "deposit")
      .reduce((s, e) => s + e.amount, 0);
    const withdrawals = forexEntries
      .filter((e) => e.type === "withdrawal")
      .reduce((s, e) => s + e.amount, 0);
    const pnl = forexEntries
      .filter((e) => e.type === "pnl")
      .reduce((s, e) => s + e.amount, 0);
    return deposits - withdrawals + pnl;
  }, [forexEntries]);

  const otherInvestmentsValue = otherInvestments.reduce((s, x) => s + x.currentValue, 0);
  const manualAssetsTotal = assets.reduce((s, a) => s + a.value, 0);
  const totalAssets =
    manualAssetsTotal + stocksValue + mfValue + goldValue + forexValue + otherInvestmentsValue;

  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtRatio =
    totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  // Financial Health Score (0–100, 5 pillars: 25+20+20+15+20)
  const healthScore = useMemo(() => {
    const savingsRate =
      currentMonthIncome > 0
        ? ((currentMonthIncome - currentMonthExpenses) / currentMonthIncome) * 100
        : 0;

    // Previous month data for trend indicator
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const prevTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });
    const prevIncome = prevTxs
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevTxs
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const prevSavingsRate =
      prevIncome > 0 ? ((prevIncome - prevExpenses) / prevIncome) * 100 : 0;

    const budgetUnderCount = budgets.filter(
      (b) => (b.spent_amount || 0) <= b.limit_amount,
    ).length;

    const activeGoalsForScore = goals.filter((g) => g.status === "active");
    const avgGoalPct =
      activeGoalsForScore.length > 0
        ? activeGoalsForScore.reduce(
            (sum, g) =>
              sum + Math.min((g.currentAmount / g.targetAmount) * 100, 100),
            0,
          ) / activeGoalsForScore.length
        : null;

    const investTypes = [stocksValue, mfValue, goldValue, forexValue].filter(
      (v) => v > 0,
    ).length;

    const savingsPts = scoreSavings(savingsRate);
    const budgetPts = scoreBudget(budgets.length, budgetUnderCount);
    const debtPts = scoreDebt(totalAssets > 0, debtRatio);
    const goalPts = scoreGoals(avgGoalPct);
    const investPts = scoreInvestments(investTypes);
    const total = savingsPts + budgetPts + debtPts + goalPts + investPts;

    // Trend vs last month (savings pillar is the only one with historical tx data)
    const hasPrevData = prevTxs.length > 0;
    const prevTotal = hasPrevData
      ? scoreSavings(prevSavingsRate) + budgetPts + debtPts + goalPts + investPts
      : null;
    const trend = prevTotal === null ? null : total - prevTotal;

    const investTypeSuffix = investTypes > 1 ? "s" : "";
    const investLabel =
      investTypes === 0 ? "None" : `${investTypes} type${investTypeSuffix}`;

    const components = [
      {
        label: "Savings",
        pts: savingsPts,
        max: 25,
        value: currentMonthIncome > 0 ? `${savingsRate.toFixed(1)}%` : "—",
        color: pillarRatioColor(savingsPts, 25),
        tip: tipSavings(savingsRate),
      },
      {
        label: "Budgets",
        pts: budgetPts,
        max: 20,
        value: budgets.length > 0 ? `${budgetUnderCount}/${budgets.length}` : "—",
        color: pillarRatioColor(budgetPts, 20),
        tip: tipBudget(budgets.length, budgetUnderCount),
      },
      {
        label: "Debt",
        pts: debtPts,
        max: 20,
        value: totalAssets > 0 ? `${debtRatio.toFixed(1)}%` : "—",
        color: pillarRatioColor(debtPts, 20),
        tip: tipDebt(debtRatio),
      },
      {
        label: "Goals",
        pts: goalPts,
        max: 15,
        value: avgGoalPct === null ? "—" : `${avgGoalPct.toFixed(0)}%`,
        color: pillarRatioColor(goalPts, 15),
        tip: tipGoals(avgGoalPct),
      },
      {
        label: "Investments",
        pts: investPts,
        max: 20,
        value: investLabel,
        color: pillarRatioColor(investPts, 20),
        tip: tipInvestments(investTypes),
      },
    ];

    const tips = getTopTips(
      components.map((c) => ({ ratio: c.pts / c.max, tip: c.tip })),
    );

    return {
      total,
      grade: gradeFromTotal(total),
      gradeLabel: gradeLabelFromTotal(total),
      gradeColor: gradeColorFromTotal(total),
      ringColor: ringColorFromTotal(total),
      trend,
      trendColor: trendColorClass(trend),
      trendText: trendStr(trend),
      components,
      tips,
    };
  }, [
    currentMonthIncome,
    currentMonthExpenses,
    transactions,
    budgets,
    totalAssets,
    debtRatio,
    goals,
    currentMonth,
    currentYear,
    stocksValue,
    mfValue,
    goldValue,
    forexValue,
  ]);

  // Investment totals (used in allocation, investment cards)
  // these values already computed above for net worth but recomputing here keeps logic grouped
  const stocksInvested = useMemo(
    () => stocks.reduce((s, x) => s + x.investedAmount, 0),
    [stocks],
  );
  const mfInvested = useMemo(
    () => mutualFunds.reduce((s, x) => s + x.investedAmount, 0),
    [mutualFunds],
  );
  const goldInvested = useMemo(
    () =>
      goldHoldings.reduce(
        (s, x) => s + x.purchasePricePerGram * x.quantityGrams,
        0,
      ),
    [goldHoldings],
  );
  const forexDeposits = useMemo(
    () =>
      forexEntries
        .filter((e) => e.type === "deposit")
        .reduce((s, e) => s + e.amount, 0),
    [forexEntries],
  );
  const totalInvested =
    stocksInvested + mfInvested + goldInvested + forexDeposits;
  const totalInvestmentValue = stocksValue + mfValue + goldValue + forexValue;

  // Asset allocation data for pie chart
  const allocationData = useMemo(() => {
    const data = [];
    if (stocksValue > 0) data.push({ name: "Stocks", value: stocksValue });
    if (mfValue > 0) data.push({ name: "Mutual Funds", value: mfValue });
    if (goldValue > 0) data.push({ name: "Gold", value: goldValue });
    if (forexValue > 0) data.push({ name: "Forex", value: forexValue });
    assets.forEach((a) => {
      if (a.type !== "investment") data.push({ name: a.name, value: a.value });
    });
    return data;
  }, [stocksValue, mfValue, goldValue, forexValue, assets]);

  // Budget usage pie chart data
  const budgetPieData = useMemo(
    () =>
      budgets
        .filter((b) => b.limit_amount > 0)
        .map((b) => ({
          name: b.subtype ? `${b.category} · ${b.subtype}` : b.category,
          spent: b.spent_amount || 0,
          limit: b.limit_amount,
          pct: Math.round(((b.spent_amount || 0) / b.limit_amount) * 100),
        }))
        .filter((b) => b.spent > 0),
    [budgets],
  );
  // Net Worth timeline from snapshots
  const nwChartData = useMemo(() => {
    return snapshots
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-12)
      .map((s) => ({
        date: new Date(s.date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
        "Net Worth": s.net_worth,
        Assets: s.total_assets,
        Liabilities: s.total_liabilities,
      }));
  }, [snapshots]);

  // Top holdings across all investment types
  const topHoldings = useMemo(() => {
    const holdings: Array<{
      name: string;
      type: string;
      value: number;
      pnl: number;
      pnlPct: number;
    }> = [];
    stocks.forEach((s) => {
      holdings.push({
        name: s.symbol,
        type: "Stock",
        value: s.currentValue,
        pnl: s.currentValue - s.investedAmount,
        pnlPct:
          s.investedAmount > 0
            ? ((s.currentValue - s.investedAmount) / s.investedAmount) * 100
            : 0,
      });
    });
    mutualFunds.forEach((m) => {
      holdings.push({
        name: m.name,
        type: "MF",
        value: m.currentValue,
        pnl: m.currentValue - m.investedAmount,
        pnlPct:
          m.investedAmount > 0
            ? ((m.currentValue - m.investedAmount) / m.investedAmount) * 100
            : 0,
      });
    });
    goldHoldings.forEach((g) => {
      const val = g.currentPricePerGram * g.quantityGrams;
      const inv = g.purchasePricePerGram * g.quantityGrams;
      holdings.push({
        name: g.name,
        type: "Gold",
        value: val,
        pnl: val - inv,
        pnlPct: inv > 0 ? ((val - inv) / inv) * 100 : 0,
      });
    });
    return holdings.sort((a, b) => b.value - a.value).slice(0, 5);
  }, [stocks, mutualFunds, goldHoldings]);

  // Goal ETAs
  const goalETAs = useMemo(() => {
    return goals
      .filter((g) => g.status === "active" && g.currentAmount < g.targetAmount)
      .map((goal) => {
        const remaining = goal.targetAmount - goal.currentAmount;
        const monthlySavings = currentMonthIncome - currentMonthExpenses;
        const monthsRemaining =
          monthlySavings > 0 ? Math.ceil(remaining / monthlySavings) : null;
        return { goal, monthsRemaining, remaining };
      })
      .filter((g) => g.monthsRemaining !== null && g.monthsRemaining > 0)
      .slice(0, 3);
  }, [goals, currentMonthIncome, currentMonthExpenses]);

  const activeGoals = goals.filter((g) => g.status === "active");
  const hasNoGoals = activeGoals.length === 0;

  const handleTakeSnapshot = async () => {
    setTakingSnapshot(true);
    try {
      await createSnapshot();
    } finally {
      setTakingSnapshot(false);
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-background p-8">
        <StatsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchTransactions} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const formatShort = (v: number) => {
    if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v.toFixed(0)}`;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* ── Dark Hero Band ── */}
        <div className="bg-slate-900 dark:bg-black text-white">
          <div className="px-3 sm:px-6 lg:px-8 pt-5 pb-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                  Total Net Worth
                </p>
                <p className="text-4xl sm:text-5xl font-mono font-bold tracking-tight">
                  {format(netWorth)}
                </p>
                <p className="text-xs text-slate-500 mt-1.5">
                  as of{" "}
                  {new Date().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white gap-2"
                      onClick={handleTakeSnapshot}
                      disabled={takingSnapshot}
                    >
                      <Camera className="h-4 w-4" />
                      {takingSnapshot ? "Saving..." : "Snapshot"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save current net worth snapshot</TooltipContent>
                </Tooltip>
                <div className="text-slate-300">
                  <DashboardCustomizer />
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/60 border-t border-slate-700/60">
              <Link
                href="/net-worth"
                className="px-4 py-3 hover:bg-slate-800/60 transition-colors"
              >
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                  Assets
                </p>
                <p className="font-mono text-base font-semibold text-green-400">
                  {format(totalAssets)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {assets.length +
                    (stocksValue > 0 ? 1 : 0) +
                    (mfValue > 0 ? 1 : 0) +
                    (goldValue > 0 ? 1 : 0) +
                    (forexValue > 0 ? 1 : 0)}{" "}
                  tracked
                </p>
              </Link>
              <Link
                href="/debt-tracker"
                className="px-4 py-3 hover:bg-slate-800/60 transition-colors"
              >
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                  Liabilities
                </p>
                <p className="font-mono text-base font-semibold text-red-400">
                  {format(totalLiabilities)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {liabilities.length} items
                </p>
              </Link>
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                  Debt Ratio
                </p>
                <p className="font-mono text-base font-semibold text-slate-200">
                  {debtRatio.toFixed(1)}%
                </p>
                <p
                  className={`text-[10px] uppercase tracking-wide font-medium mt-0.5 ${
                    debtRatio < 30
                      ? "text-green-400"
                      : debtRatio < 50
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  ●{" "}
                  {debtRatio < 30
                    ? "Healthy"
                    : debtRatio < 50
                      ? "Moderate"
                      : "High"}
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                  Returns
                </p>
                <p
                  className={`font-mono text-base font-semibold ${totalInvestmentValue >= totalInvested ? "text-green-400" : "text-red-400"}`}
                >
                  {totalInvested > 0
                    ? `${(((totalInvestmentValue - totalInvested) / totalInvested) * 100).toFixed(1)}%`
                    : "—"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  on {format(totalInvested)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <main className="px-3 sm:px-6 lg:px-8 py-4 space-y-4">
          {/* Goal prompt banner */}
          {hasNoGoals && !goalBannerDismissed && (
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 flex items-center gap-3">
              <Trophy className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  Set your first financial goal
                </p>
                <p className="text-xs text-muted-foreground">
                  Goals help you stay motivated and track progress.
                </p>
              </div>
              <Link href="/goals">
                <Button size="sm" variant="outline" className="shrink-0">
                  Set Goal
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setGoalBannerDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Financial Health Score */}
          {isVisible("financial-health") && (
          <Card className="rounded-lg overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              {/* Score panel */}
              <div className="bg-slate-900 dark:bg-black text-white px-6 py-5 flex items-center gap-5 sm:w-52 shrink-0">
                <div className="relative w-[72px] h-[72px] shrink-0">
                  <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.915" stroke="#1e293b" strokeWidth="3" fill="none" />
                    <circle
                      cx="18" cy="18" r="15.915"
                      stroke={healthScore.ringColor}
                      strokeWidth="3" fill="none"
                      strokeDasharray={`${healthScore.total} ${100 - healthScore.total}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-mono font-bold leading-none">{healthScore.total}</span>
                    <span className="text-[9px] text-slate-500 mt-0.5">/ 100</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Health Score</p>
                  <p className={`text-4xl font-bold font-mono leading-none ${healthScore.gradeColor}`}>{healthScore.grade}</p>
                  <p className="text-xs text-slate-400 mt-1">{healthScore.gradeLabel}</p>
                  {healthScore.trend !== null && (
                    <div className="flex items-center gap-1 mt-2">
                      {healthScore.trend > 0 && <ArrowUpRight className="h-3 w-3 text-green-400" />}
                      {healthScore.trend < 0 && <ArrowDownRight className="h-3 w-3 text-red-400" />}
                      {healthScore.trend === 0 && <Minus className="h-3 w-3 text-slate-500" />}
                      <span className={`text-[10px] font-mono ${healthScore.trendColor}`}>
                        {healthScore.trendText}
                      </span>
                    </div>
                  )}
                  <Link href="/health-score" className="mt-2 text-[10px] text-slate-400 hover:text-white flex items-center gap-0.5 underline underline-offset-2">
                    View details
                  </Link>
                </div>
              </div>

              {/* 5 Pillars */}
              <div className="flex-1 px-5 py-4 space-y-3">
                {healthScore.components.map((c) => {
                  const PillarIcon = PILLAR_ICONS[c.label as keyof typeof PILLAR_ICONS] ?? BarChart3;
                  const info = PILLAR_INFO[c.label];
                  const ranges = PILLAR_RANGES[c.label] ?? [];
                  return (
                    <div key={c.label}>
                      <div className="flex items-center justify-between mb-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground cursor-help select-none">
                              <PillarIcon className="h-3 w-3" />
                              {c.label}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[240px] p-3 space-y-2">
                            <p className="font-semibold text-xs">{c.label}</p>
                            {info && <p className="text-[11px] text-muted-foreground leading-relaxed">{info.description}</p>}
                            {ranges.length > 0 && (
                              <div className="border-t border-border pt-2 space-y-0.5">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Scoring</p>
                                {ranges.map((r) => (
                                  <p key={r} className="text-[10px] font-mono text-muted-foreground">{r}</p>
                                ))}
                              </div>
                            )}
                            {info?.how && (
                              <div className="border-t border-border pt-2 flex items-start gap-1.5">
                                <Lightbulb className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">{info.how}</p>
                              </div>
                            )}
                          </TooltipContent>
                        </Tooltip>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-mono font-semibold">{c.value}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{c.pts}/{c.max}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(c.pts / c.max) * 100}%`, backgroundColor: c.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tips strip */}
            {healthScore.tips.length > 0 && (
              <div className="border-t border-border bg-muted/30 px-5 py-3 space-y-1.5">
                {healthScore.tips.map((tip) => (
                  <div key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          )}

          {/* Charts row */}
          {isVisible("net-worth-chart") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Net Worth Timeline */}
            <Card className="lg:col-span-2 rounded-lg">
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Net Worth Timeline
                  </p>
                  <div className="flex items-center gap-3">
                    {snapshots.length > 0 && (
                      <button
                        onClick={async () => { await clearSnapshots(); await createSnapshot(); }}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                      >
                        Reset timeline
                      </button>
                    )}
                    <Link
                      href="/net-worth"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View details <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-3 px-4 pb-4">
                {nwChartData.length > 0 && (
                  <div className="flex items-center gap-4 mb-2">
                    {[
                      { color: "#3b82f6", label: "Assets", shape: "bar" },
                      { color: "#ef4444", label: "Liabilities", shape: "bar" },
                      { color: "#22c55e", label: "Net Worth", shape: "bar" },
                    ].map(({ color, label, shape }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        {shape === "bar" ? (
                          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color, opacity: 0.85 }} />
                        ) : (
                          <span className="inline-block w-3 h-0.5 rounded-full" style={{ backgroundColor: color }} />
                        )}
                        <span className="text-[11px] text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {nwChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={nwChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={formatShort} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                      <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                      <RechartTooltip
                        contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(v: unknown, name?: string) => [format(v as number), name ?? ""]}
                      />
                      <Bar dataKey="Assets" fill="#3b82f6" fillOpacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="Liabilities" fill="#ef4444" fillOpacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={32} />
                      <Bar dataKey="Net Worth" fill="#22c55e" fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={32} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Camera className="h-8 w-8 opacity-40" />
                    <p className="text-sm">
                      Take snapshots to track your net worth over time
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleTakeSnapshot}
                      disabled={takingSnapshot}
                    >
                      {takingSnapshot ? "Saving..." : "Take First Snapshot"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Asset Allocation */}
            <Card className="rounded-lg">
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Allocation
                  </p>
                  <Link
                    href="/investments"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Invest <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-3">
                {allocationData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={allocationData}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                        >
                          {allocationData.map((_, i) => (
                            <Cell
                              key={i}
                              fill={
                                ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]
                              }
                            />
                          ))}
                        </Pie>
                        <RechartTooltip
                          formatter={(v: unknown) => [format(v as number)]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {allocationData.slice(0, 5).map((item, i) => {
                        const total = allocationData.reduce(
                          (s, d) => s + d.value,
                          0,
                        );
                        const pct = total > 0 ? (item.value / total) * 100 : 0;
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  background:
                                    ALLOCATION_COLORS[
                                      i % ALLOCATION_COLORS.length
                                    ],
                                }}
                              />
                              <span className="text-muted-foreground truncate max-w-[100px]">
                                {item.name}
                              </span>
                            </div>
                            <span className="font-mono font-medium">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Wallet className="h-8 w-8 opacity-40" />
                    <p className="text-sm text-center">
                      Add assets or investments to see allocation
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          )}

          {/* Data row: Holdings · Cashflow · Goals */}
          {isVisible("investments") && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Top Holdings */}
            <Card className="rounded-lg">
              <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Top Holdings
                  </p>
                  <Link
                    href="/investments"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    All <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {topHoldings.length > 0 ? (
                  <div className="divide-y divide-border">
                    {topHoldings.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <div className="min-w-0 flex items-center gap-2">
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${
                              h.type === "Stock"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                                : h.type === "MF"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                            }`}
                          >
                            {h.type}
                          </span>
                          <p className="text-sm font-medium truncate">
                            {h.name}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-sm font-mono font-semibold">
                            {format(h.value)}
                          </p>
                          <p
                            className={`text-xs font-mono ${h.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            {h.pnl >= 0 ? "+" : ""}
                            {h.pnlPct.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[120px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <TrendingUp className="h-6 w-6 opacity-40" />
                    <p className="text-xs text-center">No investments yet</p>
                    <Link href="/investments">
                      <Button size="sm" variant="outline">
                        Add Investment
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Month Cashflow */}
            <Card className="rounded-lg">
              <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {new Date().toLocaleDateString("en-IN", { month: "long" })}{" "}
                    Cashflow
                  </p>
                  <Link
                    href="/transactions"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  <div className="px-4 py-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        Income
                      </span>
                      <span className="font-mono text-sm font-semibold text-green-600 dark:text-green-400">
                        {format(currentMonthIncome)}
                      </span>
                    </div>
                    <Progress
                      value={100}
                      className="h-1 bg-green-100 dark:bg-green-950"
                    />
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                        <TrendingDown className="h-3 w-3 text-red-500" />
                        Expenses
                      </span>
                      <span className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
                        {format(currentMonthExpenses)}
                      </span>
                    </div>
                    <Progress
                      value={
                        currentMonthIncome > 0
                          ? Math.min(
                              100,
                              (currentMonthExpenses / currentMonthIncome) * 100,
                            )
                          : 0
                      }
                      className="h-1"
                    />
                  </div>
                  <div className="px-4 py-3 bg-muted/30">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Surplus
                      </span>
                      <span
                        className={`font-mono text-lg font-bold ${currentMonthIncome - currentMonthExpenses >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {format(currentMonthIncome - currentMonthExpenses)}
                      </span>
                    </div>
                    {currentMonthIncome > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1 text-right">
                        {(
                          (currentMonthExpenses / currentMonthIncome) *
                          100
                        ).toFixed(0)}
                        % of income spent
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Goals */}
            <Card className="rounded-lg">
              <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Goals
                  </p>
                  <Link
                    href="/goals"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    All <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {activeGoals.length > 0 ? (
                  <div className="divide-y divide-border">
                    {activeGoals.slice(0, 3).map((goal) => {
                      const pct = Math.min(
                        100,
                        (goal.currentAmount / goal.targetAmount) * 100,
                      );
                      return (
                        <div key={goal.id} className="px-4 py-3">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-sm font-medium truncate max-w-[140px]">
                              {goal.title}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground ml-2">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={pct} className="h-1" />
                          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
                            <span>{format(goal.currentAmount)}</span>
                            <span>{format(goal.targetAmount)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[120px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Trophy className="h-6 w-6 opacity-40" />
                    <p className="text-xs text-center">No active goals</p>
                    <Link href="/goals">
                      <Button size="sm" variant="outline">
                        Create Goal
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}

          {/* Goal ETAs */}
          {isVisible("goal-etas") && goalETAs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TargetIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Goal Estimates
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {goalETAs.map(({ goal, monthsRemaining, remaining }) => (
                  <Card
                    key={goal.id}
                    className="rounded-lg hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-sm">{goal.title}</h4>
                        <Link href="/goals">
                          <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Link>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Remaining
                          </span>
                          <span className="font-mono font-semibold">
                            {format(remaining)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Est. Completion
                          </span>
                          <span className="font-mono font-semibold text-primary">
                            {monthsRemaining === 1
                              ? "This month"
                              : `${monthsRemaining}mo`}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1 mt-2">
                          <div
                            className="bg-primary h-1 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Budget Usage Pie */}
          {budgetPieData.length > 0 && (
            <Card className="rounded-lg">
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Budget Usage by Category
                  </p>
                  <Link
                    href="/budgets"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Budgets <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-3">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <ResponsiveContainer width="100%" height={180} className="shrink-0 sm:max-w-50">
                    <PieChart>
                      <Pie
                        data={budgetPieData}
                        dataKey="spent"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {budgetPieData.map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={budgetSliceColor(entry.pct, i)}
                          />
                        ))}
                      </Pie>
                      <RechartTooltip
                        formatter={(v: unknown, _: unknown, props: { payload?: { pct?: number } }) => [
                          `${format(v as number)} (${props.payload?.pct ?? 0}% used)`,
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 w-full space-y-2">
                    {budgetPieData.map((b, i) => (
                      <div key={b.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: budgetSliceColor(b.pct, i) }}
                          />
                          <span className="text-xs truncate">{b.name}</span>
                        </div>
                        <span className={`text-xs font-mono font-semibold shrink-0 ${budgetPctTextColor(b.pct)}`}>
                          {b.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Transactions */}
          {isVisible("recent-transactions") && (
          <div>
            <RecentTransactionsWidget />
          </div>
          )}
        </main>

        <QuickAddButton />

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
              <DialogDescription>
                Record your income or expense transaction with detailed
                categorization.
              </DialogDescription>
            </DialogHeader>
            {isAddDialogOpen && (
              <AddTransactionForm
                onSuccess={() => {
                  setIsAddDialogOpen(false);
                  fetchTransactions();
                }}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
