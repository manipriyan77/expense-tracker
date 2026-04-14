"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Plus,
  Search,
  TrendingDown,
  Calendar,
  Filter,
  X,
  ArrowUpDown,
} from "lucide-react";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { useTransactionsStore } from "@/store/transactions-store";
import { useGoalsStore } from "@/store/goals-store";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { MonthSelector } from "@/components/ui/month-selector";
import { ListPageSkeleton } from "@/components/ui/skeleton";

const CATEGORY_COLORS: Record<string, string> = {
  Food: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Transportation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Entertainment: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  Bills: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Shopping: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  Healthcare: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Savings: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Other: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
};

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
}

function getCategoryInitial(category: string) {
  return category.charAt(0).toUpperCase();
}

export default function ExpensesPage() {
  const { format } = useFormatCurrency();
  const { transactions, loading, fetchTransactions } = useTransactionsStore();
  const { fetchGoals } = useGoalsStore();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSuccess = () => {
    fetchTransactions();
    fetchGoals();
    setIsAddDialogOpen(false);
  };

  // All expenses for selected month
  const monthExpenses = useMemo(() => {
    const m = selectedMonth.getMonth();
    const y = selectedMonth.getFullYear();
    return transactions.filter((t) => {
      if (t.type !== "expense") return false;
      const d = new Date(t.date);
      return d.getMonth() === m && d.getFullYear() === y;
    });
  }, [transactions, selectedMonth]);

  // All-time expenses for stats comparison
  const allExpenses = useMemo(
    () => transactions.filter((t) => t.type === "expense"),
    [transactions],
  );

  const monthTotal = useMemo(
    () => monthExpenses.reduce((s, t) => s + t.amount, 0),
    [monthExpenses],
  );

  const prevMonthTotal = useMemo(() => {
    const prev = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    const m = prev.getMonth();
    const y = prev.getFullYear();
    return transactions
      .filter((t) => {
        if (t.type !== "expense") return false;
        const d = new Date(t.date);
        return d.getMonth() === m && d.getFullYear() === y;
      })
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions, selectedMonth]);

  const categories = useMemo(
    () => [...new Set(monthExpenses.map((t) => t.category))].filter(Boolean).sort(),
    [monthExpenses],
  );

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    monthExpenses.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [monthExpenses]);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = monthExpenses;
    if (filterCategory !== "all") list = list.filter((t) => t.category === filterCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return sortOrder === "desc" ? db - da : da - db;
    });
  }, [monthExpenses, filterCategory, searchQuery, sortOrder]);

  const momChange =
    prevMonthTotal > 0
      ? ((monthTotal - prevMonthTotal) / prevMonthTotal) * 100
      : null;

  const hasActiveFilters = filterCategory !== "all" || searchQuery.trim();

  if (loading && transactions.length === 0) {
    return <ListPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Band */}
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-0">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
              Expenses
            </p>
            <p className="text-xs text-slate-500">Track and manage your spending</p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                This Month
              </p>
              <p className="font-mono text-base font-semibold text-red-400">
                {format(monthTotal)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {monthExpenses.length} transactions
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                vs Last Month
              </p>
              <p
                className={`font-mono text-base font-semibold ${
                  momChange === null
                    ? "text-slate-400"
                    : momChange > 0
                      ? "text-red-400"
                      : "text-emerald-400"
                }`}
              >
                {momChange === null
                  ? "—"
                  : `${momChange > 0 ? "+" : ""}${momChange.toFixed(1)}%`}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {prevMonthTotal > 0 ? format(prevMonthTotal) + " prev" : "No data"}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                All Time
              </p>
              <p className="font-mono text-base font-semibold text-slate-200">
                {format(allExpenses.reduce((s, t) => s + t.amount, 0))}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {allExpenses.length} total
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-3 sm:px-6 lg:px-8 py-4 space-y-4">
        {/* Month selector + Add button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {/* Category breakdown */}
        {categoryBreakdown.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {categoryBreakdown.map(([cat, amt]) => (
              <button
                key={cat}
                onClick={() =>
                  setFilterCategory(filterCategory === cat ? "all" : cat)
                }
                className={`text-left p-3 rounded-lg border transition-all ${
                  filterCategory === cat
                    ? "border-primary ring-1 ring-primary bg-primary/5"
                    : "border-border hover:border-primary/40 bg-card hover:bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${getCategoryColor(cat)}`}
                  >
                    {getCategoryInitial(cat)}
                  </span>
                  <span className="text-xs font-medium truncate">{cat}</span>
                </div>
                <p className="text-sm font-semibold font-mono text-red-500 dark:text-red-400">
                  -{format(amt)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {monthTotal > 0 ? ((amt / monthTotal) * 100).toFixed(0) : 0}% of total
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Search + filters */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters || hasActiveFilters ? "border-primary text-primary" : ""}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              title={sortOrder === "desc" ? "Newest first" : "Oldest first"}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/40 border">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Category:</span>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-7 text-xs w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => {
                    setFilterCategory("all");
                    setSearchQuery("");
                  }}
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Expense list */}
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <TrendingDown className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {hasActiveFilters ? "No expenses match your filters" : "No expenses this month"}
                </p>
                {!hasActiveFilters && (
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Click &ldquo;Add Expense&rdquo; to record one
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    {/* Category badge */}
                    <div
                      className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${getCategoryColor(expense.category)}`}
                    >
                      {getCategoryInitial(expense.category)}
                    </div>

                    {/* Description + category */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{expense.description}</p>
                      <p className="text-xs text-muted-foreground">{expense.category}</p>
                    </div>

                    {/* Amount + date */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold font-mono text-red-500 dark:text-red-400">
                        -{format(expense.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(expense.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer summary */}
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                <span>{filtered.length} expense{filtered.length !== 1 ? "s" : ""}</span>
                <span className="font-mono font-semibold text-red-500 dark:text-red-400">
                  -{format(filtered.reduce((s, t) => s + t.amount, 0))}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Add Expense Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Record a new expense transaction</DialogDescription>
          </DialogHeader>
          {isAddDialogOpen && (
            <AddTransactionForm
              onSuccess={handleSuccess}
              onCancel={() => setIsAddDialogOpen(false)}
              initialValues={{ type: "expense" }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
