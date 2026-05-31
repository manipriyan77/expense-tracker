"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  ArrowRight,
  Trophy,
  CreditCard,
  Landmark,
  CalendarClock,
  ReceiptText,
  Lightbulb,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Brain,
  TrendingUpIcon,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactionsStore } from "@/store/transactions-store";
import { useRecurringPatternsStore } from "@/store/recurring-patterns-store";
import { useBudgetsStore } from "@/store/budgets-store";
import { useGoalsStore } from "@/store/goals-store";
import { useDebtTrackerStore } from "@/store/debt-tracker-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { ListPageSkeleton } from "@/components/ui/skeleton";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function shortAmount(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
}

export default function CashflowPlanningPage() {
  const { format } = useFormatCurrency();
  const { transactions, loading, fetchTransactions } = useTransactionsStore();
  const { patterns, fetchPatterns } = useRecurringPatternsStore();
  const { budgets, fetchBudgets } = useBudgetsStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { debts, fetchDebts } = useDebtTrackerStore();

  // Forecast scenario controls
  const [scenarioIncomeBoost, setScenarioIncomeBoost] = useState(0); // % boost
  const [scenarioExtraExpense, setScenarioExtraExpense] = useState(0); // flat extra/mo

  // Smart Calculator state
  type CalcItem = { id: string; name: string; amount: number; type: "income" | "expense" };
  type CustomGoal = { id: string; name: string; target: number; current: number; deadline: string };
  const [calcIncomeOverride, setCalcIncomeOverride] = useState<string>("");
  const [calcExpenseOverride, setCalcExpenseOverride] = useState<string>("");
  const [calcItems, setCalcItems] = useState<CalcItem[]>([]);
  const [calcItemForm, setCalcItemForm] = useState({ name: "", amount: "", type: "expense" as "income" | "expense" });
  const [customGoals, setCustomGoals] = useState<CustomGoal[]>([]);
  const [customGoalForm, setCustomGoalForm] = useState({ name: "", target: "", current: "", deadline: "" });
  const [returnRate, setReturnRate] = useState(12);
  const [extraDebtPayment, setExtraDebtPayment] = useState(0);

  useEffect(() => {
    fetchTransactions();
    fetchPatterns();
    fetchBudgets();
    fetchGoals();
    fetchDebts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthLabel = now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  // ── Current month ──────────────────────────────────────
  const currentMonthTxns = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }),
    [transactions, currentMonth, currentYear],
  );

  const currentIncome = useMemo(
    () =>
      currentMonthTxns
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
    [currentMonthTxns],
  );

  const currentExpenses = useMemo(
    () =>
      currentMonthTxns
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [currentMonthTxns],
  );

  const surplus = currentIncome - currentExpenses;
  const savingsRate =
    currentIncome > 0 ? ((surplus / currentIncome) * 100).toFixed(1) : null;

  // ── 6-month chart ──────────────────────────────────────
  const cashflowData = useMemo(() => {
    const months: Record<
      string,
      { label: string; Income: number; Expenses: number }
    > = {};
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 5);
      cutoff.setDate(1);
      if (d < cutoff) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      if (!months[key]) months[key] = { label, Income: 0, Expenses: 0 };
      if (t.type === "income") months[key].Income += t.amount;
      else months[key].Expenses += t.amount;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [transactions]);

  // ── Recent transactions ───────────────────────────────
  const recentTxns = useMemo(
    () =>
      transactions
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6),
    [transactions],
  );

  // ── Upcoming recurring ────────────────────────────────
  const upcomingRecurring = useMemo(
    () =>
      patterns
        .filter((p) => p.is_active)
        .sort(
          (a, b) =>
            new Date(a.next_date).getTime() - new Date(b.next_date).getTime(),
        )
        .slice(0, 4),
    [patterns],
  );

  // ── Planning data ─────────────────────────────────────
  const activeGoals = useMemo(
    () =>
      goals
        .filter((g) => g.status === "active")
        .sort(
          (a, b) =>
            (PRIORITY_ORDER[a.priority ?? "medium"] ?? 1) -
            (PRIORITY_ORDER[b.priority ?? "medium"] ?? 1),
        ),
    [goals],
  );

  const sortedBudgets = useMemo(
    () =>
      [...budgets].sort((a, b) => {
        const ra =
          a.limit_amount > 0 ? (a.spent_amount || 0) / a.limit_amount : 0;
        const rb =
          b.limit_amount > 0 ? (b.spent_amount || 0) / b.limit_amount : 0;
        return rb - ra;
      }),
    [budgets],
  );

  const totalDebt = useMemo(
    () => debts.reduce((s, d) => s + d.balance, 0),
    [debts],
  );
  const totalMinPayment = useMemo(
    () => debts.reduce((s, d) => s + d.minimum_payment, 0),
    [debts],
  );

  // ── 6-month averages ──────────────────────────────────
  const sixMonthAvg = useMemo(() => {
    const months: Record<
      string,
      { income: number; expenses: number; savings: number }
    > = {};
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d < cutoff) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!months[key]) months[key] = { income: 0, expenses: 0, savings: 0 };
      if (t.type === "income") months[key].income += t.amount;
      else if (t.category === "Savings") months[key].savings += t.amount;
      else months[key].expenses += t.amount;
    });
    const vals = Object.values(months);
    if (vals.length === 0) return { income: 0, expenses: 0, savings: 0 };
    return {
      income: vals.reduce((s, m) => s + m.income, 0) / vals.length,
      expenses: vals.reduce((s, m) => s + m.expenses, 0) / vals.length,
      savings: vals.reduce((s, m) => s + m.savings, 0) / vals.length,
    };
  }, [transactions]);

  // ── 6-month cashflow forecast ─────────────────────────
  const forecastData = useMemo(() => {
    const toMonthly = (amount: number, freq: string) => {
      switch (freq) {
        case "daily":
          return amount * 30.4;
        case "weekly":
          return amount * 4.33;
        case "biweekly":
          return amount * 2.17;
        case "monthly":
          return amount;
        case "quarterly":
          return amount / 3;
        case "yearly":
          return amount / 12;
        default:
          return amount;
      }
    };

    const recurringIncome = patterns
      .filter((p) => p.is_active && p.type === "income")
      .reduce((s, p) => s + toMonthly(p.amount, p.frequency), 0);

    const recurringExpenses = patterns
      .filter((p) => p.is_active && p.type === "expense")
      .reduce((s, p) => s + toMonthly(p.amount, p.frequency), 0);

    const projIncome = Math.max(sixMonthAvg.income, recurringIncome);
    const projExpenses = Math.max(sixMonthAvg.expenses, recurringExpenses);

    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() + 1 + i);
      const label = d.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      return {
        label,
        Income: Math.round(projIncome),
        Expenses: Math.round(projExpenses),
        Surplus: Math.round(projIncome - projExpenses),
      };
    });
  }, [sixMonthAvg, patterns]);

  const projectedAnnualSurplus = forecastData.reduce(
    (s, m) => s + m.Surplus,
    0,
  );

  // ── 18-month advanced forecast (EMI-aware) ────────────
  const forecast18 = useMemo(() => {
    const toMonthly = (amount: number, freq: string) => {
      switch (freq) {
        case "daily":
          return amount * 30.4;
        case "weekly":
          return amount * 4.33;
        case "biweekly":
          return amount * 2.17;
        case "monthly":
          return amount;
        case "quarterly":
          return amount / 3;
        case "yearly":
          return amount / 12;
        default:
          return amount;
      }
    };

    const recurringIncome = patterns
      .filter((p) => p.is_active && p.type === "income")
      .reduce((s, p) => s + toMonthly(p.amount, p.frequency), 0);
    const recurringExpenses = patterns
      .filter((p) => p.is_active && p.type === "expense")
      .reduce((s, p) => s + toMonthly(p.amount, p.frequency), 0);

    const recurringPatternSavings = patterns
      .filter((p) => p.is_active && p.category === "Savings")
      .reduce((s, p) => s + toMonthly(p.amount, p.frequency), 0);

    const baseIncome =
      Math.max(sixMonthAvg.income, recurringIncome) *
      (1 + scenarioIncomeBoost / 100);
    const baseExpenses =
      Math.max(sixMonthAvg.expenses, recurringExpenses) + scenarioExtraExpense;
    const baseSavings = Math.max(sixMonthAvg.savings, recurringPatternSavings);

    // Recurring patterns that end within the 18-month forecast window
    const forecastStart = new Date();
    forecastStart.setDate(1);
    forecastStart.setHours(0, 0, 0, 0);
    const endingPatterns = patterns
      .filter((p) => p.is_active && p.end_date)
      .map((p) => {
        const endDate = new Date(p.end_date!);
        endDate.setDate(1);
        const monthsFromNow =
          (endDate.getFullYear() - forecastStart.getFullYear()) * 12 +
          (endDate.getMonth() - forecastStart.getMonth());
        return {
          ...p,
          monthsFromNow,
          monthlyAmount: toMonthly(p.amount, p.frequency),
        };
      })
      .filter((p) => p.monthsFromNow >= 1 && p.monthsFromNow <= 18);

    // Compute months remaining for each debt using amortization
    const debtTimelines = debts.map((d) => {
      let monthsLeft: number;
      if (d.months_remaining != null && d.months_remaining > 0) {
        monthsLeft = d.months_remaining;
      } else {
        const r = d.interest_rate / (12 * 100);
        const pmt = d.minimum_payment;
        if (pmt <= 0) {
          monthsLeft = 999;
        } else if (r > 0) {
          const ratio = (d.balance * r) / pmt;
          if (ratio >= 1)
            monthsLeft = 999; // payment can't cover interest
          else monthsLeft = Math.ceil(-Math.log(1 - ratio) / Math.log(1 + r));
        } else {
          // 0% interest
          monthsLeft = Math.ceil(d.balance / pmt);
        }
      }
      return { ...d, monthsLeft: Math.min(monthsLeft, 999) };
    });

    let cumSurplus = 0;
    let cumSaved = 0;
    const months = Array.from({ length: 18 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() + 1 + i);
      const label = d.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });

      // EMIs that closed before this month — freed amount applies from next month after closure
      const closedByNow = debtTimelines.filter((dt) => dt.monthsLeft <= i);
      const closedEMI = closedByNow.reduce(
        (s, dt) => s + dt.minimum_payment,
        0,
      );

      // EMIs closing exactly this month (for event display only)
      const closingThisMonth = debtTimelines.filter(
        (dt) => dt.monthsLeft === i + 1,
      );

      // Recurring patterns ending exactly this month (for event display only)
      const patternsEndingThisMonth = endingPatterns.filter(
        (p) => p.monthsFromNow === i + 1,
      );

      // Savings patterns that ended before this month — reduction applies from next month
      const endedSavingsReduction = endingPatterns
        .filter((p) => p.category === "Savings" && p.monthsFromNow <= i)
        .reduce((s, p) => s + p.monthlyAmount, 0);

      // Non-savings expense patterns that ended before this month — reduction applies from next month
      const endedExpenseReduction = endingPatterns
        .filter(
          (p) =>
            p.type === "expense" &&
            p.category !== "Savings" &&
            p.monthsFromNow <= i,
        )
        .reduce((s, p) => s + p.monthlyAmount, 0);

      const projIncome = Math.round(baseIncome);
      const projExpenses = Math.round(
        Math.max(
          baseExpenses -
            closedEMI -
            endedExpenseReduction -
            endedSavingsReduction,
          0,
        ),
      );
      const monthSavings = Math.round(
        Math.max(baseSavings - endedSavingsReduction, 0),
      );
      const monthSurplus = projIncome - projExpenses;
      cumSurplus += monthSurplus;
      cumSaved += monthSavings;

      const savingsRatePct =
        projIncome > 0 ? Math.round((monthSurplus / projIncome) * 100) : 0;
      const debtToIncomePct =
        projIncome > 0
          ? Math.round(
              ((closedEMI > 0
                ? baseExpenses -
                  closedEMI -
                  endedExpenseReduction -
                  endedSavingsReduction
                : projExpenses) /
                projIncome) *
                100,
            )
          : 0;
      // Health score: savings rate (40pts) + low debt-to-income (40pts) + positive surplus (20pts)
      const healthScore = Math.min(
        100,
        Math.max(
          0,
          Math.min(40, savingsRatePct * 2) +
            Math.max(0, 40 - Math.max(0, debtToIncomePct - 30)) +
            (monthSurplus > 0 ? 20 : 0),
        ),
      );

      // Running debt balance: subtract payments made up to this month
      const runningDebtBalance = debtTimelines.reduce((sum, dt) => {
        if (dt.monthsLeft <= i + 1) return sum; // fully paid
        const paymentsLeft = dt.monthsLeft - (i + 1);
        const r = dt.interest_rate / (12 * 100);
        if (r > 0 && dt.minimum_payment > 0) {
          const remainingBal =
            dt.minimum_payment * ((1 - Math.pow(1 + r, -paymentsLeft)) / r);
          return sum + Math.max(0, remainingBal);
        }
        return sum + Math.max(0, dt.balance - dt.minimum_payment * (i + 1));
      }, 0);

      return {
        label,
        month: i + 1,
        Income: projIncome,
        Expenses: projExpenses,
        Surplus: monthSurplus,
        CumulativeSurplus: Math.round(cumSurplus),
        Saved: monthSavings,
        CumulativeSaved: Math.round(cumSaved),
        TotalForecast: Math.round(cumSurplus + cumSaved),
        freedEMI: Math.round(closedEMI),
        savingsRatePct,
        healthScore,
        runningDebtBalance: Math.round(runningDebtBalance),
        closingThisMonth: closingThisMonth.map((dt) => ({
          id: dt.id,
          name: dt.name,
          payment: dt.minimum_payment,
        })),
        patternsEndingThisMonth: patternsEndingThisMonth.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          type: p.type,
          amount: p.monthlyAmount,
        })),
        hasEvent:
          closingThisMonth.length > 0 || patternsEndingThisMonth.length > 0,
      };
    });

    const closingIn18 = debtTimelines.filter(
      (dt) => dt.monthsLeft <= 18 && dt.monthsLeft < 999,
    );
    const totalFreedEMI = closingIn18.reduce(
      (s, dt) => s + dt.minimum_payment,
      0,
    );
    const total18Surplus = months.reduce((s, m) => s + m.Surplus, 0);
    const breakEvenMonth = months.find((m) => m.CumulativeSurplus > 0);
    const avgHealthScore = Math.round(
      months.reduce((s, m) => s + m.healthScore, 0) / months.length,
    );
    const total18Saved = months.reduce((s, m) => s + m.Saved, 0);
    const allMilestones = months
      .filter((m) => m.hasEvent)
      .flatMap((m) => [
        ...m.closingThisMonth.map((c) => ({
          month: m.label,
          type: "emi" as const,
          name: c.name,
          amount: c.payment,
        })),
        ...m.patternsEndingThisMonth.map((p) => ({
          month: m.label,
          type: "pattern" as const,
          name: p.name,
          amount: p.amount,
        })),
      ]);

    return {
      months,
      debtTimelines,
      closingIn18,
      totalFreedEMI,
      total18Surplus,
      breakEvenMonth,
      avgHealthScore,
      total18Saved,
      allMilestones,
    };
  }, [sixMonthAvg, patterns, debts, scenarioIncomeBoost, scenarioExtraExpense]);

  if (loading && transactions.length === 0) {
    return <ListPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero Band ── */}
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-0">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
              Cashflow & Planning
            </p>
            <p className="text-xs text-slate-500">{currentMonthLabel}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Income
              </p>
              <p className="font-mono text-base font-semibold text-green-400">
                {format(currentIncome)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {currentMonthLabel}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Expenses
              </p>
              <p className="font-mono text-base font-semibold text-red-400">
                {format(currentExpenses)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {currentMonthLabel}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Surplus
              </p>
              <p
                className={`font-mono text-base font-semibold ${surplus >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {surplus < 0 ? "-" : ""}
                {format(Math.abs(surplus))}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {savingsRate ? `${savingsRate}% saved` : "No income logged"}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Active Plans
              </p>
              <p className="font-mono text-base font-semibold text-slate-200">
                {activeGoals.length + budgets.length}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {activeGoals.length} goals · {budgets.length} budgets
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-3 sm:px-6 lg:px-8 py-3">
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="forecast">18-Month Forecast</TabsTrigger>
            <TabsTrigger value="calculator" className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" /> Smart Calculator
            </TabsTrigger>
          </TabsList>

          {/* ══════════════ OVERVIEW TAB ══════════════ */}
          <TabsContent value="overview" className="space-y-4">
            {/* ── Cashflow section ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Cashflow
                </p>
                <div className="flex items-center gap-3">
                  <Link
                    href="/transactions"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <ReceiptText className="h-3 w-3" /> Transactions
                  </Link>
                  <Link
                    href="/recurring"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <CalendarClock className="h-3 w-3" /> Recurring
                  </Link>
                  <Link
                    href="/insights"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Lightbulb className="h-3 w-3" /> Insights
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 rounded-lg">
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        6-Month Cashflow
                      </p>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          Avg {shortAmount(sixMonthAvg.income)}/mo
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-red-500" />
                          Avg {shortAmount(sixMonthAvg.expenses)}/mo
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 px-4 pb-4">
                    {cashflowData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                          data={cashflowData}
                          barCategoryGap="30%"
                          barGap={2}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border)"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tickFormatter={shortAmount}
                            tick={{ fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            width={44}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "var(--card)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                            formatter={(v: unknown) => [format(v as number)]}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar
                            dataKey="Income"
                            fill="#22c55e"
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="Expenses"
                            fill="#ef4444"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                        Add transactions to see cashflow trends
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-lg">
                  <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                    <div className="flex items-center justify-between pb-2">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Recent
                      </p>
                      <Link
                        href="/transactions"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        All <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recentTxns.length > 0 ? (
                      <div className="divide-y divide-border">
                        {recentTxns.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between px-4 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {t.description || t.category}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(t.date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })}{" "}
                                · {t.category}
                              </p>
                            </div>
                            <span
                              className={`text-sm font-mono font-semibold shrink-0 ml-2 ${t.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                            >
                              {t.type === "income" ? "+" : "-"}
                              {format(t.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-[140px] flex items-center justify-center text-muted-foreground text-xs">
                        No transactions yet
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {upcomingRecurring.length > 0 && (
                <Card className="rounded-lg mt-4">
                  <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Upcoming Recurring
                        </p>
                      </div>
                      <Link
                        href="/recurring"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        Manage <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
                      {upcomingRecurring.map((p) => (
                        <div key={p.id} className="px-4 py-3">
                          <p className="text-xs font-medium truncate">
                            {p.name}
                          </p>
                          <p
                            className={`font-mono text-sm font-semibold mt-0.5 ${p.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            {p.type === "expense" ? "-" : "+"}
                            {format(p.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                            {p.frequency} ·{" "}
                            {new Date(p.next_date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* ── 6-Month Forecast section ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                    6-Month Forecast
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Based on past averages and recurring bills
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2 rounded-lg">
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Income vs Expenses — Next 6 Months
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground italic shrink-0">
                        Forecast
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 pt-4 pb-2">
                    {forecastData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart
                          data={forecastData}
                          margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="incomeGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#22c55e"
                                stopOpacity={0.45}
                              />
                              <stop
                                offset="95%"
                                stopColor="#22c55e"
                                stopOpacity={0.05}
                              />
                            </linearGradient>
                            <linearGradient
                              id="expenseGrad"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#ef4444"
                                stopOpacity={0.45}
                              />
                              <stop
                                offset="95%"
                                stopColor="#ef4444"
                                stopOpacity={0.05}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            className="stroke-muted"
                          />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) =>
                              v >= 100_000
                                ? `${(v / 100_000).toFixed(1)}L`
                                : v >= 1_000
                                  ? `${(v / 1_000).toFixed(0)}K`
                                  : `${v}`
                            }
                            width={40}
                          />
                          <Tooltip
                            formatter={(v: unknown) => format(Number(v ?? 0))}
                            contentStyle={{ fontSize: 12 }}
                          />
                          <Legend
                            iconType="square"
                            iconSize={8}
                            wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="Income"
                            stroke="#22c55e"
                            strokeWidth={2}
                            fill="url(#incomeGrad)"
                            dot={false}
                          />
                          <Area
                            type="monotone"
                            dataKey="Expenses"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fill="url(#expenseGrad)"
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                        Add transactions to generate a forecast
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-lg">
                  <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                    <div className="pb-2">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Monthly Savings Forecast
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col">
                    <div className="overflow-y-auto divide-y divide-border max-h-52">
                      {forecastData.map((m) => (
                        <div key={m.label} className="px-4 py-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              {m.label}
                            </span>
                            <span
                              className={`text-xs font-mono font-semibold ${m.Surplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                            >
                              {m.Surplus >= 0 ? "+" : ""}
                              {shortAmount(m.Surplus)} saved
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-mono">
                            <span className="text-green-600 dark:text-green-400">
                              ↑{shortAmount(m.Income)}
                            </span>
                            <span>income</span>
                            <span>·</span>
                            <span className="text-red-500">
                              ↓{shortAmount(m.Expenses)}
                            </span>
                            <span>expenses</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border shrink-0">
                      <div>
                        <span className="text-xs font-semibold">
                          6-month total savings
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          Expected cumulative surplus
                        </p>
                      </div>
                      <span
                        className={`text-sm font-mono font-bold ${projectedAnnualSurplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {projectedAnnualSurplus >= 0 ? "+" : ""}
                        {shortAmount(projectedAnnualSurplus)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ── Planning section ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Planning
                </p>
                <div className="flex items-center gap-3">
                  <Link
                    href="/goals"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Target className="h-3 w-3" /> Goals
                  </Link>
                  <Link
                    href="/budgets"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <CreditCard className="h-3 w-3" /> Budgets
                  </Link>
                  <Link
                    href="/debt-tracker"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Landmark className="h-3 w-3" /> Debts
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Goals */}
                <Card className="rounded-lg">
                  <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Goals
                        </p>
                        {activeGoals.length > 0 && (
                          <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {activeGoals.length}
                          </span>
                        )}
                      </div>
                      <Link
                        href="/goals"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        All <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto max-h-72">
                    {activeGoals.length > 0 ? (
                      <div className="divide-y divide-border">
                        {activeGoals.map((g) => {
                          const pct = Math.min(
                            100,
                            (g.currentAmount / g.targetAmount) * 100,
                          );
                          return (
                            <div key={g.id} className="px-4 py-3">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-sm font-medium truncate max-w-[150px]">
                                  {g.title}
                                </span>
                                <span className="text-xs font-mono text-muted-foreground ml-2">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                              <Progress value={pct} className="h-1" />
                              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 font-mono">
                                <span>{format(g.currentAmount)}</span>
                                <span>{format(g.targetAmount)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[140px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Trophy className="h-6 w-6 opacity-40" />
                        <p className="text-xs">No active goals</p>
                        <Link href="/goals">
                          <Button size="sm" variant="outline">
                            Create Goal
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Budgets */}
                <Card className="rounded-lg">
                  <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Budgets
                        </p>
                        {budgets.length > 0 && (
                          <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {budgets.length}
                          </span>
                        )}
                      </div>
                      <Link
                        href="/budgets"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        All <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto max-h-72">
                    {sortedBudgets.length > 0 ? (
                      <div className="divide-y divide-border">
                        {sortedBudgets.map((b) => {
                          const spent = b.spent_amount || 0;
                          const pct =
                            b.limit_amount > 0
                              ? Math.min(100, (spent / b.limit_amount) * 100)
                              : 0;
                          const over = spent > b.limit_amount;
                          return (
                            <div key={b.id} className="px-4 py-3">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-sm font-medium truncate max-w-[130px]">
                                  {b.category}
                                </span>
                                <span
                                  className={`text-xs font-mono ml-2 ${over ? "text-red-500" : "text-muted-foreground"}`}
                                >
                                  {format(spent)} / {format(b.limit_amount)}
                                </span>
                              </div>
                              <Progress
                                value={pct}
                                className={`h-1 ${over ? "[&>div]:bg-red-500" : ""}`}
                              />
                              {over && (
                                <p className="text-[10px] text-red-500 mt-0.5">
                                  Over by {format(spent - b.limit_amount)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[140px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <CreditCard className="h-6 w-6 opacity-40" />
                        <p className="text-xs">No budgets set</p>
                        <Link href="/budgets">
                          <Button size="sm" variant="outline">
                            Set Budget
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Debt summary */}
                <Card className="rounded-lg">
                  <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                          Debts
                        </p>
                        {debts.length > 0 && (
                          <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {debts.length}
                          </span>
                        )}
                      </div>
                      <Link
                        href="/debt-tracker"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        All <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col">
                    {debts.length > 0 ? (
                      <div className="divide-y divide-border flex flex-col">
                        <div className="px-4 py-3 bg-muted/30 shrink-0">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              Total Outstanding
                            </span>
                            <span className="font-mono text-lg font-bold text-red-600 dark:text-red-400">
                              {format(totalDebt)}
                            </span>
                          </div>
                          {totalMinPayment > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                              {format(totalMinPayment)}/mo minimum
                            </p>
                          )}
                        </div>
                        <div className="overflow-y-auto max-h-55 divide-y divide-border">
                          {debts.map((d) => {
                            const paidPct =
                              d.original_amount > 0
                                ? Math.min(
                                    100,
                                    ((d.original_amount - d.balance) /
                                      d.original_amount) *
                                      100,
                                  )
                                : 0;
                            return (
                              <div key={d.id} className="px-4 py-3">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-sm font-medium truncate max-w-[140px]">
                                    {d.name}
                                  </span>
                                  <span className="text-xs font-mono text-muted-foreground ml-2">
                                    {format(d.balance)}
                                  </span>
                                </div>
                                <Progress
                                  value={paidPct}
                                  className="h-1 [&>div]:bg-blue-500"
                                />
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {paidPct.toFixed(0)}% paid off
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="h-[140px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Landmark className="h-6 w-6 opacity-40" />
                        <p className="text-xs">No debts tracked</p>
                        <Link href="/debt-tracker">
                          <Button size="sm" variant="outline">
                            Add Debt
                          </Button>
                        </Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>
          </TabsContent>

          {/* ══════════════ 18-MONTH FORECAST TAB ══════════════ */}
          <TabsContent value="forecast" className="space-y-4">
            {/* ── Scenario Controls ── */}
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-2 px-4 pt-3">
                <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  <Lightbulb className="h-3.5 w-3.5" /> What-If Scenario
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Adjust to model different income or expense scenarios live
                </p>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium">
                        Income Boost
                      </span>
                      <span
                        className={`font-mono font-semibold ${scenarioIncomeBoost > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
                      >
                        {scenarioIncomeBoost > 0
                          ? `+${scenarioIncomeBoost}%`
                          : "None"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={1}
                      value={scenarioIncomeBoost}
                      onChange={(e) =>
                        setScenarioIncomeBoost(Number(e.target.value))
                      }
                      className="w-full accent-green-500"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0%</span>
                      <span>+50%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium">
                        Extra Expense
                      </span>
                      <span
                        className={`font-mono font-semibold ${scenarioExtraExpense > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
                      >
                        {scenarioExtraExpense > 0
                          ? `+${shortAmount(scenarioExtraExpense)}/mo`
                          : "None"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100000}
                      step={1000}
                      value={scenarioExtraExpense}
                      onChange={(e) =>
                        setScenarioExtraExpense(Number(e.target.value))
                      }
                      className="w-full accent-red-500"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>₹0</span>
                      <span>₹1L/mo</span>
                    </div>
                  </div>
                </div>
                {(scenarioIncomeBoost > 0 || scenarioExtraExpense > 0) && (
                  <button
                    onClick={() => {
                      setScenarioIncomeBoost(0);
                      setScenarioExtraExpense(0);
                    }}
                    className="mt-2 text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reset to baseline
                  </button>
                )}
              </CardContent>
            </Card>

            {/* ── Summary Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Monthly EMI Burden
                  </p>
                  <p className="font-mono font-bold text-base text-red-600 dark:text-red-400">
                    {format(totalMinPayment)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {debts.length} active loan{debts.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Cash Freed by Mo 18
                  </p>
                  <p className="font-mono font-bold text-base text-green-600 dark:text-green-400">
                    {format(forecast18.totalFreedEMI)}
                    <span className="text-xs font-normal">/mo</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {forecast18.closingIn18.length} loan
                    {forecast18.closingIn18.length !== 1 ? "s" : ""} closing
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Total Forecast
                  </p>
                  <p
                    className={`font-mono font-bold text-base ${forecast18.total18Surplus + forecast18.total18Saved >= 0 ? "text-purple-600 dark:text-purple-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {shortAmount(
                      forecast18.total18Surplus + forecast18.total18Saved,
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Surplus + Savings
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Avg Health Score
                  </p>
                  <p
                    className={`font-mono font-bold text-base ${forecast18.avgHealthScore >= 70 ? "text-green-600 dark:text-green-400" : forecast18.avgHealthScore >= 45 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {forecast18.avgHealthScore}/100
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {forecast18.avgHealthScore >= 70
                      ? "Strong cashflow"
                      : forecast18.avgHealthScore >= 45
                        ? "Moderate"
                        : "Needs attention"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ── EMI Payoff Timeline ── */}
            {debts.length > 0 && (
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <CardTitle className="text-sm font-semibold">
                    EMI Payoff Timeline
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Amortization-based payoff schedule. Progress bar = % of
                    original loan paid.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {forecast18.debtTimelines
                      .slice()
                      .sort((a, b) => a.monthsLeft - b.monthsLeft)
                      .map((d) => {
                        const paidPct =
                          d.original_amount > 0
                            ? Math.min(
                                100,
                                ((d.original_amount - d.balance) /
                                  d.original_amount) *
                                  100,
                              )
                            : 0;
                        const closesIn18 =
                          d.monthsLeft < 999 && d.monthsLeft <= 18;
                        const closeDate = (() => {
                          const cd = new Date();
                          cd.setDate(1);
                          cd.setMonth(cd.getMonth() + d.monthsLeft);
                          return cd.toLocaleDateString("en-IN", {
                            month: "short",
                            year: "numeric",
                          });
                        })();
                        return (
                          <div key={d.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium truncate">
                                    {d.name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] capitalize ${closesIn18 ? "text-green-600 border-green-200 dark:border-green-800" : "text-muted-foreground"}`}
                                  >
                                    {d.type}
                                  </Badge>
                                  {closesIn18 ? (
                                    <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
                                      <CheckCircle2 className="h-3 w-3" />{" "}
                                      Closes {closeDate}
                                    </span>
                                  ) : d.monthsLeft >= 999 ? (
                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <AlertCircle className="h-3 w-3" />{" "}
                                      Ongoing
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                                      <Clock className="h-3 w-3" /> Closes{" "}
                                      {closeDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
                                  {format(d.minimum_payment)}
                                  <span className="text-[10px] font-normal text-muted-foreground">
                                    /mo
                                  </span>
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {d.monthsLeft < 999
                                    ? `${d.monthsLeft} mo left`
                                    : "Ongoing"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Progress
                                value={paidPct}
                                className="h-1.5 flex-1 [&>div]:bg-blue-500"
                              />
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                {paidPct.toFixed(0)}% paid
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                {format(d.balance)} left
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Milestone Timeline ── */}
            {forecast18.allMilestones.length > 0 && (
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <CardTitle className="text-sm font-semibold">
                    Upcoming Milestones
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Key cashflow events over the next 18 months
                  </p>
                </CardHeader>
                <CardContent className="px-4 py-3">
                  <div className="relative pl-5">
                    <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
                    {forecast18.allMilestones.map((ms, idx) => (
                      <div key={idx} className="relative mb-3 last:mb-0">
                        <div
                          className={`absolute -left-3.5 top-1 h-3 w-3 rounded-full border-2 border-background ${ms.type === "emi" ? "bg-green-500" : "bg-blue-500"}`}
                        />
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-medium">
                              {ms.name}{" "}
                              {ms.type === "emi" ? "EMI closes" : "ends"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {ms.month}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-mono font-semibold shrink-0 ${ms.type === "emi" ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}
                          >
                            +{format(ms.amount)}/mo freed
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Month-by-Month Table ── */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <CardTitle className="text-sm font-semibold">
                  Month-by-Month Breakdown
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Green rows = EMI closes. Blue = pattern ends. Health score out
                  of 100.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                          Month
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Income
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Expenses
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Surplus
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Sav Rate
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Cumulative
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          EMI Freed
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Saved
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Total Forecast
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Health
                        </th>
                        <th className="px-4 py-2 font-medium text-muted-foreground">
                          Event
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast18.months.map((m) => (
                        <tr
                          key={m.label}
                          className={`border-b border-border transition-colors ${m.hasEvent ? (m.closingThisMonth.length > 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-blue-50 dark:bg-blue-950/20") : "hover:bg-muted/30"}`}
                        >
                          <td className="px-4 py-2.5 font-medium">{m.label}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-green-600 dark:text-green-400">
                            {shortAmount(m.Income)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-red-600 dark:text-red-400">
                            {shortAmount(m.Expenses)}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono font-semibold ${m.Surplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            {m.Surplus >= 0 ? "+" : ""}
                            {shortAmount(m.Surplus)}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono text-xs ${m.savingsRatePct >= 20 ? "text-green-600 dark:text-green-400" : m.savingsRatePct >= 10 ? "text-yellow-600 dark:text-yellow-400" : "text-red-500"}`}
                          >
                            {m.savingsRatePct}%
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono ${m.CumulativeSurplus >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"}`}
                          >
                            {shortAmount(m.CumulativeSurplus)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {m.freedEMI > 0 ? (
                              <span className="text-green-600 dark:text-green-400">
                                +{shortAmount(m.freedEMI)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {m.Saved > 0 ? (
                              <span className="text-blue-600 dark:text-blue-400">
                                +{shortAmount(m.Saved)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-purple-600 dark:text-purple-400">
                            {shortAmount(m.TotalForecast)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono ${m.healthScore >= 70 ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : m.healthScore >= 45 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}
                            >
                              {m.healthScore}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 space-y-0.5">
                            {m.closingThisMonth.map((c) => (
                              <span
                                key={c.id}
                                className="flex items-center gap-1 text-[10px] text-green-700 dark:text-green-400 font-medium"
                              >
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                {c.name} done
                              </span>
                            ))}
                            {m.patternsEndingThisMonth.map((p) => (
                              <span
                                key={p.id}
                                className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium"
                              >
                                <Target className="h-3 w-3 shrink-0" />
                                {p.name} ends
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════ SMART CALCULATOR TAB ══════════════ */}
          <TabsContent value="calculator" className="space-y-4">

            {/* ── Top: compact input strip ── */}
            <Card className="border-violet-200 dark:border-violet-800">
              <CardContent className="px-4 py-3">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-violet-500 shrink-0" />
                  <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Intelligence Calculator</p>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">· Edit values to model different scenarios</span>
                </div>

                {/* Row 1: income + expenses + one-time adder */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wide">Monthly Income</Label>
                    <Input type="number" placeholder={`${Math.round(sixMonthAvg.income)}`}
                      value={calcIncomeOverride} onChange={(e) => setCalcIncomeOverride(e.target.value)}
                      className="h-8 text-xs font-mono" />
                    <p className="text-[9px] text-muted-foreground mt-0.5">avg {format(sixMonthAvg.income)}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wide">Monthly Expenses</Label>
                    <Input type="number" placeholder={`${Math.round(sixMonthAvg.expenses)}`}
                      value={calcExpenseOverride} onChange={(e) => setCalcExpenseOverride(e.target.value)}
                      className="h-8 text-xs font-mono" />
                    <p className="text-[9px] text-muted-foreground mt-0.5">avg {format(sixMonthAvg.expenses)}</p>
                  </div>
                  {/* One-time item quick-add */}
                  <div className="col-span-2">
                    <Label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wide">Add One-time Item</Label>
                    <div className="flex gap-1.5">
                      <Input placeholder="Name" value={calcItemForm.name}
                        onChange={(e) => setCalcItemForm((f) => ({ ...f, name: e.target.value }))}
                        className="h-8 text-xs flex-1 min-w-0" />
                      <Input type="number" placeholder="₹" value={calcItemForm.amount}
                        onChange={(e) => setCalcItemForm((f) => ({ ...f, amount: e.target.value }))}
                        className="h-8 text-xs w-20 font-mono shrink-0" />
                      <select value={calcItemForm.type}
                        onChange={(e) => setCalcItemForm((f) => ({ ...f, type: e.target.value as "income" | "expense" }))}
                        className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground shrink-0">
                        <option value="expense">Exp</option>
                        <option value="income">Inc</option>
                      </select>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0"
                        disabled={!calcItemForm.name || !calcItemForm.amount}
                        onClick={() => {
                          const amt = parseFloat(calcItemForm.amount);
                          if (!calcItemForm.name || isNaN(amt) || amt <= 0) return;
                          setCalcItems((prev) => [...prev, { id: crypto.randomUUID(), name: calcItemForm.name, amount: amt, type: calcItemForm.type }]);
                          setCalcItemForm({ name: "", amount: "", type: "expense" });
                        }}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* One-time items + custom goal pills */}
                {(calcItems.length > 0 || customGoals.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border">
                    {calcItems.map((item) => (
                      <div key={item.id} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${item.type === "income" ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300" : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300"}`}>
                        <span>{item.type === "income" ? "+" : "-"}{format(item.amount)} {item.name}</span>
                        <button onClick={() => setCalcItems((prev) => prev.filter((i) => i.id !== item.id))} className="opacity-60 hover:opacity-100 ml-0.5">×</button>
                      </div>
                    ))}
                    {customGoals.map((g) => (
                      <div key={g.id} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/20 dark:border-violet-800 dark:text-violet-300">
                        <span>🎯 {g.name} · {format(g.target)}</span>
                        <button onClick={() => setCustomGoals((prev) => prev.filter((x) => x.id !== g.id))} className="opacity-60 hover:opacity-100 ml-0.5">×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom goal quick-add */}
                <details className="mt-2">
                  <summary className="text-[10px] text-violet-600 dark:text-violet-400 cursor-pointer hover:underline select-none">+ Add custom goal</summary>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    <Input placeholder="Goal name" value={customGoalForm.name}
                      onChange={(e) => setCustomGoalForm((f) => ({ ...f, name: e.target.value }))}
                      className="h-8 text-xs" />
                    <Input type="number" placeholder="Target (₹)" value={customGoalForm.target}
                      onChange={(e) => setCustomGoalForm((f) => ({ ...f, target: e.target.value }))}
                      className="h-8 text-xs font-mono" />
                    <Input type="number" placeholder="Saved so far (₹)" value={customGoalForm.current}
                      onChange={(e) => setCustomGoalForm((f) => ({ ...f, current: e.target.value }))}
                      className="h-8 text-xs font-mono" />
                    <div className="flex gap-1.5">
                      <Input type="month" value={customGoalForm.deadline}
                        onChange={(e) => setCustomGoalForm((f) => ({ ...f, deadline: e.target.value }))}
                        className="h-8 text-xs flex-1" />
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0"
                        disabled={!customGoalForm.name || !customGoalForm.target}
                        onClick={() => {
                          const tgt = parseFloat(customGoalForm.target);
                          if (!customGoalForm.name || isNaN(tgt) || tgt <= 0) return;
                          setCustomGoals((prev) => [...prev, { id: crypto.randomUUID(), name: customGoalForm.name, target: tgt, current: parseFloat(customGoalForm.current) || 0, deadline: customGoalForm.deadline }]);
                          setCustomGoalForm({ name: "", target: "", current: "", deadline: "" });
                        }}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>

            {/* ── Bottom: tabbed results ── */}
            <SmartCalculatorResults
              sixMonthAvg={sixMonthAvg}
              calcIncomeOverride={calcIncomeOverride}
              calcExpenseOverride={calcExpenseOverride}
              calcItems={calcItems}
              customGoals={customGoals}
              activeGoals={activeGoals}
              debts={debts}
              returnRate={returnRate}
              setReturnRate={setReturnRate}
              extraDebtPayment={extraDebtPayment}
              setExtraDebtPayment={setExtraDebtPayment}
              format={format}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ── Smart Calculator Results panel ────────────────────────────────────────────

type CalcItem = { id: string; name: string; amount: number; type: "income" | "expense" };
type CustomGoal = { id: string; name: string; target: number; current: number; deadline: string };

function SmartCalculatorResults({
  sixMonthAvg,
  calcIncomeOverride,
  calcExpenseOverride,
  calcItems,
  customGoals,
  activeGoals,
  debts,
  returnRate,
  setReturnRate,
  extraDebtPayment,
  setExtraDebtPayment,
  format,
}: {
  sixMonthAvg: { income: number; expenses: number; savings: number };
  calcIncomeOverride: string;
  calcExpenseOverride: string;
  calcItems: CalcItem[];
  customGoals: CustomGoal[];
  activeGoals: import("@/store/goals-store").Goal[];
  debts: import("@/store/debt-tracker-store").Debt[];
  returnRate: number;
  setReturnRate: (v: number) => void;
  extraDebtPayment: number;
  setExtraDebtPayment: (v: number) => void;
  format: (v: number) => string;
}) {
  const baseIncome = calcIncomeOverride ? parseFloat(calcIncomeOverride) || 0 : sixMonthAvg.income;
  const baseExpenses = calcExpenseOverride ? parseFloat(calcExpenseOverride) || 0 : sixMonthAvg.expenses;

  const oneTimeIncome = calcItems.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0);
  const oneTimeExpense = calcItems.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0);

  const totalIncome = baseIncome + oneTimeIncome;
  const totalExpenses = baseExpenses + oneTimeExpense;
  const monthlySurplus = totalIncome - totalExpenses;
  const savingsRatePct = totalIncome > 0 ? (monthlySurplus / totalIncome) * 100 : 0;

  // Goal timelines — only 80% of surplus allocated (20% kept as emergency buffer)
  const allocableSurplus = Math.max(0, monthlySurplus) * 0.8;
  const emergencyBuffer = Math.max(0, monthlySurplus) * 0.2;

  // Allocation strategy:
  // If any high-priority goals exist → 90% of allocable surplus goes to high-priority goals (split
  // equally among them), remaining 10% is split equally among medium/low/custom goals.
  // If no high-priority goals → split equally among all goals.
  const highGoals = activeGoals.filter((g) => (g.priority ?? "medium") === "high");
  const otherGoals = [
    ...activeGoals.filter((g) => (g.priority ?? "medium") !== "high"),
    ...customGoals.map((g) => ({ ...g, _isCustom: true as const })),
  ];
  const hasHigh = highGoals.length > 0;
  const highPool = hasHigh ? allocableSurplus * 0.9 : 0;
  const otherPool = hasHigh
    ? allocableSurplus * 0.1
    : allocableSurplus;

  function goalAlloc(_priority: string, isHigh: boolean, groupCount: number): number {
    if (groupCount === 0) return 0;
    return isHigh ? highPool / groupCount : otherPool / Math.max(1, otherGoals.length);
  }

  type GoalResult = {
    id: string;
    name: string;
    remaining: number;
    target: number;
    monthlyAlloc: number;
    monthsToReach: number;
    deadlineMonths: number | null;
    atRisk: boolean;
    priority: string;
    weightPct: number;
  };

  const goalResults: GoalResult[] = [
    ...activeGoals.map((g) => {
      const isHigh = (g.priority ?? "medium") === "high";
      const alloc = goalAlloc(g.priority ?? "medium", isHigh, highGoals.length);
      const remaining = Math.max(0, g.targetAmount - g.currentAmount);
      const months = alloc > 0 ? Math.ceil(remaining / alloc) : Infinity;
      const deadlineDate = g.targetDate ? new Date(g.targetDate) : null;
      const deadlineMonths = deadlineDate
        ? Math.max(0, (deadlineDate.getFullYear() - new Date().getFullYear()) * 12 + (deadlineDate.getMonth() - new Date().getMonth()))
        : null;
      const weightPct = allocableSurplus > 0 ? Math.round((alloc / allocableSurplus) * 100) : 0;
      return { id: g.id, name: g.title, remaining, target: g.targetAmount, monthlyAlloc: alloc, monthsToReach: months, deadlineMonths, atRisk: deadlineMonths != null && months > deadlineMonths, priority: g.priority ?? "medium", weightPct };
    }),
    ...customGoals.map((g) => {
      const alloc = hasHigh
        ? otherPool / Math.max(1, otherGoals.length)
        : allocableSurplus / Math.max(1, activeGoals.length + customGoals.length);
      const remaining = Math.max(0, g.target - g.current);
      const months = alloc > 0 ? Math.ceil(remaining / alloc) : Infinity;
      const deadlineMonths = g.deadline
        ? (() => {
            const [yr, mo] = g.deadline.split("-").map(Number);
            const now = new Date();
            return Math.max(0, (yr - now.getFullYear()) * 12 + (mo - 1 - now.getMonth()));
          })()
        : null;
      const weightPct = allocableSurplus > 0 ? Math.round((alloc / allocableSurplus) * 100) : 0;
      return { id: g.id, name: g.name, remaining, target: g.target, monthlyAlloc: alloc, monthsToReach: months, deadlineMonths, atRisk: deadlineMonths != null && months > deadlineMonths, priority: "medium", weightPct };
    }),
  ];

  // Investment projection: compound monthly, PMT = monthlySurplus
  const r = returnRate / 100 / 12;
  function fv(months: number) {
    if (monthlySurplus <= 0) return 0;
    if (r === 0) return monthlySurplus * months;
    return monthlySurplus * ((Math.pow(1 + r, months) - 1) / r);
  }
  const inv5y = fv(60);
  const inv10y = fv(120);

  // Debt payoff with extra payment
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const baseMonthlyEMI = debts.reduce((s, d) => s + d.minimum_payment, 0);
  function debtPayoffMonths(extraPerMonth: number) {
    if (totalDebt <= 0) return 0;
    const totalPayment = baseMonthlyEMI + extraPerMonth;
    if (totalPayment <= 0) return 999;
    let balance = totalDebt;
    let months = 0;
    while (balance > 0 && months < 999) {
      const avgRate = debts.length > 0
        ? debts.reduce((s, d) => s + (d.interest_rate / 100 / 12) * d.balance, 0) / totalDebt
        : 0;
      const interest = balance * avgRate;
      const principal = Math.min(balance, totalPayment - interest);
      if (principal <= 0) return 999;
      balance -= principal;
      months++;
    }
    return months;
  }
  const basePayoffMonths = debtPayoffMonths(0);
  const extraPayoffMonths = debtPayoffMonths(extraDebtPayment);
  const monthsSaved = Math.max(0, basePayoffMonths - extraPayoffMonths);

  function fmtMonths(m: number) {
    if (m >= 999 || !isFinite(m)) return "N/A";
    const y = Math.floor(m / 12);
    const mo = m % 12;
    if (y === 0) return `${mo}mo`;
    if (mo === 0) return `${y}yr`;
    return `${y}yr ${mo}mo`;
  }

  // Intelligence report bullets
  const insights: { type: "good" | "warn" | "bad"; text: string }[] = [];

  if (monthlySurplus <= 0) {
    insights.push({ type: "bad", text: "Your expenses exceed income — you're running a deficit. Cut discretionary spending first." });
  } else if (savingsRatePct < 10) {
    insights.push({ type: "warn", text: `Savings rate is only ${savingsRatePct.toFixed(1)}%. Aim for at least 20% to build wealth steadily.` });
  } else if (savingsRatePct >= 30) {
    insights.push({ type: "good", text: `Excellent savings rate of ${savingsRatePct.toFixed(1)}%! You're well-positioned to hit your goals early.` });
  } else {
    insights.push({ type: "good", text: `Savings rate of ${savingsRatePct.toFixed(1)}% is healthy. Push it above 30% to accelerate goal timelines.` });
  }

  const atRiskGoals = goalResults.filter((g) => g.atRisk);
  if (atRiskGoals.length > 0) {
    insights.push({ type: "warn", text: `${atRiskGoals.length} goal${atRiskGoals.length > 1 ? "s are" : " is"} at risk of missing deadline: ${atRiskGoals.map((g) => g.name).join(", ")}. Increase monthly allocation or extend deadlines.` });
  }

  if (totalDebt > 0 && extraDebtPayment === 0 && monthlySurplus > 0) {
    const suggestedExtra = Math.round(Math.min(monthlySurplus * 0.2, 10000));
    insights.push({ type: "warn", text: `Adding ₹${suggestedExtra.toLocaleString()}/mo extra to debts would save you ${fmtMonths(Math.max(0, basePayoffMonths - debtPayoffMonths(suggestedExtra)))} and reduce interest burden.` });
  }

  if (extraDebtPayment > 0 && monthsSaved > 0) {
    insights.push({ type: "good", text: `Extra debt payment of ${format(extraDebtPayment)}/mo clears debt ${fmtMonths(monthsSaved)} faster, freeing up ${format(baseMonthlyEMI + extraDebtPayment)}/mo for investments.` });
  }

  if (monthlySurplus > 0) {
    insights.push({ type: "good", text: `Investing your ₹${Math.round(monthlySurplus).toLocaleString()} surplus at ${returnRate}% p.a. grows to ${format(inv5y)} in 5 years and ${format(inv10y)} in 10 years.` });
  }

  if (goalResults.length === 0 && monthlySurplus > 0) {
    insights.push({ type: "warn", text: "You have no active goals. Add savings goals to allocate your surplus effectively." });
  }

  if (monthlySurplus > 0 && goalResults.length > 0) {
    insights.push({ type: "good", text: `${format(emergencyBuffer)}/mo is reserved as an emergency buffer (20% of surplus) — a smart cushion for unexpected expenses.` });
  }

  const fastest = goalResults.filter((g) => isFinite(g.monthsToReach)).sort((a, b) => a.monthsToReach - b.monthsToReach)[0];
  if (fastest) {
    insights.push({ type: "good", text: `"${fastest.name}" is your most achievable goal — only ${fmtMonths(fastest.monthsToReach)} away at current allocation.` });
  }

  // ── Derived display helpers ──────────────────────────────────────────────────

  function projectedDate(monthsFromNow: number): string {
    if (!isFinite(monthsFromNow) || monthsFromNow >= 999) return "—";
    const d = new Date();
    d.setMonth(d.getMonth() + monthsFromNow);
    return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }

  function requiredMonthlyToMeetDeadline(remaining: number, deadlineMonths: number | null): number | null {
    if (deadlineMonths == null || deadlineMonths <= 0) return null;
    return Math.ceil(remaining / deadlineMonths);
  }

  // Investment year-by-year table
  const invYearData = Array.from({ length: 10 }, (_, i) => {
    const yr = i + 1;
    const months = yr * 12;
    const total = fv(months);
    const contributed = monthlySurplus > 0 ? monthlySurplus * months : 0;
    const growth = Math.max(0, total - contributed);
    return { yr, total, contributed, growth };
  });

  // Investment milestone: when do we first cross each threshold?
  const MILESTONES = [100_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000];
  const invMilestones = MILESTONES.map((target) => {
    if (monthlySurplus <= 0 || r === 0) {
      const mo = monthlySurplus > 0 ? Math.ceil(target / monthlySurplus) : Infinity;
      return { target, months: mo };
    }
    const mo = Math.ceil(Math.log(1 + (target * r) / monthlySurplus) / Math.log(1 + r));
    return { target, months: isFinite(mo) && mo > 0 ? mo : Infinity };
  }).filter((m) => isFinite(m.months) && m.months <= 240);

  // Debt per-loan breakdown
  const debtBreakdown = debts.map((d) => {
    let moLeft: number;
    const ri = d.interest_rate / 100 / 12;
    const pmt = d.minimum_payment;
    if (pmt <= 0) { moLeft = 999; }
    else if (ri > 0) {
      const ratio = (d.balance * ri) / pmt;
      moLeft = ratio >= 1 ? 999 : Math.ceil(-Math.log(1 - ratio) / Math.log(1 + ri));
    } else {
      moLeft = Math.ceil(d.balance / pmt);
    }
    const totalInterest = pmt * moLeft - d.balance;
    return { ...d, moLeft: Math.min(moLeft, 999), totalInterest: Math.max(0, totalInterest) };
  }).sort((a, b) => b.interest_rate - a.interest_rate); // avalanche order

  // Debt balance over time — two series: base EMI only vs EMI + extra payment
  function debtBalanceAt(month: number, extra: number): number {
    if (totalDebt <= 0) return 0;
    const avgRate = debts.reduce((s, d) => s + (d.interest_rate / 100 / 12) * d.balance, 0) / totalDebt;
    let bal = totalDebt;
    const pmt = baseMonthlyEMI + extra;
    for (let m = 0; m < month; m++) {
      const interest = bal * avgRate;
      const principal = Math.min(bal, pmt - interest);
      if (principal <= 0) break;
      bal -= principal;
    }
    return Math.max(0, Math.round(bal));
  }

  const chartMonths = Math.min(Math.max(basePayoffMonths, extraPayoffMonths, 1) + 1, 73);
  const step = chartMonths > 36 ? 3 : 1;
  const debtChartData = Array.from({ length: Math.ceil(chartMonths / step) }, (_, i) => {
    const mo = i * step;
    const label = mo === 0 ? "Now" : mo % 12 === 0 ? `Y${mo / 12}` : `M${mo}`;
    return {
      label,
      "Without Extra": debtBalanceAt(mo, 0),
      "With Extra": extraDebtPayment > 0 ? debtBalanceAt(mo, extraDebtPayment) : undefined,
    };
  });

  // Yearly table: balance at end of each year for both scenarios
  const maxTableYears = Math.ceil(Math.max(basePayoffMonths, extraPayoffMonths, 12) / 12);
  const debtTableData = Array.from({ length: Math.min(maxTableYears, 10) }, (_, i) => {
    const mo = (i + 1) * 12;
    const base = debtBalanceAt(mo, 0);
    const withExtra = extraDebtPayment > 0 ? debtBalanceAt(mo, extraDebtPayment) : null;
    const basePaid = Math.max(0, totalDebt - base);
    const extraPaid = withExtra !== null ? Math.max(0, totalDebt - withExtra) : null;
    return { year: i + 1, base, withExtra, basePaid, extraPaid };
  });

  // Investment area chart data (yearly)
  const invChartData = invYearData.map((d) => ({
    label: `Y${d.yr}`,
    Contributed: Math.round(d.contributed),
    Growth: Math.round(d.growth),
    Total: Math.round(d.total),
  }));

  return (
    <div className="space-y-0">

      {/* ══════ SURPLUS SUMMARY STRIP ══════ */}
      <Card className={`border-2 ${monthlySurplus >= 0 ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}`}>
        <CardContent className="px-4 pt-4 pb-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Monthly Cashflow Projection</p>

          {/* Income → Expenses → Surplus flow bar */}
          {totalIncome > 0 && (
            <div className="mb-4">
              <div className="flex rounded-full overflow-hidden h-3 w-full">
                <div className="bg-red-400 dark:bg-red-600 transition-all" style={{ width: `${Math.min(100, (totalExpenses / totalIncome) * 100)}%` }} />
                {monthlySurplus > 0 && (
                  <>
                    <div className="bg-orange-400 dark:bg-orange-500 transition-all" style={{ width: `${(emergencyBuffer / totalIncome) * 100}%` }} />
                    <div className="bg-violet-500 dark:bg-violet-400 transition-all" style={{ width: `${(allocableSurplus / totalIncome) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="inline-block h-2 w-2 rounded-full bg-red-400" />Expenses</span>
                {monthlySurplus > 0 && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="inline-block h-2 w-2 rounded-full bg-orange-400" />Buffer</span>}
                {monthlySurplus > 0 && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="inline-block h-2 w-2 rounded-full bg-violet-500" />Goals pool</span>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 px-3 py-2.5">
              <p className="text-[10px] text-green-700 dark:text-green-400 font-medium">Income</p>
              <p className="font-mono text-sm font-bold text-green-700 dark:text-green-300">{format(totalIncome)}</p>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2.5">
              <p className="text-[10px] text-red-700 dark:text-red-400 font-medium">Expenses</p>
              <p className="font-mono text-sm font-bold text-red-700 dark:text-red-300">{format(totalExpenses)}</p>
            </div>
            <div className={`rounded-lg px-3 py-2.5 ${monthlySurplus >= 0 ? "bg-violet-50 dark:bg-violet-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
              <p className={`text-[10px] font-medium ${monthlySurplus >= 0 ? "text-violet-700 dark:text-violet-400" : "text-red-600"}`}>Surplus</p>
              <p className={`font-mono text-sm font-bold ${monthlySurplus >= 0 ? "text-violet-700 dark:text-violet-300" : "text-red-600"}`}>
                {monthlySurplus >= 0 ? "+" : ""}{format(monthlySurplus)}
              </p>
              {totalIncome > 0 && <p className="text-[10px] text-muted-foreground">{savingsRatePct.toFixed(1)}%</p>}
            </div>
          </div>

          {monthlySurplus > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
              <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 px-3 py-2.5">
                <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">Goals Pool · 80%</p>
                <p className="font-mono text-sm font-bold text-violet-700 dark:text-violet-300">{format(allocableSurplus)}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></p>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 px-3 py-2.5">
                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">Emergency Buffer · 20%</p>
                <p className="font-mono text-sm font-bold text-orange-700 dark:text-orange-300">{format(emergencyBuffer)}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════ TABBED DETAIL PANELS ══════ */}
      <Tabs defaultValue="goals" className="mt-4">
        <TabsList className="w-full grid grid-cols-4 h-9">
          <TabsTrigger value="goals" className="text-xs gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Goals {goalResults.length > 0 && <span className="text-[9px] bg-muted rounded px-1">{goalResults.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="debt" className="text-xs gap-1.5">
            <Landmark className="h-3.5 w-3.5" />
            Debt {debts.length > 0 && <span className="text-[9px] bg-muted rounded px-1">{debts.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="invest" className="text-xs gap-1.5">
            <TrendingUpIcon className="h-3.5 w-3.5" />
            Investment
          </TabsTrigger>
          <TabsTrigger value="report" className="text-xs gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            Report
          </TabsTrigger>
        </TabsList>

        {/* ── Goals tab ── */}
        <TabsContent value="goals" className="mt-4">
          {goalResults.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground">80% of surplus split by priority (High 3× · Medium 2× · Low 1×). 20% kept as emergency buffer.</p>
              {goalResults.map((g) => {
                const savedAmt = g.target - g.remaining;
                const pct = g.target > 0 ? Math.min(100, (savedAmt / g.target) * 100) : 0;
                const finishDate = projectedDate(g.monthsToReach);
                const requiredForDeadline = requiredMonthlyToMeetDeadline(g.remaining, g.deadlineMonths);
                const shortfall = requiredForDeadline != null ? requiredForDeadline - g.monthlyAlloc : null;
                const boostToSave3Mo = g.remaining > 0 && g.monthsToReach > 3
                  ? Math.ceil(g.remaining / (g.monthsToReach - 3)) - g.monthlyAlloc
                  : null;
                const priorityStyle =
                  g.priority === "high"
                    ? { badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", bar: "bg-red-500", border: "border-red-200 dark:border-red-800" }
                    : g.priority === "low"
                      ? { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", bar: "bg-blue-500", border: "border-blue-200 dark:border-blue-800" }
                      : { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", bar: "bg-amber-500", border: "border-amber-200 dark:border-amber-800" };

            return (
              <Card key={g.id} className={`border ${g.atRisk ? "border-amber-300 dark:border-amber-700" : priorityStyle.border}`}>
                <CardContent className="px-4 pt-4 pb-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {g.atRisk
                        ? <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        : <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{g.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${priorityStyle.badge}`}>{g.priority}</span>
                          <span className="text-[10px] text-muted-foreground">{g.weightPct}% of pool</span>
                          {g.atRisk && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">At Risk</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold font-mono ${g.atRisk ? "text-amber-500" : "text-foreground"}`}>{fmtMonths(g.monthsToReach)}</p>
                      <p className="text-[10px] text-muted-foreground">to goal</p>
                    </div>
                  </div>

                  {/* Progress bar with markers */}
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-mono">
                      <span>{format(savedAmt)} saved</span>
                      <span>{pct.toFixed(0)}%</span>
                      <span>{format(g.target)} target</span>
                    </div>
                    <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${g.atRisk ? "bg-amber-400" : priorityStyle.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                      {/* 50% marker */}
                      <div className="absolute top-0 left-1/2 h-full w-px bg-background/40" />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>Start</span>
                      <span>50%</span>
                      <span>🎯 Done</span>
                    </div>
                  </div>

                  {/* Action plan steps */}
                  <div className="rounded-lg bg-muted/30 border border-border px-3 py-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Action Plan</p>

                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-[10px] font-bold flex items-center justify-center">1</span>
                      <p className="text-xs text-foreground">
                        Set aside <span className="font-semibold font-mono text-violet-700 dark:text-violet-300">{format(g.monthlyAlloc)}/mo</span> from your goals pool every month automatically.
                      </p>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center">2</span>
                      <p className="text-xs text-foreground">
                        At this pace, you&apos;ll reach <span className="font-semibold">{g.name}</span> by{" "}
                        <span className="font-semibold font-mono text-blue-700 dark:text-blue-300">{finishDate}</span>
                        {" "}({fmtMonths(g.monthsToReach)} from now).
                      </p>
                    </div>

                    {boostToSave3Mo != null && boostToSave3Mo > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 text-[10px] font-bold flex items-center justify-center">3</span>
                        <p className="text-xs text-foreground">
                          Increase by just <span className="font-semibold font-mono text-green-700 dark:text-green-400">{format(boostToSave3Mo)}/mo</span> more to finish <span className="font-semibold">3 months earlier</span>.
                        </p>
                      </div>
                    )}

                    {g.atRisk && requiredForDeadline != null && shortfall != null && shortfall > 0 && (
                      <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 px-2.5 py-2 mt-1">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          To meet your deadline, you need <span className="font-semibold font-mono">{format(requiredForDeadline)}/mo</span> — that&apos;s <span className="font-semibold">{format(shortfall)}/mo more</span> than currently allocated.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Mini milestone steps */}
                  {isFinite(g.monthsToReach) && g.monthsToReach > 0 && (
                    <div className="flex items-center gap-0 text-[10px]">
                      {[0.25, 0.5, 0.75, 1].map((milestone) => {
                        const moAtMilestone = Math.round(g.monthsToReach * milestone);
                        const reached = pct >= milestone * 100;
                        return (
                          <div key={milestone} className="flex-1 flex flex-col items-center gap-1">
                            <div className={`h-2 w-2 rounded-full border-2 ${reached ? "bg-green-500 border-green-500" : "bg-background border-muted-foreground/40"}`} />
                            <span className={`text-center leading-tight ${reached ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}>
                              {milestone === 1 ? "Done" : `${milestone * 100}%`}
                              <br />{projectedDate(moAtMilestone)}
                            </span>
                          </div>
                        );
                      }).reduce<React.ReactNode[]>((acc, el, i) => {
                        if (i > 0) acc.push(<div key={`line-${i}`} className="flex-1 h-px bg-muted-foreground/20 self-start mt-1" />);
                        acc.push(el);
                        return acc;
                      }, [])}
                    </div>
                  )}
                </CardContent>
              </Card>
            );})}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Target className="h-8 w-8 opacity-30" />
              <p className="text-sm">No active goals yet.</p>
              <p className="text-xs">Add goals in the Goals page or use the custom goal form above.</p>
            </div>
          )}
        </TabsContent>

        {/* ── Debt tab ── */}
        <TabsContent value="debt" className="mt-4">
          {totalDebt > 0 ? (
            <Card>
              <CardHeader className="pb-3 border-b border-border px-4 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-red-500" />
                    <p className="text-sm font-semibold">Debt Clearance Plan</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-bold text-red-500">{fmtMonths(extraPayoffMonths)}</p>
                    <p className="text-[10px] text-muted-foreground">to debt-free · {projectedDate(extraPayoffMonths)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1 font-mono">
                    <span>Outstanding: {format(totalDebt)}</span>
                    <span>Min EMI: {format(baseMonthlyEMI)}/mo</span>
                  </div>
                  <div className="h-3 rounded-full bg-red-100 dark:bg-red-950/30 overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Per Loan · Avalanche Order</p>
                  <div className="space-y-2">
                    {debtBreakdown.map((d, idx) => (
                      <div key={d.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 h-5 w-5 rounded-full flex items-center justify-center shrink-0">{idx + 1}</span>
                            <span className="text-xs font-medium truncate">{d.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono text-xs font-semibold text-red-500">{format(d.balance)}</p>
                            <p className="text-[10px] text-muted-foreground">{d.interest_rate}% p.a.</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span>EMI: {format(d.minimum_payment)}/mo</span>
                          <span className="text-amber-600 dark:text-amber-400">Interest: ~{format(d.totalInterest)}</span>
                          <span className={d.moLeft <= 12 ? "text-green-600 dark:text-green-400 font-semibold" : ""}>{fmtMonths(d.moLeft)} left</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-3 py-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-green-700 dark:text-green-400">Extra Payment / mo</span>
                    <span className={`font-mono font-bold ${extraDebtPayment > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      {extraDebtPayment > 0 ? `+${format(extraDebtPayment)}` : "₹0"}
                    </span>
                  </div>
                  <input type="range" min={0} max={Math.max(50000, Math.round(monthlySurplus))} step={500}
                    value={extraDebtPayment} onChange={(e) => setExtraDebtPayment(Number(e.target.value))}
                    className="w-full accent-green-500" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Without extra</p>
                      <p className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">{fmtMonths(basePayoffMonths)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">With extra</p>
                      <p className="font-mono text-xs font-semibold text-green-600 dark:text-green-400">{fmtMonths(extraPayoffMonths)}</p>
                    </div>
                  </div>
                  {monthsSaved > 0 && (
                    <div className="flex items-center gap-1.5 rounded-md bg-green-100 dark:bg-green-900/30 px-2 py-1.5">
                      <Zap className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                        Save <span className="font-bold">{fmtMonths(monthsSaved)}</span> — debt-free by <span className="font-bold">{projectedDate(extraPayoffMonths)}</span>
                      </p>
                    </div>
                  )}
                </div>

                {debtChartData.length > 2 && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Debt Balance Over Time</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={debtChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="debtGradBase" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.03} />
                            </linearGradient>
                            <linearGradient id="debtGradExtra" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.03} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                          <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.floor(debtChartData.length / 5)} />
                          <YAxis tickFormatter={(v) => v >= 100_000 ? `${(v / 100_000).toFixed(1)}L` : `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={38} />
                          <Tooltip formatter={(v: unknown, name?: string) => [format(Number(v ?? 0)), name ?? ""]} contentStyle={{ fontSize: 11 }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                          <Area type="monotone" dataKey="Without Extra" stroke="#ef4444" strokeWidth={2} fill="url(#debtGradBase)" dot={false} strokeDasharray="4 2" />
                          {extraDebtPayment > 0 && (
                            <Area type="monotone" dataKey="With Extra" stroke="#22c55e" strokeWidth={2} fill="url(#debtGradExtra)" dot={false} />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Year-by-year comparison table */}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Year-by-Year Breakdown</p>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            {extraDebtPayment > 0 && (
                              <tr className="border-b border-border">
                                <th className="px-3 py-1.5" />
                                <th colSpan={2} className="text-center px-3 py-1.5 font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 border-x border-border">
                                  Min EMI only — {format(baseMonthlyEMI)}/mo
                                </th>
                                <th colSpan={2} className="text-center px-3 py-1.5 font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20">
                                  With extra — {format(baseMonthlyEMI + extraDebtPayment)}/mo
                                </th>
                              </tr>
                            )}
                            <tr className="bg-muted/50 border-b border-border">
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Year</th>
                              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Remaining</th>
                              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Paid off</th>
                              {extraDebtPayment > 0 && <th className="text-right px-3 py-2 font-medium text-muted-foreground">Remaining</th>}
                              {extraDebtPayment > 0 && <th className="text-right px-3 py-2 font-medium text-muted-foreground">Paid off</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {debtTableData.map((row, idx) => (
                              <tr key={row.year} className={`border-b border-border last:border-0 ${idx % 2 === 1 ? "bg-muted/20" : ""}`}>
                                <td className="px-3 py-2 font-semibold">Yr {row.year}</td>
                                <td className="px-3 py-2 text-right font-mono">
                                  {row.base <= 0
                                    ? <span className="text-green-600 dark:text-green-400 font-semibold">Cleared ✓</span>
                                    : <span className="text-red-500">{format(row.base)}</span>}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-foreground">{format(row.basePaid)}</td>
                                {extraDebtPayment > 0 && (
                                  <td className="px-3 py-2 text-right font-mono">
                                    {row.withExtra !== null && row.withExtra <= 0
                                      ? <span className="text-green-600 dark:text-green-400 font-semibold">Cleared ✓</span>
                                      : <span className="text-green-600 dark:text-green-400">{format(row.withExtra ?? 0)}</span>}
                                  </td>
                                )}
                                {extraDebtPayment > 0 && (
                                  <td className="px-3 py-2 text-right font-mono text-foreground">{format(row.extraPaid ?? 0)}</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Landmark className="h-8 w-8 opacity-30" />
              <p className="text-sm">No debts tracked.</p>
              <p className="text-xs">Add debts in the Debt Tracker page to see payoff plans.</p>
            </div>
          )}
        </TabsContent>

        {/* ── Investment tab ── */}
        <TabsContent value="invest" className="mt-4">
          <Card>
            <CardHeader className="pb-3 border-b border-border px-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                  <p className="text-sm font-semibold">Investment Growth</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">{monthlySurplus > 0 ? format(fv(120)) : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">in 10 years</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 py-4 space-y-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">Annual Return Rate</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{returnRate}% p.a.</span>
                </div>
                <input type="range" min={4} max={24} step={1} value={returnRate}
                  onChange={(e) => setReturnRate(Number(e.target.value))} className="w-full accent-blue-500" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>4% · FD / PPF</span><span>12% · Equity</span><span>24% · High Risk</span>
                </div>
              </div>

              {monthlySurplus > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Wealth Growth · 10 Years</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={invChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => v >= 10_000_000 ? `${(v / 10_000_000).toFixed(1)}Cr` : v >= 100_000 ? `${(v / 100_000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip formatter={(v: unknown, name?: string) => [format(Number(v ?? 0)), name ?? ""]} contentStyle={{ fontSize: 11 }} />
                      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="Contributed" stroke="#3b82f6" strokeWidth={2} fill="url(#contribGrad)" stackId="1" dot={false} />
                      <Area type="monotone" dataKey="Growth" stroke="#8b5cf6" strokeWidth={2} fill="url(#growthGrad)" stackId="1" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {monthlySurplus > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Year</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Invested</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Returns</th>
                        <th className="text-right px-3 py-2 font-medium text-foreground font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invYearData.filter((_, i) => [0, 2, 4, 6, 9].includes(i)).map((row) => (
                        <tr key={row.yr} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">Year {row.yr}</td>
                          <td className="px-3 py-2 text-right font-mono text-blue-600 dark:text-blue-400">{format(row.contributed)}</td>
                          <td className="px-3 py-2 text-right font-mono text-violet-600 dark:text-violet-400">+{format(row.growth)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{format(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {invMilestones.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Wealth Milestones</p>
                  <div className="flex flex-wrap gap-2">
                    {invMilestones.map((ms) => (
                      <div key={ms.target} className="rounded-full bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">
                          {ms.target >= 10_000_000 ? `₹${ms.target / 10_000_000}Cr` : ms.target >= 100_000 ? `₹${ms.target / 100_000}L` : `₹${ms.target / 1000}K`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">by {projectedDate(ms.months)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {monthlySurplus > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Investing <span className="font-semibold">{format(monthlySurplus)}/mo</span> at <span className="font-semibold">{returnRate}% p.a.</span> compounded monthly.{" "}
                  Wealth multiplier at 10 years: <span className="font-bold text-violet-600 dark:text-violet-400">{(fv(120) / (monthlySurplus * 120)).toFixed(1)}×</span>
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Report tab ── */}
        <TabsContent value="report" className="mt-4">
          <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/10">
            <CardHeader className="pb-3 border-b border-violet-200 dark:border-violet-800 px-4 pt-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Intelligence Report</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Personalised action steps based on your numbers</p>
            </CardHeader>
            <CardContent className="px-4 py-4 space-y-2">
              {insights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-lg px-3 py-3 ${
                  ins.type === "good"
                    ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                    : ins.type === "warn"
                      ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                      : "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                }`}>
                  <span className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    ins.type === "good"
                      ? "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300"
                      : ins.type === "warn"
                        ? "bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300"
                        : "bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300"
                  }`}>{i + 1}</span>
                  <p className={`text-xs leading-relaxed ${
                    ins.type === "good" ? "text-green-800 dark:text-green-300"
                      : ins.type === "warn" ? "text-amber-800 dark:text-amber-300"
                        : "text-red-800 dark:text-red-300"
                  }`}>{ins.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
