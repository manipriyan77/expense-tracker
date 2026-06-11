"use client";

import Link from "next/link";
import { useTransactionsStore } from "@/store/transactions-store";
import { ArrowRight } from "lucide-react";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

const fmt = (v: number) => {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
};

export function RecentTransactionsWidget() {
  const { format } = useFormatCurrency();
  const { transactions, loading } = useTransactionsStore();

  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Recent Transactions</p>
        <Link href="/transactions" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
          View all <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
              <div className="flex-1 h-3 bg-muted rounded" />
              <div className="w-14 h-3 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : recent.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">No transactions yet</div>
      ) : (
        <div className="divide-y divide-border/60">
          {recent.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors group">
              {/* Type indicator */}
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.type === "income" ? "bg-green-500" : "bg-red-500"}`} />

              {/* Description + category */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate leading-tight">{t.description || t.category}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {t.category}{t.subtype ? ` · ${t.subtype}` : ""}
                </p>
              </div>

              {/* Amount + date */}
              <div className="text-right shrink-0">
                <p className={`text-xs font-mono font-semibold tabular-nums ${t.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {t.type === "income" ? "+" : "−"}{fmt(t.amount)}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
