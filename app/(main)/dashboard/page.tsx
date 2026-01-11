"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  User as UserIcon,
  Target,
  Wallet,
  BarChart3,
  ArrowRight,
  Loader2,
  Plus,
  Trophy,
  CreditCard,
  PiggyBank,
  CalendarDays,
} from "lucide-react";
import { useTransactionsStore } from "@/store/transactions-store";
import { useGoalsStore } from "@/store/goals-store";
import { useBudgetsStore } from "@/store/budgets-store";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { RecentTransactionsWidget } from "@/components/dashboard/RecentTransactionsWidget";
import { QuickAddButton } from "@/components/QuickAddButton";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { formatCurrency } from "@/lib/utils/currency";
import { StatsSkeleton } from "@/components/ui/skeleton";


export default function Dashboard() {
  const router = useRouter();
  const { transactions, loading, error, fetchTransactions } = useTransactionsStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { budgets, fetchBudgets } = useBudgetsStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchGoals();
    fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: "n",
      ctrlKey: true,
      action: () => setIsAddDialogOpen(true),
      description: "Add new transaction",
    },
    {
      key: "d",
      ctrlKey: true,
      action: () => router.push("/dashboard"),
      description: "Go to dashboard",
    },
    {
      key: "a",
      ctrlKey: true,
      action: () => router.push("/analytics"),
      description: "Go to analytics",
    },
    {
      key: "b",
      ctrlKey: true,
      action: () => router.push("/budgets"),
      description: "Go to budgets",
    },
    {
      key: "g",
      ctrlKey: true,
      action: () => router.push("/goals"),
      description: "Go to goals",
    },
    {
      key: "?",
      shiftKey: true,
      action: () => setShowShortcuts(true),
      description: "Show keyboard shortcuts",
    },
  ]);

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <StatsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchTransactions} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  const activeGoals = goals.filter((g) => g.status === "active").length;
  const activeBudgets = budgets.length;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500">Welcome back! Here's your financial overview</p>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => setShowShortcuts(true)}>
                      <span className="text-lg">?</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Keyboard Shortcuts</TooltipContent>
                </Tooltip>
                <NotificationCenter />
                <div className="flex items-center space-x-2 pl-2 border-l">
                  <UserIcon className="h-5 w-5 text-gray-500" />
                  <div className="text-sm text-gray-700">
                    <div>Welcome, User</div>
                    <div className="text-xs text-gray-500">user@example.com</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Balance
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                      {formatCurrency(balance)}
                    </div>
                    <p className="text-xs text-gray-500">Income - Expenses</p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>Your net balance for all time</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <Link href="/transactions">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Income
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(totalIncome)}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center">
                        All time
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </p>
                    </CardContent>
                  </Link>
                </Card>
              </TooltipTrigger>
              <TooltipContent>Click to view all income transactions</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <Link href="/transactions">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Expenses
                      </CardTitle>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(totalExpenses)}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center">
                        All time
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </p>
                    </CardContent>
                  </Link>
                </Card>
              </TooltipTrigger>
              <TooltipContent>Click to view all expense transactions</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <Link href="/transactions">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Transactions
                      </CardTitle>
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-purple-600">
                        {transactions.length}
                      </div>
                      <p className="text-xs text-gray-500 flex items-center">
                        Total recorded
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </p>
                    </CardContent>
                  </Link>
                </Card>
              </TooltipTrigger>
              <TooltipContent>Total number of transactions</TooltipContent>
            </Tooltip>
          </div>

          {/* Quick Access Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Quick Access
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/goals">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center space-x-4 p-6">
                    <div className="p-3 rounded-full bg-blue-100">
                      <Target className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Goals</h4>
                      <p className="text-sm text-gray-500">{activeGoals} active</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/budgets">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center space-x-4 p-6">
                    <div className="p-3 rounded-full bg-purple-100">
                      <CreditCard className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Budgets</h4>
                      <p className="text-sm text-gray-500">{activeBudgets} set</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/savings-challenges">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center space-x-4 p-6">
                    <div className="p-3 rounded-full bg-green-100">
                      <Trophy className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Challenges</h4>
                      <p className="text-sm text-gray-500">Save more</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/calendar">
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center space-x-4 p-6">
                    <div className="p-3 rounded-full bg-orange-100">
                      <CalendarDays className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Calendar</h4>
                      <p className="text-sm text-gray-500">View timeline</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Recent Transactions Widget */}
          <div className="mb-8">
            <RecentTransactionsWidget />
          </div>
        </main>

        {/* Quick Add Button */}
        <QuickAddButton />

        {/* Keyboard Shortcuts Dialog */}
        <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />

        {/* Add Transaction Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
              <DialogDescription>
                Record your income or expense transaction with detailed categorization.
              </DialogDescription>
            </DialogHeader>
            {isAddDialogOpen && (
              <AddTransactionForm
                onSuccess={() => {
                  setIsAddDialogOpen(false);
                  fetchTransactions();
                }}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
