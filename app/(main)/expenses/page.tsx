"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  Filter,
  X,
  ArrowUpDown,
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Minus,
  PiggyBank,
} from "lucide-react";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { useTransactionsStore, type Transaction } from "@/store/transactions-store";
import { useGoalsStore } from "@/store/goals-store";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { ListPageSkeleton } from "@/components/ui/skeleton";

// ─── Category config ──────────────────────────────────────────────────────────

const EXPENSE_CAT_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  Food:           { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", hex: "#f97316" },
  Transportation: { bg: "bg-blue-100 dark:bg-blue-900/30",   text: "text-blue-700 dark:text-blue-400",   hex: "#3b82f6" },
  Entertainment:  { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", hex: "#a855f7" },
  Bills:          { bg: "bg-red-100 dark:bg-red-900/30",     text: "text-red-700 dark:text-red-400",     hex: "#ef4444" },
  Shopping:       { bg: "bg-pink-100 dark:bg-pink-900/30",   text: "text-pink-700 dark:text-pink-400",   hex: "#ec4899" },
  Healthcare:     { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", hex: "#22c55e" },
  Savings:        { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", hex: "#10b981" },
  Education:      { bg: "bg-cyan-100 dark:bg-cyan-900/30",   text: "text-cyan-700 dark:text-cyan-400",   hex: "#06b6d4" },
  Travel:         { bg: "bg-sky-100 dark:bg-sky-900/30",     text: "text-sky-700 dark:text-sky-400",     hex: "#0ea5e9" },
  Other:          { bg: "bg-slate-100 dark:bg-slate-800",    text: "text-slate-700 dark:text-slate-400", hex: "#6366f1" },
};
const INCOME_CAT_COLORS: Record<string, { bg: string; text: string; hex: string }> = {
  Salary:     { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", hex: "#10b981" },
  Freelance:  { bg: "bg-blue-100 dark:bg-blue-900/30",       text: "text-blue-700 dark:text-blue-400",       hex: "#3b82f6" },
  Investment: { bg: "bg-purple-100 dark:bg-purple-900/30",   text: "text-purple-700 dark:text-purple-400",   hex: "#a855f7" },
  Business:   { bg: "bg-amber-100 dark:bg-amber-900/30",     text: "text-amber-700 dark:text-amber-400",     hex: "#f59e0b" },
  Other:      { bg: "bg-slate-100 dark:bg-slate-800",        text: "text-slate-700 dark:text-slate-400",     hex: "#6366f1" },
};

function getCat(category: string, type: "expense" | "income") {
  const map = type === "expense" ? EXPENSE_CAT_COLORS : INCOME_CAT_COLORS;
  return map[category] ?? EXPENSE_CAT_COLORS.Other;
}

function fmtShort(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
}

// ─── Group transactions by date ───────────────────────────────────────────────

function groupByDate(items: Transaction[]) {
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1);
  const groups = new Map<string, Transaction[]>();
  for (const t of items) {
    const d = new Date(t.date); d.setHours(0,0,0,0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else label = d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(t);
  }
  return groups;
}

// ─── Transaction list ─────────────────────────────────────────────────────────

function TransactionList({
  type, transactions, selectedMonth, onMonthChange, onAdd,
}: {
  type: "expense" | "income";
  transactions: Transaction[];
  selectedMonth: Date;
  onMonthChange: (d: Date) => void;
  onAdd: () => void;
}) {
  const { format } = useFormatCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  const isExpense = type === "expense";
  const amountColor = isExpense ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400";
  const prefix = isExpense ? "-" : "+";

  const monthItems = useMemo(() => {
    const m = selectedMonth.getMonth(), y = selectedMonth.getFullYear();
    return transactions.filter((t) => {
      if (t.type !== type) return false;
      const d = new Date(t.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
  }, [transactions, selectedMonth, type]);

  const prevMonthTotal = useMemo(() => {
    const prev = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    return transactions.filter((t) => {
      if (t.type !== type) return false;
      const d = new Date(t.date);
      return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
    }).reduce((s, t) => s + t.amount, 0);
  }, [transactions, selectedMonth, type]);

  const monthTotal = useMemo(() => monthItems.reduce((s, t) => s + t.amount, 0), [monthItems]);
  const momChange = prevMonthTotal > 0 ? ((monthTotal - prevMonthTotal) / prevMonthTotal) * 100 : null;

  const categories = useMemo(
    () => [...new Set(monthItems.map((t) => t.category))].filter(Boolean).sort(),
    [monthItems],
  );

  const filtered = useMemo(() => {
    let list = monthItems;
    if (filterCategory !== "all") list = list.filter((t) => t.category === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      const da = new Date(a.date).getTime(), db = new Date(b.date).getTime();
      return sortOrder === "desc" ? db - da : da - db;
    });
  }, [monthItems, filterCategory, searchQuery, sortOrder]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const hasActiveFilters = filterCategory !== "all" || !!searchQuery.trim();

  // Top 3 categories for quick filter pills
  const topCats = useMemo(() => {
    const map: Record<string, number> = {};
    monthItems.forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([cat]) => cat);
  }, [monthItems]);

  return (
    <div className="space-y-3">
      {/* Month navigator + stats strip */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold min-w-28 text-center">
            {selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => onMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <Button onClick={onAdd} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add {isExpense ? "Expense" : "Income"}
        </Button>
      </div>

      {/* Summary pill */}
      <div className={`rounded-2xl p-4 ${isExpense ? "bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30" : "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30"}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
              Total {isExpense ? "Spent" : "Earned"}
            </p>
            <p className={`text-2xl font-bold font-mono ${isExpense ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {prefix}{format(monthTotal)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{monthItems.length} transactions</p>
          </div>
          {momChange !== null && (
            <div className="text-right">
              <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isExpense
                  ? (momChange > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400")
                  : (momChange >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")
              }`}>
                {momChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : momChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {Math.abs(momChange).toFixed(1)}% vs last month
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{format(prevMonthTotal)} prev</p>
            </div>
          )}
        </div>
      </div>

      {/* Category quick filters */}
      {topCats.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilterCategory("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filterCategory === "all" ? "bg-foreground text-background border-foreground" : "bg-card border-border text-muted-foreground hover:border-foreground/40"}`}
          >
            All
          </button>
          {topCats.map((cat) => {
            const c = getCat(cat, type);
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filterCategory === cat ? "border-foreground bg-foreground text-background" : "bg-card border-border text-muted-foreground hover:border-foreground/40"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0`} style={{ backgroundColor: c.hex }} />
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Search + sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={`Search ${isExpense ? "expenses" : "income"}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-colors ${showFilters || hasActiveFilters ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <Filter className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
          className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/40 border text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Category:</span>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-7 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setFilterCategory("all"); setSearchQuery(""); }}>
              <X className="h-3 w-3 mr-1" />Clear
            </Button>
          )}
        </div>
      )}

      {/* Transaction list — grouped by date */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            {isExpense ? <TrendingDown className="h-7 w-7 text-muted-foreground/40" /> : <TrendingUp className="h-7 w-7 text-muted-foreground/40" />}
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            {hasActiveFilters ? "No results match your filters" : `No ${isExpense ? "expenses" : "income"} this month`}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {!hasActiveFilters && `Tap "Add ${isExpense ? "Expense" : "Income"}" to record one`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([dateLabel, items]) => (
            <div key={dateLabel}>
              {/* Date group header */}
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground">{dateLabel}</span>
                <span className={`text-xs font-mono font-semibold ${amountColor}`}>
                  {prefix}{format(items.reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              {/* Transactions */}
              <div className="rounded-2xl border bg-card overflow-hidden divide-y divide-border/60">
                {items.map((item) => {
                  const cat = getCat(item.category, type);
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${cat.bg} ${cat.text}`}>
                        {item.category.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate leading-snug">{item.description || item.category}</p>
                        <p className="text-[11px] text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold font-mono ${amountColor}`}>{prefix}{format(item.amount)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Footer total */}
          <div className="flex items-center justify-between px-1 pt-1 pb-2 border-t">
            <span className="text-xs text-muted-foreground">{filtered.length} {isExpense ? "expense" : "income"}{filtered.length !== 1 ? "s" : ""}</span>
            <span className={`text-sm font-bold font-mono ${amountColor}`}>{prefix}{format(filtered.reduce((s, t) => s + t.amount, 0))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Summary / Overview tab ───────────────────────────────────────────────────

function SummaryTab({ transactions, selectedMonth }: { transactions: Transaction[]; selectedMonth: Date }) {
  const { format } = useFormatCurrency();

  const sixMonths = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - (5 - i), 1);
      const m = d.getMonth(), y = d.getFullYear();
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const txns = transactions.filter((t) => { const td = new Date(t.date); return td.getMonth() === m && td.getFullYear() === y; });
      const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const expenses = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      const savings = income - expenses;
      const rate = income > 0 ? (savings / income) * 100 : 0;
      return { label, income, expenses, savings, rate, month: d };
    });
  }, [transactions, selectedMonth]);

  const current = sixMonths[sixMonths.length - 1];
  const prev = sixMonths[sixMonths.length - 2];

  const expenseCategoryData = useMemo(() => {
    const m = selectedMonth.getMonth(), y = selectedMonth.getFullYear();
    const map: Record<string, number> = {};
    transactions.filter((t) => {
      if (t.type !== "expense") return false;
      const d = new Date(t.date);
      return d.getMonth() === m && d.getFullYear() === y;
    }).forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({
      name,
      value,
      fill: EXPENSE_CAT_COLORS[name]?.hex ?? "#6366f1",
    }));
  }, [transactions, selectedMonth]);

  const totalExpenses = expenseCategoryData.reduce((s, c) => s + c.value, 0);

  const savingsRateDelta = prev && prev.income > 0 ? current.rate - prev.rate : null;

  // Savings rate gauge arc (0-100 mapped to 0-180 deg)

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Income", value: format(current.income), sub: prev.income > 0 ? `${((current.income - prev.income) / prev.income * 100).toFixed(1)}% vs last` : "—",
            positive: current.income >= prev.income, color: "text-emerald-600 dark:text-emerald-400",
            bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30",
            icon: ArrowUpRight,
          },
          {
            label: "Expenses", value: format(current.expenses), sub: prev.expenses > 0 ? `${((current.expenses - prev.expenses) / prev.expenses * 100).toFixed(1)}% vs last` : "—",
            positive: current.expenses <= prev.expenses, color: "text-red-600 dark:text-red-400",
            bg: "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30",
            icon: ArrowDownRight,
          },
          {
            label: "Saved", value: `${current.savings >= 0 ? "+" : "-"}${format(Math.abs(current.savings))}`, sub: current.savings >= 0 ? "surplus" : "deficit",
            positive: current.savings >= 0, color: current.savings >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500",
            bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30",
            icon: Wallet,
          },
          {
            label: "Savings Rate", value: current.income > 0 ? `${current.rate.toFixed(1)}%` : "—",
            sub: savingsRateDelta !== null ? `${savingsRateDelta >= 0 ? "+" : ""}${savingsRateDelta.toFixed(1)}pp vs last` : "—",
            positive: (savingsRateDelta ?? 0) >= 0, color: current.rate >= 20 ? "text-emerald-600 dark:text-emerald-400" : current.rate >= 10 ? "text-amber-600" : "text-red-500",
            bg: "bg-muted/40 border-border/50",
            icon: PiggyBank,
          },
        ].map(({ label, value, sub, positive, color, bg, icon: Icon }) => (
          <div key={label} className={`rounded-2xl border p-4 space-y-2 ${bg}`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon className={`h-3.5 w-3.5 ${color}`} />
              </div>
            </div>
            <p className={`text-xl font-bold font-mono leading-none ${color}`}>{value}</p>
            <p className={`text-[10px] font-medium ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Income vs Expenses area chart */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">6-Month Cashflow</p>
            <p className="text-xs text-muted-foreground mt-0.5">Income vs Expenses trend</p>
          </div>
        </div>
        <div className="p-4">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={sixMonths} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={fmtShort} width={50} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                formatter={(v: unknown) => [format(v as number)]}
              />
              <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#incomeGrad)" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expenseGrad)" dot={false} activeDot={{ r: 4, fill: "#ef4444" }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings rate + category breakdown side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Savings rate bar chart */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b">
            <p className="text-sm font-semibold">Savings Rate Trend</p>
            <p className="text-xs text-muted-foreground mt-0.5">% of income saved each month</p>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={sixMonths} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: unknown) => [`${(v as number).toFixed(1)}%`, "Savings Rate"]}
                />
                <Bar dataKey="rate" name="Rate" radius={[4, 4, 0, 0]}>
                  {sixMonths.map((m) => (
                    <Cell key={m.label} fill={m.rate >= 20 ? "#10b981" : m.rate >= 10 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Target line label */}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-muted-foreground">Target: ≥20% is healthy</span>
              <div className="h-px flex-1 border-t border-dashed border-muted-foreground/30" />
            </div>
          </div>
        </div>

        {/* Expense category donut */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b">
            <p className="text-sm font-semibold">Expense Breakdown</p>
            <p className="text-xs text-muted-foreground mt-0.5">{selectedMonth.toLocaleDateString("en-US", { month: "long" })}</p>
          </div>
          <div className="p-4">
            {expenseCategoryData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No expenses this month</div>
            ) : (
              <div className="flex gap-4 items-center">
                <div className="w-36 h-36 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseCategoryData} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={60} paddingAngle={2} strokeWidth={0}>
                        {expenseCategoryData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 11 }} formatter={(v: unknown) => [format(v as number)]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  {expenseCategoryData.slice(0, 5).map(({ name, value, fill }) => {
                    const pct = totalExpenses > 0 ? (value / totalExpenses) * 100 : 0;
                    return (
                      <div key={name} className="space-y-0.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: fill }} />
                            <span className="truncate text-muted-foreground">{name}</span>
                          </span>
                          <span className="font-mono font-semibold shrink-0 ml-1">{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: fill }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Month-over-month table */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b flex items-center justify-between">
          <p className="text-sm font-semibold">Month-over-Month</p>
          <p className="text-xs text-muted-foreground">Last 6 months</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Month</th>
                <th className="px-3 py-3 text-right font-medium">Income</th>
                <th className="px-3 py-3 text-right font-medium">Expenses</th>
                <th className="px-3 py-3 text-right font-medium">Saved</th>
                <th className="px-4 py-3 text-right font-medium">Rate</th>
              </tr>
            </thead>
            <tbody>
              {[...sixMonths].reverse().map((m, i) => (
                <tr key={m.label} className={`border-b border-border/40 last:border-0 transition-colors hover:bg-muted/20 ${i === 0 ? "bg-muted/20" : ""}`}>
                  <td className="px-4 py-3 font-medium">{m.label}{i === 0 && <span className="ml-2 px-1.5 py-0.5 text-[9px] rounded-full bg-primary/10 text-primary font-semibold">Current</span>}</td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{m.income > 0 ? `+${format(m.income)}` : "—"}</td>
                  <td className="px-3 py-3 text-right font-mono text-red-500">{m.expenses > 0 ? `-${format(m.expenses)}` : "—"}</td>
                  <td className={`px-3 py-3 text-right font-mono font-semibold ${m.savings >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500"}`}>
                    {m.income > 0 || m.expenses > 0 ? `${m.savings < 0 ? "-" : "+"}${format(Math.abs(m.savings))}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {m.income > 0 ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] ${m.rate >= 20 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : m.rate >= 10 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                        {m.rate.toFixed(1)}%
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MoneyFlowPage() {
  const searchParams = useSearchParams();
  const { format } = useFormatCurrency();
  const { transactions, loading, fetchTransactions } = useTransactionsStore();
  const { fetchGoals } = useGoalsStore();

  const [activeTab, setActiveTab] = useState<"expenses" | "income" | "overview">(
    () => searchParams.get("tab") === "income" ? "income" : searchParams.get("tab") === "overview" || searchParams.get("tab") === "summary" ? "overview" : "expenses"
  );
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<"expense" | "income">("expense");

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = (type: "expense" | "income") => { setAddType(type); setIsAddDialogOpen(true); };

  const headerStats = useMemo(() => {
    const m = selectedMonth.getMonth(), y = selectedMonth.getFullYear();
    const txns = transactions.filter((t) => { const d = new Date(t.date); return d.getMonth() === m && d.getFullYear() === y; });
    const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const savings = income - expenses;
    const rate = income > 0 ? (savings / income) * 100 : 0;
    const spentPct = income > 0 ? Math.min(100, (expenses / income) * 100) : 0;
    const savedPct = income > 0 ? Math.max(0, (savings / income) * 100) : 0;
    return { income, expenses, savings, rate, spentPct, savedPct };
  }, [transactions, selectedMonth]);

  if (loading && transactions.length === 0) return <ListPageSkeleton />;

  const tabs = [
    { id: "expenses" as const, label: "Expenses", icon: TrendingDown, color: "text-red-500" },
    { id: "income" as const, label: "Income", icon: TrendingUp, color: "text-emerald-500" },
    { id: "overview" as const, label: "Overview", icon: Wallet, color: "text-blue-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-0">
          {/* Top row */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Money Flow</p>
              <p className="text-xs text-slate-500">
                {selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white gap-1.5 h-8"
                onClick={() => openAdd("income")}>
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                Income
              </Button>
              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white gap-1.5 h-8"
                onClick={() => openAdd("expense")}>
                <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                Expense
              </Button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Income</p>
              <p className="font-mono text-base font-bold text-emerald-400">{format(headerStats.income)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">earned</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Expenses</p>
              <p className="font-mono text-base font-bold text-red-400">{format(headerStats.expenses)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">spent</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Saved</p>
              <p className={`font-mono text-base font-bold ${headerStats.savings >= 0 ? "text-blue-400" : "text-red-400"}`}>
                {headerStats.savings < 0 ? "-" : "+"}{format(Math.abs(headerStats.savings))}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{headerStats.savings >= 0 ? "surplus" : "deficit"}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Savings Rate</p>
              <p className={`font-mono text-base font-bold ${headerStats.rate >= 20 ? "text-emerald-400" : headerStats.rate >= 10 ? "text-yellow-400" : "text-red-400"}`}>
                {headerStats.income > 0 ? `${headerStats.rate.toFixed(1)}%` : "—"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">of income</p>
            </div>
          </div>

          {/* Income vs expenses progress bar */}
          {headerStats.income > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-700/60">
              <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden flex">
                <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${headerStats.spentPct}%` }} />
                <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${headerStats.savedPct}%` }} />
              </div>
              <div className="flex gap-4 mt-1.5">
                <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Spent {headerStats.spentPct.toFixed(0)}%</span>
                <span className="flex items-center gap-1 text-[10px] text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />Saved {headerStats.savedPct.toFixed(0)}%</span>
              </div>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex border-t border-slate-700/60 mt-0.5">
            {tabs.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                  activeTab === id ? "border-white text-white" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${activeTab === id ? color : "text-slate-500"}`} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-4">
        {activeTab === "expenses" && (
          <TransactionList type="expense" transactions={transactions} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} onAdd={() => openAdd("expense")} />
        )}
        {activeTab === "income" && (
          <TransactionList type="income" transactions={transactions} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} onAdd={() => openAdd("income")} />
        )}
        {activeTab === "overview" && (
          <SummaryTab transactions={transactions} selectedMonth={selectedMonth} />
        )}
      </main>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add {addType === "expense" ? "Expense" : "Income"}</DialogTitle>
            <DialogDescription>Record a new {addType} transaction</DialogDescription>
          </DialogHeader>
          {isAddDialogOpen && (
            <AddTransactionForm
              onSuccess={() => { fetchTransactions(); fetchGoals(); setIsAddDialogOpen(false); }}
              onCancel={() => setIsAddDialogOpen(false)}
              initialValues={{ type: addType }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
