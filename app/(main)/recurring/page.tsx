"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
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
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Repeat,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Trash2,
} from "lucide-react";

interface RecurringTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  nextDate: string;
  isActive: boolean;
}

export default function RecurringPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<RecurringTransaction[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    description: "",
    category: "",
    frequency: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
  });

  const checkAuth = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase().auth.getSession();
      if (!session) {
        router.push("/sign-in");
        return;
      }

      const { data: userData } = await supabase().auth.getUser();
      if (userData.user) {
        setUser(userData.user);
      } else {
        setUser(session.user);
      }
    } catch (error) {
      console.error("Auth check error:", error);
      router.push("/sign-in");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    checkAuth();
    loadRecurringTransactions();
  }, [checkAuth]);

  const loadRecurringTransactions = async () => {
    const mockTransactions: RecurringTransaction[] = [
      {
        id: "1",
        type: "income",
        amount: 3000,
        description: "Monthly Salary",
        category: "Salary",
        frequency: "monthly",
        nextDate: "2025-01-01",
        isActive: true,
      },
      {
        id: "2",
        type: "expense",
        amount: 1200,
        description: "Rent Payment",
        category: "Bills",
        frequency: "monthly",
        nextDate: "2025-01-01",
        isActive: true,
      },
      {
        id: "3",
        type: "expense",
        amount: 15,
        description: "Netflix Subscription",
        category: "Entertainment",
        frequency: "monthly",
        nextDate: "2025-01-15",
        isActive: true,
      },
      {
        id: "4",
        type: "expense",
        amount: 50,
        description: "Gym Membership",
        category: "Healthcare",
        frequency: "monthly",
        nextDate: "2025-01-10",
        isActive: false,
      },
    ];
    setTransactions(mockTransactions);
  };

  const handleAddTransaction = async () => {
    if (!formData.amount || !formData.description || !formData.category) return;

    const newTransaction: RecurringTransaction = {
      id: Date.now().toString(),
      type: formData.type,
      amount: parseFloat(formData.amount),
      description: formData.description,
      category: formData.category,
      frequency: formData.frequency,
      nextDate: new Date().toISOString().split("T")[0],
      isActive: true,
    };

    setTransactions([newTransaction, ...transactions]);
    setFormData({
      type: "expense",
      amount: "",
      description: "",
      category: "",
      frequency: "monthly",
    });
    setIsAddDialogOpen(false);
  };

  const toggleActive = (id: string) => {
    setTransactions(
      transactions.map((t) =>
        t.id === id ? { ...t, isActive: !t.isActive } : t
      )
    );
  };

  const activeTransactions = transactions.filter((t) => t.isActive);
  const totalMonthlyIncome = activeTransactions
    .filter((t) => t.type === "income" && t.frequency === "monthly")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalMonthlyExpenses = activeTransactions
    .filter((t) => t.type === "expense" && t.frequency === "monthly")
    .reduce((sum, t) => sum + t.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Recurring Transactions
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Income
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totalMonthlyIncome.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                From recurring sources
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Expenses
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${totalMonthlyExpenses.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                From recurring bills
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Net Monthly
              </CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${(totalMonthlyIncome - totalMonthlyExpenses).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Expected balance change
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Add Button */}
        <div className="mb-6">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Recurring Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Recurring Transaction</DialogTitle>
                <DialogDescription>
                  Set up automatic income or expense tracking
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "income" | "expense") =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="e.g., Monthly Rent"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Salary">Salary</SelectItem>
                      <SelectItem value="Bills">Bills</SelectItem>
                      <SelectItem value="Subscriptions">Subscriptions</SelectItem>
                      <SelectItem value="Food">Food</SelectItem>
                      <SelectItem value="Transportation">
                        Transportation
                      </SelectItem>
                      <SelectItem value="Entertainment">
                        Entertainment
                      </SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(
                      value: "daily" | "weekly" | "monthly" | "yearly"
                    ) => setFormData({ ...formData, frequency: value })}
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
                </div>

                <Button onClick={handleAddTransaction} className="w-full">
                  Add Transaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Transactions List */}
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <Card
              key={transaction.id}
              className={transaction.isActive ? "" : "opacity-60"}
            >
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
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                          {transaction.frequency}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {transaction.category}
                      </p>
                      <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Next: {new Date(transaction.nextDate).toLocaleDateString()}
                        </span>
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
                        {transaction.type === "income" ? "+" : "-"}$
                        {transaction.amount.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(transaction.id)}
                      >
                        {transaction.isActive ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {transactions.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Repeat className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">
                No recurring transactions
              </p>
              <p className="text-gray-600 mb-4">
                Add your first recurring income or expense
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
