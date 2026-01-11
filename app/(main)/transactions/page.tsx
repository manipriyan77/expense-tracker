"use client";

import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Repeat,
  DollarSign,
  Search,
  Trash2,
  Loader2,
} from "lucide-react";
import { MonthSelector } from "@/components/ui/month-selector";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";

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
      const transformedTransactions: Transaction[] = data.map((t: TransactionFromDB) => ({
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
      }));

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
    if (!confirm("Are you sure you want to delete this transaction? This will update any linked budgets and goals.")) {
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

  // Filter transactions by selected month and search query
  const filteredTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.date);
    const matchesMonth =
      transactionDate.getMonth() === selectedMonth.getMonth() &&
      transactionDate.getFullYear() === selectedMonth.getFullYear();
    const matchesSearch = t.description
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesMonth && matchesSearch;
  });

  const allTransactions = filteredTransactions;
  const incomeTransactions = filteredTransactions.filter(
    (t) => t.type === "income"
  );
  const expenseTransactions = filteredTransactions.filter(
    (t) => t.type === "expense"
  );
  const recurringTransactions = filteredTransactions.filter(
    (t) => t.isRecurring
  );

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
              <p className="text-xs text-muted-foreground">Income - Expenses</p>
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Add Transaction */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
            {allTransactions.length === 0 ? (
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
              allTransactions.map((transaction) => (
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
                                  transaction.date
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            {transaction.isRecurring &&
                              transaction.nextDate && (
                                <div className="flex items-center space-x-1 text-xs text-blue-600">
                                  <span>
                                    Next:{" "}
                                    {new Date(
                                      transaction.nextDate
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
                            onClick={() => handleDeleteTransaction(transaction.id)}
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
              ))
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
              incomeTransactions.map((transaction) => (
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
                              {new Date(transaction.date).toLocaleDateString()}
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
                          onClick={() => handleDeleteTransaction(transaction.id)}
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
              ))
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
              expenseTransactions.map((transaction) => (
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
                              {new Date(transaction.date).toLocaleDateString()}
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
                          onClick={() => handleDeleteTransaction(transaction.id)}
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
              ))
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
              recurringTransactions.map((transaction) => (
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
                                  transaction.nextDate
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
                          onClick={() => handleDeleteTransaction(transaction.id)}
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
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
      </div>
    </>
  );
}
