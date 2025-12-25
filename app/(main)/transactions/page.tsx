"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Repeat,
  DollarSign,
  Filter,
  Search,
} from "lucide-react";

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  date: string;
  isRecurring: boolean;
  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  nextDate?: string;
}

const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  isRecurring: z.boolean(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "expense",
      amount: "",
      description: "",
      category: "",
      isRecurring: false,
      frequency: "monthly",
    },
  });

  const isRecurring = watch("isRecurring");
  const transactionType = watch("type");

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    // Mock data combining income, expense, and recurring
    const mockTransactions: Transaction[] = [
      {
        id: "1",
        type: "income",
        amount: 3000,
        description: "Monthly Salary",
        category: "Salary",
        date: "2024-12-20",
        isRecurring: true,
        frequency: "monthly",
        nextDate: "2025-01-20",
      },
      {
        id: "2",
        type: "expense",
        amount: 1200,
        description: "Rent Payment",
        category: "Bills",
        date: "2024-12-01",
        isRecurring: true,
        frequency: "monthly",
        nextDate: "2025-01-01",
      },
      {
        id: "3",
        type: "expense",
        amount: 50,
        description: "Groceries",
        category: "Food",
        date: "2024-12-23",
        isRecurring: false,
      },
      {
        id: "4",
        type: "income",
        amount: 500,
        description: "Freelance Project",
        category: "Freelance",
        date: "2024-12-15",
        isRecurring: false,
      },
      {
        id: "5",
        type: "expense",
        amount: 15,
        description: "Netflix Subscription",
        category: "Entertainment",
        date: "2024-12-15",
        isRecurring: true,
        frequency: "monthly",
        nextDate: "2025-01-15",
      },
      {
        id: "6",
        type: "expense",
        amount: 25,
        description: "Coffee",
        category: "Food",
        date: "2024-12-22",
        isRecurring: false,
      },
      {
        id: "7",
        type: "expense",
        amount: 80,
        description: "Gas",
        category: "Transportation",
        date: "2024-12-21",
        isRecurring: false,
      },
    ];
    setTransactions(mockTransactions);
  };

  const onSubmit = (data: TransactionFormData) => {
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      type: data.type,
      amount: parseFloat(data.amount),
      description: data.description,
      category: data.category,
      date: new Date().toISOString().split("T")[0],
      isRecurring: data.isRecurring,
      frequency: data.isRecurring ? data.frequency : undefined,
      nextDate: data.isRecurring
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        : undefined,
    };

    setTransactions([newTransaction, ...transactions]);
    reset();
    setIsAddDialogOpen(false);
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((t) =>
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Calculations
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
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
              <div className="text-2xl font-bold">${balance.toFixed(2)}</div>
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
                ${totalIncome.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
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
                ${totalExpenses.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
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
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
                <DialogDescription>
                  Create a one-time or recurring transaction
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Transaction Type */}
                <div className="space-y-2">
                  <Label htmlFor="type">Transaction Type</Label>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">
                            <div className="flex items-center space-x-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span>Income</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="expense">
                            <div className="flex items-center space-x-2">
                              <TrendingDown className="h-4 w-4 text-red-600" />
                              <span>Expense</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.type && (
                    <p className="text-sm text-red-600">{errors.type.message}</p>
                  )}
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Controller
                    name="amount"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                      />
                    )}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-600">{errors.amount.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        id="description"
                        placeholder="What is this for?"
                      />
                    )}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {transactionType === "income" ? (
                            <>
                              <SelectItem value="Salary">Salary</SelectItem>
                              <SelectItem value="Freelance">Freelance</SelectItem>
                              <SelectItem value="Investment">Investment</SelectItem>
                              <SelectItem value="Business">Business</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="Food">Food</SelectItem>
                              <SelectItem value="Transportation">
                                Transportation
                              </SelectItem>
                              <SelectItem value="Entertainment">
                                Entertainment
                              </SelectItem>
                              <SelectItem value="Bills">Bills</SelectItem>
                              <SelectItem value="Shopping">Shopping</SelectItem>
                              <SelectItem value="Healthcare">Healthcare</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.category && (
                    <p className="text-sm text-red-600">
                      {errors.category.message}
                    </p>
                  )}
                </div>

                {/* Recurring Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Repeat className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Recurring Transaction</p>
                      <p className="text-sm text-gray-500">
                        Automatically repeat this transaction
                      </p>
                    </div>
                  </div>
                  <Controller
                    name="isRecurring"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>

                {/* Frequency (only if recurring) */}
                {isRecurring && (
                  <div className="space-y-2 p-4 border rounded-lg bg-blue-50">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Controller
                      name="frequency"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <p className="text-xs text-gray-600 mt-2">
                      This transaction will automatically repeat{" "}
                      {watch("frequency")}
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full">
                  {isRecurring
                    ? "Create Recurring Transaction"
                    : "Add Transaction"}
                </Button>
              </form>
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

                      <div className="text-right">
                        <p
                          className={`text-xl font-bold ${
                            transaction.type === "income"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.type === "income" ? "+" : "-"}$
                          {transaction.amount.toFixed(2)}
                        </p>
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
                          </p>
                          <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(transaction.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-green-600">
                        +${transaction.amount.toFixed(2)}
                      </p>
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
                          </p>
                          <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(transaction.date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-red-600">
                        -${transaction.amount.toFixed(2)}
                      </p>
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
                      <p
                        className={`text-xl font-bold ${
                          transaction.type === "income"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}$
                        {transaction.amount.toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
