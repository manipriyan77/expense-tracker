"use client";

import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Repeat,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { PendingRecurringOccurrence } from "@/lib/utils/recurring-occurrences";

export interface TransactionRowModel {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  category: string;
  subtype?: string;
  date: string;
  isRecurring?: boolean;
  frequency?: string;
  nextDate?: string;
  recurringPatternId?: string | null;
}

export type MergedListItem =
  | { kind: "transaction"; t: TransactionRowModel }
  | { kind: "pending_recurring"; p: PendingRecurringOccurrence };

interface TransactionListItemRowProps {
  readonly item: MergedListItem;
  readonly format: (n: number) => string;
  readonly onEdit: (t: TransactionRowModel) => void;
  readonly onDelete: (id: string) => void;
  readonly onMarkRecurringComplete: (patternId: string, dueDate: string) => void;
  readonly completingKey: string | null;
  readonly deleting: string | null;
}

export function TransactionListItemRow({
  item,
  format,
  onEdit,
  onDelete,
  onMarkRecurringComplete,
  completingKey,
  deleting,
}: TransactionListItemRowProps) {
  if (item.kind === "pending_recurring") {
    const { p } = item;
    const ck = `${p.patternId}:${p.dueDate}`;
    const loading = completingKey === ck;
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-50/50 dark:bg-amber-950/20">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`shrink-0 p-1.5 rounded-full ${
              p.type === "income"
                ? "bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400"
                : "bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400"
            }`}
          >
            {p.type === "income" ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm truncate">{p.description}</p>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100 flex items-center gap-1 shrink-0">
                <Repeat className="h-3 w-3" />
                Due · {p.frequency}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {p.name}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {p.category}
                {p.subtype ? ` · ${p.subtype}` : ""}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(p.dueDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p
            className={`font-mono font-semibold text-sm ${
              p.type === "income"
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {p.type === "income" ? "+" : "−"}
            {format(p.amount)}
          </p>
          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs gap-1"
            disabled={loading}
            onClick={() => onMarkRecurringComplete(p.patternId, p.dueDate)}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Mark paid</span>
          </Button>
        </div>
      </div>
    );
  }

  const transaction = item.t;
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`shrink-0 p-1.5 rounded-full ${
            transaction.type === "income"
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"
          }`}
        >
          {transaction.type === "income" ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{transaction.description}</p>
            {(transaction.isRecurring || transaction.recurringPatternId) && (
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1 shrink-0">
                <Repeat className="h-3 w-3" />
                <span>{transaction.frequency ?? "recurring"}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {transaction.category}
              {transaction.subtype && ` · ${transaction.subtype}`}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(transaction.date).toLocaleDateString()}
            </span>
            {transaction.isRecurring && transaction.nextDate && (
              <span className="text-[10px] text-blue-500">
                Next: {new Date(transaction.nextDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <p
          className={`font-mono font-semibold text-sm ${
            transaction.type === "income"
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {transaction.type === "income" ? "+" : "−"}
          {format(transaction.amount)}
        </p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(transaction)}
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDelete(transaction.id)}
          disabled={deleting === transaction.id}
          title="Delete"
        >
          {deleting === transaction.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
