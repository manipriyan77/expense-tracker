"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  User as UserIcon,
  Target as TargetIcon,
  ArrowRight,
  Trophy,
  CreditCard,
  CalendarDays,
  Wallet,
  PieChart,
} from "lucide-react";
import { useTransactionsStore } from "@/store/transactions-store";
import { useGoalsStore } from "@/store/goals-store";
import { useBudgetsStore } from "@/store/budgets-store";
import { useNetWorthStore } from "@/store/net-worth-store";
import { useDebtTrackerStore } from "@/store/debt-tracker-store";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { RecentTransactionsWidget } from "@/components/dashboard/RecentTransactionsWidget";
import { QuickAddButton } from "@/components/QuickAddButton";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { StatsSkeleton } from "@/components/ui/skeleton";
import { AlertCircle, Lightbulb } from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const { format } = useFormatCurrency();
  const { transactions, loading, error, fetchTransactions } =
    useTransactionsStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { budgets, fetchBudgets } = useBudgetsStore();
  const { assets, fetchAssets, fetchLiabilities } = useNetWorthStore();
  const { debts, fetchDebts } = useDebtTrackerStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchGoals();
    fetchBudgets();
    fetchAssets();
    fetchLiabilities();
    fetchDebts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate monthly data for forecasting (must be before early returns)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysPassed = new Date().getDate();
  const daysRemaining = daysInMonth - daysPassed;

  // Current month transactions
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

  // Daily spending totals (per calendar day) for current month
  const dailyExpenseTotals = useMemo(() => {
    const expenseTx = currentMonthTransactions.filter(
      (t) => t.type === "expense",
    );
    const byDay: Record<string, number> = {};
    expenseTx.forEach((t) => {
      const day = t.date;
      byDay[day] = (byDay[day] ?? 0) + t.amount;
    });
    return Object.values(byDay);
  }, [currentMonthTransactions]);

  // Median of daily totals (robust to single-day spikes like split expenses)
  const median = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]!
      : (sorted[mid - 1]! + sorted[mid]!) / 2;
  };

  const typicalDailySpend =
    dailyExpenseTotals.length >= 2
      ? median(dailyExpenseTotals)
      : daysPassed > 0
      ? currentMonthExpenses / daysPassed
      : 0;

  // Projected month-end balance (use typical daily spend to avoid spike days skewing)
  const projectedMonthEndExpenses =
    currentMonthExpenses + typicalDailySpend * daysRemaining;
  const projectedMonthEndBalance =
    currentMonthIncome - projectedMonthEndExpenses;

  // Top insights
  const insights = useMemo(() => {
    const insightsList: Array<{
      type: "warning" | "info" | "success";
      message: string;
      link?: string;
    }> = [];

    // Compare with last month
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return (
        date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear
      );
    });
    const lastMonthExpenses = lastMonthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    if (lastMonthExpenses > 0) {
      const expenseChange =
        ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
      if (Math.abs(expenseChange) > 15) {
        insightsList.push({
          type: expenseChange > 0 ? "warning" : "success",
          message: `You&apos;ve ${
            expenseChange > 0 ? "spent" : "saved"
          } ${Math.abs(expenseChange).toFixed(0)}% ${
            expenseChange > 0 ? "more" : "less"
          } this month compared to last month`,
          link: "/analytics",
        });
      }
    }

    // Budget warnings
    const overspendingBudgets = budgets.filter((budget) => {
      const budgetSpent = currentMonthTransactions
        .filter((t) => t.budget_id === budget.id && t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      return budgetSpent > budget.limit_amount * 0.8; // 80% threshold
    });

    if (overspendingBudgets.length > 0) {
      insightsList.push({
        type: "warning",
        message: `${overspendingBudgets.length} budget${
          overspendingBudgets.length > 1 ? "s" : ""
        } approaching limit`,
        link: "/budgets",
      });
    }

    // Goal progress
    const nearCompletionGoals = goals.filter((goal) => {
      if (goal.status !== "active") return false;
      const progress = goal.currentAmount / goal.targetAmount;
      return progress >= 0.8 && progress < 1;
    });

    if (nearCompletionGoals.length > 0) {
      insightsList.push({
        type: "success",
        message: `${nearCompletionGoals.length} goal${
          nearCompletionGoals.length > 1 ? "s" : ""
        } nearly complete!`,
        link: "/goals",
      });
    }

    // Spending rate warning (uses typical daily spend so one-off big days don't skew)
    if (daysPassed > 0 && typicalDailySpend > 0) {
      const projectedMonthly = typicalDailySpend * daysInMonth;
      if (projectedMonthly > currentMonthIncome * 1.1) {
        insightsList.push({
          type: "warning",
          message:
            "At current spending rate, you&apos;ll exceed income this month",
          link: "/transactions",
        });
      }
    }

    return insightsList.slice(0, 3); // Top 3 insights
  }, [
    transactions,
    currentMonthExpenses,
    budgets,
    goals,
    currentMonthTransactions,
    currentMonthIncome,
    daysPassed,
    daysInMonth,
    typicalDailySpend,
    currentMonth,
    currentYear,
  ]);

  // Goal completion ETAs
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

  // Calculate totals (after hooks, before early returns)
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;
  const activeGoals = goals.filter((g) => g.status === "active").length;
  const activeBudgets = budgets.length;

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      ctrlKey: true,
      action: () => setIsAddDialogOpen(true),
      description: "Add new transaction",
    },
    {
      key: "d",
      ctrlKey: true,
      action: () => router.push("/dashboard"),
      description: "Go to dashboard",
    },
    {
      key: "a",
      ctrlKey: true,
      action: () => router.push("/analytics"),
      description: "Go to analytics",
    },
    {
      key: "b",
      ctrlKey: true,
      action: () => router.push("/budgets"),
      description: "Go to budgets",
    },
    {
      key: "g",
      ctrlKey: true,
      action: () => router.push("/goals"),
      description: "Go to goals",
    },
    {
      key: "?",
      shiftKey: true,
      action: () => setShowShortcuts(true),
      description: "Show keyboard shortcuts",
    },
  ]);

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <StatsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchTransactions} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="px-3 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 gap-2 min-w-0">
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Dashboard</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Welcome back! Here&apos;s your financial overview
                </p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-9 sm:w-9"
                      onClick={() => setShowShortcuts(true)}
                    >
                      <span className="text-lg">?</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Keyboard Shortcuts</TooltipContent>
                </Tooltip>
                <NotificationCenter />
                <div className="hidden sm:flex items-center space-x-2 pl-2 border-l">
                  <UserIcon className="h-5 w-5 text-gray-500 shrink-0" />
                  <div className="text-sm text-gray-700 min-w-0">
                    <div className="truncate">Welcome, User</div>
                    <div className="text-xs text-gray-500 truncate max-w-[120px] lg:max-w-none">
                      user@example.com
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-3 sm:px-6 lg:px-8 py-4">
          {/* Insights Section */}
          {insights.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {insights.map((insight, idx) => (
                  <Card
                    key={idx}
                    className={`py-1 ${
                      insight.type === "warning"
                        ? "border-orange-200 bg-orange-50"
                        : insight.type === "success"
                        ? "border-green-200 bg-green-50"
                        : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {insight.type === "warning" ? (
                          <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                        ) : insight.type === "success" ? (
                          <TargetIcon className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        ) : (
                          <Lightbulb className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {insight.message}
                          </p>
                          {insight.link && (
                            <Link
                              href={insight.link}
                              className="text-xs text-blue-600 hover:underline mt-1 inline-flex items-center gap-1"
                            >
                              View details
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="py-2 hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-0">
                    <CardTitle className="text-sm font-medium">
                      Total Balance
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent className="p-3 pt-2">
                    <div
                      className={`text-xl font-bold ${
                        balance >= 0 ? "text-blue-600" : "text-red-600"
                      }`}
                    >
                      {format(balance)}
                    </div>
                    <p className="text-xs text-gray-500">Income - Expenses</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>Your net balance for all time</TooltipContent>
            </Tooltip>

            {/* Projected Month-End Balance - hidden for now */}
            {false && (
              <Card className="py-2 border-2 border-purple-200 bg-purple-50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Projected Month-End
                  </CardTitle>
                  <CalendarIcon className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      projectedMonthEndBalance >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {format(projectedMonthEndBalance)}
                  </div>
                  <p className="text-xs text-gray-500">
                    Based on typical daily spend (ignores one-off spike days)
                  </p>
                </CardContent>
              </Card>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="py-2 cursor-pointer hover:shadow-md transition-shadow">
                  <Link href="/transactions">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-0">
                      <CardTitle className="text-sm font-medium">
                        Total Income
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent className="p-3 pt-2">
                      <div className="text-xl font-bold text-green-600">
                        {format(totalIncome)}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center">
                        All time
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </p>
                    </CardContent>
                  </Link>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                Click to view all income transactions
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-pointer py-2 hover:shadow-md transition-shadow">
                  <Link href="/transactions">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-0">
                      <CardTitle className="text-sm font-medium">
                        Total Expenses
                      </CardTitle>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent className="p-3 pt-2">
                      <div className="text-xl font-bold text-red-600">
                        {format(totalExpenses)}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center">
                        All time
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </p>
                    </CardContent>
                  </Link>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                Click to view all expense transactions
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <Link href="/transactions">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-0">
                      <CardTitle className="text-sm font-medium">
                        Transactions
                      </CardTitle>
                      <CalendarIcon className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent className="p-3 pt-2">
                      <div className="text-xl font-bold text-purple-600">
                        {transactions.length}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center">
                        Total recorded
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </p>
                    </CardContent>
                  </Link>
                </Card>
              </TooltipTrigger>
              <TooltipContent>Total number of transactions</TooltipContent>
            </Tooltip>
          </div>

          {/* Quick Access Section */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Quick Access
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <Link href="/goals">
                <Card className="py-2 cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center space-x-3 p-4">
                    <div className="p-2 rounded-full bg-blue-100">
                      <TargetIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Goals</h4>
                      <p className="text-sm text-gray-500">
                        {activeGoals} active
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/budgets">
                <Card className="cursor-pointer py-2 hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center space-x-3 p-4">
                    <div className="p-2 rounded-full bg-purple-100">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Budgets</h4>
                      <p className="text-sm text-gray-500">
                        {activeBudgets} set
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/savings-challenges">
                <Card className="cursor-pointer py-2 hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center space-x-3 p-4">
                    <div className="p-2 rounded-full bg-green-100">
                      <Trophy className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Challenges</h4>
                      <p className="text-sm text-gray-500">Save more</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/calendar">
                <Card className="cursor-pointer py-2 hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center space-x-3 p-4">
                    <div className="p-2 rounded-full bg-orange-100">
                      <CalendarDays className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Calendar</h4>
                      <p className="text-sm text-gray-500">View timeline</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Goal ETAs */}
          {goalETAs.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <TargetIcon className="h-4 w-4 text-blue-600" />
                Goal Completion Estimates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {goalETAs.map(({ goal, monthsRemaining, remaining }) => (
                  <Card
                    key={goal.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm">{goal.title}</h4>
                        <Link href="/goals">
                          <ArrowRight className="h-4 w-4 text-gray-400 hover:text-blue-600" />
                        </Link>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Remaining</span>
                          <span className="font-semibold">
                            {format(remaining)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Est. completion</span>
                          <span className="font-semibold text-blue-600">
                            {monthsRemaining === 1
                              ? "This month"
                              : `${monthsRemaining} months`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                (goal.currentAmount / goal.targetAmount) * 100,
                              )}%`,
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

          {/* Assets */}
          {assets.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-green-600" />
                Assets
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {assets.slice(0, 6).map((asset) => (
                  <Link key={asset.id} href="/net-worth">
                    <Card className="hover:shadow-md transition-shadow h-full">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-sm">
                            {asset.name}
                          </h4>
                          <ArrowRight className="h-4 w-4 text-gray-400 hover:text-green-600 shrink-0" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-gray-600">
                            <span>Current value</span>
                            <span className="font-semibold text-green-600">
                              {format(asset.value)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600 capitalize">
                              {asset.type.replace("_", " ")}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div
                              className="bg-green-600 h-2 rounded-full transition-all"
                              style={{ width: "100%" }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Debts */}
          {debts.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-600" />
                Debts
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {debts.slice(0, 6).map((debt) => {
                  const paidOffPct =
                    debt.original_amount > 0
                      ? Math.min(
                          100,
                          ((debt.original_amount - debt.balance) /
                            debt.original_amount) *
                            100,
                        )
                      : 0;
                  return (
                    <Link key={debt.id} href="/debt-tracker">
                      <Card className="hover:shadow-md transition-shadow h-full">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm">
                              {debt.name}
                            </h4>
                            <ArrowRight className="h-4 w-4 text-gray-400 hover:text-red-600 shrink-0" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Remaining</span>
                              <span className="font-semibold text-red-600">
                                {format(debt.balance)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Est. payoff</span>
                              <span className="font-semibold text-blue-600">
                                {debt.months_remaining != null
                                  ? debt.months_remaining === 1
                                    ? "This month"
                                    : `${debt.months_remaining} months`
                                  : "—"}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className="bg-red-600 h-2 rounded-full transition-all"
                                style={{
                                  width: `${paidOffPct}%`,
                                }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Budgets */}
          {budgets.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-amber-600" />
                Budgets
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {budgets.slice(0, 6).map((budget) => {
                  const limit = Number(budget.limit_amount) || 1;
                  const spent = Number(budget.spent_amount) || 0;
                  const pct = Math.min(100, (spent / limit) * 100);
                  const remaining = Math.max(0, limit - spent);
                  return (
                    <Link key={budget.id} href="/budgets">
                      <Card className="hover:shadow-md transition-shadow h-full">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-sm">
                              {budget.category}
                              {budget.subtype && (
                                <span className="text-gray-500 font-normal">
                                  {" "}
                                  → {budget.subtype}
                                </span>
                              )}
                            </h4>
                            <ArrowRight className="h-4 w-4 text-gray-400 hover:text-amber-600 shrink-0" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Remaining</span>
                              <span className="font-semibold">
                                {format(remaining)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Used</span>
                              <span
                                className={`font-semibold ${
                                  pct >= 100
                                    ? "text-red-600"
                                    : pct >= 80
                                    ? "text-amber-600"
                                    : "text-blue-600"
                                }`}
                              >
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  pct >= 100
                                    ? "bg-red-600"
                                    : pct >= 80
                                    ? "bg-amber-600"
                                    : "bg-amber-500"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Transactions Widget */}
          <div className="mb-4">
            <RecentTransactionsWidget />
          </div>
        </main>

        {/* Quick Add Button */}
        <QuickAddButton />

        {/* Keyboard Shortcuts Dialog */}
        <KeyboardShortcutsDialog
          open={showShortcuts}
          onOpenChange={setShowShortcuts}
        />

        {/* Add Transaction Dialog */}
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
