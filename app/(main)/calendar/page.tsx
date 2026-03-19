"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { useTransactionsStore } from "@/store/transactions-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

interface DayTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
}

export default function CalendarPage() {
  const { format } = useFormatCurrency();
  const { transactions, fetchTransactions } = useTransactionsStore();

  const [calCurrentDate, setCalCurrentDate] = useState(new Date());
  const [calSelectedDate, setCalSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isAddCalDialogOpen, setIsAddCalDialogOpen] = useState(false);

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calGetDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const calGetFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const calToDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const calGetTransactionsForDate = (date: Date): DayTransaction[] =>
    transactions
      .filter((t) => t.date === calToDateString(date))
      .map((t) => ({
        id: t.id,
        type: t.type as "income" | "expense",
        amount: t.amount,
        description: t.description,
        category: t.category,
      }));

  const calHandleDayClick = (date: Date) => {
    setCalSelectedDate(date);
    setIsDayModalOpen(true);
  };

  const calGetDayTotal = (date: Date) => {
    const dayTxns = calGetTransactionsForDate(date);
    const income = dayTxns
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expenses = dayTxns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return { income, expenses };
  };

  const calNavigateMonth = (direction: "prev" | "next") => {
    setCalCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + (direction === "next" ? 1 : -1));
      return d;
    });
  };

  const calIsToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const calIsSelected = (date: Date) => {
    if (!calSelectedDate) return false;
    return (
      date.getDate() === calSelectedDate.getDate() &&
      date.getMonth() === calSelectedDate.getMonth() &&
      date.getFullYear() === calSelectedDate.getFullYear()
    );
  };

  const calRenderDays = () => {
    const daysInMonth = calGetDaysInMonth(calCurrentDate);
    const firstDay = calGetFirstDayOfMonth(calCurrentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 border min-h-[100px] bg-muted/20" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(calCurrentDate.getFullYear(), calCurrentDate.getMonth(), day);
      const dayTxns = calGetTransactionsForDate(date);
      const { income, expenses } = calGetDayTotal(date);
      const hasTxns = dayTxns.length > 0;

      days.push(
        <div
          key={day}
          className={`p-2 border min-h-[100px] cursor-pointer transition-colors ${
            calIsToday(date) ? "bg-primary/10 dark:bg-primary/20 border-primary/30" : ""
          } ${calIsSelected(date) ? "ring-2 ring-primary ring-inset" : ""} ${
            hasTxns ? "hover:bg-muted/50" : ""
          }`}
          onClick={() => calHandleDayClick(date)}
        >
          <span
            className={`text-sm font-medium ${
              calIsToday(date) ? "text-primary font-bold" : "text-foreground"
            }`}
          >
            {day}
          </span>
          {hasTxns && (
            <div className="mt-1 space-y-0.5">
              {income > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-600 shrink-0" />
                  <span className="text-[10px] text-green-600 truncate">{format(income)}</span>
                </div>
              )}
              {expenses > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-red-600 shrink-0" />
                  <span className="text-[10px] text-red-600 truncate">{format(expenses)}</span>
                </div>
              )}
            </div>
          )}
        </div>,
      );
    }
    return days;
  };

  const calMonthlyStats = () => {
    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();
    const monthTxns = transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    const income = monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expenses, net: income - expenses };
  };

  const stats = calMonthlyStats();

  return (
    <div className="min-h-screen bg-background">
      <main className="px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Transaction Calendar</p>
            <h1 className="text-xl font-semibold mt-0.5">
              {calCurrentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </h1>
          </div>
          <Button size="sm" onClick={() => setIsAddCalDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Transaction
          </Button>
        </div>

        {/* Monthly Stats */}
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader className="p-3 pb-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Income</p>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="text-xl font-bold text-green-600">{format(stats.income)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Expenses</p>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="text-xl font-bold text-red-600">{format(stats.expenses)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Net Balance</p>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className={`text-xl font-bold ${stats.net >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {format(stats.net)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar */}
        <Card>
          <CardHeader className="pb-2 border-b border-border px-4 pt-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={() => calNavigateMonth("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold">
                {calCurrentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>
              <Button variant="outline" size="icon" onClick={() => calNavigateMonth("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0 border-t border-l">{calRenderDays()}</div>
            <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary/10 border border-primary/30 rounded" />
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
      </main>

      {/* Day transactions modal */}
      <Dialog
        open={isDayModalOpen}
        onOpenChange={(open) => {
          setIsDayModalOpen(open);
          if (!open) setCalSelectedDate(null);
        }}
      >
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {calSelectedDate
                ? calSelectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "Transactions"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {calSelectedDate
                ? `${calGetTransactionsForDate(calSelectedDate).length} transaction(s) on this day`
                : "Transactions made on this day"}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 -mx-6 px-6">
            {calSelectedDate && calGetTransactionsForDate(calSelectedDate).length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">No transactions on this date</p>
            ) : (
              calSelectedDate && (
                <div className="space-y-2">
                  {calGetTransactionsForDate(calSelectedDate).map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-full shrink-0 ${
                            t.type === "income"
                              ? "bg-green-100 dark:bg-green-950/60"
                              : "bg-red-100 dark:bg-red-950/60"
                          }`}
                        >
                          {t.type === "income" ? (
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{t.description}</p>
                          <p className="text-sm text-muted-foreground">{t.category}</p>
                        </div>
                      </div>
                      <p
                        className={`font-semibold shrink-0 ml-2 ${
                          t.type === "income"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {format(t.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={isAddCalDialogOpen} onOpenChange={setIsAddCalDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>Add a new income or expense transaction</DialogDescription>
          </DialogHeader>
          {isAddCalDialogOpen && (
            <AddTransactionForm
              onSuccess={() => setIsAddCalDialogOpen(false)}
              onCancel={() => setIsAddCalDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
