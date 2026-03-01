"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  User as UserIcon,
  Target as TargetIcon,
  ArrowRight,
  Trophy,
  CreditCard,
  Wallet,
  Camera,
  Building2,
  Scale,
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
  const { user } = useAuthStore();
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
        {/* Header */}
        <header className="bg-card shadow-sm border-b sticky top-0 z-10">
          <div className="px-3 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 gap-2 min-w-0">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                  Dashboard
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Welcome back,{" "}
                  {(user?.user_metadata?.full_name as string) || "User"}
                </p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <div className="hidden sm:flex items-center space-x-2 pl-2 border-l">
                  <UserIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="text-sm text-foreground min-w-0">
                    <div className="truncate">
                      {(user?.user_metadata?.full_name as string) ||
                        (user?.user_metadata?.name as string) ||
                        "User"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate max-w-[120px] lg:max-w-none">
                      {user?.email ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-3 sm:px-6 lg:px-8 py-4 space-y-4">
          {/* Hero — Net Worth Card */}
          <div
            className="rounded-2xl p-6 text-white relative overflow-hidden"
            style={{
              background:
                netWorth < 0
                  ? "linear-gradient(135deg, #7f1d1d, #991b1b, #b91c1c)"
                  : "linear-gradient(135deg, #166534, #15803d, #16a34a)",
            }}
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 80% 20%, #fff 0%, transparent 60%)",
              }}
            />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p
                  className={`text-sm font-medium mb-1 ${netWorth < 0 ? "text-red-200" : "text-green-200"}`}
                >
                  Total Net Worth
                </p>
                <p className="text-4xl font-bold tracking-tight">
                  {format(netWorth)}
                </p>
                <p
                  className={`text-xs mt-2 ${netWorth < 0 ? "text-red-200" : "text-green-200"}`}
                >
                  as of{" "}
                  {new Date().toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-white/40 text-white bg-white/10 hover:bg-white/20 hover:text-white gap-2"
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
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="text-green-200 text-xs">Invested</p>
                    <p className="font-semibold">{format(totalInvested)}</p>
                  </div>
                  <div>
                    <p className="text-green-200 text-xs">Returns</p>
                    <p
                      className={`font-semibold ${totalInvestmentValue >= totalInvested ? "text-green-200" : "text-red-300"}`}
                    >
                      {totalInvested > 0
                        ? `${(((totalInvestmentValue - totalInvested) / totalInvested) * 100).toFixed(1)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Goal prompt banner */}
          {hasNoGoals && !goalBannerDismissed && (
            <div className="relative rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Set your first financial goal
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Goals help you stay motivated and track progress towards what
                  matters.
                </p>
              </div>
              <Link href="/goals">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-700 dark:text-blue-300 shrink-0"
                >
                  Set Goal
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-blue-500"
                onClick={() => setGoalBannerDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* 3 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/net-worth">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Total Assets
                    </span>
                    <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {format(totalAssets)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {assets.length +
                      (stocksValue > 0 ? 1 : 0) +
                      (mfValue > 0 ? 1 : 0) +
                      (goldValue > 0 ? 1 : 0) +
                      (forexValue > 0 ? 1 : 0)}{" "}
                    asset
                    {assets.length +
                      (stocksValue > 0 ? 1 : 0) +
                      (mfValue > 0 ? 1 : 0) +
                      (goldValue > 0 ? 1 : 0) +
                      (forexValue > 0 ? 1 : 0) !==
                    1
                      ? "s"
                      : ""}{" "}
                    tracked
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Link href="/planning/debt-tracker">
              <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Total Liabilities
                    </span>
                    <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {format(totalLiabilities)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {liabilities.length + debts.length} item
                    {liabilities.length + debts.length !== 1 ? "s" : ""} tracked
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Debt Ratio
                  </span>
                  <Scale className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {debtRatio.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {debtRatio < 30
                    ? "Healthy"
                    : debtRatio < 50
                      ? "Moderate"
                      : "High"}{" "}
                  debt-to-asset
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Net Worth Timeline + Asset Allocation */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Net Worth Timeline */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    Net Worth Over Time
                  </CardTitle>
                  <Link
                    href="/net-worth"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View details <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
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
                        stroke="#16a34a"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="Assets"
                        stroke="#2563eb"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 2"
                      />
                      <Line
                        type="monotone"
                        dataKey="Liabilities"
                        stroke="#dc2626"
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
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    Allocation
                  </CardTitle>
                  <Link
                    href="/investments"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    Invest <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
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
                    <div className="space-y-1 mt-2">
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
                                className="w-2.5 h-2.5 rounded-full shrink-0"
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
                            <span className="font-medium">
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

          {/* Top Holdings + Month Cashflow + Goals */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top Holdings */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    Top Holdings
                  </CardTitle>
                  <Link
                    href="/investments"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    All <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {topHoldings.length > 0 ? (
                  <div className="space-y-3">
                    {topHoldings.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {h.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {h.type}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold">
                            {format(h.value)}
                          </p>
                          <p
                            className={`text-xs ${h.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
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
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    {new Date().toLocaleDateString("en-IN", { month: "long" })}{" "}
                    Cashflow
                  </CardTitle>
                  <Link
                    href="/transactions"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5 text-green-500" />{" "}
                        Income
                      </span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {format(currentMonthIncome)}
                      </span>
                    </div>
                    <Progress
                      value={100}
                      className="h-2 bg-green-100 dark:bg-green-950"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />{" "}
                        Expenses
                      </span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
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
                      className="h-2"
                    />
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Surplus
                    </span>
                    <span
                      className={`text-lg font-bold ${currentMonthIncome - currentMonthExpenses >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {format(currentMonthIncome - currentMonthExpenses)}
                    </span>
                  </div>
                  {currentMonthIncome > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(
                        (currentMonthExpenses / currentMonthIncome) *
                        100
                      ).toFixed(0)}
                      % of income spent
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Goals */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    Goals
                  </CardTitle>
                  <Link
                    href="/goals"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    All <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {activeGoals.length > 0 ? (
                  <div className="space-y-3">
                    {activeGoals.slice(0, 3).map((goal) => {
                      const pct = Math.min(
                        100,
                        (goal.currentAmount / goal.targetAmount) * 100,
                      );
                      return (
                        <div key={goal.id}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium truncate max-w-[140px]">
                              {goal.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={pct} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
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

          {/* Insights removed */}

          {/* Goal ETAs */}
          {goalETAs.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                <TargetIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Goal Estimates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {goalETAs.map(({ goal, monthsRemaining, remaining }) => (
                  <Card
                    key={goal.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm text-foreground">
                          {goal.title}
                        </h4>
                        <Link href="/goals">
                          <ArrowRight className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        </Link>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Remaining</span>
                          <span className="font-semibold text-foreground">
                            {format(remaining)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            Est. completion
                          </span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {monthsRemaining === 1
                              ? "This month"
                              : `${monthsRemaining} months`}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mt-1">
                          <div
                            className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
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

          {/* financial health score removed */}

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
