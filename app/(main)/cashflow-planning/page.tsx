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
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
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
  const activeGoals = useMemo(
    () => goals.filter((g) => g.status === "active"),
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
    const months: Record<string, { income: number; expenses: number }> = {};
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d < cutoff) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!months[key]) months[key] = { income: 0, expenses: 0 };
      if (t.type === "income") months[key].income += t.amount;
      else months[key].expenses += t.amount;
    });
    const vals = Object.values(months);
    if (vals.length === 0) return { income: 0, expenses: 0 };
    return {
      income: vals.reduce((s, m) => s + m.income, 0) / vals.length,
      expenses: vals.reduce((s, m) => s + m.expenses, 0) / vals.length,
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
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      return {
        label,
        Income: Math.round(projIncome),
        Expenses: Math.round(projExpenses),
        Surplus: Math.round(projIncome - projExpenses),
      };
    });
  }, [sixMonthAvg, patterns]);

  const projectedAnnualSurplus = forecastData.reduce((s, m) => s + m.Surplus, 0);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero Band ── */}
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-5 pb-0">
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

      <main className="px-3 sm:px-6 lg:px-8 py-4 space-y-6">

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

            {/* 6-month chart */}
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

            {/* Recent transactions */}
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
                          className={`text-sm font-mono font-semibold shrink-0 ml-2 ${
                            t.type === "income"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
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

          {/* Upcoming recurring */}
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
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <p
                        className={`font-mono text-sm font-semibold mt-0.5 ${
                          p.type === "income"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
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

        {/* ── Forecast section ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              6-Month Forecast
            </p>
            <span className="text-[10px] text-muted-foreground">Based on 6-month avg + recurring</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Forecast chart */}
            <Card className="lg:col-span-2 rounded-lg">
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Projected Cashflow
                  </p>
                  <span className="text-[10px] font-mono text-muted-foreground italic">Forecast</span>
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
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) =>
                          v >= 100_000 ? `${(v / 100_000).toFixed(1)}L` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : `${v}`
                        }
                        width={40}
                      />
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

            {/* Forecast summary */}
            <Card className="rounded-lg">
              <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground pb-2">Projection Summary</p>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border">
                {forecastData.map((m) => (
                  <div key={m.label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-muted-foreground font-medium">{m.label}</span>
                    <span className={`text-xs font-mono font-semibold ${m.Surplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {m.Surplus >= 0 ? "+" : ""}{shortAmount(m.Surplus)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                  <span className="text-xs font-semibold">6-month total</span>
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
              <CardContent className="p-0">
                {activeGoals.length > 0 ? (
                  <div className="divide-y divide-border">
                    {activeGoals.slice(0, 4).map((g) => {
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
              <CardContent className="p-0">
                {sortedBudgets.length > 0 ? (
                  <div className="divide-y divide-border">
                    {sortedBudgets.slice(0, 4).map((b) => {
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
              <CardContent className="p-0">
                {debts.length > 0 ? (
                  <div className="divide-y divide-border">
                    <div className="px-4 py-3 bg-muted/30">
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
                    {debts.slice(0, 3).map((d) => {
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
      </main>
    </div>
  );
}
