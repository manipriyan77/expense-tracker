"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  AreaChart,
  Area,
  LineChart,
  Line,
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
import {
  scoreSavings,
  scoreBudget,
  scoreDebt,
  scoreGoals,
  scoreInvestments,
  gradeFromTotal,
} from "@/lib/health-score-utils";
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
  if (rate < 15)
    return `Savings rate ${rate.toFixed(1)}% — aim for 15%+ to earn top score`;
  return "";
}
function tipBudget(count: number, underCount: number): string {
  if (count === 0) return "Set spending budgets to unlock the Budget score";
  if (underCount < count)
    return `${count - underCount} budget(s) are over limit — review spending`;
  return "";
}
function tipDebt(ratio: number): string {
  if (ratio >= 25)
    return `Debt ratio ${ratio.toFixed(1)}% — pay down debt to aim under 25%`;
  return "";
}
function tipGoals(avgPct: number | null): string {
  if (avgPct === null) return "Add financial goals to track your progress";
  if (avgPct < 25) return "Goals are early-stage — keep contributing regularly";
  return "";
}
function tipInvestments(types: number): string {
  if (types === 0) return "Start investing to diversify and grow your wealth";
  if (types === 1)
    return "Diversify across stocks, mutual funds, gold, or forex";
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
    description:
      "How many of your budget categories stay within their spending limits.",
    how: "Review overspent categories and tighten limits. Set budgets if you haven't yet.",
  },
  Debt: {
    description:
      "Liabilities as % of total portfolio (assets + liabilities) — matches Net Worth page.",
    how: "Pay down high-interest debt first. Aim to keep liabilities below 25% of portfolio.",
  },
  Goals: {
    description: "Average completion % across all active financial goals.",
    how: "Create goals and contribute consistently. Even small monthly amounts compound fast.",
  },
  Investments: {
    description:
      "Number of investment asset types you actively hold (stocks, MF, gold, forex).",
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
    "Liabilities < 15% of portfolio  →  20 / 20 pts",
    "15 – 25%                         →  16 / 20 pts",
    "25 – 35%                         →  12 / 20 pts",
    "35 – 50%                         →   8 / 20 pts",
    "50 – 67%                         →   4 / 20 pts",
    "≥ 67% or no assets               →  12 / 20 pts (neutral)",
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
  const { investments: otherInvestments, load: loadOtherInvestments } =
    useOtherInvestmentsStore();

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

  // Real expenses exclude savings/investment categories (same logic as health score)
  const SAVINGS_CATS = new Set(["savings", "investment", "investments"]);
  const isSavingsTx = (t: { category?: string; goal_id?: string | null; subtype?: string }) =>
    SAVINGS_CATS.has((t.category ?? "").toLowerCase()) || !!t.goal_id || (t.subtype ?? "").toLowerCase() === "goal savings";

  const currentMonthRealExpenses = useMemo(
    () => currentMonthTransactions.filter((t) => t.type === "expense" && !isSavingsTx(t)).reduce((s, t) => s + t.amount, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentMonthTransactions],
  );
  const currentMonthSaved = currentMonthIncome - currentMonthRealExpenses;

  // Previous month for period comparison
  const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthTransactions = useMemo(() =>
    transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === prevMonthIdx && d.getFullYear() === prevMonthYear;
    }),
  [transactions, prevMonthIdx, prevMonthYear]);
  const prevMonthIncome = prevMonthTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const prevMonthExpenses = prevMonthTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // Sparkline: daily cumulative expense curve for current month (up to today)
  const expenseSparkline = useMemo(() => {
    const today = new Date().getDate();
    const byDay: Record<number, number> = {};
    currentMonthTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => { const d = new Date(t.date).getDate(); byDay[d] = (byDay[d] ?? 0) + t.amount; });
    let cum = 0;
    return Array.from({ length: today }, (_, i) => {
      cum += byDay[i + 1] ?? 0;
      return { v: cum };
    });
  }, [currentMonthTransactions]);

  const incomeSparkline = useMemo(() => {
    const today = new Date().getDate();
    const byDay: Record<number, number> = {};
    currentMonthTransactions
      .filter((t) => t.type === "income")
      .forEach((t) => { const d = new Date(t.date).getDate(); byDay[d] = (byDay[d] ?? 0) + t.amount; });
    let cum = 0;
    return Array.from({ length: today }, (_, i) => {
      cum += byDay[i + 1] ?? 0;
      return { v: cum };
    });
  }, [currentMonthTransactions]);

  const incomeDelta = prevMonthIncome > 0 ? ((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100 : null;
  const expenseDelta = prevMonthExpenses > 0 ? ((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100 : null;
  // Savings rate uses real expenses (excludes savings/investment categories) — same as health score
  const savingsRate = currentMonthIncome > 0 ? (currentMonthSaved / currentMonthIncome) * 100 : 0;

  const financialPulse = useMemo(() => {
    if (currentMonthIncome === 0) return null;
    const rate = savingsRate;
    if (rate >= 20) return { text: `Saving ${rate.toFixed(0)}% of income — great pace`, color: "text-green-400" };
    if (rate >= 15) return { text: `Saving ${rate.toFixed(0)}% of income — on track`, color: "text-emerald-400" };
    if (rate > 0) return { text: `Saving ${rate.toFixed(0)}% of income — aim for 15%+`, color: "text-amber-400" };
    return { text: `Real spending exceeds income by ${format(Math.abs(currentMonthSaved))} this month`, color: "text-red-400" };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonthIncome, currentMonthSaved, savingsRate]);

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

  const otherInvestmentsValue = otherInvestments.reduce(
    (s, x) => s + x.currentValue,
    0,
  );
  const manualAssetsTotal = assets.reduce((s, a) => s + a.value, 0);
  const totalAssets =
    manualAssetsTotal +
    stocksValue +
    mfValue +
    goldValue +
    forexValue +
    otherInvestmentsValue;

  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  // liabilities as % of total portfolio — matches net worth page formula
  const debtRatio =
    (totalAssets + totalLiabilities) > 0
      ? (totalLiabilities / (totalAssets + totalLiabilities)) * 100
      : 0;

  // Financial Health Score (0–100, 5 pillars: 25+20+20+15+20)
  const healthScore = useMemo(() => {
    // Exclude savings/investment-category expenses from "real expenses"
    const SAVINGS_CATS = new Set(["savings", "investment", "investments"]);
    const isSavingsTx = (t: { category?: string; goal_id?: string | null; subtype?: string }) =>
      SAVINGS_CATS.has((t.category ?? "").toLowerCase()) || !!t.goal_id || (t.subtype ?? "").toLowerCase() === "goal savings";

    const realExpenses = currentMonthTransactions
      .filter((t) => t.type === "expense" && !isSavingsTx(t))
      .reduce((s, t) => s + t.amount, 0);
    const savingsRate =
      currentMonthIncome > 0
        ? ((currentMonthIncome - realExpenses) / currentMonthIncome) * 100
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
    const prevRealExpenses = prevTxs
      .filter((t) => t.type === "expense" && !isSavingsTx(t))
      .reduce((s, t) => s + t.amount, 0);
    const prevSavingsRate =
      prevIncome > 0 ? ((prevIncome - prevRealExpenses) / prevIncome) * 100 : 0;

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
      ? scoreSavings(prevSavingsRate) +
        budgetPts +
        debtPts +
        goalPts +
        investPts
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
        value:
          budgets.length > 0 ? `${budgetUnderCount}/${budgets.length}` : "—",
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
    currentMonthTransactions,
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
  // Net Worth timeline: historical snapshots, with today's point aligned to live hero totals
  // (Snapshots are created server-side; live totals include all modules — see createSnapshot API.)
  const nwChartData = useMemo(() => {
    const sorted = snapshots
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-12);

    const todayIso = new Date().toISOString().split("T")[0];
    const todayLabel = new Date(`${todayIso}T12:00:00`).toLocaleDateString(
      "en-IN",
      { day: "numeric", month: "short" },
    );

    const rows = sorted.map((s) => ({
      sortKey: s.date,
      date: new Date(s.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      "Net Worth": s.net_worth,
      Assets: s.total_assets,
      Liabilities: s.total_liabilities,
    }));

    if (rows.length === 0) return [];

    const last = rows[rows.length - 1];
    if (last.sortKey === todayIso) {
      last["Net Worth"] = netWorth;
      last.Assets = totalAssets;
      last.Liabilities = totalLiabilities;
    } else {
      rows.push({
        sortKey: todayIso,
        date: todayLabel,
        "Net Worth": netWorth,
        Assets: totalAssets,
        Liabilities: totalLiabilities,
      });
      while (rows.length > 12) rows.shift();
    }

    return rows.map(({ sortKey: _sk, ...rest }) => rest);
  }, [snapshots, totalAssets, totalLiabilities, netWorth]);

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
      <div className="min-h-screen bg-background p-4">
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
          <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-0">
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
                  <TooltipContent>
                    Save current net worth snapshot
                  </TooltipContent>
                </Tooltip>
                <div className="text-slate-300">
                  <DashboardCustomizer />
                </div>
              </div>
            </div>

            {/* Financial Pulse */}
            {financialPulse && (
              <div className="border-t border-slate-700/60 px-1 py-2 flex items-center gap-2">
                <span className={`text-[11px] font-medium ${financialPulse.color}`}>
                  ● {financialPulse.text}
                </span>
              </div>
            )}

            {/* Stats strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/60 border-t border-slate-700/60">
              {/* Income */}
              <Link href="/transactions" className="px-3 py-2.5 hover:bg-slate-800/60 transition-colors group">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Income</p>
                <div className="flex items-end justify-between gap-1">
                  <p className="font-mono text-base font-semibold text-green-400">{format(currentMonthIncome)}</p>
                  <div className="w-14 h-7 shrink-0">
                    <LineChart width={56} height={28} data={incomeSparkline}>
                      <Line type="monotone" dataKey="v" stroke="#4ade80" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </div>
                </div>
                {incomeDelta !== null && (
                  <p className={`text-[10px] mt-0.5 font-mono ${incomeDelta >= 0 ? "text-green-500" : "text-red-400"}`}>
                    {incomeDelta >= 0 ? "▲" : "▼"} {Math.abs(incomeDelta).toFixed(1)}% vs last mo
                  </p>
                )}
              </Link>

              {/* Expenses */}
              <Link href="/transactions" className="px-3 py-2.5 hover:bg-slate-800/60 transition-colors group">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Expenses</p>
                <div className="flex items-end justify-between gap-1">
                  <p className="font-mono text-base font-semibold text-red-400">{format(currentMonthExpenses)}</p>
                  <div className="w-14 h-7 shrink-0">
                    <LineChart width={56} height={28} data={expenseSparkline}>
                      <Line type="monotone" dataKey="v" stroke="#f87171" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </div>
                </div>
                {expenseDelta !== null && (
                  <p className={`text-[10px] mt-0.5 font-mono ${expenseDelta <= 0 ? "text-green-500" : "text-red-400"}`}>
                    {expenseDelta >= 0 ? "▲" : "▼"} {Math.abs(expenseDelta).toFixed(1)}% vs last mo
                  </p>
                )}
              </Link>

              {/* Savings rate */}
              <div className="px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Savings Rate</p>
                <p className={`font-mono text-base font-semibold ${savingsRate >= 15 ? "text-green-400" : savingsRate >= 5 ? "text-amber-400" : "text-red-400"}`}>
                  {currentMonthIncome > 0 ? `${savingsRate.toFixed(1)}%` : "—"}
                </p>
                <p className={`text-[10px] uppercase tracking-wide font-medium mt-0.5 ${debtRatio < 25 ? "text-green-400" : debtRatio < 40 ? "text-amber-400" : "text-red-400"}`}>
                  ● Debt {debtRatio.toFixed(1)}%
                </p>
              </div>

              {/* Investment returns */}
              <div className="px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Returns</p>
                <p className={`font-mono text-base font-semibold ${totalInvestmentValue >= totalInvested ? "text-green-400" : "text-red-400"}`}>
                  {totalInvested > 0 ? `${(((totalInvestmentValue - totalInvested) / totalInvested) * 100).toFixed(1)}%` : "—"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">on {format(totalInvested)}</p>
              </div>
            </div>
          </div>
        </div>

        <main className="px-3 sm:px-6 lg:px-8 py-3 space-y-2.5">
          {/* Goal prompt banner */}
          {hasNoGoals && !goalBannerDismissed && (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs flex-1 min-w-0"><span className="font-medium">No goals yet</span> — set one to stay motivated</p>
              <Link href="/goals"><Button size="sm" variant="outline" className="h-7 px-2 text-xs shrink-0">Set Goal</Button></Link>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setGoalBannerDismissed(true)}><X className="h-3 w-3" /></Button>
            </div>
          )}

          {/* ── ROW 1: Health Score + Cashflow (side by side) ── */}
          {isVisible("financial-health") && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-2.5">

              {/* Health Score — compact ring + pillars */}
              <Card className="lg:col-span-2 overflow-hidden">
                <div className="flex h-full">
                  {/* Ring + grade */}
                  <div className="bg-slate-900 dark:bg-black text-white px-4 py-4 flex flex-col items-center justify-center gap-2 shrink-0 w-28">
                    <div className="relative w-16 h-16">
                      <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3.5" />
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke={healthScore.ringColor} strokeWidth="3.5"
                          strokeDasharray={`${healthScore.total} ${100 - healthScore.total}`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-mono font-bold leading-none">{healthScore.total}</span>
                        <span className="text-[8px] text-slate-500">/100</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className={`text-2xl font-bold font-mono leading-none ${healthScore.gradeColor}`}>{healthScore.grade}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{healthScore.gradeLabel}</p>
                    </div>
                    {healthScore.trend !== null && (
                      <div className={`flex items-center gap-0.5 text-[9px] font-mono ${healthScore.trendColor}`}>
                        {healthScore.trend > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : healthScore.trend < 0 ? <ArrowDownRight className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                        {healthScore.trend > 0 ? "+" : ""}{healthScore.trend}
                      </div>
                    )}
                    <Link href="/health-score" className="text-[9px] text-slate-500 hover:text-white underline underline-offset-2 transition-colors">Details</Link>
                  </div>
                  {/* Pillars */}
                  <div className="flex-1 px-4 py-3 space-y-2 min-w-0">
                    {healthScore.components.map((c) => {
                      const PillarIcon = PILLAR_ICONS[c.label as keyof typeof PILLAR_ICONS] ?? BarChart3;
                      const info = PILLAR_INFO[c.label];
                      const ranges = PILLAR_RANGES[c.label] ?? [];
                      return (
                        <div key={c.label} className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 cursor-help w-20 shrink-0">
                                <PillarIcon className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                <span className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{c.label}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[220px] p-2.5 space-y-1.5">
                              <p className="font-semibold text-xs">{c.label}</p>
                              {info && <p className="text-[10px] text-muted-foreground leading-relaxed">{info.description}</p>}
                              {ranges.length > 0 && <div className="border-t border-border pt-1.5 space-y-0.5">{ranges.slice(0, 3).map((r) => <p key={r} className="text-[9px] font-mono text-muted-foreground">{r}</p>)}</div>}
                              {info?.how && <div className="border-t border-border pt-1.5 flex gap-1"><Lightbulb className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-px" /><p className="text-[10px] text-amber-500 leading-relaxed">{info.how}</p></div>}
                            </TooltipContent>
                          </Tooltip>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(c.pts / c.max) * 100}%`, backgroundColor: c.color }} />
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground w-7 text-right shrink-0">{c.pts}/{c.max}</span>
                        </div>
                      );
                    })}
                    {healthScore.tips.length > 0 && (
                      <div className="pt-1 border-t border-border/50">
                        <div className="flex items-start gap-1.5">
                          <Lightbulb className="h-2.5 w-2.5 text-amber-500 shrink-0 mt-px" />
                          <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-tight">{healthScore.tips[0]}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Month cashflow — compact stacked bars */}
              <Card className="lg:col-span-3">
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {new Date().toLocaleDateString("en-IN", { month: "long" })} Cashflow
                  </p>
                  <Link href="/transactions" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                    All transactions <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {/* Income bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground"><TrendingUp className="h-3 w-3 text-green-500" />Income</span>
                      <div className="flex items-center gap-2">
                        {incomeDelta !== null && <span className={`text-[10px] font-mono ${incomeDelta >= 0 ? "text-green-500" : "text-red-400"}`}>{incomeDelta >= 0 ? "▲" : "▼"}{Math.abs(incomeDelta).toFixed(1)}%</span>}
                        <span className="font-mono text-sm font-semibold text-green-600 dark:text-green-400">{format(currentMonthIncome)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-green-100 dark:bg-green-950/60 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>
                  {/* Expenses bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground"><TrendingDown className="h-3 w-3 text-red-500" />Spending</span>
                      <div className="flex items-center gap-2">
                        {expenseDelta !== null && <span className={`text-[10px] font-mono ${expenseDelta <= 0 ? "text-green-500" : "text-red-400"}`}>{expenseDelta >= 0 ? "▲" : "▼"}{Math.abs(expenseDelta).toFixed(1)}%</span>}
                        <span className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">{format(currentMonthExpenses)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${currentMonthIncome > 0 ? Math.min(100, (currentMonthExpenses / currentMonthIncome) * 100) : 0}%` }} />
                    </div>
                  </div>
                  {/* Saved bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground"><PiggyBank className="h-3 w-3 text-blue-500" />Saved<span className="text-[9px] text-muted-foreground/60">(excl. invest)</span></span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono ${savingsRate >= 15 ? "text-green-500" : savingsRate >= 5 ? "text-amber-500" : "text-red-400"}`}>{savingsRate.toFixed(1)}%</span>
                        <span className={`font-mono text-sm font-semibold ${currentMonthSaved >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500"}`}>{format(Math.max(0, currentMonthSaved))}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${currentMonthIncome > 0 ? Math.min(100, Math.max(0, savingsRate)) : 0}%` }} />
                    </div>
                  </div>
                  {/* Summary row */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground">Net surplus this month</span>
                    <span className={`font-mono text-base font-bold ${currentMonthIncome - currentMonthExpenses >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {currentMonthIncome - currentMonthExpenses >= 0 ? "+" : ""}{format(currentMonthIncome - currentMonthExpenses)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ── ROW 2: Net Worth Chart + Allocation ── */}
          {isVisible("net-worth-chart") && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
              <Card className="lg:col-span-2">
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
                  <div className="flex items-center gap-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Net Worth Timeline</p>
                    {[{ color: "#3b82f6", label: "Assets" }, { color: "#ef4444", label: "Liab." }, { color: "#22c55e", label: "Net Worth" }].map(({ color, label }) => (
                      <div key={label} className="hidden sm:flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color, opacity: 0.85 }} />
                        <span className="text-[10px] text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {snapshots.length > 0 && (
                      <button onClick={async () => { await clearSnapshots(); await createSnapshot(); }} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors">Reset</button>
                    )}
                    <Link href="/net-worth" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">Details <ArrowRight className="h-2.5 w-2.5" /></Link>
                  </div>
                </div>
                <CardContent className="pt-3 px-3 pb-3">
                  {nwChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart data={nwChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={formatShort} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                        <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
                        <RechartTooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                          formatter={(v: unknown, name?: string) => [format(v as number), name ?? ""]} />
                        <Bar dataKey="Assets" fill="#3b82f6" fillOpacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="Liabilities" fill="#ef4444" fillOpacity={0.75} radius={[3, 3, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="Net Worth" fill="#22c55e" fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={28} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Camera className="h-6 w-6 opacity-40" />
                      <p className="text-xs">Take snapshots to track net worth over time</p>
                      <Button size="sm" variant="outline" onClick={handleTakeSnapshot} disabled={takingSnapshot}>{takingSnapshot ? "Saving..." : "Take First Snapshot"}</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Allocation donut */}
              <Card>
                <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Allocation</p>
                  <Link href="/investments" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">Invest <ArrowRight className="h-2.5 w-2.5" /></Link>
                </div>
                <CardContent className="px-4 pb-3 pt-2">
                  {allocationData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={130}>
                        <PieChart>
                          <Pie data={allocationData} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2}>
                            {allocationData.map((_, i) => <Cell key={i} fill={ALLOCATION_COLORS[i % ALLOCATION_COLORS.length]} />)}
                          </Pie>
                          <RechartTooltip formatter={(v: unknown) => [format(v as number)]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1 mt-1">
                        {allocationData.slice(0, 5).map((item, i) => {
                          const tot = allocationData.reduce((s, d) => s + d.value, 0);
                          const pct = tot > 0 ? (item.value / tot) * 100 : 0;
                          return (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] }} />
                                <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] text-muted-foreground font-mono">{formatShort(item.value)}</span>
                                <span className="text-[10px] font-mono font-semibold w-8 text-right">{pct.toFixed(0)}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="h-[180px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Wallet className="h-6 w-6 opacity-40" />
                      <p className="text-xs text-center">Add assets or investments</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── ROW 3: Holdings · Goals · Budgets ── */}
          {isVisible("investments") && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
              {/* Top Holdings */}
              <Card>
                <div className="flex items-center justify-between px-4 pt-2.5 pb-2 border-b border-border">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Top Holdings</p>
                  <Link href="/investments" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">All <ArrowRight className="h-2.5 w-2.5" /></Link>
                </div>
                <div className="divide-y divide-border/60">
                  {topHoldings.length > 0 ? topHoldings.map((h, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-1.5">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className={`text-[8px] font-bold px-1 py-px rounded-sm uppercase shrink-0 leading-none ${h.type === "Stock" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" : h.type === "MF" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"}`}>{h.type}</span>
                        <p className="text-xs font-medium truncate">{h.name}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2 flex items-center gap-2">
                        <p className="text-xs font-mono font-semibold">{formatShort(h.value)}</p>
                        <p className={`text-[10px] font-mono w-10 text-right ${h.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{h.pnl >= 0 ? "+" : ""}{h.pnlPct.toFixed(1)}%</p>
                      </div>
                    </div>
                  )) : (
                    <div className="h-20 flex flex-col items-center justify-center text-muted-foreground gap-1">
                      <TrendingUp className="h-4 w-4 opacity-40" />
                      <p className="text-[10px]">No investments yet</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Goals — single-line rows, no bottom sub-text */}
              <Card>
                <div className="flex items-center justify-between px-4 pt-2.5 pb-2 border-b border-border">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Goals</p>
                  <Link href="/goals" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">All <ArrowRight className="h-2.5 w-2.5" /></Link>
                </div>
                <div className="divide-y divide-border/60">
                  {activeGoals.length > 0 ? activeGoals.slice(0, 5).map((goal) => {
                    const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
                    const eta = goalETAs.find((e) => e.goal.id === goal.id);
                    const barColor = pct >= 75 ? "#22c55e" : pct >= 40 ? "#3b82f6" : pct > 0 ? "#f59e0b" : "#94a3b8";
                    return (
                      <div key={goal.id} className="flex items-center gap-3 px-4 py-2">
                        {/* Progress ring (tiny) */}
                        <div className="relative w-7 h-7 shrink-0">
                          <svg viewBox="0 0 24 24" className="w-7 h-7 -rotate-90">
                            <circle cx="12" cy="12" r="9" fill="none" stroke="var(--muted)" strokeWidth="2.5" />
                            <circle cx="12" cy="12" r="9" fill="none" stroke={barColor} strokeWidth="2.5"
                              strokeDasharray={`${(pct / 100) * 56.5} 56.5`} strokeLinecap="round" />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold" style={{ color: barColor }}>{pct.toFixed(0)}</span>
                        </div>
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate leading-tight">{goal.title}</p>
                          <p className="text-[9px] text-muted-foreground font-mono">{formatShort(goal.currentAmount)} / {formatShort(goal.targetAmount)}</p>
                        </div>
                        {/* ETA */}
                        {eta ? (
                          <span className="text-[9px] font-mono text-primary shrink-0">{eta.monthsRemaining === 1 ? "this mo" : `${eta.monthsRemaining}mo`}</span>
                        ) : (
                          <span className="text-[9px] text-muted-foreground shrink-0">—</span>
                        )}
                      </div>
                    );
                  }) : (
                    <div className="h-20 flex flex-col items-center justify-center text-muted-foreground gap-1">
                      <Trophy className="h-4 w-4 opacity-40" />
                      <p className="text-[10px]">No active goals</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Budgets — inline bars, no wasted space */}
              <Card>
                <div className="flex items-center justify-between px-4 pt-2.5 pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Budgets</p>
                    {budgetPieData.length > 0 && (
                      <span className={`text-[9px] font-mono px-1.5 py-px rounded-full ${budgetPieData.some(b => b.pct >= 100) ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : budgetPieData.some(b => b.pct >= 80) ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"}`}>
                        {budgetPieData.filter(b => b.pct < 80).length}/{budgetPieData.length} on track
                      </span>
                    )}
                  </div>
                  <Link href="/budgets" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">Manage <ArrowRight className="h-2.5 w-2.5" /></Link>
                </div>
                {budgetPieData.length > 0 ? (
                  <div className="px-4 py-2 space-y-1.5">
                    {budgetPieData.slice(0, 7).map((b, i) => (
                      <div key={b.name} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground truncate w-28 shrink-0">{b.name}</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(b.pct, 100)}%`, backgroundColor: budgetSliceColor(b.pct, i) }} />
                        </div>
                        <span className={`text-[10px] font-mono font-semibold w-8 text-right shrink-0 ${budgetPctTextColor(b.pct)}`}>{b.pct}%</span>
                      </div>
                    ))}
                    {budgetPieData.length > 7 && (
                      <p className="text-[9px] text-muted-foreground pt-0.5">+{budgetPieData.length - 7} more categories</p>
                    )}
                  </div>
                ) : (
                  <div className="h-20 flex flex-col items-center justify-center text-muted-foreground gap-1">
                    <Receipt className="h-4 w-4 opacity-40" />
                    <p className="text-[10px]">No budget data this month</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── Recent Transactions ── */}
          {isVisible("recent-transactions") && <RecentTransactionsWidget />}
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
