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
  BarChart,
  Bar,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Info,
  Clock,
  Sparkles,
  Gauge,
  Layers,
} from "lucide-react";
import { useTransactionsStore } from "@/store/transactions-store";
import { useBudgetsStore } from "@/store/budgets-store";
import { useGoalsStore } from "@/store/goals-store";
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
import { ListPageSkeleton } from "@/components/ui/skeleton";

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

// Whether a forecast trend is good news, given what's being forecast — rising income is
// good, rising expenses is not, and vice versa. Returns null for "stable" (no verdict).
function isTrendFavorable(
  trend: "increasing" | "decreasing" | "stable",
  type: "income" | "expense",
): boolean | null {
  if (trend === "stable") return null;
  return type === "expense" ? trend === "decreasing" : trend === "increasing";
}

const FORECAST_METHODS: {
  key: "ensemble" | "exponential" | "linear" | "moving-average";
  label: string;
}[] = [
  { key: "ensemble", label: "Ensemble" },
  { key: "exponential", label: "Exp. Smoothing" },
  { key: "linear", label: "Linear Trend" },
  { key: "moving-average", label: "Moving Avg" },
];

const PACE_RANK: Record<string, number> = { behind: 0, unknown: 1, on_track: 2, ahead: 3 };

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

  const [goalSortBy, setGoalSortBy] = useState<"deadline" | "progress" | "pace">(
    "deadline",
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

  // Net cash flow with a trailing 3-month rolling average, to smooth out one-off spikes
  const monthlyDataWithRollingAvg = useMemo(() => {
    return monthlyData.map((m, i) => {
      const window = monthlyData.slice(Math.max(0, i - 2), i + 1);
      const rollingNet = window.reduce((s, w) => s + w.net, 0) / window.length;
      return { ...m, rollingNet };
    });
  }, [monthlyData]);

  // Best/worst single month by net cash flow, within the filtered window
  const bestWorstMonth = useMemo(() => {
    if (monthlyData.length === 0) return null;
    const best = monthlyData.reduce((a, b) => (b.net > a.net ? b : a));
    const worst = monthlyData.reduce((a, b) => (b.net < a.net ? b : a));
    return { best, worst };
  }, [monthlyData]);

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

  const goalsSorted = useMemo(() => {
    const list = [...goalAnalysis];
    if (goalSortBy === "progress") {
      return list.sort((a, b) => a.percentage - b.percentage);
    }
    if (goalSortBy === "pace") {
      return list.sort((a, b) => PACE_RANK[a.paceStatus] - PACE_RANK[b.paceStatus]);
    }
    return list.sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  }, [goalAnalysis, goalSortBy]);

  // Portfolio-level pace: at the combined current monthly contribution, how long to
  // fund every remaining goal, and which goals have no funding plan at all.
  const goalsPortfolioPace = useMemo(() => {
    if (goalAnalysis.length === 0) return null;
    const active = goalAnalysis.filter((g) => g.remaining > 0);
    const totalRemaining = active.reduce((s, g) => s + g.remaining, 0);
    const totalMonthly = active.reduce((s, g) => s + (g.monthlyContribution ?? 0), 0);
    const monthsToFundAll = totalMonthly > 0 ? totalRemaining / totalMonthly : null;
    const unfunded = active.filter((g) => !g.monthlyContribution || g.monthlyContribution <= 0);
    return { totalRemaining, totalMonthly, monthsToFundAll, unfunded };
  }, [goalAnalysis]);

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

    const sorted = Array.from(monthMap.entries())
      .sort(([a], [b]) => {
        const [aMonth, aYear] = a.split(" ");
        const [bMonth, bYear] = b.split(" ");
        return (
          new Date(`${aMonth} 1 20${aYear}`).getTime() -
          new Date(`${bMonth} 1 20${bYear}`).getTime()
        );
      })
      .slice(-6);

    return sorted.map(([month, data]) => ({
      month,
      ...Object.fromEntries(
        topCategories.map((cat) => [cat.name, data[cat.name] || 0]),
      ),
    }));
  }, [filteredTransactions, categoryData]);

  const loading = transLoading || budgetLoading || goalsLoading;
  const allCategories = [
    "all",
    ...Array.from(new Set(transactions.map((t) => t.category))),
  ];

  // Compute forecasts (use last 12 months from today so we include your real data)
  const forecastMonthlyData = useMemo(
    () => prepareMonthlyData(transactions, forecastType, 12),
    [transactions, forecastType],
  );

  // Coefficient of variation on recent actuals — a quick, model-agnostic proxy for how
  // "predictable" the series is, used to derive a confidence score alongside the model output.
  const forecastVolatility = useMemo(() => {
    const vals = forecastMonthlyData.map((d) => d.value).filter((v) => v > 0);
    if (vals.length < 2) return null;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (mean <= 0) return null;
    const variance =
      vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / vals.length;
    const stdDev = Math.sqrt(variance);
    return stdDev / mean; // coefficient of variation
  }, [forecastMonthlyData]);

  const forecastConfidence =
    forecastVolatility === null
      ? null
      : Math.max(5, Math.min(97, Math.round(100 - forecastVolatility * 130)));

  // Run every model once so the UI can show how much the methods agree/disagree —
  // the spread between them is itself a signal, independent of any single model's stated bounds.
  const forecastComparison = useMemo(() => {
    if (forecastMonthlyData.length < 3) return null;
    const methods: { key: typeof forecastMethod; label: string; run: () => ForecastResult }[] = [
      { key: "linear", label: "Linear Trend", run: () => linearTrendForecast(forecastMonthlyData, 1) },
      { key: "exponential", label: "Exp. Smoothing", run: () => exponentialSmoothingForecast(forecastMonthlyData, 1) },
      { key: "moving-average", label: "Moving Avg", run: () => movingAverageForecast(forecastMonthlyData, 1) },
      { key: "ensemble", label: "Ensemble", run: () => ensembleForecast(forecastMonthlyData, 1) },
    ];
    const rows = methods.map((m) => ({
      key: m.key,
      label: m.label,
      predicted: m.run().forecasts[0]?.predicted ?? 0,
    }));
    const maxVal = Math.max(1, ...rows.map((r) => r.predicted));
    return { rows, maxVal };
  }, [forecastMonthlyData]);

  const forecastData = useMemo(() => {
    if (transactions.length < 3) return null;

    const monthlyData = forecastMonthlyData;
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
  }, [transactions, forecastMonthlyData, forecastMethod, forecastPeriods]);

  // Top 5 largest expense transactions in filtered period
  const topExpenses = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === "expense")
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [filteredTransactions]);

  // Category MoM comparison (current calendar month vs previous)
  const categoryMoM = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
    const curr: Record<string, number> = {};
    const prev: Record<string, number> = {};
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      const key = t.date.substring(0, 7);
      if (key === thisMonth) curr[t.category] = (curr[t.category] || 0) + t.amount;
      if (key === prevMonth) prev[t.category] = (prev[t.category] || 0) + t.amount;
    });
    const cats = Array.from(new Set([...Object.keys(curr), ...Object.keys(prev)]));
    return cats
      .map((name) => {
        const c = curr[name] || 0;
        const p = prev[name] || 0;
        const delta = p > 0 ? ((c - p) / p) * 100 : null;
        return { name, current: c, prev: p, delta, color: CATEGORY_COLORS[name] || "#6366f1" };
      })
      .filter((x) => x.current > 0 || x.prev > 0)
      .sort((a, b) => b.current - a.current)
      .slice(0, 8);
  }, [transactions]);

  // Category with the single largest MoM swing (by % change) — surfaced as a callout
  const categoryMoMBiggestMover = useMemo(() => {
    const withDelta = categoryMoM.filter((c) => c.delta !== null && c.prev >= 300);
    if (withDelta.length === 0) return null;
    return withDelta.reduce((max, c) =>
      Math.abs(c.delta as number) > Math.abs(max.delta as number) ? c : max,
    );
  }, [categoryMoM]);

  // Monthly savings rate for trends chart
  const savingsRateData = useMemo(() => {
    return monthlyData.map((m) => ({
      month: m.month,
      rate: m.income > 0 ? Math.round(((m.income - m.expenses) / m.income) * 100) : 0,
      income: m.income,
      expenses: m.expenses,
    }));
  }, [monthlyData]);

  // MoM summary table (last 6 months)
  const momSummary = useMemo(() => {
    if (monthlyData.length < 1) return [];
    return monthlyData.slice(-6).map((m, i, arr) => {
      const prev = arr[i - 1];
      const incomeDelta = prev && prev.income > 0 ? ((m.income - prev.income) / prev.income) * 100 : null;
      const expDelta = prev && prev.expenses > 0 ? ((m.expenses - prev.expenses) / prev.expenses) * 100 : null;
      const rate = m.income > 0 ? ((m.income - m.expenses) / m.income) * 100 : 0;
      return { month: m.month, income: m.income, expenses: m.expenses, net: m.net, rate, incomeDelta, expDelta };
    });
  }, [monthlyData]);

  if (loading && transactions.length === 0) {
    return <ListPageSkeleton />;
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
              <TabsTrigger value="insights" className="text-xs px-3">
                Insights
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Section: Income vs Expenses + Spending Summary side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
              {/* Trend chart */}
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Income vs Expenses</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Monthly comparison — {selectedPeriod === "ALL" ? "all time" : `last ${selectedPeriod}`}</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" />Income</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500" />Expenses</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData} barGap={2} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }} formatter={(value: number | undefined) => value !== undefined ? format(value) : format(0)} />
                      <Bar dataKey="income" name="Income" fill="#22c55e" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Spending summary panel */}
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Expense Breakdown</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Category share of total spending</p>
                </CardHeader>
                <CardContent className="pt-3 space-y-2.5">
                  {categoryData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No expense data</p>
                  ) : (
                    <>
                      <div className="relative mx-auto w-33 h-33">
                        <ResponsiveContainer width={132} height={132}>
                          <PieChart>
                            <Pie
                              data={categoryData.slice(0, 8)}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={44}
                              outerRadius={64}
                              paddingAngle={2}
                              strokeWidth={0}
                            >
                              {categoryData.slice(0, 8).map((cat) => (
                                <Cell key={cat.name} fill={cat.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v: unknown) => (typeof v === "number" ? format(v) : "—")}
                              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <p className="font-mono font-bold text-xs">{formatShortInsights(statistics.expenses)}</p>
                          <p className="text-[9px] text-muted-foreground uppercase tracking-widest">total</p>
                        </div>
                      </div>
                      {categoryData.slice(0, 8).map((cat) => (
                        <div key={cat.name}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                              <span className="text-xs font-medium truncate">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-muted-foreground font-mono">{cat.percentage.toFixed(1)}%</span>
                              <span className="text-xs font-semibold font-mono">{format(cat.value)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {categoryData.length > 0 && (
                    <div className="pt-2 border-t border-border flex justify-between text-xs">
                      <span className="text-muted-foreground">{categoryData.length} categories</span>
                      <span className="font-semibold font-mono">{format(statistics.expenses)} total</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Section: Category MoM + Top Expenses side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Category MoM */}
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Category Month-over-Month</p>
                      <p className="text-xs text-muted-foreground mt-0.5">This month vs last · <span className="text-green-600">green = down</span> · <span className="text-red-500">red = up</span></p>
                    </div>
                    {categoryMoMBiggestMover && (
                      <div className="shrink-0 text-right">
                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Biggest mover</p>
                        <p className={`text-[11px] font-semibold inline-flex items-center gap-0.5 ${(categoryMoMBiggestMover.delta as number) > 0 ? "text-red-500" : "text-green-600"}`}>
                          {(categoryMoMBiggestMover.delta as number) > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                          {categoryMoMBiggestMover.name} {Math.abs(categoryMoMBiggestMover.delta as number).toFixed(0)}%
                        </p>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {categoryMoM.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No current/previous month data</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left py-2 px-4 font-medium text-muted-foreground">Category</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Last mo.</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">This mo.</th>
                          <th className="text-right py-2 px-4 font-medium text-muted-foreground">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryMoM.map((cat) => (
                          <tr key={cat.name} className="border-b border-border hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                <span className="font-medium">{cat.name}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{format(cat.prev)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold">{format(cat.current)}</td>
                            <td className="py-2.5 px-4 text-right">
                              {cat.delta !== null ? (
                                <span className={`inline-flex items-center gap-0.5 font-semibold ${cat.delta > 0 ? "text-red-500" : "text-green-500"}`}>
                                  {cat.delta > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                  {Math.abs(cat.delta).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">new</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>

              {/* Top expenses */}
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Biggest Expenses</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Top 5 largest single transactions in this period</p>
                </CardHeader>
                <CardContent className="pt-3">
                  {topExpenses.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No expenses in this period</p>
                  ) : (
                    <div className="space-y-2">
                      {topExpenses.map((t, i) => {
                        const maxAmt = topExpenses[0].amount;
                        const barPct = maxAmt > 0 ? (t.amount / maxAmt) * 100 : 0;
                        return (
                          <div key={t.id} className="rounded-lg bg-muted/30 border border-border px-3 py-2.5">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="text-[10px] font-mono font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[t.category] || "#6366f1" }} />
                              <span className="flex-1 text-xs font-semibold truncate">{t.description || t.category}</span>
                              <span className="font-mono font-bold text-sm text-red-600 dark:text-red-400 shrink-0">{format(t.amount)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: CATEGORY_COLORS[t.category] || "#6366f1", opacity: 0.7 }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {t.category} · {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Section: Key stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Avg Monthly Income", value: format(statistics.avgMonthlyIncome), color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10", icon: <TrendingUp className="h-3.5 w-3.5 text-green-600" /> },
                { label: "Avg Monthly Expense", value: format(statistics.avgMonthlyExpenses), color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", icon: <TrendingDown className="h-3.5 w-3.5 text-red-600" /> },
                { label: "Avg Transaction", value: format(statistics.avgTransactionAmount), color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", icon: <DollarSign className="h-3.5 w-3.5 text-blue-600" /> },
                { label: "Total Transactions", value: String(statistics.transactionCount), color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", icon: <Info className="h-3.5 w-3.5 text-violet-600" /> },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="p-3">
                    <div className={`w-6 h-6 rounded-md ${s.bg} flex items-center justify-center mb-2`}>{s.icon}</div>
                    <p className={`font-mono font-bold text-sm ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            {/* Best/worst month callouts */}
            {bestWorstMonth && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="overflow-hidden">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-950/40 shrink-0">
                      <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Best Month · {bestWorstMonth.best.month}
                      </p>
                      <p className="font-mono font-bold text-sm text-green-600 dark:text-green-400">
                        {bestWorstMonth.best.net >= 0 ? "+" : ""}
                        {format(bestWorstMonth.best.net)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="overflow-hidden">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <div className="p-1.5 rounded-full bg-red-100 dark:bg-red-950/40 shrink-0">
                      <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Toughest Month · {bestWorstMonth.worst.month}
                      </p>
                      <p className={`font-mono font-bold text-sm ${bestWorstMonth.worst.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {bestWorstMonth.worst.net >= 0 ? "+" : ""}
                        {format(bestWorstMonth.worst.net)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* MoM Summary Table — primary element */}
            {momSummary.length > 0 && (
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Month-over-Month Summary</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Last 6 months · arrows = change vs prior month · save % target is 20%+</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="text-green-600 font-medium">≥20% good</span>
                      <span className="text-amber-600 font-medium">10–20% ok</span>
                      <span className="text-red-500 font-medium">&lt;10% low</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Month</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Income</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Expenses</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Net</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground">Save %</th>
                          <th className="text-right py-3 px-4 font-medium text-muted-foreground hidden sm:table-cell">Rate bar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {momSummary.map((row, i) => (
                          <tr key={i} className="border-b border-border hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4 font-semibold">{row.month}</td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {row.incomeDelta !== null && (
                                  <span className={`inline-flex items-center text-[10px] font-medium ${row.incomeDelta >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    {row.incomeDelta >= 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                                    {Math.abs(row.incomeDelta).toFixed(0)}%
                                  </span>
                                )}
                                <span className="font-mono font-semibold text-green-600 dark:text-green-400">{format(row.income)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {row.expDelta !== null && (
                                  <span className={`inline-flex items-center text-[10px] font-medium ${row.expDelta > 0 ? "text-red-500" : "text-green-500"}`}>
                                    {row.expDelta > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                                    {Math.abs(row.expDelta).toFixed(0)}%
                                  </span>
                                )}
                                <span className="font-mono font-semibold text-red-600 dark:text-red-400">{format(row.expenses)}</span>
                              </div>
                            </td>
                            <td className={`py-3 px-4 text-right font-mono font-bold ${row.net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              {row.net >= 0 ? "+" : ""}{format(row.net)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded-full text-[11px] ${row.rate >= 20 ? "bg-green-500/15 text-green-700 dark:text-green-400" : row.rate >= 10 ? "bg-amber-500/15 text-amber-700" : "bg-red-500/15 text-red-700 dark:text-red-400"}`}>
                                {row.rate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 px-4 hidden sm:table-cell">
                              <div className="flex items-center justify-end">
                                <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(Math.max(row.rate, 0), 100)}%`, backgroundColor: row.rate >= 20 ? "#22c55e" : row.rate >= 10 ? "#f59e0b" : "#ef4444" }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 2-col: category trend chart + savings rate chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Category Spend Over Time</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Top 5 categories stacked per month</p>
                </CardHeader>
                <CardContent className="pt-3">
                  {categoryTrends.length === 0 ? (
                    <div className="flex items-center justify-center h-56 text-sm text-muted-foreground">No expense data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={230}>
                      <BarChart data={categoryTrends} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={42} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                        <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const items = (payload as { name: string; value: number; fill: string }[]).filter((p) => p.value > 0);
                          if (!items.length) return null;
                          const total = items.reduce((s, p) => s + p.value, 0);
                          return (
                            <div className="rounded-lg border bg-card p-3 text-xs shadow-md min-w-[150px]">
                              <p className="mb-2 font-semibold">{label}</p>
                              {items.map((e) => <div key={e.name} className="flex items-center gap-2 mb-1"><span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: e.fill }} /><span className="text-muted-foreground flex-1">{e.name}</span><span className="font-mono font-medium">{format(e.value)}</span></div>)}
                              {items.length > 1 && <div className="mt-1 flex justify-between border-t border-border pt-1"><span className="text-muted-foreground">Total</span><span className="font-mono font-semibold">{format(total)}</span></div>}
                            </div>
                          );
                        }} />
                        <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} iconType="circle" iconSize={7} />
                        {categoryData.slice(0, 5).map((cat, i, arr) => (
                          <Bar key={cat.name} dataKey={cat.name} stackId="a" fill={cat.color} radius={i === arr.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Monthly Savings Rate</p>
                      <p className="text-xs text-muted-foreground mt-0.5">% of income kept after expenses</p>
                    </div>
                    <span className="text-[10px] text-green-600 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">20% target</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  {savingsRateData.length === 0 ? (
                    <div className="flex items-center justify-center h-56 text-sm text-muted-foreground">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={230}>
                      <ComposedChart data={savingsRateData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                        <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="4 4" label={{ value: "20%", position: "right", fontSize: 10, fill: "#22c55e" }} />
                        <ReferenceLine y={0} stroke="var(--foreground)" strokeOpacity={0.2} />
                        <Tooltip formatter={(v: number | undefined) => [v !== undefined ? `${v}%` : "—", "Savings rate"]} contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }} />
                        <Area type="monotone" dataKey="rate" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} name="Savings rate" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Net cashflow chart */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Net Cash Flow</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Income minus expenses per month · <span className="text-green-600 font-medium">green = surplus</span> · <span className="text-red-500 font-medium">red = deficit</span> · <span className="text-indigo-500 font-medium">dashed line = 3-mo avg</span>
                </p>
              </CardHeader>
              <CardContent className="pt-3">
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={monthlyDataWithRollingAvg} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <ReferenceLine y={0} stroke="var(--foreground)" strokeOpacity={0.25} strokeWidth={1} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0]?.payload as { net: number; income: number; expenses: number; rollingNet: number };
                      if (!row) return null;
                      return (
                        <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
                          <p className="font-semibold mb-1">{label}</p>
                          <p className="text-muted-foreground">Income: <span className="text-green-600 font-mono">{format(row.income)}</span></p>
                          <p className="text-muted-foreground">Expenses: <span className="text-red-600 font-mono">{format(row.expenses)}</span></p>
                          <p className={`mt-1 pt-1 border-t font-medium ${row.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                            Net: {format(row.net)} <span className="text-muted-foreground font-normal">({row.net >= 0 ? "surplus" : "deficit"})</span>
                          </p>
                          <p className="text-indigo-500 font-mono text-[11px] mt-0.5">3-mo avg: {format(row.rollingNet)}</p>
                        </div>
                      );
                    }} />
                    <Bar dataKey="net" radius={[4, 4, 4, 4]} maxBarSize={44}>
                      {monthlyDataWithRollingAvg.map((entry, index) => (
                        <Cell key={`net-${index}`} fill={entry.net >= 0 ? "#22c55e" : "#ef4444"} />
                      ))}
                    </Bar>
                    <Line
                      type="monotone"
                      dataKey="rollingNet"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={false}
                      name="3-mo avg"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-4">
            {goalAnalysis.length > 0 && goalsTabStats ? (
              <>
                {/* KPI strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Combined Target", value: format(goalsTabStats.totalTarget), color: "text-foreground", bg: "bg-muted/50", sub: `${goalAnalysis.length} active goals` },
                    { label: "Total Saved", value: format(goalsTabStats.totalCurrent), color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10", sub: `${((goalsTabStats.totalCurrent / Math.max(goalsTabStats.totalTarget, 1)) * 100).toFixed(1)}% of all targets` },
                    { label: "Avg Completion", value: `${goalsTabStats.avgPct.toFixed(1)}%`, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10", sub: "across all goals" },
                    { label: "Pace Status", value: goalsTabStats.behind > 0 ? `${goalsTabStats.behind} behind` : "All on track", color: goalsTabStats.behind > 0 ? "text-orange-600" : "text-green-600 dark:text-green-400", bg: goalsTabStats.behind > 0 ? "bg-orange-500/10" : "bg-green-500/10", sub: goalsTabStats.behind > 0 ? "need to increase savings" : "keep it up" },
                  ].map((s) => (
                    <Card key={s.label} className="overflow-hidden">
                      <CardContent className={`p-4 ${s.bg}`}>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                        <p className={`font-mono text-base font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.sub}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Portfolio pace */}
                {goalsPortfolioPace && (
                  <Card className="overflow-hidden">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-950/40 shrink-0">
                          <Gauge className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Portfolio Pace
                          </p>
                          {goalsPortfolioPace.monthsToFundAll !== null ? (
                            <p className="text-sm">
                              At{" "}
                              <span className="font-mono font-semibold">
                                {format(goalsPortfolioPace.totalMonthly)}/mo
                              </span>{" "}
                              combined, all goals are funded in{" "}
                              <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                ~{Math.ceil(goalsPortfolioPace.monthsToFundAll)} months
                              </span>
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No monthly contribution plan set on any goal yet
                            </p>
                          )}
                        </div>
                      </div>
                      {goalsPortfolioPace.unfunded.length > 0 && (
                        <span className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-400">
                          {goalsPortfolioPace.unfunded.length} goal
                          {goalsPortfolioPace.unfunded.length === 1 ? "" : "s"} with no funding plan
                        </span>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Goal cards grid */}
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">
                    Sort
                  </span>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    {(
                      [
                        { key: "deadline", label: "Deadline" },
                        { key: "progress", label: "Progress" },
                        { key: "pace", label: "Behind first" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setGoalSortBy(opt.key)}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${goalSortBy === opt.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {goalsSorted.map((goal) => {
                    const projectedMonths = goal.monthlyContribution && goal.monthlyContribution > 0 && goal.remaining > 0
                      ? Math.ceil(goal.remaining / goal.monthlyContribution) : null;
                    const projectedDate = projectedMonths !== null
                      ? new Date(Date.now() + projectedMonths * 30 * 86400000).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : null;
                    const deadline = new Date(goal.targetDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                    const statusCfg = {
                      behind: { label: "Behind pace", cls: "bg-orange-500/15 text-orange-700 dark:text-orange-400", bar: "#f97316" },
                      ahead: { label: "Ahead of pace", cls: "bg-green-500/15 text-green-700 dark:text-green-400", bar: "#22c55e" },
                      on_track: { label: "On track", cls: "bg-blue-500/15 text-blue-700 dark:text-blue-400", bar: "#3b82f6" },
                      unknown: { label: "Set monthly plan", cls: "bg-muted text-muted-foreground", bar: "#6366f1" },
                    }[goal.paceStatus];
                    const pct = Math.min(goal.percentage, 100);
                    return (
                      <Card key={goal.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{goal.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" />
                                Due {deadline}{goal.daysLeft > 0 ? ` · ${goal.daysLeft}d left` : goal.remaining > 0 ? " · overdue" : ""}
                              </p>
                            </div>
                            <span className={`text-[10px] shrink-0 px-2 py-0.5 rounded-full font-semibold ${statusCfg.cls}`}>{statusCfg.label}</span>
                          </div>

                          {/* Progress bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>{format(goal.current)} saved</span>
                              <span className="font-semibold text-foreground">{pct.toFixed(1)}%</span>
                              <span>{format(goal.target)} target</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: statusCfg.bar }} />
                            </div>
                          </div>

                          {/* Detail row */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-md bg-muted/40 px-2.5 py-2">
                              <p className="text-[10px] text-muted-foreground">Still needed</p>
                              <p className="font-mono font-semibold mt-0.5">{format(Math.max(goal.remaining, 0))}</p>
                            </div>
                            <div className="rounded-md bg-muted/40 px-2.5 py-2">
                              <p className="text-[10px] text-muted-foreground">
                                {projectedDate ? "Est. completion" : "Required/mo"}
                              </p>
                              <p className="font-mono font-semibold mt-0.5">
                                {goal.remaining <= 0 ? "✓ Done" : projectedDate ?? (goal.paceNeeded > 0 ? format(goal.paceNeeded) : "—")}
                              </p>
                            </div>
                            {goal.paceNeeded > 0 && goal.remaining > 0 && (
                              <div className="rounded-md bg-muted/40 px-2.5 py-2">
                                <p className="text-[10px] text-muted-foreground">Need/mo to hit date</p>
                                <p className="font-mono font-semibold mt-0.5">{format(goal.paceNeeded)}</p>
                              </div>
                            )}
                            {goal.monthlyContribution != null && goal.monthlyContribution > 0 && (
                              <div className="rounded-md bg-muted/40 px-2.5 py-2">
                                <p className="text-[10px] text-muted-foreground">Current plan/mo</p>
                                <p className="font-mono font-semibold mt-0.5">{format(goal.monthlyContribution)}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Portfolio summary table */}
                <Card>
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Goals Portfolio Summary</p>
                    <p className="text-xs text-muted-foreground mt-0.5">All goals sorted by deadline with funding status</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Goal</th>
                            <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Saved</th>
                            <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Target</th>
                            <th className="text-right py-2.5 px-3 font-medium text-muted-foreground">Progress</th>
                            <th className="text-right py-2.5 px-3 font-medium text-muted-foreground hidden sm:table-cell">Deadline</th>
                            <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {goalsSorted.map((g) => (
                            <tr key={g.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                              <td className="py-2.5 px-4 font-medium max-w-32 truncate">{g.title}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-green-600 dark:text-green-400">{format(g.current)}</td>
                              <td className="py-2.5 px-3 text-right font-mono">{format(g.target)}</td>
                              <td className="py-2.5 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(g.percentage, 100)}%`, backgroundColor: g.paceStatus === "behind" ? "#f97316" : g.paceStatus === "ahead" ? "#22c55e" : "#3b82f6" }} />
                                  </div>
                                  <span className="font-mono font-semibold w-9 text-right">{g.percentage.toFixed(0)}%</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right text-muted-foreground hidden sm:table-cell">
                                {new Date(g.targetDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <span className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[10px] ${{ behind: "bg-orange-500/15 text-orange-700 dark:text-orange-400", ahead: "bg-green-500/15 text-green-700 dark:text-green-400", on_track: "bg-blue-500/15 text-blue-700 dark:text-blue-400", unknown: "bg-muted text-muted-foreground" }[g.paceStatus]}`}>
                                  {{ behind: "Behind", ahead: "Ahead", on_track: "On track", unknown: "No plan" }[g.paceStatus]}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-base font-semibold text-foreground mb-1">No Active Goals</p>
                  <p className="text-muted-foreground text-sm">Set financial goals to track your progress here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-2.5">
            {/* Hero */}
            <div className="rounded-xl bg-slate-900 dark:bg-black text-white overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400">
                      Forecast Engine
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      Projecting {forecastType === "expense" ? "spending" : "income"} from{" "}
                      {forecastMonthlyData.length} months of history
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 shrink-0">
                  {(["expense", "income"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setForecastType(t)}
                      className={`text-[11px] px-3 py-1 rounded-md font-medium transition-colors ${forecastType === t ? "bg-white text-slate-900" : "text-slate-400 hover:text-white"}`}
                    >
                      {t === "expense" ? "Expenses" : "Income"}
                    </button>
                  ))}
                </div>
              </div>

              {forecastData ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-800">
                  <div className="px-5 py-3.5">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                      Next Month
                    </p>
                    <p className="font-mono text-lg font-bold">
                      {format(forecastData.forecasts[0]?.predicted ?? 0)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {format(forecastData.forecasts[0]?.lower ?? 0)} –{" "}
                      {format(forecastData.forecasts[0]?.upper ?? 0)}
                    </p>
                  </div>
                  <div className="px-5 py-3.5">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                      Trend
                    </p>
                    {(() => {
                      const good = isTrendFavorable(forecastData.trend, forecastType);
                      const color =
                        good === null
                          ? "text-slate-300"
                          : good
                            ? "text-green-400"
                            : "text-red-400";
                      return (
                        <p className={`font-mono text-lg font-bold capitalize flex items-center gap-1 ${color}`}>
                          {forecastData.trend === "increasing" && (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                          {forecastData.trend === "decreasing" && (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          {forecastData.trend}
                        </p>
                      );
                    })()}
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {forecastData.method}
                    </p>
                  </div>
                  <div className="px-5 py-3.5">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                      Confidence
                    </p>
                    <p
                      className={`font-mono text-lg font-bold ${
                        forecastConfidence === null
                          ? "text-slate-300"
                          : forecastConfidence >= 70
                            ? "text-green-400"
                            : forecastConfidence >= 40
                              ? "text-amber-400"
                              : "text-red-400"
                      }`}
                    >
                      {forecastConfidence === null ? "—" : `${forecastConfidence}%`}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      from recent volatility
                    </p>
                  </div>
                  <div className="px-5 py-3.5">
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                      Seasonality
                    </p>
                    <p
                      className={`font-mono text-lg font-bold ${forecastData.seasonality ? "text-blue-400" : "text-slate-300"}`}
                    >
                      {forecastData.seasonality ? "Detected" : "None"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      12-month autocorrelation
                    </p>
                  </div>
                </div>
              ) : (
                <div className="px-5 py-6 text-center text-xs text-slate-400">
                  Need at least 3 months of transaction data to generate forecasts
                </div>
              )}
            </div>

            {/* Controls */}
            <Card className="overflow-hidden">
              <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1 shrink-0">
                    Model
                  </span>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1 flex-wrap">
                    {FORECAST_METHODS.map((m) => (
                      <button
                        key={m.key}
                        onClick={() => setForecastMethod(m.key)}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${forecastMethod === m.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground mr-1">
                    Horizon
                  </span>
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    {[3, 6, 12].map((p) => (
                      <button
                        key={p}
                        onClick={() => setForecastPeriods(p)}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${forecastPeriods === p ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {p}mo
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {forecastData ? (
              <>
                {/* Model agreement */}
                {forecastComparison && (
                  <Card>
                    <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Layers className="h-3 w-3" /> Model Agreement — Next Month
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        How each method independently predicts next month. A wide
                        spread means less certainty; tap a row to switch models.
                      </p>
                    </CardHeader>
                    <CardContent className="px-4 py-3 space-y-2">
                      {forecastComparison.rows.map((row) => {
                        const pct = (row.predicted / forecastComparison.maxVal) * 100;
                        const active = row.key === forecastMethod;
                        return (
                          <button
                            key={row.key}
                            onClick={() => setForecastMethod(row.key)}
                            className="grid items-center gap-2 w-full text-left group"
                            style={{ gridTemplateColumns: "104px minmax(0,1fr) 84px" }}
                          >
                            <span
                              className={`text-[11px] truncate ${active ? "font-semibold text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                            >
                              {row.label}
                            </span>
                            <span className="h-2 rounded-full bg-muted overflow-hidden">
                              <span
                                className={`block h-full rounded-full transition-all ${active ? "bg-indigo-500" : "bg-muted-foreground/40"}`}
                                style={{ width: `${Math.max(2, pct)}%` }}
                              />
                            </span>
                            <span className="font-mono text-[11px] text-right tabular-nums">
                              {format(row.predicted)}
                            </span>
                          </button>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Forecast Chart */}
                <Card>
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4 flex flex-row items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Historical Data & Forecast
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Solid blue = actual. Dashed orange = predicted. Shaded band
                        = confidence interval.
                      </p>
                    </div>
                    <span
                      title="Predicted = single best guess. Lower/Upper bound = worst/best case. Range = how wide that band is — bigger range means more uncertainty."
                      className="shrink-0 mt-0.5"
                    >
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={380}>
                      <ComposedChart data={forecastData.chartData}>
                        <defs>
                          <linearGradient id="forecastBandGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#fb923c" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#fb923c" stopOpacity={0.08} />
                          </linearGradient>
                          <linearGradient id="forecastActualGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
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
                            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
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
                        <Area
                          type="monotone"
                          dataKey="actual"
                          stroke="none"
                          fill="url(#forecastActualGrad)"
                          isAnimationActive={false}
                          legendType="none"
                        />

                        {/* Historical data (blue) */}
                        <Line
                          type="monotone"
                          dataKey="actual"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6", r: 3 }}
                          activeDot={{ r: 5 }}
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
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                          name="Forecast"
                        />

                        {/* Avg expense reference line */}
                        {statistics.avgMonthlyExpenses > 0 && (
                          <ReferenceLine
                            y={statistics.avgMonthlyExpenses}
                            stroke="#6366f1"
                            strokeDasharray="4 2"
                            label={{ value: "Avg", position: "right", fontSize: 10, fill: "#6366f1" }}
                          />
                        )}

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
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Predicted value per month, plus the confidence band and how
                      wide it is (bar = relative range width).
                    </p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/40">
                            <th className="text-left py-2 px-4 font-medium text-muted-foreground">
                              Month
                            </th>
                            <th
                              className="text-right py-2 px-4 font-medium text-muted-foreground"
                              title="Most likely forecast for that month"
                            >
                              Predicted
                            </th>
                            <th
                              className="text-right py-2 px-4 font-medium text-muted-foreground hidden sm:table-cell"
                              title="Minimum expected value in the confidence interval"
                            >
                              Lower
                            </th>
                            <th
                              className="text-right py-2 px-4 font-medium text-muted-foreground hidden sm:table-cell"
                              title="Maximum expected value in the confidence interval"
                            >
                              Upper
                            </th>
                            <th
                              className="text-left py-2 px-4 font-medium text-muted-foreground"
                              title="Half the width of the confidence interval (± around predicted)"
                            >
                              Range
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const maxRange = Math.max(
                              1,
                              ...forecastData.forecasts.map(
                                (f) => f.upper - f.lower,
                              ),
                            );
                            return forecastData.forecasts.map((forecast, idx) => {
                              const range = forecast.upper - forecast.lower;
                              const rangePct = (range / maxRange) * 100;
                              return (
                                <tr
                                  key={idx}
                                  className="border-b border-border/60 hover:bg-muted/30"
                                >
                                  <td className="py-2 px-4">
                                    {new Date(forecast.date).toLocaleDateString(
                                      "en-US",
                                      { month: "long", year: "numeric" },
                                    )}
                                  </td>
                                  <td className="text-right py-2 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                                    {format(forecast.predicted)}
                                  </td>
                                  <td className="text-right py-2 px-4 font-mono text-muted-foreground hidden sm:table-cell">
                                    {format(forecast.lower)}
                                  </td>
                                  <td className="text-right py-2 px-4 font-mono text-muted-foreground hidden sm:table-cell">
                                    {format(forecast.upper)}
                                  </td>
                                  <td className="py-2 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                                        <div
                                          className="h-full rounded-full bg-orange-400"
                                          style={{ width: `${Math.max(4, rangePct)}%` }}
                                        />
                                      </div>
                                      <span className="font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                                        ±{format(range / 2)}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Insights */}
                <Card>
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Gauge className="h-3 w-3" /> Insights
                    </p>
                  </CardHeader>
                  <CardContent className="px-4 py-3 space-y-2">
                    {forecastData.trend === "increasing" && forecastType === "expense" && (
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-red-100 dark:bg-red-950/40 rounded-full shrink-0">
                          <TrendingUp className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Rising expenses.
                          </span>{" "}
                          Spending is trending upward — review your budget and
                          look for areas to cut back.
                        </p>
                      </div>
                    )}

                    {forecastData.trend === "decreasing" && forecastType === "expense" && (
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-green-100 dark:bg-green-950/40 rounded-full shrink-0">
                          <TrendingDown className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Great progress.
                          </span>{" "}
                          Spending is trending downward — keep up the good
                          habits.
                        </p>
                      </div>
                    )}

                    {forecastData.seasonality && (
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-950/40 rounded-full shrink-0">
                          <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Seasonal pattern found.
                          </span>{" "}
                          Your {forecastType} shows seasonal variation — plan
                          ahead for months with higher predicted values.
                        </p>
                      </div>
                    )}

                    {forecastComparison && (
                      <div className="flex items-start gap-2.5">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-950/40 rounded-full shrink-0">
                          <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Model spread.
                          </span>{" "}
                          {(() => {
                            const vals = forecastComparison.rows.map((r) => r.predicted);
                            const lo = Math.min(...vals);
                            const hi = Math.max(...vals);
                            const spreadPct = lo > 0 ? ((hi - lo) / lo) * 100 : 0;
                            return spreadPct < 10
                              ? `All four models agree closely (±${spreadPct.toFixed(0)}%) — this forecast is fairly stable.`
                              : `Models disagree by about ${spreadPct.toFixed(0)}% between ${format(lo)} and ${format(hi)} — treat this forecast as directional.`;
                          })()}
                        </p>
                      </div>
                    )}

                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full shrink-0">
                        <Target className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {forecastData.method}
                        </span>{" "}
                        provides predictions with 95% confidence intervals — a
                        wider band on the chart means more uncertainty for that
                        month.
                      </p>
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
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-4">
            <InsightsTabContent transactions={transactions} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ── Insights tab (formerly /insights page) ───────────────────────────────────
const INSIGHTS_CATEGORY_COLORS: Record<string, string> = {
  Food: "#ef4444", Transportation: "#f97316", Entertainment: "#f59e0b",
  Bills: "#eab308", Shopping: "#84cc16", Healthcare: "#22c55e",
  Savings: "#10b981", Investment: "#14b8a6", Education: "#06b6d4",
  Travel: "#0ea5e9", Other: "#6366f1", Salary: "#22c55e",
  Freelance: "#3b82f6", Business: "#8b5cf6", Gift: "#a855f7",
};

function formatShortInsights(value: number): string {
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

function InsightsTabContent({ transactions }: { transactions: Transaction[] }) {
  const { format } = useFormatCurrency();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const now = useMemo(() => new Date(), []);

  const currentMonthTxns = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [transactions, now]);

  const currentIncome = useMemo(() => currentMonthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0), [currentMonthTxns]);
  const currentExpenses = useMemo(() => currentMonthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0), [currentMonthTxns]);
  const currentInvested = useMemo(() => currentMonthTxns.filter((t) => t.category === "Investment" || t.category === "Savings" || t.subtype === "investment").reduce((s, t) => s + t.amount, 0), [currentMonthTxns]);
  const surplus = currentIncome - currentExpenses;
  const incomeEntries = currentMonthTxns.filter((t) => t.type === "income").length;
  const expenseEntries = currentMonthTxns.filter((t) => t.type === "expense").length;
  const surplusRate = currentIncome > 0 ? ((surplus / currentIncome) * 100).toFixed(1) : null;
  const currentMonthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Days elapsed this month with zero logged expenses — a small gamified discipline metric
  const noSpendDays = useMemo(() => {
    const daysElapsed = now.getDate();
    const spentDays = new Set(
      currentMonthTxns
        .filter((t) => t.type === "expense")
        .map((t) => new Date(t.date).getDate()),
    );
    return Math.max(0, daysElapsed - spentDays.size);
  }, [currentMonthTxns, now]);

  const sixMonthData = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {};
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 6);
    transactions.forEach((t) => {
      const d = new Date(t.date); if (d < cutoff) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!months[key]) months[key] = { income: 0, expenses: 0 };
      if (t.type === "income") months[key].income += t.amount;
      else months[key].expenses += t.amount;
    });
    return Object.values(months);
  }, [transactions]);

  const avgMonthlyIncome = sixMonthData.length > 0 ? sixMonthData.reduce((s, m) => s + m.income, 0) / sixMonthData.length : 0;
  const avgMonthlyExpense = sixMonthData.length > 0 ? sixMonthData.reduce((s, m) => s + m.expenses, 0) / sixMonthData.length : 0;

  const cashflowData = useMemo(() => {
    const months: Record<string, { label: string; income: number; expenses: number }> = {};
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 5); cutoff.setDate(1);
      if (d < cutoff) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      if (!months[key]) months[key] = { label, income: 0, expenses: 0 };
      if (t.type === "income") months[key].income += t.amount;
      else months[key].expenses += t.amount;
    });
    return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    currentMonthTxns.filter((t) => t.type === "expense").forEach((t) => { cats[t.category] = (cats[t.category] || 0) + t.amount; });
    return Object.entries(cats).sort(([, a], [, b]) => b - a).map(([name, amount]) => ({ name, amount }));
  }, [currentMonthTxns]);

  const totalExpenseCats = categoryBreakdown.reduce((s, c) => s + c.amount, 0);

  // Top merchants by spend (last 3 months, by description)
  const topMerchants = useMemo(() => {
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 3);
    const map: Record<string, { amount: number; count: number; category: string }> = {};
    transactions
      .filter((t) => t.type === "expense" && new Date(t.date) >= cutoff && t.description)
      .forEach((t) => {
        const key = t.description.trim().toLowerCase();
        if (!map[key]) map[key] = { amount: 0, count: 0, category: t.category };
        map[key].amount += t.amount;
        map[key].count += 1;
      });
    return Object.entries(map)
      .map(([name, d]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), ...d }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [transactions]);

  // Savings rate trend (last 6 months)
  const savingsRateTrend = useMemo(() => {
    const months: Record<string, { label: string; income: number; expenses: number; sortKey: string }> = {};
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 6); cutoff.setDate(1);
    transactions.forEach((t) => {
      const d = new Date(t.date); if (d < cutoff) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) months[key] = { label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }), income: 0, expenses: 0, sortKey: key };
      if (t.type === "income") months[key].income += t.amount;
      else months[key].expenses += t.amount;
    });
    return Object.values(months)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map((m) => ({ label: m.label, rate: m.income > 0 ? Math.round(((m.income - m.expenses) / m.income) * 100) : 0 }));
  }, [transactions]);

  // Day-of-week spending pattern (last 3 months)
  const dowPattern = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const totals: number[] = new Array(7).fill(0);
    const counts: Set<string>[] = Array.from({ length: 7 }, () => new Set());
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 3);
    transactions.filter((t) => t.type === "expense" && new Date(t.date) >= cutoff).forEach((t) => {
      const d = new Date(t.date);
      const dow = d.getDay();
      totals[dow] += t.amount;
      counts[dow].add(t.date.substring(0, 10));
    });
    return days.map((day, i) => ({ day, amount: counts[i].size > 0 ? Math.round(totals[i] / counts[i].size) : 0 }));
  }, [transactions]);

  // Spending anomalies — transactions > 2× their category average (last 30 days)
  const anomalies = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const recent = transactions.filter((t) => t.type === "expense" && new Date(t.date) >= cutoff);
    const allExpenses = transactions.filter((t) => t.type === "expense");
    const catAvg: Record<string, number> = {};
    const catCount: Record<string, number> = {};
    allExpenses.forEach((t) => {
      catAvg[t.category] = (catAvg[t.category] || 0) + t.amount;
      catCount[t.category] = (catCount[t.category] || 0) + 1;
    });
    Object.keys(catAvg).forEach((k) => { catAvg[k] = catAvg[k] / catCount[k]; });
    return recent
      .filter((t) => catAvg[t.category] && t.amount > catAvg[t.category] * 2)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((t) => ({ ...t, avg: catAvg[t.category], multiple: t.amount / catAvg[t.category] }));
  }, [transactions]);

  return (
    <div className="space-y-4">
      {/* Month stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          {
            label: "Income",
            value: format(currentIncome),
            sub: `${incomeEntries} entries`,
            color: "text-green-600 dark:text-green-400",
            delta: avgMonthlyIncome > 0 ? ((currentIncome - avgMonthlyIncome) / avgMonthlyIncome) * 100 : null,
            deltaGood: true,
          },
          {
            label: "Expenses",
            value: format(currentExpenses),
            sub: `${expenseEntries} entries`,
            color: "text-red-600 dark:text-red-400",
            delta: avgMonthlyExpense > 0 ? ((currentExpenses - avgMonthlyExpense) / avgMonthlyExpense) * 100 : null,
            deltaGood: false,
          },
          { label: "Invested", value: currentInvested > 0 ? format(currentInvested) : "—", sub: currentInvested === 0 ? 'Use "Investment" category' : currentMonthLabel, color: "text-blue-600 dark:text-blue-400", delta: null, deltaGood: true },
          { label: "Surplus", value: `${surplus < 0 ? "-" : ""}${format(Math.abs(surplus))}`, sub: surplusRate ? `${surplusRate}% saved` : "No income logged", color: surplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400", delta: null, deltaGood: true },
          { label: "No-Spend Days", value: String(noSpendDays), sub: `of ${now.getDate()} days so far`, color: noSpendDays > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground", delta: null, deltaGood: true },
        ].map(({ label, value, sub, color, delta, deltaGood }) => (
          <Card key={label}>
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
              <p className={`font-mono font-semibold text-sm ${color}`}>{value}</p>
              {delta !== null ? (
                <p className={`text-[10px] mt-0.5 inline-flex items-center gap-0.5 font-medium ${(delta > 0) === deltaGood ? "text-green-600 dark:text-green-400" : delta === 0 ? "text-muted-foreground" : "text-red-500"}`}>
                  {delta > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : delta < 0 ? <ArrowDownRight className="h-2.5 w-2.5" /> : null}
                  {Math.abs(delta).toFixed(0)}% vs 6-mo avg
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 6-month averages */}
      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-950/40 shrink-0">
              <TrendingUp className="h-3.5 w-3.5 text-green-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Avg Monthly Income</p>
              <p className="font-mono font-semibold text-sm text-green-600 dark:text-green-400">{format(avgMonthlyIncome)}</p>
              <p className="text-[10px] text-muted-foreground">6-month average</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="p-1.5 rounded-full bg-red-100 dark:bg-red-950/40 shrink-0">
              <TrendingDown className="h-3.5 w-3.5 text-red-600" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Avg Monthly Expense</p>
              <p className="font-mono font-semibold text-sm text-red-600 dark:text-red-400">{format(avgMonthlyExpense)}</p>
              <p className="text-[10px] text-muted-foreground">6-month average</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Cashflow chart */}
      <Card>
        <CardHeader className="pb-2 border-b border-border px-4 pt-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {cashflowData.length}-Month Cashflow · Income vs Expenses
          </p>
        </CardHeader>
        <CardContent>
          {cashflowData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No transaction data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cashflowData} barCategoryGap="30%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatShortInsights(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  formatter={(value: number | undefined) => [value !== undefined ? format(value) : "₹0"]}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Day-of-week pattern */}
      <Card>
        <CardHeader className="pb-2 border-b border-border px-4 pt-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Spending by Day of Week</p>
          <p className="text-xs text-muted-foreground mt-0.5">Average spend per day — last 3 months</p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dowPattern} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatShortInsights(v)} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} formatter={(v: number | undefined) => [v !== undefined ? format(v) : "₹0", "Avg spend"]} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {dowPattern.map((entry, i) => (
                  <Cell key={i} fill={entry.amount === Math.max(...dowPattern.map((d) => d.amount)) ? "#ef4444" : "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Spending anomalies */}
      {anomalies.length > 0 && (
        <Card className="border-orange-400/40">
          <CardHeader className="pb-2 border-b border-border px-4 pt-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Spending Anomalies</p>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Transactions in the last 30 days that are 2× above their category average</p>
          </CardHeader>
          <CardContent className="pt-3 space-y-2">
            {anomalies.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 px-3 py-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: INSIGHTS_CATEGORY_COLORS[t.category] ?? "#6366f1" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description || t.category}</p>
                  <p className="text-[10px] text-muted-foreground">{t.category} · avg {format(t.avg)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-semibold text-sm text-orange-600">{format(t.amount)}</p>
                  <p className="text-[10px] text-muted-foreground">{t.multiple.toFixed(1)}× avg</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Category breakdown */}
      <Card>
        <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setCategoryOpen((v) => !v)}>
          <div className="flex items-center gap-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Category Breakdown</p>
            <span className="text-[10px] text-muted-foreground">· {currentMonthLabel}</span>
          </div>
          <Info className="h-4 w-4 text-muted-foreground" />
        </button>
        {categoryOpen && (
          <CardContent className="pt-0 pb-4 px-4">
            {categoryBreakdown.length === 0 ? (
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center py-6">No expenses this month</p>
            ) : (
              <div className="space-y-3">
                {categoryBreakdown.map(({ name, amount }) => {
                  const pct = totalExpenseCats > 0 ? (amount / totalExpenseCats) * 100 : 0;
                  const color = INSIGHTS_CATEGORY_COLORS[name] ?? INSIGHTS_CATEGORY_COLORS["Other"];
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                          <span className="font-medium text-sm">{name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] text-muted-foreground">{pct.toFixed(1)}%</span>
                          <span className="font-mono font-semibold text-sm">{format(amount)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Savings rate trend */}
      {savingsRateTrend.length > 1 && (
        <Card>
          <CardHeader className="pb-2 border-b border-border px-4 pt-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Savings Rate Trend</p>
            <p className="text-xs text-muted-foreground mt-0.5">% of income saved each month · last 6 months</p>
          </CardHeader>
          <CardContent className="pt-3 px-4 pb-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={savingsRateTrend} barCategoryGap="40%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <ReferenceLine y={15} stroke="#22c55e" strokeDasharray="4 2" label={{ value: "15% target", fontSize: 10, fill: "#22c55e", position: "right" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} formatter={(v: number | undefined) => [`${v ?? 0}%`, "Savings rate"]} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {savingsRateTrend.map((entry, i) => (
                    <Cell key={i} fill={entry.rate >= 15 ? "#22c55e" : entry.rate >= 0 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top merchants */}
      {topMerchants.length > 0 && (
        <Card>
          <CardHeader className="pb-2 border-b border-border px-4 pt-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Top Merchants</p>
            <p className="text-xs text-muted-foreground mt-0.5">Where your money goes · last 3 months</p>
          </CardHeader>
          <CardContent className="pt-3 px-4 pb-4 space-y-2">
            {topMerchants.map(({ name, amount, count, category }, i) => {
              const max = topMerchants[0].amount;
              const pct = max > 0 ? (amount / max) * 100 : 0;
              const color = INSIGHTS_CATEGORY_COLORS[category] ?? "#6366f1";
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-muted-foreground w-4 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium truncate max-w-[180px]">{name}</span>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-[10px] text-muted-foreground">{count}×</span>
                        <span className="font-mono text-sm font-semibold">{format(amount)}</span>
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
