"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import { AnimatedEmptyState } from "@/components/ui/empty-state";
import { CardSkeleton } from "@/components/ui/skeleton";
import {
  FileText,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
} from "lucide-react";
import { useTransactionsStore } from "@/store/transactions-store";
import { useTaxStore, TAX_DEDUCTIBLE_CATEGORIES } from "@/store/tax-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

export default function TaxPage() {
  const { format } = useFormatCurrency();
  const { transactions, loading, fetchTransactions } = useTransactionsStore();
  const { taxDeductibleIds, markDeductible, unmarkDeductible, isDeductible, hydrateFromStorage } =
    useTaxStore();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    hydrateFromStorage();
    fetchTransactions();
  }, []);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  // Filter transactions for the selected financial year (April–March)
  const yearTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === selectedYear && t.type === "expense";
    });
  }, [transactions, selectedYear]);

  // Auto-suggest: transactions in tax-deductible categories not yet marked
  const autoSuggested = useMemo(() => {
    return yearTransactions.filter(
      (t) =>
        TAX_DEDUCTIBLE_CATEGORIES.some((c) =>
          t.category.toLowerCase().includes(c.toLowerCase())
        ) && !isDeductible(t.id)
    );
  }, [yearTransactions, taxDeductibleIds]);

  const deductibleTransactions = useMemo(() => {
    return yearTransactions.filter((t) => isDeductible(t.id));
  }, [yearTransactions, taxDeductibleIds]);

  const totalDeductible = deductibleTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = yearTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const byCategory = useMemo(() => {
    const groups: Record<string, { transactions: typeof yearTransactions; deductible: number }> = {};
    for (const t of yearTransactions) {
      if (!groups[t.category]) groups[t.category] = { transactions: [], deductible: 0 };
      groups[t.category].transactions.push(t);
      if (isDeductible(t.id)) groups[t.category].deductible += t.amount;
    }
    return groups;
  }, [yearTransactions, taxDeductibleIds]);

  const handleToggle = (id: string, checked: boolean) => {
    if (checked) markDeductible(id);
    else unmarkDeductible(id);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl">
      {/* Header */}
      <div className="rounded-2xl bg-linear-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Tax Summary</p>
            <h1 className="text-2xl font-bold">Tax Deductions</h1>
            <p className="text-sm text-slate-400 mt-1">
              Mark transactions as tax-deductible for {selectedYear}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-700/50 rounded-xl p-1">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedYear === y
                    ? "bg-white text-slate-900"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Total Expenses</p>
            <p className="font-mono text-lg font-semibold">{format(totalExpenses)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Deductible</p>
            <p className="font-mono text-lg font-semibold text-green-400">{format(totalDeductible)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Transactions</p>
            <p className="font-mono text-lg font-semibold">{deductibleTransactions.length}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">% of Spend</p>
            <p className="font-mono text-lg font-semibold">
              {totalExpenses > 0 ? ((totalDeductible / totalExpenses) * 100).toFixed(1) : "0.0"}%
            </p>
          </div>
        </div>
      </div>

      {/* Suggestions banner */}
      {autoSuggested.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              {autoSuggested.length} unreviewed transaction{autoSuggested.length > 1 ? "s" : ""} in tax-relevant categories
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Review the &quot;To Review&quot; tab to mark them as deductible.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Deductible ({deductibleTransactions.length})</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="review">
            To Review
            {autoSuggested.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-4 px-1.5 text-[10px]">
                {autoSuggested.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Deductible Tab */}
        <TabsContent value="all" className="space-y-2">
          {deductibleTransactions.length === 0 ? (
            <AnimatedEmptyState
              illustration="📋"
              title="No deductible transactions yet"
              description="Switch to 'To Review' to find transactions that may qualify for deductions, or manually check expenses in the 'By Category' tab."
            />
          ) : (
            deductibleTransactions.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                checked={isDeductible(t.id)}
                onToggle={handleToggle}
                format={format}
              />
            ))
          )}
        </TabsContent>

        {/* By Category Tab */}
        <TabsContent value="categories" className="space-y-3">
          {Object.keys(byCategory).length === 0 ? (
            <AnimatedEmptyState
              illustration="📂"
              title="No expenses this year"
              description="No expense transactions found for the selected year."
            />
          ) : (
            Object.entries(byCategory)
              .sort(([, a], [, b]) => b.deductible - a.deductible)
              .map(([category, data]) => {
                const total = data.transactions.reduce((s, t) => s + t.amount, 0);
                const pct = total > 0 ? (data.deductible / total) * 100 : 0;
                const isTaxRelevant = TAX_DEDUCTIBLE_CATEGORIES.some((c) =>
                  category.toLowerCase().includes(c.toLowerCase())
                );
                return (
                  <Card key={category}>
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{category}</span>
                          {isTaxRelevant && (
                            <Badge variant="secondary" className="text-[10px]">Tax-relevant</Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-semibold text-green-600">
                            {format(data.deductible)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">of {format(total)}</p>
                        </div>
                      </div>
                      <AnimatedProgress value={pct} className="h-1.5 mt-2" />
                    </CardHeader>
                    <CardContent className="px-4 pb-3 space-y-1.5">
                      {data.transactions.map((t) => (
                        <TransactionRow
                          key={t.id}
                          transaction={t}
                          checked={isDeductible(t.id)}
                          onToggle={handleToggle}
                          format={format}
                          compact
                        />
                      ))}
                    </CardContent>
                  </Card>
                );
              })
          )}
        </TabsContent>

        {/* To Review Tab */}
        <TabsContent value="review" className="space-y-2">
          {autoSuggested.length === 0 ? (
            <AnimatedEmptyState
              illustration="✅"
              title="All reviewed!"
              description="No pending transactions to review in tax-relevant categories."
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">
                These transactions are in categories that may qualify for tax deductions.
                Check the ones that apply.
              </p>
              {autoSuggested.map((t) => (
                <TransactionRow
                  key={t.id}
                  transaction={t}
                  checked={false}
                  onToggle={handleToggle}
                  format={format}
                  highlight
                />
              ))}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TransactionRowProps {
  transaction: { id: string; description: string; category: string; amount: number; date: string };
  checked: boolean;
  onToggle: (id: string, checked: boolean) => void;
  format: (n: number) => string;
  compact?: boolean;
  highlight?: boolean;
}

function TransactionRow({ transaction: t, checked, onToggle, format, compact, highlight }: TransactionRowProps) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border transition-colors ${
        checked ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900/30" :
        highlight ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30" :
        "bg-card border-border"
      }`}
    >
      <Checkbox
        id={t.id}
        checked={checked}
        onCheckedChange={(val) => onToggle(t.id, !!val)}
      />
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${compact ? "text-xs" : "text-sm"}`}>{t.description}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.category} · {t.date}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {checked && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
        <p className={`font-mono font-semibold ${compact ? "text-xs" : "text-sm"}`}>
          {format(t.amount)}
        </p>
      </div>
    </div>
  );
}
