"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Repeat,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { useTransactionsStore } from "@/store/transactions-store";
import { useRecurringPatternsStore } from "@/store/recurring-patterns-store";
import { getPendingOccurrencesForMonth } from "@/lib/utils/recurring-occurrences";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

interface DayTransaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  isPendingRecurring?: boolean;
  patternId?: string;
  dueDate?: string;
}

export default function CalendarPage() {
  const { format } = useFormatCurrency();
  const { transactions, fetchTransactions } = useTransactionsStore();
  const { patterns, fetchPatterns, completeOccurrence } =
    useRecurringPatternsStore();

  const [calCurrentDate, setCalCurrentDate] = useState(new Date());
  const [calSelectedDate, setCalSelectedDate] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [isAddCalDialogOpen, setIsAddCalDialogOpen] = useState(false);
  const [completingKey, setCompletingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
    fetchPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingByDate = useMemo(() => {
    const y = calCurrentDate.getFullYear();
    const m = calCurrentDate.getMonth();
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
    const map: Record<string, DayTransaction[]> = {};
    for (const p of raw) {
      const row: DayTransaction = {
        id: `pending:${p.patternId}:${p.dueDate}`,
        type: p.type,
        amount: p.amount,
        description: p.description,
        category: p.category,
        isPendingRecurring: true,
        patternId: p.patternId,
        dueDate: p.dueDate,
      };
      if (!map[p.dueDate]) map[p.dueDate] = [];
      map[p.dueDate].push(row);
    }
    return map;
  }, [calCurrentDate, patterns, transactions]);

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

  const calGetTransactionsForDate = useCallback(
    (date: Date): DayTransaction[] => {
      const key = calToDateString(date);
      const pending = pendingByDate[key] ?? [];
      const real = transactions
        .filter((t) => t.date === key)
        .map((t) => ({
          id: t.id,
          type: t.type as "income" | "expense",
          amount: t.amount,
          description: t.description,
          category: t.category,
        }));
      return [...pending, ...real];
    },
    [transactions, pendingByDate],
  );

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

  const handleMarkPaid = async (patternId: string, dueDate: string) => {
    const key = `${patternId}:${dueDate}`;
    setCompletingKey(key);
    try {
      await completeOccurrence(patternId, dueDate);
      await fetchTransactions();
      toast.success("Payment recorded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not record payment");
    } finally {
      setCompletingKey(null);
    }
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
      const hasPending = dayTxns.some((t) => t.isPendingRecurring);

      days.push(
        <div
          key={day}
          className={`p-2 border min-h-[100px] cursor-pointer transition-colors ${
            calIsToday(date) ? "bg-primary/10 dark:bg-primary/20 border-primary/30" : ""
          } ${calIsSelected(date) ? "ring-2 ring-primary ring-inset" : ""} ${
            hasTxns ? "hover:bg-muted/50" : ""
          } ${hasPending ? "bg-amber-50/40 dark:bg-amber-950/15" : ""}`}
          onClick={() => calHandleDayClick(date)}
        >
          <span
            className={`text-sm font-medium ${
              calIsToday(date) ? "text-primary font-bold" : "text-foreground"
            }`}
          >
            {day}
          </span>
          {hasPending && (
            <div className="mt-0.5 flex items-center gap-0.5 text-[9px] text-amber-800 dark:text-amber-200 font-medium">
              <Repeat className="h-2.5 w-2.5 shrink-0" />
              <span>Due</span>
            </div>
          )}
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

        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader className="p-3 pb-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Income</p>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="text-xl font-bold text-green-600">{format(stats.income)}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Recorded only (not due recurring)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-3 pb-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Expenses</p>
            </CardHeader>
            <CardContent className="p-3 pt-2">
              <div className="text-xl font-bold text-red-600">{format(stats.expenses)}</div>
              <p className="text-[10px] text-muted-foreground mt-1">Recorded only</p>
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
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-primary/10 border border-primary/30 rounded" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-100 dark:bg-amber-950/40 border border-amber-300/50 rounded" />
                <span>Has due recurring</span>
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
                ? `${calGetTransactionsForDate(calSelectedDate).length} item(s) — tap Mark paid when a recurring payment is done`
                : "Items on this day"}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 min-h-0 -mx-6 px-6">
            {calSelectedDate && calGetTransactionsForDate(calSelectedDate).length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">Nothing on this date</p>
            ) : (
              calSelectedDate && (
                <div className="space-y-2">
                  {calGetTransactionsForDate(calSelectedDate).map((t) => {
                    const ck =
                      t.isPendingRecurring && t.patternId && t.dueDate
                        ? `${t.patternId}:${t.dueDate}`
                        : null;
                    const loading = ck != null && completingKey === ck;
                    return (
                      <div
                        key={t.id}
                        className={`flex flex-col gap-2 p-3 border rounded-lg ${
                          t.isPendingRecurring
                            ? "bg-amber-50/80 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-900/50"
                            : "bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
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
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-foreground truncate">{t.description}</p>
                                {t.isPendingRecurring && (
                                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-amber-200/90 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100 flex items-center gap-1">
                                    <Repeat className="h-3 w-3" />
                                    Due
                                  </span>
                                )}
                              </div>
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
                        {t.isPendingRecurring && t.patternId && t.dueDate && (
                          <Button
                            size="sm"
                            className="w-full gap-1"
                            disabled={loading}
                            onClick={() => {
                              if (t.patternId && t.dueDate) {
                                handleMarkPaid(t.patternId, t.dueDate);
                              }
                            }}
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Mark paid
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCalDialogOpen} onOpenChange={setIsAddCalDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>Add a new income or expense transaction</DialogDescription>
          </DialogHeader>
          {isAddCalDialogOpen && (
            <AddTransactionForm
              onSuccess={() => {
                setIsAddCalDialogOpen(false);
                fetchTransactions();
              }}
              onCancel={() => setIsAddCalDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
