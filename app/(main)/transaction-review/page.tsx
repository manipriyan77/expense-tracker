"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Lightbulb,
  ReceiptText,
  Repeat,
  SearchCheck,
  Sparkles,
  Tags,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useTransactionsStore } from "@/store/transactions-store";
import { useRecurringPatternsStore } from "@/store/recurring-patterns-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { buildTransactionReview, type InsightSeverity } from "@/lib/utils/transaction-insights";

function severityClass(severity: InsightSeverity): string {
  if (severity === "critical") return "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900 dark:text-red-300";
  if (severity === "warning") return "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300";
  if (severity === "positive") return "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900 dark:text-green-300";
  return "bg-muted border-border text-muted-foreground";
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function TransactionReviewPage() {
  const { format } = useFormatCurrency();
  const { transactions, loading, fetchTransactions } = useTransactionsStore();
  const { patterns, fetchPatterns } = useRecurringPatternsStore();

  useEffect(() => {
    fetchTransactions();
    fetchPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const review = useMemo(
    () => buildTransactionReview(transactions, patterns),
    [transactions, patterns],
  );

  if (loading && transactions.length === 0) {
    return <ListPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Smart Review
              </p>
              <h1 className="text-2xl font-bold tracking-tight">
                Transaction Quality Center
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Find duplicate entries, unusual spends, category gaps, and recurring payment opportunities before they distort your reports.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/transactions">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ReceiptText className="h-4 w-4" />
                  Transactions
                </Button>
              </Link>
              <Link href="/recurring">
                <Button size="sm" className="gap-1.5">
                  <Repeat className="h-4 w-4" />
                  Recurring
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Card className="col-span-2 lg:col-span-2 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Review Score
                  </p>
                  <p
                    className={`font-mono text-3xl font-bold mt-1 ${
                      review.score >= 85
                        ? "text-green-600 dark:text-green-400"
                        : review.score >= 65
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-500"
                    }`}
                  >
                    {review.score}
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
              </div>
              <Progress value={review.score} className="h-1.5 mt-3" />
              <p className="text-[10px] text-muted-foreground mt-2">
                {review.counts.needsReview === 0
                  ? "Everything looks tidy."
                  : `${review.counts.needsReview} review item${review.counts.needsReview === 1 ? "" : "s"} found.`}
              </p>
            </CardContent>
          </Card>

          {[
            { label: "Duplicates", value: review.counts.duplicates, icon: SearchCheck, color: "text-red-500" },
            { label: "Unusual", value: review.counts.unusual, icon: TrendingUp, color: "text-amber-500" },
            { label: "Uncategorized", value: review.counts.uncategorized, icon: Tags, color: "text-blue-500" },
            { label: "Recurring", value: review.counts.recurringCandidates, icon: Repeat, color: "text-violet-500" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {item.label}
                    </p>
                    <Icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <p className="font-mono text-2xl font-bold">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {item.value === 0 ? "No issues" : "Needs attention"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {review.insights.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {review.insights.map((insight) => (
              <Link
                key={insight.id}
                href={insight.href}
                className={`rounded-lg border p-3 transition-colors hover:bg-muted/40 ${severityClass(insight.severity)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{insight.title}</p>
                    <p className="text-[10px] mt-1 opacity-80">{insight.detail}</p>
                  </div>
                  <span className="font-mono text-sm font-bold shrink-0">
                    {insight.metric}
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}

        <Tabs defaultValue="duplicates" className="space-y-4">
          <div className="overflow-x-auto no-scrollbar">
            <TabsList className="flex w-max min-w-full">
              <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
              <TabsTrigger value="unusual">Unusual Spends</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="recurring">Recurring</TabsTrigger>
              <TabsTrigger value="consistency">Consistency</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="duplicates">
            <Card>
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm">Possible Duplicate Transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {review.duplicates.length > 0 ? (
                  <div className="divide-y divide-border">
                    {review.duplicates.map((group) => (
                      <div key={group.id} className="p-4">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <p className="text-sm font-semibold">{group.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(group.date)} · {group.transactions.length} matching entries
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-bold text-red-600 dark:text-red-400">
                              {format(group.amount)}
                            </p>
                            <Badge variant="outline" className="text-[9px]">
                              {group.confidence}% match
                            </Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {group.transactions.map((t) => (
                            <Link
                              key={t.id}
                              href="/transactions"
                              className="rounded-md border border-border p-2 text-xs hover:bg-muted/40"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate">{t.category || "No category"}</span>
                                <span className="font-mono shrink-0">{format(t.amount)}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {formatDate(t.date)}
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CheckCircle2}
                    title="No duplicates found"
                    description="No same-day transactions with matching amount and merchant were detected."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unusual">
            <Card>
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm">Unusual Spend Detection</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {review.unusualSpends.length > 0 ? (
                  <div className="divide-y divide-border">
                    {review.unusualSpends.map((item) => (
                      <div key={item.transaction.id} className="flex items-center gap-3 p-4">
                        <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center shrink-0">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">
                            {item.transaction.description || item.transaction.category}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.reason} · usual {format(Math.round(item.baseline))}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                            {format(item.transaction.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(item.transaction.date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CheckCircle2}
                    title="No unusual spends"
                    description="Recent expenses are within the normal range for their categories."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm">Uncategorized Transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {review.uncategorized.length > 0 ? (
                  <div className="divide-y divide-border">
                    {review.uncategorized.map((item) => (
                      <div key={item.transaction.id} className="flex items-center gap-3 p-4">
                        <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center shrink-0">
                          <Tags className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">
                            {item.transaction.description || "Untitled transaction"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Suggested category: {item.suggestedCategory}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-sm font-bold">
                            {format(item.transaction.amount)}
                          </p>
                          <Badge variant="outline" className="text-[9px]">
                            {item.confidence}% confidence
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={CheckCircle2}
                    title="Categories look complete"
                    description="No transactions are currently marked as Other, Misc, or Uncategorized."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recurring">
            <Card>
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm">Recurring Payment Candidates</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {review.recurringCandidates.length > 0 ? (
                  <div className="divide-y divide-border">
                    {review.recurringCandidates.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-4">
                        <div className="h-9 w-9 rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 flex items-center justify-center shrink-0">
                          <Repeat className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{item.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.count} payments · {item.cadence} cadence · last {formatDate(item.lastDate)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-sm font-bold">{format(item.amount)}</p>
                          <Link href="/recurring" className="text-[10px] text-primary hover:underline inline-flex items-center gap-1">
                            Create rule <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Sparkles}
                    title="No new recurring candidates"
                    description="Repeated merchant patterns already look covered by your current transaction history."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consistency">
            <Card>
              <CardHeader className="pb-2 border-b border-border">
                <CardTitle className="text-sm">Merchant Category Consistency</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {review.merchantSuggestions.length > 0 ? (
                  <div className="divide-y divide-border">
                    {review.merchantSuggestions.map((item) => (
                      <div key={item.merchant} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold capitalize">{item.merchant}</p>
                            <p className="text-xs text-muted-foreground">
                              Usually categorized as {item.suggestedCategory}; {item.transactions.length} item{item.transactions.length === 1 ? "" : "s"} differ.
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[9px]">
                            {item.confidence}% consistency
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Lightbulb}
                    title="Merchant categories are consistent"
                    description="No merchant has enough mixed category history to suggest a cleanup."
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
