"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Percent,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactionsStore } from "@/store/transactions-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

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

function formatShort(value: number): string {
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

export default function InsightsPage() {
  const { format } = useFormatCurrency();
  const { transactions, loading, fetchTransactions } = useTransactionsStore();
  const [categorySettingsOpen, setCategorySettingsOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const currentMonthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Current month transactions
  const currentMonthTxns = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    });
  }, [transactions]);

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

  const currentInvested = useMemo(
    () =>
      currentMonthTxns
        .filter(
          (t) =>
            t.category === "Investment" ||
            t.category === "Savings" ||
            t.subtype === "investment",
        )
        .reduce((s, t) => s + t.amount, 0),
    [currentMonthTxns],
  );

  const surplus = currentIncome - currentExpenses;
  const incomeEntries = currentMonthTxns.filter(
    (t) => t.type === "income",
  ).length;
  const expenseEntries = currentMonthTxns.filter(
    (t) => t.type === "expense",
  ).length;

  // 6-month averages
  const sixMonthData = useMemo(() => {
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

    return Object.values(months);
  }, [transactions]);

  const avgMonthlyIncome =
    sixMonthData.length > 0
      ? sixMonthData.reduce((s, m) => s + m.income, 0) / sixMonthData.length
      : 0;

  const avgMonthlyExpense =
    sixMonthData.length > 0
      ? sixMonthData.reduce((s, m) => s + m.expenses, 0) / sixMonthData.length
      : 0;

  // Cashflow chart — last 6 months
  const cashflowData = useMemo(() => {
    const months: Record<
      string,
      { label: string; income: number; expenses: number }
    > = {};

    transactions.forEach((t) => {
      const d = new Date(t.date);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 5);
      cutoff.setDate(1);
      if (d < cutoff) return;

      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });

      if (!months[key]) months[key] = { label, income: 0, expenses: 0 };
      if (t.type === "income") months[key].income += t.amount;
      else months[key].expenses += t.amount;
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [transactions]);

  // Category breakdown (expenses, current month)
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    currentMonthTxns
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        cats[t.category] = (cats[t.category] || 0) + t.amount;
      });
    return Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount]) => ({ name, amount }));
  }, [currentMonthTxns]);

  const totalExpenseCats = categoryBreakdown.reduce(
    (s, c) => s + c.amount,
    0,
  );

  const surplusRate =
    currentIncome > 0 ? ((surplus / currentIncome) * 100).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Money Insights
              </h1>
              <p className="text-sm text-muted-foreground">{currentMonthLabel}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Income */}
          <Card className="border-t-2 border-t-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Income
                </span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {format(currentIncome)}
              </div>
              <div className="text-xs text-muted-foreground">
                {incomeEntries} {incomeEntries === 1 ? "entry" : "entries"} ·{" "}
                {currentMonthLabel}
              </div>
            </CardContent>
          </Card>

          {/* Expenses */}
          <Card className="border-t-2 border-t-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Expenses
                </span>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {format(currentExpenses)}
              </div>
              <div className="text-xs text-muted-foreground">
                {expenseEntries} {expenseEntries === 1 ? "entry" : "entries"} ·{" "}
                {currentMonthLabel}
              </div>
            </CardContent>
          </Card>

          {/* Invested */}
          <Card className="border-t-2 border-t-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Invested
                </span>
                <RefreshCw className="h-4 w-4 text-blue-500" />
              </div>
              {currentInvested > 0 ? (
                <div className="text-2xl font-bold text-foreground mb-1">
                  {format(currentInvested)}
                </div>
              ) : (
                <div className="text-2xl font-bold text-foreground mb-1">—</div>
              )}
              <div className="text-xs text-muted-foreground">
                {currentInvested === 0
                  ? 'Use "Investment" category to track'
                  : `${currentMonthLabel}`}
              </div>
            </CardContent>
          </Card>

          {/* Surplus */}
          <Card
            className={`border-t-2 ${surplus >= 0 ? "border-t-purple-500" : "border-t-orange-500"}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Surplus
                </span>
                <Percent
                  className={`h-4 w-4 ${surplus >= 0 ? "text-purple-500" : "text-orange-500"}`}
                />
              </div>
              <div
                className={`text-2xl font-bold mb-1 ${surplus >= 0 ? "text-foreground" : "text-red-500"}`}
              >
                {format(Math.abs(surplus))}
                {surplus < 0 && (
                  <span className="text-sm font-normal ml-1 text-red-400">deficit</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {currentIncome === 0
                  ? "No income logged yet"
                  : surplusRate
                    ? `${surplusRate}% of income saved`
                    : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 6-Month Averages */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-950/40">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-0.5">
                    Avg Monthly Income
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {format(avgMonthlyIncome)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    6-month average
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-950/40">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground mb-0.5">
                    Avg Monthly Expense
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {format(avgMonthlyExpense)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    6-month average
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cashflow Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {cashflowData.length}-Month Cashflow · Income vs Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cashflowData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No transaction data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={cashflowData}
                  barCategoryGap="30%"
                  barGap={4}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(128,128,128,0.15)"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => formatShort(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                    formatter={(value: number) => [format(value)]}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
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
            )}
          </CardContent>
        </Card>

        {/* Category Settings */}
        <Card>
          <button
            className="w-full flex items-center justify-between p-4 text-left"
            onClick={() => setCategorySettingsOpen((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">
                Category Breakdown
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                ({currentMonthLabel})
              </span>
            </div>
            {categorySettingsOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {categorySettingsOpen && (
            <CardContent className="pt-0 pb-4 px-4">
              {categoryBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No expenses this month
                </p>
              ) : (
                <div className="space-y-3">
                  {categoryBreakdown.map(({ name, amount }) => {
                    const pct =
                      totalExpenseCats > 0
                        ? (amount / totalExpenseCats) * 100
                        : 0;
                    const color =
                      CATEGORY_COLORS[name] ?? CATEGORY_COLORS["Other"];
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-sm font-medium text-foreground">
                              {name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              {pct.toFixed(1)}%
                            </span>
                            <span className="text-sm font-semibold text-foreground">
                              {format(amount)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
}
