"use client";

import { useEffect, useState, useMemo } from "react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Repeat,
  IndianRupee,
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowUpDown,
} from "lucide-react";
import { MonthSelector } from "@/components/ui/month-selector";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import {
  TransactionListItemRow,
  type MergedListItem,
  type TransactionRowModel,
} from "@/components/transactions/TransactionListItemRow";
import { getPendingOccurrencesForMonth } from "@/lib/utils/recurring-occurrences";
import { useRecurringPatternsStore } from "@/store/recurring-patterns-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { Skeleton, TransactionSkeleton } from "@/components/ui/skeleton";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  subtype?: string;
  date: string;
  isRecurring: boolean;
  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  nextDate?: string;
  budgetId?: string | null;
  goalId?: string | null;
  recurringPatternId?: string | null;
}

interface TransactionFromDB {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  subtype?: string;
  date: string;
  is_recurring?: boolean;
  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  next_date?: string;
  recurring_pattern_id?: string | null;
}

export default function TransactionsPage() {
  const { format } = useFormatCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [completingRecurringKey, setCompletingRecurringKey] = useState<string | null>(
    null,
  );
  const { patterns, fetchPatterns, completeOccurrence } =
    useRecurringPatternsStore();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Advanced filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all",
  );
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Sort options
  const [sortBy, setSortBy] = useState<"date" | "amount" | "description" | "category">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    loadTransactions();
    fetchPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/transactions");

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();

      // Transform the data to match the Transaction interface
      const transformedTransactions: Transaction[] = data.map(
        (t: TransactionFromDB & { budget_id?: string | null; goal_id?: string | null }) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          category: t.category || "",
          subtype: t.subtype,
          date: t.date,
          isRecurring: t.is_recurring || false,
          frequency: t.frequency,
          nextDate: t.next_date,
          budgetId: t.budget_id ?? undefined,
          goalId: t.goal_id ?? undefined,
          recurringPatternId: t.recurring_pattern_id ?? null,
        }),
      );

      setTransactions(transformedTransactions);
    } catch (error) {
      console.error("Error loading transactions:", error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransactionSuccess = () => {
    loadTransactions();
    setIsAddDialogOpen(false);
    setEditingTransaction(null);
  };

  const handleEditTransaction = (t: TransactionRowModel) => {
    const full = transactions.find((x) => x.id === t.id);
    if (full) {
      setEditingTransaction(full);
      return;
    }
    setEditingTransaction({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      category: t.category,
      subtype: t.subtype,
      date: t.date,
      isRecurring: t.isRecurring ?? false,
      frequency: t.frequency as Transaction["frequency"] | undefined,
      nextDate: t.nextDate,
      budgetId: undefined,
      goalId: undefined,
      recurringPatternId: t.recurringPatternId ?? null,
    });
  };

  const handleCompleteRecurring = async (patternId: string, dueDate: string) => {
    const key = `${patternId}:${dueDate}`;
    setCompletingRecurringKey(key);
    try {
      await completeOccurrence(patternId, dueDate);
      await loadTransactions();
      toast.success("Payment recorded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record payment");
    } finally {
      setCompletingRecurringKey(null);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this transaction? This will update any linked budgets and goals.",
      )
    ) {
      return;
    }

    setDeleting(transactionId);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete transaction");
      }

      toast.success("Transaction deleted successfully!");
      await loadTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  // Get unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [transactions]);

  // Filter transactions by selected month, search query, and advanced filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const transactionDate = new Date(t.date);
      const matchesMonth =
        transactionDate.getMonth() === selectedMonth.getMonth() &&
        transactionDate.getFullYear() === selectedMonth.getFullYear();

      const matchesSearch =
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subtype?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        filterCategory === "all" || t.category === filterCategory;
      const matchesType = filterType === "all" || t.type === filterType;

      const amount = Math.abs(t.amount);
      const matchesMinAmount = !minAmount || amount >= parseFloat(minAmount);
      const matchesMaxAmount = !maxAmount || amount <= parseFloat(maxAmount);

      return (
        matchesMonth &&
        matchesSearch &&
        matchesCategory &&
        matchesType &&
        matchesMinAmount &&
        matchesMaxAmount
      );
    });
  }, [
    transactions,
    selectedMonth,
    searchQuery,
    filterCategory,
    filterType,
    minAmount,
    maxAmount,
  ]);

  const filteredPendingOccurrences = useMemo(() => {
    const y = selectedMonth.getFullYear();
    const m = selectedMonth.getMonth();
    const raw = getPendingOccurrencesForMonth(
      patterns.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        amount:
          typeof p.amount === "number"
            ? p.amount
            : Number.parseFloat(String(p.amount)),
        description: p.description,
        category: p.category,
        subtype: p.subtype || "",
        frequency: p.frequency,
        start_date: p.start_date,
        end_date: p.end_date ?? null,
        day_of_month: p.day_of_month ?? null,
        is_active: p.is_active,
      })),
      transactions,
      y,
      m,
    );
    return raw.filter((row) => {
      const matchesSearch =
        searchQuery === "" ||
        row.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.subtype.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        filterCategory === "all" || row.category === filterCategory;
      const matchesType = filterType === "all" || row.type === filterType;
      const amount = Math.abs(row.amount);
      const matchesMinAmount =
        !minAmount || amount >= Number.parseFloat(minAmount);
      const matchesMaxAmount =
        !maxAmount || amount <= Number.parseFloat(maxAmount);
      return (
        matchesSearch &&
        matchesCategory &&
        matchesType &&
        matchesMinAmount &&
        matchesMaxAmount
      );
    });
  }, [
    patterns,
    transactions,
    selectedMonth,
    searchQuery,
    filterCategory,
    filterType,
    minAmount,
    maxAmount,
  ]);

  const sortedMergedItems = useMemo(() => {
    const items: MergedListItem[] = [
      ...filteredTransactions.map((t) => ({ kind: "transaction" as const, t })),
      ...filteredPendingOccurrences.map((p) => ({
        kind: "pending_recurring" as const,
        p,
      })),
    ];
    const mult = sortOrder === "asc" ? 1 : -1;
    items.sort((a, b) => {
      const dateA = a.kind === "transaction" ? a.t.date : a.p.dueDate;
      const dateB = b.kind === "transaction" ? b.t.date : b.p.dueDate;
      if (sortBy === "date") {
        return mult * (new Date(dateA).getTime() - new Date(dateB).getTime());
      }
      const amtA = a.kind === "transaction" ? a.t.amount : a.p.amount;
      const amtB = b.kind === "transaction" ? b.t.amount : b.p.amount;
      if (sortBy === "amount") {
        return mult * (Math.abs(amtA) - Math.abs(amtB));
      }
      const descA = a.kind === "transaction" ? a.t.description : a.p.description;
      const descB = b.kind === "transaction" ? b.t.description : b.p.description;
      if (sortBy === "description") {
        return mult * descA.localeCompare(descB, undefined, { sensitivity: "base" });
      }
      const catA = a.kind === "transaction" ? (a.t.category || "") : a.p.category;
      const catB = b.kind === "transaction" ? (b.t.category || "") : b.p.category;
      const catCompare = catA.localeCompare(catB, undefined, {
        sensitivity: "base",
      });
      if (catCompare !== 0) return mult * catCompare;
      const subA = a.kind === "transaction" ? (a.t.subtype || "") : a.p.subtype;
      const subB = b.kind === "transaction" ? (b.t.subtype || "") : b.p.subtype;
      return mult * subA.localeCompare(subB, undefined, { sensitivity: "base" });
    });
    return items;
  }, [filteredTransactions, filteredPendingOccurrences, sortBy, sortOrder]);

  const incomeItems = sortedMergedItems.filter((i) =>
    i.kind === "pending_recurring" ? i.p.type === "income" : i.t.type === "income",
  );
  const expenseItems = sortedMergedItems.filter((i) =>
    i.kind === "pending_recurring" ? i.p.type === "expense" : i.t.type === "expense",
  );
  const recurringItems = sortedMergedItems.filter(
    (i) =>
      i.kind === "pending_recurring" ||
      (i.kind === "transaction" && !!i.t.recurringPatternId),
  );

  const totalPages = Math.ceil(sortedMergedItems.length / itemsPerPage);
  const paginatedMergedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedMergedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedMergedItems, currentPage, itemsPerPage]);

  const sortedBookedForExport = useMemo(() => {
    const list = [...filteredTransactions];
    const mult = sortOrder === "asc" ? 1 : -1;
    list.sort((a, b) => {
      if (sortBy === "date") {
        return mult * (new Date(a.date).getTime() - new Date(b.date).getTime());
      }
      if (sortBy === "amount") {
        return mult * (Math.abs(a.amount) - Math.abs(b.amount));
      }
      if (sortBy === "description") {
        return mult * a.description.localeCompare(b.description, undefined, {
          sensitivity: "base",
        });
      }
      const catCompare = (a.category || "").localeCompare(b.category || "", undefined, {
        sensitivity: "base",
      });
      if (catCompare !== 0) return mult * catCompare;
      return mult * (a.subtype || "").localeCompare(b.subtype || "", undefined, {
        sensitivity: "base",
      });
    });
    return list;
  }, [filteredTransactions, sortBy, sortOrder]);

  // Reset to page 1 when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    sortedMergedItems.length,
    searchQuery,
    filterCategory,
    filterType,
    minAmount,
    maxAmount,
    sortBy,
    sortOrder,
  ]);

  // CSV Export function
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Type",
      "Description",
      "Category",
      "Subtype",
      "Amount",
    ];
    const rows = sortedBookedForExport.map((t) => [
      new Date(t.date).toLocaleDateString(),
      t.type,
      t.description,
      t.category || "",
      t.subtype || "",
      t.amount.toString(),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `transactions_${selectedMonth.toISOString().slice(0, 7)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Transactions exported to CSV!");
  };

  const allTransactions = sortedMergedItems;
  const incomeTransactions = incomeItems;
  const expenseTransactions = expenseItems;
  const recurringTransactions = recurringItems;

  const getPaginatedData = (data: MergedListItem[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const getTotalPages = (data: MergedListItem[]) => {
    return Math.ceil(data.length / itemsPerPage);
  };

  // Pagination component
  const PaginationControls = ({
    totalPages: pages,
    dataLength,
  }: {
    totalPages: number;
    dataLength: number;
  }) => {
    if (pages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, dataLength)} of {dataLength}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              let pageNum;
              if (pages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= pages - 2) {
                pageNum = pages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "ghost"}
                  size="icon"
                  className="h-7 w-7 text-[11px]"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentPage((p) => Math.min(pages, p + 1))}
            disabled={currentPage === pages}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Select
          value={itemsPerPage.toString()}
          onValueChange={(v) => {
            setItemsPerPage(parseInt(v));
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="h-7 w-16 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  };

  // Calculations based on filtered transactions
  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-slate-900 dark:bg-black">
          <div className="px-3 sm:px-6 lg:px-8 pt-5 pb-4">
            <Skeleton className="h-3 w-24 bg-slate-700 mb-2" />
            <div className="grid grid-cols-3 gap-4 mt-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="px-4 py-3">
                  <Skeleton className="h-2.5 w-16 bg-slate-700 mb-2" />
                  <Skeleton className="h-5 w-24 bg-slate-700 mb-1" />
                  <Skeleton className="h-2 w-12 bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-2">
          {["a","b","c","d","e","f","g","h"].map((id) => (
            <TransactionSkeleton key={id} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-background">
        <div className="bg-slate-900 dark:bg-black text-white">
          <div className="px-3 sm:px-6 lg:px-8 pt-5 pb-0">
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Transactions</p>
              <p className="text-xs text-slate-500">{selectedMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-700/60 border-t border-slate-700/60">
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Income</p>
                <p className="font-mono text-base font-semibold text-green-400">{format(totalIncome)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{filteredTransactions.filter(t => t.type === "income").length} entries</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Expenses</p>
                <p className="font-mono text-base font-semibold text-red-400">{format(totalExpenses)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{filteredTransactions.filter(t => t.type === "expense").length} entries</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Balance</p>
                <p className={`font-mono text-base font-semibold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>{balance < 0 ? "-" : ""}{format(Math.abs(balance))}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Income − Expenses</p>
              </div>
            </div>
          </div>
        </div>

        <main className="px-4 sm:px-6 lg:px-8 py-4">
          {/* Month Selector */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              monthsToShow={7}
            />
            <div className="text-sm text-muted-foreground shrink-0" title={`${sortedMergedItems.length} items (includes due recurring)`}>
              <span className="sm:hidden">{sortedMergedItems.length}</span>
              <span className="hidden sm:inline">{sortedMergedItems.length} item(s)</span>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="space-y-3 mb-4 min-w-0">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3 min-w-0">
              {/* Search */}
              <div className="relative w-full md:w-96 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search transactions, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Sort + Buttons: wrap on mobile */}
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                {/* Sort */}
                <div className="flex items-center gap-2 shrink-0">
                  <ArrowUpDown className="h-4 w-4 text-gray-500 shrink-0" />
                  <Select
                    value={sortBy}
                    onValueChange={(v: "date" | "amount" | "description" | "category") => setSortBy(v)}
                  >
                    <SelectTrigger className="w-[120px] sm:w-[140px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="description">Description</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={sortOrder}
                    onValueChange={(v: "asc" | "desc") => setSortOrder(v)}
                  >
                    <SelectTrigger className="w-[110px] sm:w-[130px]">
                      <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">
                        {sortBy === "date" ? "Newest first" : sortBy === "amount" ? "High to low" : "Z → A"}
                      </SelectItem>
                      <SelectItem value="asc">
                        {sortBy === "date" ? "Oldest first" : sortBy === "amount" ? "Low to high" : "A → Z"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Buttons */}
                <div className="flex flex-wrap gap-2 shrink-0">
                {/* Filter Toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`shrink-0 ${showFilters ? "bg-gray-100" : ""}`}
                >
                  <Filter className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filters</span>
                  {(filterCategory !== "all" ||
                    filterType !== "all" ||
                    minAmount ||
                    maxAmount) && (
                    <span className="ml-1 sm:ml-2 px-2 py-0.5 text-[10px] uppercase tracking-widest bg-blue-500 text-white rounded-full">
                      {
                        [
                          filterCategory !== "all",
                          filterType !== "all",
                          minAmount,
                          maxAmount,
                        ].filter(Boolean).length
                      }
                    </span>
                  )}
                </Button>

                {/* Export CSV */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={sortedBookedForExport.length === 0}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export CSV</span>
                </Button>

                {/* Add Transaction */}
                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" className="shrink-0">
                      <Plus className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Add Transaction</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Transaction</DialogTitle>
                      <DialogDescription>
                        Add a new income or expense transaction
                      </DialogDescription>
                    </DialogHeader>
                    {isAddDialogOpen && (
                      <AddTransactionForm
                        onSuccess={handleTransactionSuccess}
                        onCancel={() => setIsAddDialogOpen(false)}
                      />
                    )}
                  </DialogContent>
                </Dialog>

                {/* Edit Transaction */}
                <Dialog
                  open={!!editingTransaction}
                  onOpenChange={(open) => !open && setEditingTransaction(null)}
                >
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Edit Transaction</DialogTitle>
                      <DialogDescription>
                        Update this transaction
                      </DialogDescription>
                    </DialogHeader>
                    {editingTransaction && (
                      <AddTransactionForm
                        transactionId={editingTransaction.id}
                        onSuccess={handleTransactionSuccess}
                        onCancel={() => setEditingTransaction(null)}
                        initialValues={{
                          type: editingTransaction.type,
                          amount: String(editingTransaction.amount),
                          description: editingTransaction.description,
                          category: editingTransaction.category,
                          subtype: editingTransaction.subtype ?? "",
                          budgetId: editingTransaction.budgetId ?? "",
                          goalId: editingTransaction.goalId ?? "",
                          date: editingTransaction.date,
                        }}
                      />
                    )}
                  </DialogContent>
                </Dialog>
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <Card className="p-3 border-border/50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Category
                    </label>
                    <Select
                      value={filterCategory}
                      onValueChange={setFilterCategory}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Type
                    </label>
                    <Select
                      value={filterType}
                      onValueChange={(v) =>
                        setFilterType(v as typeof filterType)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Min Amount
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5 block">
                      Max Amount
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="No limit"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                      {(filterCategory !== "all" ||
                        filterType !== "all" ||
                        minAmount ||
                        maxAmount) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setFilterCategory("all");
                            setFilterType("all");
                            setMinAmount("");
                            setMaxAmount("");
                          }}
                          title="Clear filters"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Transactions Tabs */}
          <Tabs defaultValue="all" className="space-y-4 min-w-0">
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList className="w-max min-w-0">
                <TabsTrigger value="all">
                All ({allTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="income">
                Income ({incomeTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="expense">
                Expenses ({expenseTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="recurring">
                Recurring ({recurringTransactions.length})
              </TabsTrigger>
              </TabsList>
            </div>

            {/* All Transactions */}
            <TabsContent value="all" className="mt-0">
              {sortedMergedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <IndianRupee className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">No transactions yet</p>
                  <p className="text-xs text-muted-foreground">Add transactions or set up recurring items on the Recurring page</p>
                </div>
              ) : (
                <>
                  <Card className="overflow-hidden p-0">
                    <div className="divide-y divide-border">
                      {paginatedMergedItems.map((item) => (
                        <TransactionListItemRow
                          key={
                            item.kind === "transaction"
                              ? item.t.id
                              : `${item.p.patternId}:${item.p.dueDate}`
                          }
                          item={item}
                          format={format}
                          onEdit={handleEditTransaction}
                          onDelete={handleDeleteTransaction}
                          onMarkRecurringComplete={handleCompleteRecurring}
                          completingKey={completingRecurringKey}
                          deleting={deleting}
                        />
                      ))}
                    </div>
                  </Card>
                  <PaginationControls
                    totalPages={totalPages}
                    dataLength={sortedMergedItems.length}
                  />
                </>
              )}
            </TabsContent>

            {/* Income Only */}
            <TabsContent value="income" className="mt-0">
              {incomeTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <TrendingUp className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">No income transactions found</p>
                </div>
              ) : (
                <>
                  <Card className="overflow-hidden p-0">
                    <div className="divide-y divide-border">
                      {getPaginatedData(incomeTransactions).map((item) => (
                        <TransactionListItemRow
                          key={
                            item.kind === "transaction"
                              ? item.t.id
                              : `${item.p.patternId}:${item.p.dueDate}`
                          }
                          item={item}
                          format={format}
                          onEdit={handleEditTransaction}
                          onDelete={handleDeleteTransaction}
                          onMarkRecurringComplete={handleCompleteRecurring}
                          completingKey={completingRecurringKey}
                          deleting={deleting}
                        />
                      ))}
                    </div>
                  </Card>
                  <PaginationControls
                    totalPages={getTotalPages(incomeTransactions)}
                    dataLength={incomeTransactions.length}
                  />
                </>
              )}
            </TabsContent>

            {/* Expenses Only */}
            <TabsContent value="expense" className="mt-0">
              {expenseTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <TrendingDown className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">No expense transactions found</p>
                </div>
              ) : (
                <>
                  <Card className="overflow-hidden p-0">
                    <div className="divide-y divide-border">
                      {getPaginatedData(expenseTransactions).map((item) => (
                        <TransactionListItemRow
                          key={
                            item.kind === "transaction"
                              ? item.t.id
                              : `${item.p.patternId}:${item.p.dueDate}`
                          }
                          item={item}
                          format={format}
                          onEdit={handleEditTransaction}
                          onDelete={handleDeleteTransaction}
                          onMarkRecurringComplete={handleCompleteRecurring}
                          completingKey={completingRecurringKey}
                          deleting={deleting}
                        />
                      ))}
                    </div>
                  </Card>
                  <PaginationControls
                    totalPages={getTotalPages(expenseTransactions)}
                    dataLength={expenseTransactions.length}
                  />
                </>
              )}
            </TabsContent>

            {/* Recurring Only */}
            <TabsContent value="recurring" className="mt-0">
              {recurringTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Repeat className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">No recurring items for this month</p>
                  <p className="text-xs text-muted-foreground mt-1">Due recurring or completed payments from patterns appear here</p>
                </div>
              ) : (
                <>
                  <Card className="overflow-hidden p-0">
                    <div className="divide-y divide-border">
                      {getPaginatedData(recurringTransactions).map((item) => (
                        <TransactionListItemRow
                          key={
                            item.kind === "transaction"
                              ? item.t.id
                              : `${item.p.patternId}:${item.p.dueDate}`
                          }
                          item={item}
                          format={format}
                          onEdit={handleEditTransaction}
                          onDelete={handleDeleteTransaction}
                          onMarkRecurringComplete={handleCompleteRecurring}
                          completingKey={completingRecurringKey}
                          deleting={deleting}
                        />
                      ))}
                    </div>
                  </Card>
                  <PaginationControls
                    totalPages={getTotalPages(recurringTransactions)}
                    dataLength={recurringTransactions.length}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
