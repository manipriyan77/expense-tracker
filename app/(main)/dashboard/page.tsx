"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  LogOut,
  User as UserIcon,
  Target,
  Wallet,
  BarChart3,
  ArrowRight,
} from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: "income" | "expense";
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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
      console.log("User data from getUser():", userData);

      if (userData.user) {
        setUser(userData.user);
      } else {
        // Fallback to session user if getUser fails
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
    loadTransactions();
  }, [checkAuth]);

  const loadTransactions = async () => {
    // For now, using mock data. In a real app, this would fetch from Supabase
    const mockTransactions: Transaction[] = [
      {
        id: "1",
        amount: 50,
        description: "Groceries",
        category: "Food",
        date: "2024-12-23",
        type: "expense",
      },
      {
        id: "2",
        amount: 1200,
        description: "Salary",
        category: "Income",
        date: "2024-12-20",
        type: "income",
      },
      {
        id: "3",
        amount: 25,
        description: "Coffee",
        category: "Food",
        date: "2024-12-22",
        type: "expense",
      },
      {
        id: "4",
        amount: 80,
        description: "Gas",
        category: "Transportation",
        date: "2024-12-21",
        type: "expense",
      },
    ];
    setTransactions(mockTransactions);
  };

  const handleSignOut = async () => {
    await supabase().auth.signOut();
    router.push("/sign-in");
  };

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-gray-500" />
                <div className="text-sm text-gray-700">
                  <div>Welcome, {user?.user_metadata?.user_name || "User"}</div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                  {/* Debug: Show user data structure */}
                  {process.env.NODE_ENV === "development" && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs">
                        Debug User Data
                      </summary>
                      <pre className="text-xs bg-gray-100 p-2 mt-1 rounded max-w-md overflow-auto">
                        {JSON.stringify(user, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.user_metadata?.user_name || "User"}!
          </h2>
          <p className="text-gray-600 mt-2">
            Here's an overview of your financial activity
          </p>
        </div>

        {/* Financial Summary Cards */}
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
                  ${totalIncome.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground flex items-center">
                  This month
                  <ArrowRight className="h-3 w-3 ml-1" />
                </p>
              </CardContent>
            </Link>
          </Card>

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
                  ${totalExpenses.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground flex items-center">
                  This month
                  <ArrowRight className="h-3 w-3 ml-1" />
                </p>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* Quick Access Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Access
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link href="/goals">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="flex items-center space-x-4 p-6">
                  <div className="p-3 rounded-full bg-blue-100">
                    <Target className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Goals</h4>
                    <p className="text-sm text-gray-500">Track your financial goals</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/mutual-funds">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="flex items-center space-x-4 p-6">
                  <div className="p-3 rounded-full bg-purple-100">
                    <Wallet className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Mutual Funds</h4>
                    <p className="text-sm text-gray-500">Manage your investments</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link href="/stocks">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="flex items-center space-x-4 p-6">
                  <div className="p-3 rounded-full bg-orange-100">
                    <BarChart3 className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Stocks</h4>
                    <p className="text-sm text-gray-500">Monitor your portfolio</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest transactions across all accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No recent activity. Start by adding incomes or expenses!
                </p>
              ) : (
                transactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.type === "income"
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {transaction.type === "income" ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-500">
                          {transaction.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${
                          transaction.type === "income"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}$
                        {transaction.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
