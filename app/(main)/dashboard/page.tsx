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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target as TargetIcon,
  ArrowRight,
  Trophy,
  Wallet,
  Camera,
  X,
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
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { RecentTransactionsWidget } from "@/components/dashboard/RecentTransactionsWidget";
import { QuickAddButton } from "@/components/QuickAddButton";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { StatsSkeleton } from "@/components/ui/skeleton";
// financial health card removed
// achievements removed from dashboard
// import { StreaksBadges } from "@/components/streaks-badges";

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
  } = useNetWorthStore();
  const { debts, fetchDebts } = useDebtTrackerStore();
  const { stocks, fetchStocks } = useStocksStore();
  const { mutualFunds, fetchMutualFunds } = useMutualFundsStore();
  const { holdings: goldHoldings, load: loadGold } = useGoldStore();
  const { entries: forexEntries, load: loadForex } = useForexStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [goalBannerDismissed, setGoalBannerDismissed] = useState(false);
  const [takingSnapshot, setTakingSnapshot] = useState(false);

  useEffect(() => {
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

  const manualAssetsTotal = assets.reduce((s, a) => s + a.value, 0);
  const totalAssets =
    manualAssetsTotal + stocksValue + mfValue + goldValue + forexValue;

  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtRatio =
    totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

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

  // Net Worth timeline from snapshots
  const nwChartData = useMemo(() => {
    return snapshots
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-12)
      .map((s) => ({
        date: new Date(s.date).toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white gap-2 mt-1"
                    onClick={handleTakeSnapshot}
                    disabled={takingSnapshot}
                  >
                    <Camera className="h-4 w-4" />
                    {takingSnapshot ? "Saving..." : "Snapshot"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save current net worth snapshot</TooltipContent>
              </Tooltip>
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
                href="/planning/debt-tracker"
                className="px-4 py-3 hover:bg-slate-800/60 transition-colors"
              >
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                  Liabilities
                </p>
                <p className="font-mono text-base font-semibold text-red-400">
                  {format(totalLiabilities)}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {liabilities.length + debts.length} items
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
                <p className="text-sm font-medium">Set your first financial goal</p>
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

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Net Worth Timeline */}
            <Card className="lg:col-span-2 rounded-lg">
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Net Worth Timeline
                  </p>
                  <Link
                    href="/net-worth"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View details <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-3 px-4 pb-4">
                {nwChartData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={nwChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-muted"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tickFormatter={formatShort}
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <RechartTooltip
                        formatter={(v: unknown) => [format(v as number)]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line
                        type="monotone"
                        dataKey="Net Worth"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Assets"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 2"
                      />
                      <Line
                        type="monotone"
                        dataKey="Liabilities"
                        stroke="#ef4444"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 2"
                      />
                    </LineChart>
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

          {/* Data row: Holdings · Cashflow · Goals */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

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

          {/* Goal ETAs */}
          {goalETAs.length > 0 && (
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

          {/* Recent Transactions */}
          <div>
            <RecentTransactionsWidget />
          </div>
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
