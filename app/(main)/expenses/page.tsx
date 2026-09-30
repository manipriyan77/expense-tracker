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
} from "lucide-react";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { useTransactionsStore, type Transaction } from "@/store/transactions-store";
import { useGoalsStore } from "@/store/goals-store";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";

// ─── Category config ──────────────────────────────────────────────────────────

const EXPENSE_CAT_COLORS: Record<string, { hex: string }> = {
  Food:           { hex: "#f97316" },
  Transportation: { hex: "#3b82f6" },
  Entertainment:  { hex: "#a855f7" },
  Bills:          { hex: "#ef4444" },
  Shopping:       { hex: "#ec4899" },
  Healthcare:     { hex: "#22c55e" },
  Savings:        { hex: "#10b981" },
  Education:      { hex: "#06b6d4" },
  Travel:         { hex: "#0ea5e9" },
  Other:          { hex: "#6366f1" },
};
const INCOME_CAT_COLORS: Record<string, { hex: string }> = {
  Salary:     { hex: "#10b981" },
  Freelance:  { hex: "#3b82f6" },
  Investment: { hex: "#a855f7" },
  Business:   { hex: "#f59e0b" },
  Other:      { hex: "#6366f1" },
};

function getCatHex(category: string, type: "expense" | "income") {
  const map = type === "expense" ? EXPENSE_CAT_COLORS : INCOME_CAT_COLORS;
  return (map[category] ?? EXPENSE_CAT_COLORS.Other).hex;
}

function fmtShort(v: number) {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
}

function groupByDate(items: Transaction[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const groups = new Map<string, Transaction[]>();
  for (const t of items) {
    const d = new Date(t.date); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else label = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(t);
  }
  return groups;
}

// ─── Transaction list tab ─────────────────────────────────────────────────────

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
  const amountCls = isExpense ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400";
  const prefix = isExpense ? "−" : "+";

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

  // Top categories for quick filter pills
  const topCats = useMemo(() => {
    const map: Record<string, number> = {};
    monthItems.forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat]) => cat);
  }, [monthItems]);

  return (
    <div className="space-y-2.5">
      {/* Month nav + Add button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="text-xs font-semibold min-w-24 text-center">
            {selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
          <button
            onClick={() => onMonthChange(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <Button onClick={onAdd} size="sm" className="h-7 px-2.5 gap-1 text-xs">
          <Plus className="h-3 w-3" />
          Add {isExpense ? "Expense" : "Income"}
        </Button>
      </div>

      {/* Compact summary strip */}
      <div
        className={`glass-card glow-accent flex items-center justify-between px-4 py-2.5 ${
          isExpense ? "border-red-200/40 dark:border-red-900/30" : "border-emerald-200/40 dark:border-emerald-900/30"
        }`}
        style={{ ["--glow-color" as string]: isExpense ? "oklch(0.65 0.2 25 / 35%)" : "oklch(0.72 0.17 155 / 35%)" }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total {isExpense ? "Spent" : "Earned"}</p>
          <AnimatedNumber
            value={monthTotal}
            format={(n) => `${prefix}${format(n)}`}
            className={`text-lg font-bold font-mono leading-tight block ${isExpense ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
          />
          <p className="text-[10px] text-muted-foreground">{monthItems.length} transactions</p>
        </div>
        {momChange !== null && (
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${
            isExpense
              ? (momChange > 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400")
              : (momChange >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")
          }`}>
            {momChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : momChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(momChange).toFixed(1)}% vs last
          </div>
        )}
      </div>

      {/* Category quick-filter chips */}
      {topCats.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            onClick={() => setFilterCategory("all")}
            className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-200 ${
              filterCategory === "all" ? "bg-foreground text-background border-foreground shadow-sm" : "border-border text-muted-foreground hover:border-foreground/50 hover:bg-muted/50"
            }`}
          >All</button>
          {topCats.map((cat) => {
            const hex = getCatHex(cat, type);
            const active = filterCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(active ? "all" : cat)}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-200 ${
                  active ? "bg-foreground text-background border-foreground shadow-sm" : "border-border text-muted-foreground hover:border-foreground/50 hover:bg-muted/50"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: hex, boxShadow: active ? `0 0 6px 1px ${hex}99` : undefined }}
                />
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {/* Search + controls row */}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 h-8 text-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${showFilters || hasActiveFilters ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <Filter className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title={sortOrder === "desc" ? "Newest first" : "Oldest first"}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 px-3 py-2 rounded-lg bg-muted/40 border animate-fade-up">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Category</span>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-6 text-[11px] w-32 px-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {hasActiveFilters && (
            <button className="text-[11px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
              onClick={() => { setFilterCategory("all"); setSearchQuery(""); }}>
              <X className="h-3 w-3" />Clear
            </button>
          )}
        </div>
      )}

      {/* Transaction list grouped by date */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-up">
          <div
            className="relative flex items-center justify-center w-16 h-16 rounded-full mb-4 glow-accent"
            style={{ ["--glow-color" as string]: isExpense ? "oklch(0.65 0.2 25 / 40%)" : "oklch(0.72 0.17 155 / 40%)" }}
          >
            <div className={`absolute inset-0 rounded-full ${isExpense ? "bg-red-500/10" : "bg-emerald-500/10"}`} />
            {isExpense ? <TrendingDown className="h-7 w-7 text-red-500/50 dark:text-red-400/50" /> : <TrendingUp className="h-7 w-7 text-emerald-500/50 dark:text-emerald-400/50" />}
          </div>
          <p className="text-sm font-semibold text-foreground">
            {hasActiveFilters ? "No matching transactions" : `No ${isExpense ? "expenses" : "income"} this month`}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-52">
            {hasActiveFilters
              ? "Try adjusting your search or filters."
              : `Start tracking by adding your first ${isExpense ? "expense" : "income"} entry.`}
          </p>
          {!hasActiveFilters && (
            <Button onClick={onAdd} size="sm" className="mt-4 h-7 px-3 gap-1 text-xs ring-glow-primary">
              <Plus className="h-3 w-3" />
              Add {isExpense ? "Expense" : "Income"}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {[...grouped.entries()].map(([dateLabel, items], groupIdx) => (
            <div key={dateLabel} className="animate-fade-up" style={{ animationDelay: `${groupIdx * 40}ms` }}>
              {/* Date group header */}
              <div className="flex items-center justify-between mb-1 px-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{dateLabel}</span>
                <span className={`text-[10px] font-mono font-semibold ${amountCls}`}>
                  {prefix}{fmtShort(items.reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
              {/* Transactions — compact rows */}
              <div className="glass-card overflow-hidden divide-y divide-border/50">
                {items.map((item) => {
                  const hex = getCatHex(item.category, type);
                  return (
                    <div
                      key={item.id}
                      className="group flex items-center gap-2.5 px-3 py-2 hover:bg-muted/40 transition-colors duration-200"
                    >
                      {/* Category dot */}
                      <span
                        className="w-2 h-2 rounded-full shrink-0 transition-shadow duration-200 group-hover:ring-4"
                        style={{
                          backgroundColor: hex,
                          ["--tw-ring-color" as string]: `${hex}33`,
                        }}
                      />
                      {/* Description + sub */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate leading-tight">{item.description || item.category}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{item.category}{item.subtype ? ` · ${item.subtype}` : ""}</p>
                      </div>
                      {/* Amount */}
                      <p className={`text-xs font-bold font-mono shrink-0 tabular-nums ${amountCls}`}>{prefix}{fmtShort(item.amount)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {/* Footer */}
          <div className="flex items-center justify-between px-1 pt-1 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
            <span className={`text-xs font-bold font-mono ${amountCls}`}>{prefix}{fmtShort(filtered.reduce((s, t) => s + t.amount, 0))}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Overview / Summary tab ───────────────────────────────────────────────────

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
      return { label, income, expenses, savings, rate };
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
      name, value, fill: EXPENSE_CAT_COLORS[name]?.hex ?? "#6366f1",
    }));
  }, [transactions, selectedMonth]);

  const totalExpenses = expenseCategoryData.reduce((s, c) => s + c.value, 0);
  const savingsRateDelta = prev?.income > 0 ? current.rate - prev.rate : null;

  return (
    <div className="space-y-3">
      {/* KPI strip — compact 4 columns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Income", value: current.income, fmt: fmtShort, sub: prev.income > 0 ? `${((current.income - prev.income) / prev.income * 100).toFixed(1)}% vs last` : "—", color: "text-emerald-600 dark:text-emerald-400", dot: "#10b981" },
          { label: "Expenses", value: current.expenses, fmt: fmtShort, sub: prev.expenses > 0 ? `${((current.expenses - prev.expenses) / prev.expenses * 100).toFixed(1)}% vs last` : "—", color: "text-red-600 dark:text-red-400", dot: "#ef4444" },
          { label: "Saved", value: Math.abs(current.savings), fmt: (n: number) => `${current.savings >= 0 ? "+" : "−"}${fmtShort(n)}`, sub: current.savings >= 0 ? "surplus" : "deficit", color: current.savings >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500", dot: "#3b82f6" },
          { label: "Save Rate", value: current.rate, fmt: (n: number) => current.income > 0 ? `${n.toFixed(1)}%` : "—", sub: savingsRateDelta !== null ? `${savingsRateDelta >= 0 ? "+" : ""}${savingsRateDelta.toFixed(1)}pp` : "—", color: current.rate >= 20 ? "text-emerald-600 dark:text-emerald-400" : current.rate >= 10 ? "text-amber-500" : "text-red-500", dot: "#8b5cf6" },
        ].map(({ label, value, fmt, sub, color, dot }, i) => (
          <div
            key={label}
            className="glass-card glass-card-hover glow-accent px-3 py-2.5 animate-fade-up"
            style={{ ["--glow-color" as string]: `${dot}55`, animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot, boxShadow: `0 0 5px 1px ${dot}80` }} />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
            </div>
            <AnimatedNumber value={value} format={fmt} className={`text-base font-bold font-mono leading-tight block ${color}`} />
            <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* 6-month cashflow area chart */}
      <div className="glass-card glass-card-hover overflow-hidden">
        <div className="px-4 pt-2.5 pb-2 border-b border-border/60 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">6-Month Cashflow</p>
          <div className="flex items-center gap-3">
            {[{ color: "#10b981", label: "Income" }, { color: "#ef4444", label: "Expenses" }].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-2 h-px rounded-full inline-block" style={{ backgroundColor: color, height: 2 }} />{label}
              </span>
            ))}
          </div>
        </div>
        <div className="px-3 py-2">
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={sixMonths} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.32} />
                  <stop offset="45%" stopColor="#10b981" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="expG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.26} />
                  <stop offset="45%" stopColor="#ef4444" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmtShort} width={44} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "color-mix(in oklch, var(--card) 75%, transparent)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 11,
                  boxShadow: "0 8px 24px -12px rgba(0,0,0,0.35)",
                }}
                formatter={(v: unknown) => [format(v as number)]} />
              <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2} fill="url(#incG)" dot={false} activeDot={{ r: 4 }} style={{ filter: "drop-shadow(0 1px 3px rgba(16,185,129,0.35))" }} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expG)" dot={false} activeDot={{ r: 4 }} style={{ filter: "drop-shadow(0 1px 3px rgba(239,68,68,0.3))" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Savings rate + category breakdown — side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Savings rate bars */}
        <div className="glass-card glass-card-hover overflow-hidden">
          <div className="px-4 pt-2.5 pb-2 border-b border-border/60">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Savings Rate · 6 months</p>
          </div>
          <div className="px-3 py-2">
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={sixMonths} barCategoryGap="35%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "color-mix(in oklch, var(--card) 75%, transparent)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    fontSize: 11,
                    boxShadow: "0 8px 24px -12px rgba(0,0,0,0.35)",
                  }}
                  formatter={(v: unknown) => [`${(v as number).toFixed(1)}%`, "Rate"]} />
                <Bar dataKey="rate" radius={[3, 3, 0, 0]} maxBarSize={28}>
                  {sixMonths.map((m) => (
                    <Cell key={m.label} fill={m.rate >= 20 ? "#10b981" : m.rate >= 10 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[9px] text-muted-foreground mt-1">Green ≥20% · Amber ≥10% · Red &lt;10%</p>
          </div>
        </div>

        {/* Expense category donut */}
        <div className="glass-card glass-card-hover overflow-hidden">
          <div className="px-4 pt-2.5 pb-2 border-b border-border/60">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Spend by Category · {selectedMonth.toLocaleDateString("en-US", { month: "short" })}
            </p>
          </div>
          <div className="px-3 py-2">
            {expenseCategoryData.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">No expenses</div>
            ) : (
              <div className="flex gap-3 items-center">
                <div className="w-28 h-28 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseCategoryData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={52} paddingAngle={2} strokeWidth={0} style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.18))" }}>
                        {expenseCategoryData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "color-mix(in oklch, var(--card) 75%, transparent)",
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                          border: "1px solid var(--border)",
                          borderRadius: 10,
                          fontSize: 10,
                          boxShadow: "0 8px 24px -12px rgba(0,0,0,0.35)",
                        }}
                        formatter={(v: unknown) => [fmtShort(v as number)]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5 min-w-0">
                  {expenseCategoryData.slice(0, 5).map(({ name, value, fill }) => {
                    const pct = totalExpenses > 0 ? (value / totalExpenses) * 100 : 0;
                    return (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="flex items-center gap-1 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: fill }} />
                            <span className="text-[10px] text-muted-foreground truncate">{name}</span>
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0 ml-1">
                            <span className="text-[10px] font-mono text-muted-foreground">{fmtShort(value)}</span>
                            <span className="text-[10px] font-mono font-semibold w-6 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: fill }} />
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

      {/* Month-over-month table — compact */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 pt-2.5 pb-2 border-b border-border/60 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Month-over-Month</p>
          <p className="text-[10px] text-muted-foreground">Last 6 months</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30 text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left font-medium">Month</th>
                <th className="px-3 py-2 text-right font-medium">Income</th>
                <th className="px-3 py-2 text-right font-medium">Expenses</th>
                <th className="px-3 py-2 text-right font-medium">Saved</th>
                <th className="px-4 py-2 text-right font-medium">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {[...sixMonths].reverse().map((m, i) => (
                <tr key={m.label} className={`transition-colors duration-200 hover:bg-muted/30 ${i === 0 ? "bg-muted/10" : ""}`}>
                  <td className="px-4 py-1.5 font-medium">
                    {m.label}
                    {i === 0 && <span className="ml-1.5 px-1 py-px text-[8px] rounded bg-primary/10 text-primary font-semibold">Now</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-emerald-600 dark:text-emerald-400">{m.income > 0 ? `+${fmtShort(m.income)}` : "—"}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-red-500">{m.expenses > 0 ? `−${fmtShort(m.expenses)}` : "—"}</td>
                  <td className={`px-3 py-1.5 text-right font-mono font-semibold ${m.savings >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500"}`}>
                    {m.income > 0 || m.expenses > 0 ? `${m.savings < 0 ? "−" : "+"}${fmtShort(Math.abs(m.savings))}` : "—"}
                  </td>
                  <td className="px-4 py-1.5 text-right">
                    {m.income > 0 ? (
                      <span className={`inline-flex px-1.5 py-px rounded-full font-semibold text-[10px] ${m.rate >= 20 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : m.rate >= 10 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
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
    () => searchParams.get("tab") === "income" ? "income"
        : searchParams.get("tab") === "overview" || searchParams.get("tab") === "summary" ? "overview"
        : "expenses"
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
    { id: "expenses" as const, label: "Expenses", icon: TrendingDown, color: "text-red-400" },
    { id: "income" as const, label: "Income", icon: TrendingUp, color: "text-emerald-400" },
    { id: "overview" as const, label: "Overview", icon: Wallet, color: "text-blue-400" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Compact dark hero */}
      <div className="mesh-hero bg-slate-900 dark:bg-black text-white shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] relative">
        <div className="px-4 sm:px-6 lg:px-8 pt-3 pb-0 relative">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Money Flow</p>
              <p className="text-xs text-slate-500">{selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline"
                className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white gap-1 h-7 px-2.5 text-xs transition-colors"
                onClick={() => openAdd("income")}>
                <ArrowUpRight className="h-3 w-3 text-emerald-400" />Income
              </Button>
              <Button size="sm" variant="outline"
                className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white gap-1 h-7 px-2.5 text-xs transition-colors ring-glow-primary"
                onClick={() => openAdd("expense")}>
                <ArrowDownRight className="h-3 w-3 text-red-400" />Expense
              </Button>
            </div>
          </div>

          {/* Stats strip — 4 columns */}
          <div className="glass-panel-dark rounded-lg mt-1 grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/10">
            {[
              { label: "Income", value: headerStats.income, fmt: (n: number) => format(n), color: "text-emerald-400" },
              { label: "Expenses", value: headerStats.expenses, fmt: (n: number) => format(n), color: "text-red-400" },
              { label: "Saved", value: Math.abs(headerStats.savings), fmt: (n: number) => `${headerStats.savings >= 0 ? "+" : "−"}${format(n)}`, color: headerStats.savings >= 0 ? "text-blue-400" : "text-red-400" },
              { label: "Save Rate", value: headerStats.rate, fmt: (n: number) => headerStats.income > 0 ? `${n.toFixed(1)}%` : "—", color: headerStats.rate >= 20 ? "text-emerald-400" : headerStats.rate >= 10 ? "text-amber-400" : "text-red-400" },
            ].map(({ label, value, fmt, color }) => (
              <div key={label} className="px-4 py-2.5">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
                <AnimatedNumber value={value} format={fmt} className={`font-mono text-sm font-bold block ${color}`} />
              </div>
            ))}
          </div>

          {/* Spend/save progress bar */}
          {headerStats.income > 0 && (
            <div className="px-4 py-2 border-t border-slate-700/60">
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  className="h-full bg-red-500 rounded-l-full transition-all duration-500 ease-out"
                  style={{ width: `${headerStats.spentPct}%`, boxShadow: "0 0 8px 0 rgba(239,68,68,0.6)" }}
                />
                <div
                  className="h-full bg-blue-500 rounded-r-full transition-all duration-500 ease-out"
                  style={{ width: `${headerStats.savedPct}%`, boxShadow: "0 0 8px 0 rgba(59,130,246,0.6)" }}
                />
              </div>
              <div className="flex gap-3 mt-1">
                <span className="flex items-center gap-1 text-[9px] text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />Spent {headerStats.spentPct.toFixed(0)}%</span>
                <span className="flex items-center gap-1 text-[9px] text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />Saved {headerStats.savedPct.toFixed(0)}%</span>
              </div>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex border-t border-slate-700/60 relative">
            {tabs.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors duration-200 ${
                  activeTab === id ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className={`h-3 w-3 transition-colors duration-200 ${activeTab === id ? color : "text-slate-500"}`} />
                {label}
                {activeTab === id && (
                  <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-white shadow-[0_0_8px_1px_rgba(255,255,255,0.5)] transition-all duration-300" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-3">
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
