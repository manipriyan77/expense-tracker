"use client";

import { useEffect, useState, useMemo } from "react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Search,
  Trash2,
  Loader2,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { MonthSelector } from "@/components/ui/month-selector";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { formatCurrency } from "@/lib/utils/currency";

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const response = await fetch("/api/transactions");

      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }

      const data = await response.json();

      // Transform the data to match the Transaction interface
      const transformedTransactions: Transaction[] = data.map(
        (t: TransactionFromDB) => ({
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
        }),
      );

      setTransactions(transformedTransactions);
    } catch (error) {
      console.error("Error loading transactions:", error);
      setTransactions([]);
    }
  };

  const handleTransactionSuccess = () => {
    loadTransactions();
    setIsAddDialogOpen(false);
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

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    filteredTransactions.length,
    searchQuery,
    filterCategory,
    filterType,
    minAmount,
    maxAmount,
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
    const rows = filteredTransactions.map((t) => [
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

  const allTransactions = filteredTransactions;
  const incomeTransactions = filteredTransactions.filter(
    (t) => t.type === "income",
  );
  const expenseTransactions = filteredTransactions.filter(
    (t) => t.type === "expense",
  );
  const recurringTransactions = filteredTransactions.filter(
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
      <div className="flex items-center justify-between mt-6">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
          {Math.min(currentPage * itemsPerPage, dataLength)} of {dataLength}{" "}
          transactions
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="flex items-center gap-1">
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
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(pages, p + 1))}
            disabled={currentPage === pages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select
          value={itemsPerPage.toString()}
          onValueChange={(v) => {
            setItemsPerPage(parseInt(v));
            setCurrentPage(1);
          }}
        >
          <SelectTrigger className="w-20">
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

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Month Selector */}
          <div className="mb-6 flex items-center justify-between">
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              monthsToShow={7}
            />
            <div className="text-sm text-gray-600">
              {filteredTransactions.length} transaction(s)
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Balance
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{balance.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Income - Expenses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Income
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ₹{totalIncome.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedMonth.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Expenses
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  ₹{totalExpenses.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedMonth.toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Actions Bar */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              {/* Search */}
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search transactions, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                {/* Filter Toggle */}
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? "bg-gray-100" : ""}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {(filterCategory !== "all" ||
                    filterType !== "all" ||
                    minAmount ||
                    maxAmount) && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
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
                  onClick={exportToCSV}
                  disabled={filteredTransactions.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>

                {/* Add Transaction */}
                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="w-full md:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Transaction
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
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Category
                    </label>
                    <Select
                      value={filterCategory}
                      onValueChange={setFilterCategory}
                    >
                      <SelectTrigger>
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
                    <label className="text-sm font-medium mb-2 block">
                      Type
                    </label>
                    <Select
                      value={filterType}
                      onValueChange={(v) =>
                        setFilterType(v as typeof filterType)
                      }
                    >
                      <SelectTrigger>
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
                    <label className="text-sm font-medium mb-2 block">
                      Min Amount
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Max Amount
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="No limit"
                        value={maxAmount}
                        onChange={(e) => setMaxAmount(e.target.value)}
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
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
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

            {/* All Transactions */}
            <TabsContent value="all" className="space-y-4">
              {paginatedTransactions.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <DollarSign className="h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg font-semibold text-gray-900 mb-2">
                      No transactions yet
                    </p>
                    <p className="text-gray-600 mb-4">
                      Start by adding your first transaction
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {paginatedTransactions.map((transaction) => (
                    <Card key={transaction.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div
                              className={`p-3 rounded-full ${
                                transaction.type === "income"
                                  ? "bg-green-100 text-green-600"
                                  : "bg-red-100 text-red-600"
                              }`}
                            >
                              {transaction.type === "income" ? (
                                <TrendingUp className="h-5 w-5" />
                              ) : (
                                <TrendingDown className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-semibold text-lg">
                                  {transaction.description}
                                </p>
                                {transaction.isRecurring && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center space-x-1">
                                    <Repeat className="h-3 w-3" />
                                    <span>{transaction.frequency}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {transaction.category}
                                {transaction.subtype && (
                                  <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                                    {transaction.subtype}
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center space-x-4 mt-1">
                                <div className="flex items-center space-x-1 text-xs text-gray-500">
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {new Date(
                                      transaction.date,
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                                {transaction.isRecurring &&
                                  transaction.nextDate && (
                                    <div className="flex items-center space-x-1 text-xs text-blue-600">
                                      <span>
                                        Next:{" "}
                                        {new Date(
                                          transaction.nextDate,
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p
                                className={`text-xl font-bold ${
                                  transaction.type === "income"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {transaction.type === "income" ? "+" : "-"}₹
                                {transaction.amount.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDeleteTransaction(transaction.id)
                                }
                                disabled={deleting === transaction.id}
                              >
                                {deleting === transaction.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <PaginationControls
                    totalPages={totalPages}
                    dataLength={filteredTransactions.length}
                  />
                </>
              )}
            </TabsContent>

            {/* Income Only */}
            <TabsContent value="income" className="space-y-4">
              {incomeTransactions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    No income transactions found
                  </CardContent>
                </Card>
              ) : (
                <>
                  {getPaginatedData(incomeTransactions).map((transaction) => (
                    <Card key={transaction.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 rounded-full bg-green-100 text-green-600">
                              <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-semibold text-lg">
                                  {transaction.description}
                                </p>
                                {transaction.isRecurring && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center space-x-1">
                                    <Repeat className="h-3 w-3" />
                                    <span>{transaction.frequency}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {transaction.category}
                                {transaction.subtype && (
                                  <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                                    {transaction.subtype}
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {new Date(
                                    transaction.date,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <p className="text-xl font-bold text-green-600">
                              +₹{transaction.amount.toFixed(2)}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeleteTransaction(transaction.id)
                              }
                              disabled={deleting === transaction.id}
                            >
                              {deleting === transaction.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-600" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <PaginationControls
                    totalPages={getTotalPages(incomeTransactions)}
                    dataLength={incomeTransactions.length}
                  />
                </>
              )}
            </TabsContent>

            {/* Expenses Only */}
            <TabsContent value="expense" className="space-y-4">
              {expenseTransactions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    No expense transactions found
                  </CardContent>
                </Card>
              ) : (
                <>
                  {getPaginatedData(expenseTransactions).map((transaction) => (
                    <Card key={transaction.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-3 rounded-full bg-red-100 text-red-600">
                              <TrendingDown className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-semibold text-lg">
                                  {transaction.description}
                                </p>
                                {transaction.isRecurring && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center space-x-1">
                                    <Repeat className="h-3 w-3" />
                                    <span>{transaction.frequency}</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {transaction.category}
                                {transaction.subtype && (
                                  <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                                    {transaction.subtype}
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {new Date(
                                    transaction.date,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <p className="text-xl font-bold text-red-600">
                              -₹{transaction.amount.toFixed(2)}
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeleteTransaction(transaction.id)
                              }
                              disabled={deleting === transaction.id}
                            >
                              {deleting === transaction.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-red-600" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <PaginationControls
                    totalPages={getTotalPages(expenseTransactions)}
                    dataLength={expenseTransactions.length}
                  />
                </>
              )}
            </TabsContent>

            {/* Recurring Only */}
            <TabsContent value="recurring" className="space-y-4">
              {recurringTransactions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    No recurring transactions found
                  </CardContent>
                </Card>
              ) : (
                <>
                  {getPaginatedData(recurringTransactions).map(
                    (transaction) => (
                      <Card key={transaction.id} className="border-blue-200">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div
                                className={`p-3 rounded-full ${
                                  transaction.type === "income"
                                    ? "bg-green-100 text-green-600"
                                    : "bg-red-100 text-red-600"
                                }`}
                              >
                                {transaction.type === "income" ? (
                                  <TrendingUp className="h-5 w-5" />
                                ) : (
                                  <TrendingDown className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <p className="font-semibold text-lg">
                                    {transaction.description}
                                  </p>
                                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 flex items-center space-x-1">
                                    <Repeat className="h-3 w-3" />
                                    <span>{transaction.frequency}</span>
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500">
                                  {transaction.category}
                                  {transaction.subtype && (
                                    <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                                      {transaction.subtype}
                                    </span>
                                  )}
                                </p>
                                {transaction.nextDate && (
                                  <div className="flex items-center space-x-1 text-xs text-blue-600 mt-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      Next:{" "}
                                      {new Date(
                                        transaction.nextDate,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <p
                                className={`text-xl font-bold ${
                                  transaction.type === "income"
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {transaction.type === "income" ? "+" : "-"}₹
                                {transaction.amount.toFixed(2)}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDeleteTransaction(transaction.id)
                                }
                                disabled={deleting === transaction.id}
                              >
                                {deleting === transaction.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ),
                  )}
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
