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
import { Goal } from "@/store/goals-store";
import {
  Calendar,
  Target,
  Trash2,
  Loader2,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Flag,
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

interface GoalDetailsModalProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onTransactionDeleted?: () => void;
}

const PRIORITY_META: Record<string, { label: string; cls: string }> = {
  high:   { label: "High",   cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  medium: { label: "Medium", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  low:    { label: "Low",    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
};

export default function GoalDetailsModal({
  goal,
  isOpen,
  onClose,
  onTransactionDeleted,
}: GoalDetailsModalProps) {
  const { format } = useFormatCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (goal && isOpen) fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, isOpen]);

  const fetchTransactions = async () => {
    if (!goal) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/goals/${goal.id}/transactions`);
      if (res.ok) setTransactions(await res.json());
    } catch (e) {
      console.error("Error fetching transactions:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!confirm("Delete this transaction? Goal progress will be updated.")) return;
    setDeleting(txId);
    try {
      const res = await fetch(`/api/transactions/${txId}`, { method: "DELETE" });
      if (res.ok) {
        setTransactions((prev) => prev.filter((t) => t.id !== txId));
        onTransactionDeleted?.();
      } else {
        alert("Failed to delete transaction");
      }
    } catch (e) {
      console.error("Error deleting transaction:", e);
      alert("Failed to delete transaction");
    } finally {
      setDeleting(null);
    }
  };

  if (!goal) return null;

  const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const remaining = goal.targetAmount - goal.currentAmount;
  const isCompleted = goal.status === "completed";
  const isOverdue = new Date(goal.targetDate) < new Date() && !isCompleted;
  const daysRemaining = Math.ceil(
    (new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );

  const ringColor = isCompleted
    ? "#10b981"
    : isOverdue
      ? "#ef4444"
      : progress >= 75
        ? "#10b981"
        : progress >= 40
          ? "#3b82f6"
          : "#f59e0b";

  const barColor = isCompleted
    ? "bg-emerald-500"
    : isOverdue
      ? "bg-red-400"
      : progress >= 75
        ? "bg-emerald-500"
        : progress >= 40
          ? "bg-blue-500"
          : "bg-amber-400";

  const r = 30;
  const circ = 2 * Math.PI * r;

  const priority = goal.priority ?? "medium";
  const priorityMeta = PRIORITY_META[priority] ?? PRIORITY_META.medium;

  const statusLabel = isCompleted ? "Completed" : isOverdue ? "Overdue" : "Active";
  const statusCls = isCompleted
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40"
    : isOverdue
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-900/40"
      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/40";

  const StatusIcon = isCompleted ? CheckCircle2 : isOverdue ? AlertTriangle : Target;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b">
          <DialogHeader className="mb-0 space-y-0">
            <DialogTitle className="text-base font-semibold leading-snug">
              {goal.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground uppercase tracking-widest">
              {goal.category}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${priorityMeta.cls}`}>
              <Flag className="h-2.5 w-2.5" />
              {priorityMeta.label}
            </span>
            <span className={`inline-flex items-center gap-1 ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCls}`}>
              <StatusIcon className="h-2.5 w-2.5" />
              {statusLabel}
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

            {/* Ring + stats */}
            <div className="flex items-center gap-5">
              {/* Progress ring */}
              <div className="relative shrink-0">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-muted/50" />
                  <circle
                    cx="40" cy="40" r={r} fill="none"
                    stroke={ringColor}
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={circ * (1 - progress / 100)}
                    transform="rotate(-90 40 40)"
                    style={{ transition: "stroke-dashoffset 0.7s ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-sm font-bold font-mono leading-none" style={{ color: ringColor }}>
                    {progress.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Stat pills */}
              <div className="flex-1 grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40">
                  <span className="text-xs text-muted-foreground">Saved</span>
                  <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {format(goal.currentAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40">
                  <span className="text-xs text-muted-foreground">Target</span>
                  <span className="font-mono text-sm font-bold">{format(goal.targetAmount)}</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40">
                  <span className="text-xs text-muted-foreground">Remaining</span>
                  <span className={`font-mono text-sm font-bold ${remaining <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    {remaining <= 0 ? "Done!" : format(remaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span className="font-mono">{format(goal.currentAmount)} / {format(goal.targetAmount)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Overdue / completed banner */}
            {isOverdue && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  This goal is overdue by {Math.abs(daysRemaining)} day{Math.abs(daysRemaining) !== 1 ? "s" : ""}. Update the target date or boost contributions.
                </span>
              </div>
            )}
            {isCompleted && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>Goal achieved! Great work reaching your target.</span>
              </div>
            )}

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-0.5">Target Date</p>
                  <p className={`font-medium ${isOverdue ? "text-red-500" : "text-foreground"}`}>
                    {new Date(goal.targetDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-0.5">
                    {isOverdue ? "Overdue by" : isCompleted ? "Completed" : "Days Left"}
                  </p>
                  <p className={`font-medium ${isOverdue ? "text-red-500" : "text-foreground"}`}>
                    {isCompleted
                      ? "Done"
                      : isOverdue
                        ? `${Math.abs(daysRemaining)} days`
                        : `${daysRemaining} days`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-0.5">Monthly Plan</p>
                  <p className="font-medium text-foreground">
                    {goal.monthlyContribution && goal.monthlyContribution > 0
                      ? format(goal.monthlyContribution)
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-widest mb-0.5">Created</p>
                  <p className="font-medium text-foreground">
                    {new Date(goal.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Transactions Tab ── */}
          <TabsContent value="transactions" className="mt-0">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">All contributions to this goal</span>
              <span className="text-xs font-medium">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""}</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-5">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No transactions linked to this goal yet</p>
              </div>
            ) : (
              <div>
                <div className="divide-y divide-border">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${transaction.type === "income" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-blue-100 dark:bg-blue-900/30"}`}>
                        <TrendingUp className={`h-3.5 w-3.5 ${transaction.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-blue-500 dark:text-blue-400"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {transaction.category}{transaction.subtype ? ` · ${transaction.subtype}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                          +{format(parseFloat(transaction.amount.toString()))}
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
                  <span className="text-xs text-muted-foreground">{transactions.length} contribution{transactions.length !== 1 ? "s" : ""}</span>
                  <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    +{format(transactions.reduce((s, t) => s + parseFloat(t.amount.toString()), 0))}
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
