/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Line,
  LineChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  ReferenceLine,
  Area,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
  Target,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Info,
  Clock,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { useTransactionsStore } from "@/store/transactions-store";
import { useBudgetsStore } from "@/store/budgets-store";
import { useGoalsStore } from "@/store/goals-store";
import { Progress } from "@/components/ui/progress";
import {
  prepareMonthlyData,
  linearTrendForecast,
  exponentialSmoothingForecast,
  movingAverageForecast,
  ensembleForecast,
  type ForecastResult,
} from "@/lib/utils/forecasting";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { MonthlyReportDownloadButton } from "@/components/monthly-report-template";
import { useAuthStore } from "@/store/auth-store";

// Color palette for categories
const CATEGORY_COLORS: Record<string, string> = {
  Food: "#ef4444",
  Transportation: "#f97316",
  Entertainment: "#f59e0b",
  Bills: "#eab308",
  Shopping: "#84cc16",
  Healthcare: "#22c55e",
  Savings: "#10b981",
  Investment: "#14b8a6",
  Education: "#06b6d4",
  Travel: "#0ea5e9",
  Other: "#6366f1",
  Salary: "#22c55e",
  Freelance: "#3b82f6",
  Business: "#8b5cf6",
  Gift: "#a855f7",
};

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  subtype?: string;
  date: string;
}

export default function AnalyticsPage() {
  const { format } = useFormatCurrency();
  const { user } = useAuthStore();
  const {
    transactions,
    loading: transLoading,
    fetchTransactions,
  } = useTransactionsStore();
  const { budgets, loading: budgetLoading, fetchBudgets } = useBudgetsStore();
  const { goals, loading: goalsLoading, fetchGoals } = useGoalsStore();

  const [selectedPeriod, setSelectedPeriod] = useState<
    "1M" | "3M" | "6M" | "1Y" | "ALL"
  >("6M");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Forecasting state
  const [forecastMethod, setForecastMethod] = useState<
    "linear" | "exponential" | "moving-average" | "ensemble"
  >("ensemble");
  const [forecastPeriods, setForecastPeriods] = useState<number>(6);
  const [forecastType, setForecastType] = useState<"expense" | "income">(
    "expense",
  );

  useEffect(() => {
    fetchTransactions();
    fetchBudgets();
    fetchGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter transactions by period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const periodDays: Record<typeof selectedPeriod, number> = {
      "1M": 30,
      "3M": 90,
      "6M": 180,
      "1Y": 365,
      ALL: Infinity,
    };

    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - periodDays[selectedPeriod]);

    return transactions.filter((t) => {
      const transDate = new Date(t.date);
      const meetsDate =
        periodDays[selectedPeriod] === Infinity || transDate >= cutoffDate;
      const meetsCategory =
        selectedCategory === "all" || t.category === selectedCategory;
      return meetsDate && meetsCategory;
    });
  }, [transactions, selectedPeriod, selectedCategory]);

  // Calculate monthly data
  const monthlyData = useMemo(() => {
    const months: Record<
      string,
      { income: number; expenses: number; net: number }
    > = {};

    filteredTransactions.forEach((t) => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!months[monthKey]) {
        months[monthKey] = { income: 0, expenses: 0, net: 0 };
      }

      if (t.type === "income") {
        months[monthKey].income += t.amount;
      } else {
        months[monthKey].expenses += t.amount;
      }
      months[monthKey].net =
        months[monthKey].income - months[monthKey].expenses;
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const date = new Date(key);
        return {
          month: date.toLocaleDateString("en-US", {
            month: "short",
            year: "2-digit",
          }),
          year: date.getFullYear(),
          ...data,
        };
      })
      .slice(-12); // Last 12 months max
  }, [filteredTransactions]);

  // Calculate category breakdown
  const categoryData = useMemo(() => {
    const categories: Record<string, number> = {};

    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });

    return Object.entries(categories)
      .map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || "#6366f1",
        percentage: 0,
      }))
      .sort((a, b) => b.value - a.value)
      .map((item, _, arr) => {
        const total = arr.reduce((sum, i) => sum + i.value, 0);
        return {
          ...item,
          percentage: total > 0 ? (item.value / total) * 100 : 0,
        };
      });
  }, [filteredTransactions]);

  // Calculate average daily spending pattern (average spend per occurrence of that weekday)
  const dailyPattern = useMemo(() => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const dayTotals: Record<string, number> = {};
    const dayUniqueDates: Record<string, Set<string>> = {};

    days.forEach((day) => {
      dayTotals[day] = 0;
      dayUniqueDates[day] = new Set();
    });

    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const dayName = days[new Date(t.date).getDay()];
        dayTotals[dayName] += t.amount;
        dayUniqueDates[dayName].add(t.date.substring(0, 10));
      });

    return days.map((day) => ({
      day: day.substring(0, 3),
      amount:
        dayUniqueDates[day].size > 0
          ? dayTotals[day] / dayUniqueDates[day].size
          : 0,
    }));
  }, [filteredTransactions]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const net = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    const avgMonthlyIncome =
      monthlyData.length > 0
        ? monthlyData.reduce((sum, m) => sum + m.income, 0) / monthlyData.length
        : 0;

    const avgMonthlyExpenses =
      monthlyData.length > 0
        ? monthlyData.reduce((sum, m) => sum + m.expenses, 0) /
          monthlyData.length
        : 0;

    // Calculate trends (guard against division by zero)
    const recentMonths = monthlyData.slice(-2);
    const incomeTrend =
      recentMonths.length === 2 && recentMonths[0].income > 0
        ? ((recentMonths[1].income - recentMonths[0].income) /
            recentMonths[0].income) *
          100
        : 0;
    const expenseTrend =
      recentMonths.length === 2 && recentMonths[0].expenses > 0
        ? ((recentMonths[1].expenses - recentMonths[0].expenses) /
            recentMonths[0].expenses) *
          100
        : 0;

    return {
      income,
      expenses,
      net,
      savingsRate,
      avgMonthlyIncome,
      avgMonthlyExpenses,
      incomeTrend,
      expenseTrend,
      transactionCount: filteredTransactions.length,
      avgTransactionAmount: (() => {
        const expOnly = filteredTransactions.filter(
          (t) => t.type === "expense",
        );
        return expOnly.length > 0
          ? expOnly.reduce((sum, t) => sum + t.amount, 0) / expOnly.length
          : 0;
      })(),
    };
  }, [filteredTransactions, monthlyData]);

  // Goal Progress Analysis (charts, pace vs deadline, scatter plot)
  const goalAnalysis = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return goals
      .filter((g) => g.status === "active")
      .map((goal) => {
        const percentage = (goal.currentAmount / goal.targetAmount) * 100;
        const remaining = goal.targetAmount - goal.currentAmount;
        const targetD = new Date(goal.targetDate + "T12:00:00");
        const daysLeft = Math.ceil(
          (targetD.getTime() - today.getTime()) / 86400000,
        );
        const monthsToDeadline = Math.max(daysLeft / 30.44, 1 / 30.44);
        const paceNeeded =
          remaining > 0 && daysLeft > 0 ? remaining / monthsToDeadline : 0;
        const monthly = goal.monthlyContribution ?? 0;
        let paceStatus: "on_track" | "behind" | "ahead" | "unknown" = "unknown";
        if (remaining <= 0) paceStatus = "ahead";
        else if (daysLeft <= 0) paceStatus = "behind";
        else if (monthly > 0) {
          if (monthly >= paceNeeded * 0.9) paceStatus = "on_track";
          else paceStatus = "behind";
          if (monthly >= paceNeeded * 1.15 && percentage < 100)
            paceStatus = "ahead";
        }

        return {
          id: goal.id,
          title: goal.title,
          current: goal.currentAmount,
          target: goal.targetAmount,
          remaining,
          percentage,
          category: goal.category,
          currentPct: Math.min(percentage, 100),
          targetPct: 100,
          targetDate: goal.targetDate,
          daysLeft,
          paceNeeded,
          monthlyContribution: goal.monthlyContribution,
          paceStatus,
        };
      });
  }, [goals]);

  const goalsTabStats = useMemo(() => {
    if (goalAnalysis.length === 0) return null;
    const totalTarget = goalAnalysis.reduce((s, g) => s + g.target, 0);
    const totalCurrent = goalAnalysis.reduce((s, g) => s + g.current, 0);
    const avgPct =
      goalAnalysis.reduce((s, g) => s + g.percentage, 0) / goalAnalysis.length;
    const behind = goalAnalysis.filter((g) => g.paceStatus === "behind").length;
    return { totalTarget, totalCurrent, avgPct, behind };
  }, [goalAnalysis]);

  const goalScatterData = useMemo(
    () =>
      goalAnalysis.map((g) => ({
        title: g.title,
        daysLeft: Math.max(0, g.daysLeft),
        pct: Math.min(g.percentage, 100),
        remaining: Math.max(0, g.remaining),
      })),
    [goalAnalysis],
  );

  const goalsSortedByDeadline = useMemo(
    () =>
      [...goalAnalysis].sort((a, b) =>
        a.targetDate.localeCompare(b.targetDate),
      ),
    [goalAnalysis],
  );

  // Category comparison over months
  const categoryTrends = useMemo(() => {
    const topCategories = categoryData.slice(0, 5);
    const monthMap = new Map<string, Record<string, number>>();

    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const date = new Date(t.date);
        const monthKey = date.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });

        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, {});
        }

        const monthData = monthMap.get(monthKey)!;
        monthData[t.category] = (monthData[t.category] || 0) + t.amount;
      });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => {
        const [aMonth, aYear] = a.split(" ");
        const [bMonth, bYear] = b.split(" ");
        return (
          new Date(`${aMonth} 1 20${aYear}`).getTime() -
          new Date(`${bMonth} 1 20${bYear}`).getTime()
        );
      })
      .slice(-6)
      .map(([month, data]) => ({
        month,
        ...Object.fromEntries(
          topCategories.map((cat) => [cat.name, data[cat.name] || 0]),
        ),
      }));
  }, [filteredTransactions, categoryData]);

  // Spending radar chart data
  const radarData = useMemo(() => {
    const topCats = categoryData.slice(0, 6);
    const maxValue = Math.max(...topCats.map((c) => c.value), 1);

    return topCats.map((cat) => ({
      category: cat.name,
      value: cat.value,
      fullMark: maxValue * 1.2,
    }));
  }, [categoryData]);

  const loading = transLoading || budgetLoading || goalsLoading;
  const allCategories = [
    "all",
    ...Array.from(new Set(transactions.map((t) => t.category))),
  ];

  // Compute forecasts (use last 12 months from today so we include your real data)
  const forecastData = useMemo(() => {
    if (transactions.length < 3) return null;

    const monthlyData = prepareMonthlyData(transactions, forecastType, 12);
    if (monthlyData.length < 3) return null;

    let forecast: ForecastResult;
    switch (forecastMethod) {
      case "linear":
        forecast = linearTrendForecast(monthlyData, forecastPeriods);
        break;
      case "exponential":
        forecast = exponentialSmoothingForecast(monthlyData, forecastPeriods);
        break;
      case "moving-average":
        forecast = movingAverageForecast(monthlyData, forecastPeriods);
        break;
      case "ensemble":
      default:
        forecast = ensembleForecast(monthlyData, forecastPeriods);
        break;
    }

    // Historical: only actuals (no predicted/lower/upper)
    const historicalChartData = monthlyData.map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      actual: d.value,
      predicted: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
      lowerBase: 0,
      bandWidth: 0,
    }));

    const forecastChartData = forecast.forecasts.map((f) => ({
      date: new Date(f.date).toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      actual: null as number | null,
      predicted: f.predicted,
      lower: f.lower,
      upper: f.upper,
      lowerBase: f.lower,
      bandWidth: Math.max(0, f.upper - f.lower),
    }));

    return {
      ...forecast,
      chartData: [...historicalChartData, ...forecastChartData],
      historicalData: monthlyData,
    };
  }, [transactions, forecastMethod, forecastPeriods, forecastType]);

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-0">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                Advanced Analytics
              </p>
              <p className="text-xs text-slate-500">
                Comprehensive insights into your financial data
              </p>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <MonthlyReportDownloadButton
                month={new Date().toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
                transactions={filteredTransactions}
                budgets={budgets}
                goals={goals}
                userName={
                  (user?.user_metadata?.full_name as string) || user?.email
                }
              />
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-36 h-8 text-xs border-slate-600 bg-slate-800 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === "all" ? "All Categories" : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedPeriod}
                onValueChange={(v) =>
                  setSelectedPeriod(v as typeof selectedPeriod)
                }
              >
                <SelectTrigger className="w-28 h-8 text-xs border-slate-600 bg-slate-800 text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1M">Last Month</SelectItem>
                  <SelectItem value="3M">Last 3 Months</SelectItem>
                  <SelectItem value="6M">Last 6 Months</SelectItem>
                  <SelectItem value="1Y">Last Year</SelectItem>
                  <SelectItem value="ALL">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Income
              </p>
              <p className="font-mono text-base font-semibold text-green-400">
                {format(statistics.income)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {statistics.incomeTrend >= 0 ? "+" : ""}
                {statistics.incomeTrend.toFixed(1)}% vs last mo
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Expenses
              </p>
              <p className="font-mono text-base font-semibold text-red-400">
                {format(statistics.expenses)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {statistics.expenseTrend >= 0 ? "+" : ""}
                {statistics.expenseTrend.toFixed(1)}% vs last mo
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Net Balance
              </p>
              <p
                className={`font-mono text-base font-semibold ${statistics.net >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {format(statistics.net)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {statistics.transactionCount} transactions
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Savings Rate
              </p>
              <p className="font-mono text-base font-semibold text-blue-400">
                {statistics.savingsRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Of income saved
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-3">
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="flex w-max gap-0.5 h-9">
              <TabsTrigger value="overview" className="text-xs px-3">
                Overview
              </TabsTrigger>
              <TabsTrigger value="trends" className="text-xs px-3">
                Trends
              </TabsTrigger>
              <TabsTrigger value="goals" className="text-xs px-3">
                Goals
              </TabsTrigger>
              <TabsTrigger value="forecast" className="text-xs px-3">
                Forecast
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Income vs Expenses Trend */}
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Income vs Expenses Trend
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Monthly comparison over time
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={monthlyData}
                      barGap={2}
                      barCategoryGap="25%"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) =>
                          v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number | undefined) =>
                          value !== undefined ? format(value) : format(0)
                        }
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar
                        dataKey="income"
                        name="Income"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Expenses"
                        fill="#ef4444"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Expense Distribution
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Breakdown by category
                  </p>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-3">
                  <div className="flex gap-4 items-center">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          labelLine={false}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(value: number | undefined) =>
                            value !== undefined ? format(value) : format(0)
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      {categoryData.slice(0, 7).map((cat, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs gap-2"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: cat.color }}
                            />
                            <span className="truncate text-muted-foreground">
                              {cat.name}
                            </span>
                          </div>
                          <span className="font-mono font-medium shrink-0">
                            {cat.percentage.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Spending Pattern */}
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Weekly Spending Pattern
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Average spending by day of week
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyPattern}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        stroke="var(--border)"
                      />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          value !== undefined ? format(value) : format(0)
                        }
                      />
                      <Bar
                        dataKey="amount"
                        fill="#8b5cf6"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Spending Radar */}
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Category Spending Radar
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Top categories at a glance
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="var(--border)" />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{ fontSize: 11 }}
                      />
                      <PolarRadiusAxis tick={{ fontSize: 11 }} />
                      <Radar
                        name="Spending"
                        dataKey="value"
                        stroke="#8b5cf6"
                        fill="#8b5cf6"
                        fillOpacity={0.6}
                      />
                      <Tooltip
                        formatter={(value: number | undefined) =>
                          value !== undefined ? format(value) : format(0)
                        }
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Categories List */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Top Spending Categories
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Detailed breakdown of your expenses
                </p>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {categoryData.slice(0, 8).map((category) => (
                    <div key={category.name} className="py-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium text-sm">
                            {category.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {category.percentage.toFixed(1)}%
                          </span>
                          <span className="font-mono font-semibold text-sm">
                            {format(category.value)}
                          </span>
                        </div>
                      </div>
                      <Progress value={category.percentage} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Category spending over time
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Lines show each top category per month — easier to compare
                  than stacked bars.
                </p>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart
                    data={categoryTrends}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number | undefined) =>
                        value === undefined ? format(0) : format(value)
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {categoryData.slice(0, 5).map((cat) => (
                      <Line
                        key={cat.name}
                        type="monotone"
                        dataKey={cat.name}
                        stroke={cat.color}
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 1, fill: cat.color }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Avg Monthly Income
                  </p>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <p className="font-mono font-semibold text-sm text-green-600 dark:text-green-400">
                    {format(statistics.avgMonthlyIncome)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {monthlyData.length} months
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Avg Monthly Expenses
                  </p>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <p className="font-mono font-semibold text-sm text-red-600 dark:text-red-400">
                    {format(statistics.avgMonthlyExpenses)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {monthlyData.length} months
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Avg Transaction
                  </p>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <p className="font-mono font-semibold text-sm text-blue-600">
                    {format(statistics.avgTransactionAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Per transaction average
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-border overflow-hidden">
              <CardHeader className="pb-2 border-b border-border px-4 pt-4 bg-muted/30">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Net cash flow (monthly)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      <strong className="text-foreground">Net cash flow</strong>{" "}
                      is simply{" "}
                      <strong className="text-foreground">
                        income minus expenses
                      </strong>{" "}
                      for that calendar month (in your selected date range).
                      Bars above the zero line are a{" "}
                      <span className="text-green-600 font-medium">
                        surplus
                      </span>{" "}
                      (you kept money); bars below are a{" "}
                      <span className="text-red-600 font-medium">deficit</span>{" "}
                      (you spent more than you earned that month).
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={340}>
                  <ComposedChart
                    data={monthlyData}
                    margin={{ top: 12, right: 8, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        v >= 1000 || v <= -1000
                          ? `${(v / 1000).toFixed(0)}k`
                          : String(v)
                      }
                    />
                    <ReferenceLine
                      y={0}
                      stroke="var(--foreground)"
                      strokeOpacity={0.25}
                      strokeWidth={1}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0]?.payload as {
                          net: number;
                          income: number;
                          expenses: number;
                        };
                        if (!row) return null;
                        const n = row.net;
                        return (
                          <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
                            <p className="font-semibold mb-1">{label}</p>
                            <p className="text-muted-foreground">
                              Income:{" "}
                              <span className="text-green-600 font-mono">
                                {format(row.income)}
                              </span>
                            </p>
                            <p className="text-muted-foreground">
                              Expenses:{" "}
                              <span className="text-red-600 font-mono">
                                {format(row.expenses)}
                              </span>
                            </p>
                            <p
                              className={`mt-1 pt-1 border-t font-medium ${n >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              Net: {format(n)}{" "}
                              <span className="text-muted-foreground font-normal">
                                ({n >= 0 ? "surplus" : "deficit"})
                              </span>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="net" radius={[4, 4, 4, 4]} maxBarSize={48}>
                      {monthlyData.map((entry, index) => (
                        <Cell
                          key={`net-${index}`}
                          fill={entry.net >= 0 ? "#22c55e" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-4">
            {goalAnalysis.length > 0 && goalsTabStats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Combined target
                      </p>
                      <p className="font-mono text-lg font-semibold mt-1">
                        {format(goalsTabStats.totalTarget)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Saved so far
                      </p>
                      <p className="font-mono text-lg font-semibold text-green-600 mt-1">
                        {format(goalsTabStats.totalCurrent)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-3 px-4">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Avg completion
                      </p>
                      <p className="font-mono text-lg font-semibold text-indigo-600 mt-1">
                        {goalsTabStats.avgPct.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card
                    className={
                      goalsTabStats.behind > 0 ? "border-orange-500/50" : ""
                    }
                  >
                    <CardContent className="pt-4 pb-3 px-4">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Pace alerts
                      </p>
                      <p className="font-mono text-lg font-semibold mt-1">
                        {goalsTabStats.behind > 0 ? (
                          <span className="text-orange-600">
                            {goalsTabStats.behind} behind
                          </span>
                        ) : (
                          <span className="text-green-600">All on track</span>
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Progress vs time pressure
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Each dot is a goal: horizontal axis = days until target
                        date; vertical = % funded. Bubble size ≈ amount left to
                        save. Bottom-right = urgent and incomplete.
                      </p>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <ScatterChart
                          margin={{ top: 8, right: 8, bottom: 28, left: 8 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border)"
                          />
                          <XAxis
                            type="number"
                            dataKey="daysLeft"
                            name="Days left"
                            tick={{ fontSize: 10 }}
                            label={{
                              value: "Days until target date",
                              position: "bottom",
                              offset: 12,
                              fontSize: 10,
                            }}
                          />
                          <YAxis
                            type="number"
                            dataKey="pct"
                            domain={[0, 100]}
                            name="% funded"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => `${v}%`}
                            label={{
                              value: "% of target saved",
                              angle: -90,
                              position: "insideLeft",
                              fontSize: 10,
                            }}
                          />
                          <ZAxis
                            type="number"
                            dataKey="remaining"
                            range={[80, 320]}
                            name="Remaining"
                          />
                          <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d = payload[0].payload as {
                                title: string;
                                daysLeft: number;
                                pct: number;
                                remaining: number;
                              };
                              return (
                                <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
                                  <p className="font-semibold mb-1">
                                    {d.title}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {d.pct.toFixed(1)}% funded
                                  </p>
                                  <p className="text-muted-foreground">
                                    {d.daysLeft} days to deadline
                                  </p>
                                  <p className="text-muted-foreground">
                                    {format(d.remaining)} left to save
                                  </p>
                                </div>
                              );
                            }}
                          />
                          <Scatter
                            name="Goals"
                            data={goalScatterData}
                            fill="#6366f1"
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Deadline timeline
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Goals sorted by target date — bar shows progress toward
                        each target.
                      </p>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3 max-h-[320px] overflow-y-auto">
                      {goalsSortedByDeadline.map((goal) => (
                        <div
                          key={goal.id}
                          className="rounded-lg border border-border p-3 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {goal.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Due{" "}
                                {new Date(
                                  goal.targetDate + "T12:00:00",
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                                {goal.daysLeft > 0
                                  ? ` · ${goal.daysLeft}d left`
                                  : goal.daysLeft <= 0 && goal.remaining > 0
                                    ? " · overdue"
                                    : ""}
                              </p>
                            </div>
                            <span
                              className={`text-[10px] shrink-0 px-2 py-0.5 rounded-full font-medium ${
                                goal.paceStatus === "behind"
                                  ? "bg-orange-500/15 text-orange-700 dark:text-orange-400"
                                  : goal.paceStatus === "ahead"
                                    ? "bg-green-500/15 text-green-700 dark:text-green-400"
                                    : goal.paceStatus === "on_track"
                                      ? "bg-blue-500/15 text-blue-700 dark:text-blue-400"
                                      : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {goal.paceStatus === "behind"
                                ? "Behind pace"
                                : goal.paceStatus === "ahead"
                                  ? "Ahead of pace"
                                  : goal.paceStatus === "on_track"
                                    ? "On track"
                                    : "Set monthly $"}
                            </span>
                          </div>
                          <Progress
                            value={Math.min(goal.percentage, 100)}
                            className="h-2"
                          />
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                            <span>
                              {format(goal.current)} / {format(goal.target)}
                            </span>
                            {goal.remaining > 0 && goal.daysLeft > 0 && (
                              <span>
                                Need ~{format(goal.paceNeeded)}/mo to hit date
                              </span>
                            )}
                            {goal.monthlyContribution != null &&
                              goal.monthlyContribution > 0 && (
                                <span>
                                  Plan: {format(goal.monthlyContribution)}/mo
                                </span>
                              )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Funded % comparison
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Blue = saved toward goal; gray bar = full target (100%).
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer
                      width="100%"
                      height={Math.max(220, goalAnalysis.length * 36)}
                    >
                      <BarChart
                        data={goalAnalysis}
                        layout="vertical"
                        margin={{ left: 4, right: 16, top: 8, bottom: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <YAxis
                          dataKey="title"
                          type="category"
                          width={120}
                          tick={{ fontSize: 10 }}
                          interval={0}
                        />
                        <Tooltip
                          formatter={(
                            value: number | undefined,
                            name: string | undefined,
                            props: {
                              payload?: { current: number; target: number };
                            },
                          ) => {
                            const p = props.payload;
                            const label = name ?? "";
                            if (!p)
                              return [
                                value != null ? `${value.toFixed(1)}%` : "0%",
                                label,
                              ];
                            if (name === "Current")
                              return [
                                `${format(p.current)} (${(value ?? 0).toFixed(1)}%)`,
                                label,
                              ];
                            if (name === "Target")
                              return [`${format(p.target)} (100%)`, label];
                            return [
                              value != null ? `${value.toFixed(1)}%` : "0%",
                              label,
                            ];
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar
                          dataKey="currentPct"
                          fill="#3b82f6"
                          name="Funded"
                          radius={[0, 4, 4, 0]}
                        />
                        <Bar
                          dataKey="targetPct"
                          fill="#e5e7eb"
                          name="Full target"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-6 text-center">
                  <Target className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-lg font-semibold text-foreground mb-2">
                    No Active Goals
                  </p>
                  <p className="text-muted-foreground mb-2 text-sm">
                    Set financial goals to track your progress
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-4">
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Financial Forecasting</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  We project future monthly{" "}
                  {forecastType === "expense" ? "spending" : "income"} from your
                  history. The chart shows actual months (blue), then predicted
                  values (orange) with a shaded band for uncertainty.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Forecast Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Forecast Type</Label>
                    <Select
                      value={forecastType}
                      onValueChange={(value: "income" | "expense") =>
                        setForecastType(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expenses</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Forecasting Method
                    </Label>
                    <Select
                      value={forecastMethod}
                      onValueChange={(value: any) => setForecastMethod(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ensemble">
                          Ensemble (Best)
                        </SelectItem>
                        <SelectItem value="exponential">
                          Exponential Smoothing
                        </SelectItem>
                        <SelectItem value="linear">Linear Trend</SelectItem>
                        <SelectItem value="moving-average">
                          Moving Average
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Forecast Months
                    </Label>
                    <Select
                      value={forecastPeriods.toString()}
                      onValueChange={(value) =>
                        setForecastPeriods(parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="6">6 Months</SelectItem>
                        <SelectItem value="12">12 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {forecastData ? (
                  <>
                    {/* Forecast Insights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Card className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Trend Direction
                              </p>
                              <p className="text-2xl font-bold capitalize flex items-center space-x-2">
                                {forecastData.trend === "increasing" && (
                                  <ArrowUpRight className="h-6 w-6 text-red-600" />
                                )}
                                {forecastData.trend === "decreasing" && (
                                  <ArrowDownRight className="h-6 w-6 text-green-600" />
                                )}
                                <span
                                  className={
                                    forecastData.trend === "increasing"
                                      ? "text-red-600"
                                      : forecastData.trend === "decreasing"
                                        ? "text-green-600"
                                        : "text-muted-foreground"
                                  }
                                >
                                  {forecastData.trend}
                                </span>
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2">
                        <CardContent className="pt-6">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Forecasting Model
                            </p>
                            <p className="text-lg font-bold">
                              {forecastData.method}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {forecastData.seasonality
                                ? "Seasonality detected"
                                : "No seasonality"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2">
                        <CardContent className="pt-6">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Next Month Prediction
                            </p>
                            <p className="text-2xl font-bold text-indigo-600">
                              {format(
                                forecastData.forecasts[0]?.predicted ?? 0,
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Range:{" "}
                              {format(forecastData.forecasts[0]?.lower ?? 0)} -{" "}
                              {format(forecastData.forecasts[0]?.upper ?? 0)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* How to read the chart & table */}
                    <Card className="border-2 border-border bg-muted/50">
                      <CardHeader className="pb-2">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          How to read this
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 space-y-2">
                          <span className="block">
                            <strong className="text-foreground">
                              Historical
                            </strong>{" "}
                            — Your real past{" "}
                            {forecastType === "expense" ? "expenses" : "income"}{" "}
                            (what actually happened). Shown as the blue solid
                            line on the chart.
                          </span>
                          <span className="block">
                            <strong className="text-foreground">
                              Forecast
                            </strong>{" "}
                            — What the model thinks will happen in future
                            months. Shown as the orange dashed line.
                          </span>
                          <span className="block">
                            <strong className="text-foreground">
                              Predicted
                            </strong>{" "}
                            — The single best guess for that month (e.g. we
                            expect about ₹1,50,000).
                          </span>
                          <span className="block">
                            <strong className="text-foreground">
                              Lower bound
                            </strong>{" "}
                            — The minimum we expect (worst case).{" "}
                            <strong className="text-foreground">
                              Upper bound
                            </strong>{" "}
                            — The maximum we expect (high case). The shaded
                            orange band on the chart is this range.
                          </span>
                          <span className="block">
                            <strong className="text-foreground">Range</strong> —
                            How wide that band is (± value). Bigger range = more
                            uncertainty.
                          </span>
                        </p>
                      </CardHeader>
                    </Card>

                    {/* Forecast Chart */}
                    <Card>
                      <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Historical Data & Forecast
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Blue line = your real past data. Orange dashed line =
                          predicted future. Shaded band = lower to upper bound.
                        </p>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={420}>
                          <ComposedChart data={forecastData.chartData}>
                            <defs>
                              <linearGradient
                                id="forecastBandGrad"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="#fb923c"
                                  stopOpacity={0.35}
                                />
                                <stop
                                  offset="100%"
                                  stopColor="#fb923c"
                                  stopOpacity={0.08}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="var(--border)"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 11 }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(v) =>
                                v >= 1000
                                  ? `${(v / 1000).toFixed(0)}k`
                                  : String(v)
                              }
                            />
                            <Tooltip
                              formatter={(value: unknown) =>
                                value != null && typeof value === "number"
                                  ? format(value)
                                  : "—"
                              }
                              contentStyle={{
                                backgroundColor: "var(--card)",
                                border: "1px solid var(--border)",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                              labelStyle={{ fontWeight: 600 }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />

                            <Area
                              type="monotone"
                              dataKey="lowerBase"
                              stackId="fcBand"
                              stroke="none"
                              fill="transparent"
                              isAnimationActive={false}
                              legendType="none"
                            />
                            <Area
                              type="monotone"
                              dataKey="bandWidth"
                              stackId="fcBand"
                              stroke="none"
                              fill="url(#forecastBandGrad)"
                              isAnimationActive={false}
                              name="Uncertainty band"
                              legendType="rect"
                            />

                            {/* Historical data (blue) */}
                            <Line
                              type="monotone"
                              dataKey="actual"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={{ fill: "#3b82f6", r: 3 }}
                              connectNulls={false}
                              name="Historical"
                            />

                            {/* Forecast (orange) */}
                            <Line
                              type="monotone"
                              dataKey="predicted"
                              stroke="#f97316"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={{ fill: "#f97316", r: 3 }}
                              connectNulls={false}
                              name="Forecast"
                            />

                            {/* Vertical line at forecast start */}
                            {forecastData.historicalData.length > 0 &&
                              forecastData.chartData[
                                forecastData.historicalData.length
                              ] && (
                                <ReferenceLine
                                  x={
                                    forecastData.chartData[
                                      forecastData.historicalData.length
                                    ].date
                                  }
                                  stroke="#94a3b8"
                                  strokeDasharray="3 3"
                                  label={{
                                    value: "Forecast start",
                                    position: "top",
                                    fontSize: 11,
                                  }}
                                />
                              )}
                          </ComposedChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {/* Forecast Table */}
                    <Card>
                      <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Detailed Forecast
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Month-by-month numbers: predicted value, then the
                          low–high band (lower and upper bound), then the range
                          (±).
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-3 px-4">Month</th>
                                <th
                                  className="text-right py-3 px-4"
                                  title="Most likely forecast for that month"
                                >
                                  Predicted
                                </th>
                                <th
                                  className="text-right py-3 px-4"
                                  title="Minimum expected value in the confidence interval"
                                >
                                  Lower Bound
                                </th>
                                <th
                                  className="text-right py-3 px-4"
                                  title="Maximum expected value in the confidence interval"
                                >
                                  Upper Bound
                                </th>
                                <th
                                  className="text-right py-3 px-4"
                                  title="Half the width of the confidence interval (± around predicted)"
                                >
                                  Range
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {forecastData.forecasts.map((forecast, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b hover:bg-muted/50"
                                >
                                  <td className="py-3 px-4">
                                    {new Date(forecast.date).toLocaleDateString(
                                      "en-US",
                                      { month: "long", year: "numeric" },
                                    )}
                                  </td>
                                  <td className="text-right py-3 px-4 font-semibold text-indigo-600">
                                    {format(forecast.predicted)}
                                  </td>
                                  <td className="text-right py-3 px-4 text-muted-foreground">
                                    {format(forecast.lower)}
                                  </td>
                                  <td className="text-right py-3 px-4 text-muted-foreground">
                                    {format(forecast.upper)}
                                  </td>
                                  <td className="text-right py-3 px-4 text-sm text-muted-foreground">
                                    ±
                                    {format(
                                      (forecast.upper - forecast.lower) / 2,
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Insights & Recommendations */}
                    <Card className="border-2 border-indigo-200 bg-indigo-50">
                      <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-indigo-600" />
                          <span>AI Insights</span>
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {forecastData.trend === "increasing" &&
                          forecastType === "expense" && (
                            <div className="flex items-start space-x-3">
                              <div className="p-2 bg-red-100 rounded-full">
                                <TrendingUp className="h-4 w-4 text-red-600" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  Rising Expenses Detected
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Your expenses are trending upward. Consider
                                  reviewing your budget and identifying areas to
                                  cut back.
                                </p>
                              </div>
                            </div>
                          )}

                        {forecastData.trend === "decreasing" &&
                          forecastType === "expense" && (
                            <div className="flex items-start space-x-3">
                              <div className="p-2 bg-green-100 rounded-full">
                                <TrendingDown className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  Great Progress!
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Your expenses are trending downward. Keep up
                                  the good work with your spending habits!
                                </p>
                              </div>
                            </div>
                          )}

                        {forecastData.seasonality && (
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <Calendar className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                Seasonal Pattern Found
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Your {forecastType} shows seasonal variations.
                                Plan ahead for months with higher predicted
                                values.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-start space-x-3">
                          <div className="p-2 bg-indigo-100 rounded-full">
                            <Target className="h-4 w-4 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              Forecast Confidence
                            </p>
                            <p className="text-sm text-muted-foreground">
                              The {forecastData.method.toLowerCase()} model
                              provides predictions with 95% confidence
                              intervals. Wider ranges indicate higher
                              uncertainty.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card>
                    <CardContent className="py-6 text-center">
                      <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-lg font-semibold text-foreground mb-2">
                        Insufficient Data
                      </p>
                      <p className="text-muted-foreground">
                        Need at least 3 months of transaction data to generate
                        forecasts
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
