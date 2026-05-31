"use client";

import { useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
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
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Zap,
  Target,
  Wallet,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactionsStore } from "@/store/transactions-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { ListPageSkeleton } from "@/components/ui/skeleton";

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

function DeltaBadge({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const isPositive = invert ? pct < 0 : pct > 0;
  const abs = Math.abs(pct).toFixed(1);
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
        isPositive
          ? "bg-green-500/20 text-green-400"
          : "bg-red-500/20 text-red-400"
      }`}
    >
      {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {abs}%
    </span>
  );
}

export default function InsightsPage() {
  const { format } = useFormatCurrency();
  const { transactions, loading, fetchTransactions } = useTransactionsStore();

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = new Date();
  const currentMonthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // ── Current month ──
  const currentMonthTxns = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [transactions],
  );

  // ── Last month ──
  const lastMonthTxns = useMemo(() => {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const currentIncome = useMemo(
    () => currentMonthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    [currentMonthTxns],
  );

  const currentExpenses = useMemo(
    () => currentMonthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [currentMonthTxns],
  );

  const lastIncome = useMemo(
    () => lastMonthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    [lastMonthTxns],
  );

  const lastExpenses = useMemo(
    () => lastMonthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [lastMonthTxns],
  );

  const surplus = currentIncome - currentExpenses;
  const lastSurplus = lastIncome - lastExpenses;
  const savingsRate = currentIncome > 0 ? (surplus / currentIncome) * 100 : 0;
  const lastSavingsRate = lastIncome > 0 ? (lastSurplus / lastIncome) * 100 : 0;

  // ── 6-month data ──
  const sixMonthMonthlyData = useMemo(() => {
    const months: Record<string, { key: string; label: string; income: number; expenses: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      months[key] = { key, label, income: 0, expenses: 0 };
    }
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!months[key]) return;
      if (t.type === "income") months[key].income += t.amount;
      else months[key].expenses += t.amount;
    });
    return Object.values(months);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);

  const sixMonthAvgIncome =
    sixMonthMonthlyData.length > 0
      ? sixMonthMonthlyData.reduce((s, m) => s + m.income, 0) / sixMonthMonthlyData.length
      : 0;
  const sixMonthAvgExpenses =
    sixMonthMonthlyData.length > 0
      ? sixMonthMonthlyData.reduce((s, m) => s + m.expenses, 0) / sixMonthMonthlyData.length
      : 0;
  const sixMonthAvgSurplus = sixMonthAvgIncome - sixMonthAvgExpenses;

  // ── Spending velocity ──
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const dailyAvgSpend = dayOfMonth > 0 ? currentExpenses / dayOfMonth : 0;
  const projectedMonthEnd = dailyAvgSpend * daysInMonth;

  // ── Top 5 expenses this month ──
  const top5Expenses = useMemo(
    () =>
      currentMonthTxns
        .filter((t) => t.type === "expense")
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [currentMonthTxns],
  );

  // ── Category breakdown current month ──
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

  // ── Category breakdown last month ──
  const lastCategoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    lastMonthTxns
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        cats[t.category] = (cats[t.category] || 0) + t.amount;
      });
    return cats;
  }, [lastMonthTxns]);

  const totalExpenseCats = categoryBreakdown.reduce((s, c) => s + c.amount, 0);

  // ── Spending by day of week ──
  const spendByDow = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const totals = [0, 0, 0, 0, 0, 0, 0];
    currentMonthTxns
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const d = new Date(t.date);
        const dow = (d.getDay() + 6) % 7; // Mon=0
        totals[dow] += t.amount;
      });
    return days.map((label, i) => ({ label, amount: totals[i] }));
  }, [currentMonthTxns]);

  // ── Biggest single expense ──
  const biggestExpense = useMemo(
    () =>
      currentMonthTxns
        .filter((t) => t.type === "expense")
        .sort((a, b) => b.amount - a.amount)[0] ?? null,
    [currentMonthTxns],
  );

  // ── Savings rate per month chart ──
  const savingsRateData = useMemo(
    () =>
      sixMonthMonthlyData.map((m) => ({
        label: m.label,
        rate: m.income > 0 ? parseFloat(((( m.income - m.expenses) / m.income) * 100).toFixed(1)) : 0,
      })),
    [sixMonthMonthlyData],
  );

  // ── Month-over-month table ──
  const momTable = useMemo(
    () =>
      sixMonthMonthlyData.map((m) => {
        const s = m.income - m.expenses;
        const sr = m.income > 0 ? ((s / m.income) * 100).toFixed(1) : "—";
        return { ...m, surplus: s, savingsRate: sr };
      }),
    [sixMonthMonthlyData],
  );

  // ── Income sources ──
  const incomeSources = useMemo(() => {
    const cats: Record<string, number> = {};
    currentMonthTxns
      .filter((t) => t.type === "income")
      .forEach((t) => {
        cats[t.category] = (cats[t.category] || 0) + t.amount;
      });
    return Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount]) => ({ name, amount }));
  }, [currentMonthTxns]);

  // ── Income by month ──
  const incomeByMonth = useMemo(
    () => sixMonthMonthlyData.map((m) => ({ label: m.label, income: m.income })),
    [sixMonthMonthlyData],
  );

  // ── Income stats ──
  const incomeTxns = useMemo(
    () => currentMonthTxns.filter((t) => t.type === "income"),
    [currentMonthTxns],
  );
  const avgIncomeTxnSize = incomeTxns.length > 0 ? currentIncome / incomeTxns.length : 0;

  // ── Income consistency: months with income > 0 out of last 6 ──
  const incomeConsistency = sixMonthMonthlyData.filter((m) => m.income > 0).length;

  if (loading && transactions.length === 0) {
    return <ListPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero Band ── */}
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-0">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Money Insights</p>
            <p className="text-sm font-medium text-white">{currentMonthLabel}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/60 border-t border-slate-700/60">
            {/* Income */}
            <div className="px-3 py-4 space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Income</p>
              <p className="font-mono text-lg font-bold text-green-400">{format(currentIncome)}</p>
              <DeltaBadge current={currentIncome} previous={lastIncome} />
            </div>
            {/* Expenses */}
            <div className="px-3 py-4 space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Expenses</p>
              <p className="font-mono text-lg font-bold text-red-400">{format(currentExpenses)}</p>
              <DeltaBadge current={currentExpenses} previous={lastExpenses} invert />
            </div>
            {/* Surplus */}
            <div className="px-3 py-4 space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Surplus</p>
              <p className={`font-mono text-lg font-bold ${surplus >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {surplus < 0 ? "-" : ""}{format(Math.abs(surplus))}
              </p>
              <DeltaBadge current={surplus} previous={lastSurplus} />
            </div>
            {/* Savings Rate */}
            <div className="px-3 py-4 space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Savings Rate</p>
              <p className={`font-mono text-lg font-bold ${savingsRate >= 20 ? "text-emerald-400" : savingsRate >= 10 ? "text-yellow-400" : "text-red-400"}`}>
                {currentIncome > 0 ? `${savingsRate.toFixed(1)}%` : "—"}
              </p>
              {lastSavingsRate > 0 && (
                <DeltaBadge current={savingsRate} previous={lastSavingsRate} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <main className="px-4 sm:px-6 lg:px-8 py-4">
        <Tabs defaultValue="overview">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="spending" className="text-xs">Spending</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs">Trends</TabsTrigger>
            <TabsTrigger value="income" className="text-xs">Income</TabsTrigger>
          </TabsList>

          {/* ══════════════════════ TAB 1: OVERVIEW ══════════════════════ */}
          <TabsContent value="overview" className="space-y-4">

            {/* Monthly comparison */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Monthly Comparison</p>
              </CardHeader>
              <CardContent className="px-4 pt-3 pb-4">
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Last Month</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">This Month</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">6mo Avg</div>
                </div>
                {[
                  { label: "Income", last: lastIncome, curr: currentIncome, avg: sixMonthAvgIncome, color: "text-green-600 dark:text-green-400" },
                  { label: "Expenses", last: lastExpenses, curr: currentExpenses, avg: sixMonthAvgExpenses, color: "text-red-600 dark:text-red-400" },
                  { label: "Surplus", last: lastSurplus, curr: surplus, avg: sixMonthAvgSurplus, color: surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400" },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-3 gap-2 py-2 border-t border-border/50 items-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">{row.label}</p>
                      <p className="font-mono text-sm font-medium">{formatShort(row.last)}</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-mono text-sm font-bold ${row.color}`}>{formatShort(row.curr)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm text-muted-foreground">{formatShort(row.avg)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Spending velocity */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-yellow-500" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Spending Velocity</p>
                </div>
              </CardHeader>
              <CardContent className="px-4 pt-3 pb-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Daily Avg</p>
                    <p className="font-mono text-base font-bold text-foreground">{formatShort(dailyAvgSpend)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">per day</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Projected</p>
                    <p className={`font-mono text-base font-bold ${projectedMonthEnd > currentIncome && currentIncome > 0 ? "text-red-500" : "text-foreground"}`}>
                      {formatShort(projectedMonthEnd)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">month-end</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Days Left</p>
                    <p className="font-mono text-base font-bold text-foreground">{daysLeft}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">in {now.toLocaleDateString("en-US", { month: "short" })}</p>
                  </div>
                </div>
                {currentIncome > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Expense ratio</span>
                      <span>{currentIncome > 0 ? ((currentExpenses / currentIncome) * 100).toFixed(1) : 0}% of income</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${Math.min((currentExpenses / currentIncome) * 100, 100)}%` }}
                      />
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.max(Math.min((surplus / currentIncome) * 100, 100), 0)}%` }}
                      />
                    </div>
                    <div className="flex gap-4 mt-1.5">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-red-500" />Spent</span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />Saved</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top 5 transactions */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Top Expenses This Month</p>
                </div>
              </CardHeader>
              <CardContent className="px-4 pt-2 pb-4">
                {top5Expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No expenses this month</p>
                ) : (
                  <div className="space-y-1">
                    {top5Expenses.map((t, i) => (
                      <div key={t.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                        <span className="text-[10px] font-mono text-muted-foreground w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.description || t.category}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="inline-block w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: CATEGORY_COLORS[t.category] ?? CATEGORY_COLORS["Other"] }}
                            />
                            <span className="text-[10px] text-muted-foreground">{t.category}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                        <p className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">{format(t.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════ TAB 2: SPENDING ══════════════════════ */}
          <TabsContent value="spending" className="space-y-4">

            {/* Donut + category list */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Expenses by Category · {currentMonthLabel}</p>
              </CardHeader>
              <CardContent className="px-4 pt-3 pb-4">
                {categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No expenses this month</p>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={categoryBreakdown}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={2}
                          >
                            {categoryBreakdown.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={CATEGORY_COLORS[entry.name] ?? CATEGORY_COLORS["Other"]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: 12,
                            }}
                            formatter={(value: unknown) => [format(value as number)]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-2">
                      {categoryBreakdown.map(({ name, amount }) => {
                        const pct = totalExpenseCats > 0 ? (amount / totalExpenseCats) * 100 : 0;
                        const color = CATEGORY_COLORS[name] ?? CATEGORY_COLORS["Other"];
                        const lastAmt = lastCategoryBreakdown[name] ?? 0;
                        return (
                          <div key={name}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-sm font-medium">{name}</span>
                                {lastAmt > 0 && (
                                  <DeltaBadge current={amount} previous={lastAmt} invert />
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-[10px] text-muted-foreground">{pct.toFixed(1)}%</span>
                                <span className="font-mono text-sm font-semibold">{format(amount)}</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Spending by day of week */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Spending by Day of Week</p>
                </div>
              </CardHeader>
              <CardContent className="pt-3 pb-2">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={spendByDow} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      formatter={(value: unknown) => [format(value as number), "Spent"]}
                    />
                    <Bar dataKey="amount" name="Spent" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Biggest single expense */}
            {biggestExpense && (
              <Card className="border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10">
                <CardContent className="px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                      <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Biggest Single Expense</p>
                      <p className="text-base font-semibold truncate">{biggestExpense.description || biggestExpense.category}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[biggestExpense.category] ?? CATEGORY_COLORS["Other"] }}
                        />
                        <span className="text-[10px] text-muted-foreground">{biggestExpense.category}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(biggestExpense.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <p className="font-mono text-lg font-bold text-red-600 dark:text-red-400 shrink-0">{format(biggestExpense.amount)}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══════════════════════ TAB 3: TRENDS ══════════════════════ */}
          <TabsContent value="trends" className="space-y-4">

            {/* Cashflow bar chart */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">6-Month Cashflow</p>
                </div>
              </CardHeader>
              <CardContent className="pt-3 pb-2">
                {sixMonthMonthlyData.every((m) => m.income === 0 && m.expenses === 0) ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={sixMonthMonthlyData} barCategoryGap="30%" barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                        formatter={(value: unknown) => [format(value as number)]}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Savings rate line chart */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Savings Rate Trend</p>
                </div>
              </CardHeader>
              <CardContent className="pt-3 pb-2">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={savingsRateData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      formatter={(value: unknown) => [`${value}%`, "Savings Rate"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#10b981" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* MoM table */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Month-over-Month Summary</p>
              </CardHeader>
              <CardContent className="px-0 pt-0 pb-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Month</th>
                      <th className="text-right px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Income</th>
                      <th className="text-right px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Expenses</th>
                      <th className="text-right px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Surplus</th>
                      <th className="text-right px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {momTable.map((m, i) => (
                      <tr key={m.key} className={`border-b border-border/50 last:border-0 ${i === momTable.length - 1 ? "bg-muted/30" : ""}`}>
                        <td className="px-4 py-2.5 font-medium">{m.label}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-green-600 dark:text-green-400">{formatShort(m.income)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-red-600 dark:text-red-400">{formatShort(m.expenses)}</td>
                        <td className={`px-3 py-2.5 text-right font-mono font-semibold ${m.surplus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {m.surplus < 0 ? "-" : ""}{formatShort(Math.abs(m.surplus))}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-mono font-semibold ${
                          m.savingsRate === "—"
                            ? "text-muted-foreground"
                            : parseFloat(m.savingsRate as string) >= 20
                            ? "text-emerald-600 dark:text-emerald-400"
                            : parseFloat(m.savingsRate as string) >= 10
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          {m.savingsRate === "—" ? "—" : `${m.savingsRate}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════════════ TAB 4: INCOME ══════════════════════ */}
          <TabsContent value="income" className="space-y-4">

            {/* Income stats row */}
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-3.5 w-3.5 text-green-500" />
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg Transaction</p>
                  </div>
                  <p className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                    {avgIncomeTxnSize > 0 ? formatShort(avgIncomeTxnSize) : "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">per income entry</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-3.5 w-3.5 text-blue-500" />
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Transactions</p>
                  </div>
                  <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">{incomeTxns.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">this month</p>
                </CardContent>
              </Card>
            </div>

            {/* Income consistency */}
            <Card>
              <CardContent className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Income Consistency</p>
                  </div>
                  <span className={`font-mono text-sm font-bold ${incomeConsistency >= 5 ? "text-green-600 dark:text-green-400" : incomeConsistency >= 3 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}>
                    {incomeConsistency}/6
                  </span>
                </div>
                <div className="flex gap-1">
                  {sixMonthMonthlyData.map((m) => (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                      <div className={`h-2 w-full rounded-full ${m.income > 0 ? "bg-green-500" : "bg-muted"}`} />
                      <span className="text-[9px] text-muted-foreground">{m.label.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {incomeConsistency === 6
                    ? "Income logged every month — great consistency!"
                    : `Income recorded in ${incomeConsistency} of the last 6 months`}
                </p>
              </CardContent>
            </Card>

            {/* Income sources donut */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Income Sources · {currentMonthLabel}</p>
              </CardHeader>
              <CardContent className="px-4 pt-3 pb-4">
                {incomeSources.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No income this month</p>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={incomeSources}
                            dataKey="amount"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={2}
                          >
                            {incomeSources.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={CATEGORY_COLORS[entry.name] ?? CATEGORY_COLORS["Other"]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: 12,
                            }}
                            formatter={(value: unknown) => [format(value as number)]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-1">
                      {incomeSources.map(({ name, amount }) => {
                        const pct = currentIncome > 0 ? (amount / currentIncome) * 100 : 0;
                        const color = CATEGORY_COLORS[name] ?? CATEGORY_COLORS["Other"];
                        return (
                          <div key={name} className="flex items-center gap-3">
                            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-sm flex-1">{name}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">{pct.toFixed(1)}%</span>
                            <span className="font-mono text-sm font-semibold text-green-600 dark:text-green-400">{format(amount)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Income by month bar */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Income by Month</p>
              </CardHeader>
              <CardContent className="pt-3 pb-2">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={incomeByMonth} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatShort} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      formatter={(value: unknown) => [format(value as number), "Income"]}
                    />
                    <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
