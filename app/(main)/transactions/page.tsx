"use client";

import { useEffect, useState, useMemo } from "react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Calendar,
  Repeat,
  DollarSign,
  IndianRupee,
  Search,
  Trash2,
  Loader2,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  ArrowUpDown,
} from "lucide-react";
import { MonthSelector } from "@/components/ui/month-selector";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
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

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
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

  // Sorted transactions (applies sort to filtered list)
  const sortedTransactions = useMemo(() => {
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
        return mult * (a.description.localeCompare(b.description, undefined, { sensitivity: "base" }));
      }
      if (sortBy === "category") {
        const catCompare = (a.category || "").localeCompare(b.category || "", undefined, { sensitivity: "base" });
        if (catCompare !== 0) return mult * catCompare;
        return mult * (a.subtype || "").localeCompare(b.subtype || "", undefined, { sensitivity: "base" });
      }
      return 0;
    });
    return list;
  }, [filteredTransactions, sortBy, sortOrder]);

  // Pagination (based on sorted list)
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, currentPage, itemsPerPage]);

  // Reset to page 1 when filters or sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filteredTransactions.length,
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
    const rows = sortedTransactions.map((t) => [
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

  const allTransactions = sortedTransactions;
  const incomeTransactions = sortedTransactions.filter(
    (t) => t.type === "income",
  );
  const expenseTransactions = sortedTransactions.filter(
    (t) => t.type === "expense",
  );
  const recurringTransactions = sortedTransactions.filter(
    (t) => t.isRecurring,
  );

  // Pagination helper function
  const getPaginatedData = (data: Transaction[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const getTotalPages = (data: Transaction[]) => {
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
            <div className="text-sm text-muted-foreground shrink-0" title={`${filteredTransactions.length} transactions`}>
              <span className="sm:hidden">{filteredTransactions.length}</span>
              <span className="hidden sm:inline">{filteredTransactions.length} transaction(s)</span>
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
                  disabled={sortedTransactions.length === 0}
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
              {paginatedTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <IndianRupee className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">No transactions yet</p>
                  <p className="text-xs text-muted-foreground">Start by adding your first transaction</p>
                </div>
              ) : (
                <>
                  <Card className="overflow-hidden p-0">
                    <div className="divide-y divide-border">
                      {paginatedTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`shrink-0 p-1.5 rounded-full ${
                                transaction.type === "income"
                                  ? "bg-green-100 text-green-600"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {transaction.type === "income" ? (
                                <TrendingUp className="h-3.5 w-3.5" />
                              ) : (
                                <TrendingDown className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm truncate">
                                  {transaction.description}
                                </p>
                                {transaction.isRecurring && (
                                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 shrink-0">
                                    <Repeat className="h-3 w-3" />
                                    <span>{transaction.frequency}</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                  {transaction.category}
                                  {transaction.subtype && ` · ${transaction.subtype}`}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(transaction.date).toLocaleDateString()}
                                </span>
                                {transaction.isRecurring && transaction.nextDate && (
                                  <span className="text-[10px] text-blue-500">
                                    Next: {new Date(transaction.nextDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <p
                              className={`font-mono font-semibold text-sm ${
                                transaction.type === "income"
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {transaction.type === "income" ? "+" : "−"}
                              {format(transaction.amount)}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEditTransaction(transaction)}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              disabled={deleting === transaction.id}
                              title="Delete"
                            >
                              {deleting === transaction.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <PaginationControls
                    totalPages={totalPages}
                    dataLength={sortedTransactions.length}
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
                      {getPaginatedData(incomeTransactions).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0 p-1.5 rounded-full bg-green-100 text-green-600">
                              <TrendingUp className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm truncate">
                                  {transaction.description}
                                </p>
                                {transaction.isRecurring && (
                                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 shrink-0">
                                    <Repeat className="h-3 w-3" />
                                    <span>{transaction.frequency}</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                  {transaction.category}
                                  {transaction.subtype && ` · ${transaction.subtype}`}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(transaction.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <p className="font-mono font-semibold text-sm text-green-600 dark:text-green-400">
                              +{format(transaction.amount)}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEditTransaction(transaction)}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              disabled={deleting === transaction.id}
                              title="Delete"
                            >
                              {deleting === transaction.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
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
                      {getPaginatedData(expenseTransactions).map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0 p-1.5 rounded-full bg-red-100 text-red-600">
                              <TrendingDown className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm truncate">
                                  {transaction.description}
                                </p>
                                {transaction.isRecurring && (
                                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 shrink-0">
                                    <Repeat className="h-3 w-3" />
                                    <span>{transaction.frequency}</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                  {transaction.category}
                                  {transaction.subtype && ` · ${transaction.subtype}`}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(transaction.date).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <p className="font-mono font-semibold text-sm text-red-600 dark:text-red-400">
                              −{format(transaction.amount)}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEditTransaction(transaction)}
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              disabled={deleting === transaction.id}
                              title="Delete"
                            >
                              {deleting === transaction.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
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
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">No recurring transactions found</p>
                </div>
              ) : (
                <>
                  <Card className="overflow-hidden p-0">
                    <div className="divide-y divide-border">
                      {getPaginatedData(recurringTransactions).map(
                        (transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`shrink-0 p-1.5 rounded-full ${
                                  transaction.type === "income"
                                    ? "bg-green-100 text-green-600"
                                    : "bg-red-100 text-red-600"
                                }`}
                              >
                                {transaction.type === "income" ? (
                                  <TrendingUp className="h-3.5 w-3.5" />
                                ) : (
                                  <TrendingDown className="h-3.5 w-3.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-sm truncate">
                                    {transaction.description}
                                  </p>
                                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 shrink-0">
                                    <Repeat className="h-3 w-3" />
                                    <span>{transaction.frequency}</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                    {transaction.category}
                                    {transaction.subtype && ` · ${transaction.subtype}`}
                                  </span>
                                  {transaction.nextDate && (
                                    <span className="text-[10px] text-blue-500">
                                      Next: {new Date(transaction.nextDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <p
                                className={`font-mono font-semibold text-sm ${
                                  transaction.type === "income"
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400"
                                }`}
                              >
                                {transaction.type === "income" ? "+" : "−"}
                                {format(transaction.amount)}
                              </p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => handleEditTransaction(transaction)}
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                disabled={deleting === transaction.id}
                                title="Delete"
                              >
                                {deleting === transaction.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ),
                      )}
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
