"use client";

import { useEffect, useMemo } from "react";
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
  ReferenceLine,
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
} from "lucide-react";
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

function shortAmount(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
}

export default function CashflowPlanningPage() {
  const { format } = useFormatCurrency();
  const { transactions, fetchTransactions } = useTransactionsStore();
  const { patterns, fetchPatterns } = useRecurringPatternsStore();
  const { budgets, fetchBudgets } = useBudgetsStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { debts, fetchDebts } = useDebtTrackerStore();

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
  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const GOAL_PRIORITY_COLOR: Record<string, string> = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

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
    const months: Record<string, { income: number; expenses: number; savings: number }> = {};
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
        case "daily": return amount * 30.4;
        case "weekly": return amount * 4.33;
        case "biweekly": return amount * 2.17;
        case "monthly": return amount;
        case "quarterly": return amount / 3;
        case "yearly": return amount / 12;
        default: return amount;
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
        case "daily": return amount * 30.4;
        case "weekly": return amount * 4.33;
        case "biweekly": return amount * 2.17;
        case "monthly": return amount;
        case "quarterly": return amount / 3;
        case "yearly": return amount / 12;
        default: return amount;
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

    const baseIncome = Math.max(sixMonthAvg.income, recurringIncome);
    const baseExpenses = Math.max(sixMonthAvg.expenses, recurringExpenses);
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
        return { ...p, monthsFromNow, monthlyAmount: toMonthly(p.amount, p.frequency) };
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
          if (ratio >= 1) monthsLeft = 999; // payment can't cover interest
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
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

      // EMIs that closed before this month — freed amount applies from next month after closure
      const closedByNow = debtTimelines.filter((dt) => dt.monthsLeft <= i);
      const closedEMI = closedByNow.reduce((s, dt) => s + dt.minimum_payment, 0);

      // EMIs closing exactly this month (for event display only)
      const closingThisMonth = debtTimelines.filter((dt) => dt.monthsLeft === i + 1);

      // Recurring patterns ending exactly this month (for event display only)
      const patternsEndingThisMonth = endingPatterns.filter((p) => p.monthsFromNow === i + 1);

      // Savings patterns that ended before this month — reduction applies from next month
      const endedSavingsReduction = endingPatterns
        .filter((p) => p.category === "Savings" && p.monthsFromNow <= i)
        .reduce((s, p) => s + p.monthlyAmount, 0);

      // Non-savings expense patterns that ended before this month — reduction applies from next month
      const endedExpenseReduction = endingPatterns
        .filter((p) => p.type === "expense" && p.category !== "Savings" && p.monthsFromNow <= i)
        .reduce((s, p) => s + p.monthlyAmount, 0);

      const projIncome = Math.round(baseIncome);
      const projExpenses = Math.round(Math.max(baseExpenses - closedEMI - endedExpenseReduction - endedSavingsReduction, 0));
      const monthSavings = Math.round(Math.max(baseSavings - endedSavingsReduction, 0));
      const monthSurplus = projIncome - projExpenses;
      cumSurplus += monthSurplus;
      cumSaved += monthSavings;

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
        hasEvent: closingThisMonth.length > 0 || patternsEndingThisMonth.length > 0,
      };
    });

    const closingIn18 = debtTimelines.filter((dt) => dt.monthsLeft <= 18 && dt.monthsLeft < 999);
    const totalFreedEMI = closingIn18.reduce((s, dt) => s + dt.minimum_payment, 0);
    const total18Surplus = months.reduce((s, m) => s + m.Surplus, 0);

    return { months, debtTimelines, closingIn18, totalFreedEMI, total18Surplus };
  }, [sixMonthAvg, patterns, debts]);

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
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Income</p>
              <p className="font-mono text-base font-semibold text-green-400">{format(currentIncome)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{currentMonthLabel}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Expenses</p>
              <p className="font-mono text-base font-semibold text-red-400">{format(currentExpenses)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{currentMonthLabel}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Surplus</p>
              <p className={`font-mono text-base font-semibold ${surplus >= 0 ? "text-green-400" : "text-red-400"}`}>
                {surplus < 0 ? "-" : ""}{format(Math.abs(surplus))}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {savingsRate ? `${savingsRate}% saved` : "No income logged"}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Active Plans</p>
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
            <TabsTrigger value="forecast">
              18-Month Forecast
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
                  <Link href="/transactions" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <ReceiptText className="h-3 w-3" /> Transactions
                  </Link>
                  <Link href="/recurring" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" /> Recurring
                  </Link>
                  <Link href="/insights" className="text-xs text-primary hover:underline flex items-center gap-1">
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
                        <BarChart data={cashflowData} barCategoryGap="30%" barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={shortAmount} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "12px" }}
                            formatter={(v: unknown) => [format(v as number)]}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
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
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Recent</p>
                      <Link href="/transactions" className="text-xs text-primary hover:underline flex items-center gap-1">
                        All <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recentTxns.length > 0 ? (
                      <div className="divide-y divide-border">
                        {recentTxns.map((t) => (
                          <div key={t.id} className="flex items-center justify-between px-4 py-2.5">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{t.description || t.category}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {t.category}
                              </p>
                            </div>
                            <span className={`text-sm font-mono font-semibold shrink-0 ml-2 ${t.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              {t.type === "income" ? "+" : "-"}{format(t.amount)}
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
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Upcoming Recurring</p>
                      </div>
                      <Link href="/recurring" className="text-xs text-primary hover:underline flex items-center gap-1">
                        Manage <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
                      {upcomingRecurring.map((p) => (
                        <div key={p.id} className="px-4 py-3">
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          <p className={`font-mono text-sm font-semibold mt-0.5 ${p.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {p.type === "expense" ? "-" : "+"}{format(p.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                            {p.frequency} · {new Date(p.next_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
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
                      <span className="text-[10px] font-mono text-muted-foreground italic shrink-0">Forecast</span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-2 pt-4 pb-2">
                    {forecastData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={forecastData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 100_000 ? `${(v / 100_000).toFixed(1)}L` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : `${v}`} width={40} />
                          <Tooltip formatter={(v: unknown) => format(Number(v ?? 0))} contentStyle={{ fontSize: 12 }} />
                          <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                          <Area type="monotone" dataKey="Income" stroke="#22c55e" strokeWidth={2} fill="url(#incomeGrad)" dot={false} />
                          <Area type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" dot={false} />
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
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Monthly Savings Forecast</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col">
                    <div className="overflow-y-auto divide-y divide-border max-h-52">
                      {forecastData.map((m) => (
                        <div key={m.label} className="px-4 py-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">{m.label}</span>
                            <span className={`text-xs font-mono font-semibold ${m.Surplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              {m.Surplus >= 0 ? "+" : ""}{shortAmount(m.Surplus)} saved
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-mono">
                            <span className="text-green-600 dark:text-green-400">↑{shortAmount(m.Income)}</span>
                            <span>income</span>
                            <span>·</span>
                            <span className="text-red-500">↓{shortAmount(m.Expenses)}</span>
                            <span>expenses</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border shrink-0">
                      <div>
                        <span className="text-xs font-semibold">6-month total savings</span>
                        <p className="text-[10px] text-muted-foreground">Expected cumulative surplus</p>
                      </div>
                      <span className={`text-sm font-mono font-bold ${projectedAnnualSurplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {projectedAnnualSurplus >= 0 ? "+" : ""}{shortAmount(projectedAnnualSurplus)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* ── Planning section ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Planning</p>
                <div className="flex items-center gap-3">
                  <Link href="/goals" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Target className="h-3 w-3" /> Goals
                  </Link>
                  <Link href="/budgets" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Budgets
                  </Link>
                  <Link href="/debt-tracker" className="text-xs text-primary hover:underline flex items-center gap-1">
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
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Goals</p>
                        {activeGoals.length > 0 && (
                          <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{activeGoals.length}</span>
                        )}
                      </div>
                      <Link href="/goals" className="text-xs text-primary hover:underline flex items-center gap-1">
                        All <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto max-h-72">
                    {activeGoals.length > 0 ? (
                      <div className="divide-y divide-border">
                        {activeGoals.map((g) => {
                          const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
                          return (
                            <div key={g.id} className="px-4 py-3">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-sm font-medium truncate max-w-[150px]">{g.title}</span>
                                <span className="text-xs font-mono text-muted-foreground ml-2">{pct.toFixed(0)}%</span>
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
                        <Link href="/goals"><Button size="sm" variant="outline">Create Goal</Button></Link>
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
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Budgets</p>
                        {budgets.length > 0 && (
                          <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{budgets.length}</span>
                        )}
                      </div>
                      <Link href="/budgets" className="text-xs text-primary hover:underline flex items-center gap-1">
                        All <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto max-h-72">
                    {sortedBudgets.length > 0 ? (
                      <div className="divide-y divide-border">
                        {sortedBudgets.map((b) => {
                          const spent = b.spent_amount || 0;
                          const pct = b.limit_amount > 0 ? Math.min(100, (spent / b.limit_amount) * 100) : 0;
                          const over = spent > b.limit_amount;
                          return (
                            <div key={b.id} className="px-4 py-3">
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-sm font-medium truncate max-w-[130px]">{b.category}</span>
                                <span className={`text-xs font-mono ml-2 ${over ? "text-red-500" : "text-muted-foreground"}`}>
                                  {format(spent)} / {format(b.limit_amount)}
                                </span>
                              </div>
                              <Progress value={pct} className={`h-1 ${over ? "[&>div]:bg-red-500" : ""}`} />
                              {over && <p className="text-[10px] text-red-500 mt-0.5">Over by {format(spent - b.limit_amount)}</p>}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[140px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <CreditCard className="h-6 w-6 opacity-40" />
                        <p className="text-xs">No budgets set</p>
                        <Link href="/budgets"><Button size="sm" variant="outline">Set Budget</Button></Link>
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
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Debts</p>
                        {debts.length > 0 && (
                          <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{debts.length}</span>
                        )}
                      </div>
                      <Link href="/debt-tracker" className="text-xs text-primary hover:underline flex items-center gap-1">
                        All <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col">
                    {debts.length > 0 ? (
                      <div className="divide-y divide-border flex flex-col">
                        <div className="px-4 py-3 bg-muted/30 shrink-0">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Outstanding</span>
                            <span className="font-mono text-lg font-bold text-red-600 dark:text-red-400">{format(totalDebt)}</span>
                          </div>
                          {totalMinPayment > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 text-right">{format(totalMinPayment)}/mo minimum</p>
                          )}
                        </div>
                        <div className="overflow-y-auto max-h-55 divide-y divide-border">
                          {debts.map((d) => {
                            const paidPct = d.original_amount > 0 ? Math.min(100, ((d.original_amount - d.balance) / d.original_amount) * 100) : 0;
                            return (
                              <div key={d.id} className="px-4 py-3">
                                <div className="flex justify-between items-center mb-1.5">
                                  <span className="text-sm font-medium truncate max-w-[140px]">{d.name}</span>
                                  <span className="text-xs font-mono text-muted-foreground ml-2">{format(d.balance)}</span>
                                </div>
                                <Progress value={paidPct} className="h-1 [&>div]:bg-blue-500" />
                                <p className="text-[10px] text-muted-foreground mt-0.5">{paidPct.toFixed(0)}% paid off</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="h-[140px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Landmark className="h-6 w-6 opacity-40" />
                        <p className="text-xs">No debts tracked</p>
                        <Link href="/debt-tracker"><Button size="sm" variant="outline">Add Debt</Button></Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>

          </TabsContent>

          {/* ══════════════ 18-MONTH FORECAST TAB ══════════════ */}
          <TabsContent value="forecast" className="space-y-4">

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Monthly EMI Burden</p>
                  <p className="font-mono font-bold text-base text-red-600 dark:text-red-400">{format(totalMinPayment)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{debts.length} active loan{debts.length !== 1 ? "s" : ""}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Closing in 18 Months</p>
                  <p className="font-mono font-bold text-base text-amber-600 dark:text-amber-400">
                    {forecast18.closingIn18.length} loan{forecast18.closingIn18.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {forecast18.debtTimelines.filter(d => d.monthsLeft >= 999).length} ongoing beyond 18mo
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Cash Freed by Month 18</p>
                  <p className="font-mono font-bold text-base text-green-600 dark:text-green-400">
                    {format(forecast18.totalFreedEMI)}<span className="text-xs font-normal">/mo</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">After all closing EMIs end</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Projected 18-Mo Savings</p>
                  <p className={`font-mono font-bold text-base ${forecast18.total18Surplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {forecast18.total18Surplus >= 0 ? "+" : ""}{shortAmount(forecast18.total18Surplus)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Cumulative surplus</p>
                </CardContent>
              </Card>
            </div>

            {/* Loan closure timeline */}
            {debts.length > 0 && (
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <CardTitle className="text-sm font-semibold">EMI Payoff Timeline</CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Calculated using amortization formula. Months remaining = based on current balance, rate & EMI.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {forecast18.debtTimelines
                      .slice()
                      .sort((a, b) => a.monthsLeft - b.monthsLeft)
                      .map((d) => {
                        const paidPct = d.original_amount > 0
                          ? Math.min(100, ((d.original_amount - d.balance) / d.original_amount) * 100)
                          : 0;
                        const closesIn18 = d.monthsLeft < 999 && d.monthsLeft <= 18;
                        const closeDate = (() => {
                          const cd = new Date();
                          cd.setDate(1);
                          cd.setMonth(cd.getMonth() + d.monthsLeft);
                          return cd.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
                        })();

                        return (
                          <div key={d.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium truncate">{d.name}</span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] capitalize ${closesIn18 ? "text-green-600 border-green-200 dark:border-green-800" : "text-muted-foreground"}`}
                                  >
                                    {d.type}
                                  </Badge>
                                  {closesIn18 ? (
                                    <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
                                      <CheckCircle2 className="h-3 w-3" /> Closes {closeDate}
                                    </span>
                                  ) : d.monthsLeft >= 999 ? (
                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <AlertCircle className="h-3 w-3" /> Ongoing
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                                      <Clock className="h-3 w-3" /> Closes {closeDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
                                  {format(d.minimum_payment)}<span className="text-[10px] font-normal text-muted-foreground">/mo</span>
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {d.monthsLeft < 999 ? `${d.monthsLeft} mo left` : "Ongoing"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Progress value={paidPct} className="h-1.5 flex-1 [&>div]:bg-blue-500" />
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">{paidPct.toFixed(0)}% paid</span>
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">{format(d.balance)} left</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 18-month chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <CardTitle className="text-sm font-semibold">Income vs Expenses — Next 18 Months</CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Expenses drop as EMIs close. Dashed line = surplus.
                  </p>
                </CardHeader>
                <CardContent className="px-2 pt-4 pb-2">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={forecast18.months} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="f18incomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="f18expGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="f18surpGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={1} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortAmount} width={44} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }}
                        formatter={(v: unknown, name: unknown) => [format(v as number), name as string]}
                        content={({ active, payload, label: l }) => {
                          if (!active || !payload?.length) return null;
                          const monthData = forecast18.months.find(m => m.label === l);
                          return (
                            <div className="bg-card border border-border rounded-lg p-2.5 text-xs shadow-md min-w-[160px]">
                              <p className="font-semibold mb-1.5 text-foreground">{l}</p>
                              {payload.map((p) => (
                                <div key={p.name} className="flex justify-between gap-4">
                                  <span style={{ color: p.color }}>{p.name}</span>
                                  <span className="font-mono font-medium">{format(p.value as number)}</span>
                                </div>
                              ))}
                              {monthData?.hasEvent && (
                                <div className="mt-1.5 pt-1.5 border-t border-border">
                                  {monthData.closingThisMonth.map(c => (
                                    <p key={c.id} className="text-green-600 dark:text-green-400 font-medium">
                                      ✓ {c.name} EMI closes ({format(c.payment)}/mo freed)
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }}
                      />
                      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                      {/* Reference lines for EMI closure events */}
                      {forecast18.months.filter(m => m.hasEvent).map(m => (
                        <ReferenceLine
                          key={m.label}
                          x={m.label}
                          stroke="#22c55e"
                          strokeDasharray="4 2"
                          strokeWidth={1.5}
                          strokeOpacity={0.6}
                        />
                      ))}
                      <Area type="monotone" dataKey="Income" stroke="#22c55e" strokeWidth={2} fill="url(#f18incomeGrad)" dot={false} />
                      <Area type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#f18expGrad)" dot={false} />
                      <Area type="monotone" dataKey="Surplus" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 2" fill="url(#f18surpGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Cumulative savings chart */}
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <CardTitle className="text-sm font-semibold">Cumulative Savings</CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Projected savings build-up over 18 months</p>
                </CardHeader>
                <CardContent className="px-2 pt-4 pb-2">
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={forecast18.months} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={2} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortAmount} width={44} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }}
                        formatter={(v: unknown) => [format(v as number), "Cumulative Savings"]}
                      />
                      <Area type="monotone" dataKey="CumulativeSurplus" name="Cumulative Savings" stroke="#8b5cf6" strokeWidth={2} fill="url(#cumGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Month-by-month table */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <CardTitle className="text-sm font-semibold">Month-by-Month Breakdown</CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Green rows indicate months when an EMI closes and cash flow improves.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Month</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Income</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Expenses</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Surplus</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Cumulative</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">EMI Freed</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Saved</th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total Forecast</th>
                        <th className="px-4 py-2 font-medium text-muted-foreground">Event</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast18.months.map((m) => (
                        <tr
                          key={m.label}
                          className={`border-b border-border transition-colors ${m.hasEvent ? "bg-green-50 dark:bg-green-950/20" : "hover:bg-muted/30"}`}
                        >
                          <td className="px-4 py-2.5 font-medium">{m.label}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-green-600 dark:text-green-400">
                            {shortAmount(m.Income)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-red-600 dark:text-red-400">
                            {shortAmount(m.Expenses)}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-mono font-semibold ${m.Surplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {m.Surplus >= 0 ? "+" : ""}{shortAmount(m.Surplus)}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-mono ${m.CumulativeSurplus >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"}`}>
                            {shortAmount(m.CumulativeSurplus)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {m.freedEMI > 0 ? (
                              <span className="text-green-600 dark:text-green-400">+{shortAmount(m.freedEMI)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {m.Saved > 0 ? (
                              <span className="text-blue-600 dark:text-blue-400">+{shortAmount(m.Saved)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-purple-600 dark:text-purple-400">
                            {shortAmount(m.TotalForecast)}
                          </td>
                          <td className="px-4 py-2.5 space-y-0.5">
                            {m.closingThisMonth.map((c) => (
                              <span key={c.id} className="flex items-center gap-1 text-[10px] text-green-700 dark:text-green-400 font-medium">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                {c.name} done
                              </span>
                            ))}
                            {m.patternsEndingThisMonth.map((p) => (
                              <span key={p.id} className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
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
        </Tabs>
      </main>
    </div>
  );
}
