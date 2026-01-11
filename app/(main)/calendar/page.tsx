"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { useTransactionsStore } from "@/store/transactions-store";

interface DayTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
}

export default function CalendarPage() {
  const { transactions, loading, fetchTransactions } = useTransactionsStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getTransactionsForDate = (date: Date): DayTransaction[] => {
    const dateStr = date.toISOString().split("T")[0];
    return transactions
      .filter((t) => t.date === dateStr)
      .map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        category: t.category,
      }));
  };

  const getDayTotal = (date: Date) => {
    const dayTransactions = getTransactionsForDate(date);
    const income = dayTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = dayTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, net: income - expenses };
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date) => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 border" />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayTransactions = getTransactionsForDate(date);
      const { income, expenses, net } = getDayTotal(date);
      const hasTransactions = dayTransactions.length > 0;

      days.push(
        <div
          key={day}
          className={`p-2 border min-h-[120px] cursor-pointer transition-colors ${
            isToday(date) ? "bg-blue-50 border-blue-300" : ""
          } ${isSelected(date) ? "ring-2 ring-blue-500" : ""} ${
            hasTransactions ? "hover:bg-gray-50" : ""
          }`}
          onClick={() => setSelectedDate(date)}
        >
          <div className="flex justify-between items-start mb-1">
            <span
              className={`text-sm font-medium ${
                isToday(date) ? "text-blue-600 font-bold" : "text-gray-700"
              }`}
            >
              {day}
            </span>
            {dayTransactions.length > 0 && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                {dayTransactions.length}
              </Badge>
            )}
          </div>

          {hasTransactions && (
            <div className="space-y-1">
              {income > 0 && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>{formatCurrency(income)}</span>
                </div>
              )}
              {expenses > 0 && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <TrendingDown className="h-3 w-3" />
                  <span>{formatCurrency(expenses)}</span>
                </div>
              )}
              {dayTransactions.slice(0, 2).map((t) => (
                <div
                  key={t.id}
                  className="text-xs text-gray-600 truncate"
                  title={t.description}
                >
                  • {t.description}
                </div>
              ))}
              {dayTransactions.length > 2 && (
                <div className="text-xs text-gray-400">
                  +{dayTransactions.length - 2} more
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const monthlyStats = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthTransactions = transactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate.getFullYear() === year && tDate.getMonth() === month;
    });

    const income = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expenses, net: income - expenses };
  };

  const stats = monthlyStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Transaction Calendar</h1>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Monthly Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.income)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.expenses)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Net Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.net >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {formatCurrency(stats.net)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigateMonth("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-sm font-semibold text-gray-600"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-0 border-t border-l">
              {renderCalendarDays()}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-50 border border-blue-300 rounded" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span>Income</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span>Expense</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        {selectedDate && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>
                Transactions on{" "}
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getTransactionsForDate(selectedDate).length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No transactions on this date
                </p>
              ) : (
                <div className="space-y-3">
                  {getTransactionsForDate(selectedDate).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            t.type === "income" ? "bg-green-100" : "bg-red-100"
                          }`}
                        >
                          {t.type === "income" ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{t.description}</p>
                          <p className="text-sm text-gray-500">{t.category}</p>
                        </div>
                      </div>
                      <p
                        className={`font-semibold ${
                          t.type === "income" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Add Transaction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Add a new income or expense transaction
            </DialogDescription>
          </DialogHeader>
          {isAddDialogOpen && (
            <AddTransactionForm
              onSuccess={() => setIsAddDialogOpen(false)}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
