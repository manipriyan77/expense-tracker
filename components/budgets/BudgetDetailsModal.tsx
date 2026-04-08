"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Budget } from "@/store/budgets-store";
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Loader2,
  Calendar,
  TrendingDown,
  Clock,
} from "lucide-react";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  subtype: string;
  date: string;
  type: string;
  created_at: string;
}

interface BudgetDetailsModalProps {
  budget: Budget | null;
  isOpen: boolean;
  onClose: () => void;
  onTransactionDeleted?: () => void;
}

export default function BudgetDetailsModal({
  budget,
  isOpen,
  onClose,
  onTransactionDeleted,
}: BudgetDetailsModalProps) {
  const { format } = useFormatCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (budget && isOpen) {
      fetchTransactions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budget?.id, budget?.month, budget?.year, isOpen]);

  const fetchTransactions = async () => {
    if (!budget) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/budgets/${budget.id}/transactions`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm("Delete this transaction? This will update the budget spent amount.")) return;
    setDeleting(transactionId);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, { method: "DELETE" });
      if (response.ok) {
        setTransactions(transactions.filter((t) => t.id !== transactionId));
        if (onTransactionDeleted) onTransactionDeleted();
      } else {
        alert("Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      alert("Failed to delete transaction");
    } finally {
      setDeleting(null);
    }
  };

  if (!budget) return null;

  const spent = budget.spent_amount || 0;
  const percentage = budget.limit_amount > 0 ? (spent / budget.limit_amount) * 100 : 0;
  const remaining = budget.limit_amount - spent;
  const isOver = remaining < 0;
  const isNear = !isOver && percentage >= 80;
  const isOnTrack = !isOver && !isNear;

  const barColor = isOver
    ? "bg-red-500"
    : isNear
      ? "bg-amber-400"
      : "bg-emerald-500";

  const statusColor = isOver
    ? "text-red-600 dark:text-red-400"
    : isNear
      ? "text-amber-600 dark:text-amber-400"
      : "text-emerald-600 dark:text-emerald-400";

  const statusBg = isOver
    ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40"
    : isNear
      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40"
      : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40";

  const StatusIcon = isOver || isNear ? AlertTriangle : CheckCircle2;

  const budgetPeriodLabel =
    budget.month != null && budget.year != null
      ? new Date(budget.year, budget.month - 1, 1).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        })
      : new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // SVG ring
  const r = 30;
  const circ = 2 * Math.PI * r;
  const ringColor = isOver ? "#ef4444" : isNear ? "#f59e0b" : "#10b981";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">

        {/* ── Header band ── */}
        <div className="px-5 pt-5 pb-4 border-b">
          <DialogHeader className="mb-0 space-y-0">
            <DialogTitle className="text-base font-semibold flex items-center gap-2 flex-wrap">
              <span>{budget.category}</span>
              {budget.subtype && (
                <span className="text-sm font-normal text-muted-foreground">
                  → {budget.subtype}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Period + status chips */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground uppercase tracking-widest">
              {budget.period}
            </span>
            <span className="text-[10px] text-muted-foreground">{budgetPeriodLabel}</span>
            <span className={`inline-flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusBg} ${statusColor}`}>
              <StatusIcon className="h-2.5 w-2.5" />
              {isOver ? "Over Budget" : isNear ? "Near Limit" : "On Track"}
            </span>
          </div>
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-transparent h-10 px-5 gap-4">
            <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none bg-transparent text-xs">
              Details
            </TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none bg-transparent text-xs">
              Transactions ({transactions.length})
            </TabsTrigger>
          </TabsList>

          {/* ── Details Tab ── */}
          <TabsContent value="details" className="p-5 space-y-5 mt-0">

            {/* Progress ring + stats */}
            <div className="flex items-center gap-5">
              {/* Ring */}
              <div className="relative shrink-0">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted/50" />
                  <circle
                    cx="40" cy="40" r={r} fill="none"
                    stroke={ringColor}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - Math.min(percentage / 100, 1))}
                    transform="rotate(-90 40 40)"
                    style={{ transition: "stroke-dashoffset 0.6s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-sm font-bold font-mono leading-none ${statusColor}`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Stat pills */}
              <div className="flex-1 grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40">
                  <span className="text-xs text-muted-foreground">Spent</span>
                  <span className="font-mono text-sm font-bold text-red-500 dark:text-red-400">
                    {format(spent)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40">
                  <span className="text-xs text-muted-foreground">Limit</span>
                  <span className="font-mono text-sm font-bold">{format(budget.limit_amount)}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40">
                  <span className="text-xs text-muted-foreground">{isOver ? "Over by" : "Remaining"}</span>
                  <span className={`font-mono text-sm font-bold ${isOver ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {format(Math.abs(remaining))}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Spending progress</span>
                <span className="font-mono">{format(spent)} / {format(budget.limit_amount)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Alert banner */}
            {(isOver || isNear) && (
              <div className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${statusBg} ${statusColor}`}>
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  {isOver
                    ? `Budget exceeded by ${format(Math.abs(remaining))}. Consider adjusting your limit or reducing spending.`
                    : `Only ${format(remaining)} left. You've used ${percentage.toFixed(0)}% of this budget.`}
                </span>
              </div>
            )}

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-0.5">Created</p>
                  <p className="font-medium text-foreground">
                    {new Date(budget.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-0.5">Updated</p>
                  <p className="font-medium text-foreground">
                    {new Date(budget.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Transactions Tab ── */}
          <TabsContent value="transactions" className="mt-0">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {budgetPeriodLabel}
              </span>
              <span className="text-xs font-medium">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-5">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No transactions for {budgetPeriodLabel}</p>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-border">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                        <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {transaction.category}{transaction.subtype ? ` · ${transaction.subtype}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold font-mono text-red-500 dark:text-red-400">
                          -{format(parseFloat(transaction.amount.toString()))}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-red-500"
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        disabled={deleting === transaction.id}
                      >
                        {deleting === transaction.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />
                        }
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Total footer */}
                <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</span>
                  <span className="font-mono text-sm font-bold text-red-500 dark:text-red-400">
                    -{format(transactions.reduce((s, t) => s + parseFloat(t.amount.toString()), 0))}
                  </span>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
