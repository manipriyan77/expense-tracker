"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Landmark,
  PiggyBank,
  Shield,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { useNetWorthStore } from "@/store/net-worth-store";
import { useTransactionsStore } from "@/store/transactions-store";

const ESSENTIAL_KEYWORDS = [
  "rent",
  "groceries",
  "grocery",
  "bills",
  "utilities",
  "electricity",
  "water",
  "gas",
  "internet",
  "broadband",
  "mobile",
  "transport",
  "fuel",
  "medical",
  "health",
  "insurance",
  "emi",
  "loan",
  "debt",
  "education",
];

function shortAmount(value: number): string {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(1)}Cr`;
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(1)}L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${value.toFixed(0)}`;
}

function isEssential(category: string, description: string): boolean {
  const text = `${category} ${description}`.toLowerCase();
  return ESSENTIAL_KEYWORDS.some((word) => text.includes(word));
}

export default function EmergencyFundPage() {
  const { format } = useFormatCurrency();
  const { assets, loading: assetsLoading, fetchAssets } = useNetWorthStore();
  const { transactions, loading: txLoading, fetchTransactions } =
    useTransactionsStore();
  const [targetMonths, setTargetMonths] = useState(6);

  useEffect(() => {
    fetchAssets();
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emergencyData = useMemo(() => {
    const now = new Date();
    const monthTotals = new Map<string, number>();
    const categoryTotals = new Map<string, number>();

    transactions
      .filter((t) => {
        const d = new Date(t.date);
        const cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return t.type === "expense" && d >= cutoff;
      })
      .forEach((t) => {
        if (!isEssential(t.category, t.description)) return;
        const d = new Date(t.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthTotals.set(key, (monthTotals.get(key) ?? 0) + t.amount);
        categoryTotals.set(t.category || "Other", (categoryTotals.get(t.category || "Other") ?? 0) + t.amount);
      });

    const months = Math.max(1, monthTotals.size);
    const monthlyEssential =
      monthTotals.size > 0
        ? [...monthTotals.values()].reduce((s, v) => s + v, 0) / months
        : 0;

    const liquidAssets = assets.filter((asset) =>
      asset.type === "cash" ||
      asset.type === "bank" ||
      asset.name.toLowerCase().includes("emergency") ||
      asset.name.toLowerCase().includes("liquid"),
    );
    const currentReserve = liquidAssets.reduce((s, asset) => s + asset.value, 0);
    const targetReserve = monthlyEssential * targetMonths;
    const gap = Math.max(0, targetReserve - currentReserve);
    const coverageMonths =
      monthlyEssential > 0 ? currentReserve / monthlyEssential : 0;
    const progress =
      targetReserve > 0 ? Math.min(100, (currentReserve / targetReserve) * 100) : 0;

    const topEssentials = [...categoryTotals.entries()]
      .map(([category, amount]) => ({
        category,
        amount,
        monthly: amount / months,
      }))
      .sort((a, b) => b.monthly - a.monthly)
      .slice(0, 5);

    const suggestedContribution = Math.ceil(gap / 12 / 500) * 500;

    return {
      monthlyEssential,
      liquidAssets,
      currentReserve,
      targetReserve,
      gap,
      coverageMonths,
      progress,
      topEssentials,
      suggestedContribution: Number.isFinite(suggestedContribution)
        ? Math.max(0, suggestedContribution)
        : 0,
    };
  }, [transactions, assets, targetMonths]);

  if ((assetsLoading || txLoading) && transactions.length === 0 && assets.length === 0) {
    return <ListPageSkeleton />;
  }

  const status =
    emergencyData.coverageMonths >= targetMonths
      ? "ready"
      : emergencyData.coverageMonths >= Math.max(3, targetMonths / 2)
        ? "building"
        : "thin";

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Planning
              </p>
              <h1 className="text-2xl font-bold tracking-tight">
                Emergency Fund Tracker
              </h1>
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                Estimate essential monthly expenses, measure liquid reserve coverage, and keep a practical safety buffer.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[3, 6, 12].map((months) => (
                <Button
                  key={months}
                  size="sm"
                  variant={targetMonths === months ? "default" : "outline"}
                  onClick={() => setTargetMonths(months)}
                >
                  {months} mo
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-5 space-y-5">
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="lg:col-span-2 overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Coverage
                  </p>
                  <p
                    className={`font-mono text-4xl font-bold mt-1 ${
                      status === "ready"
                        ? "text-green-600 dark:text-green-400"
                        : status === "building"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-500"
                    }`}
                  >
                    {emergencyData.coverageMonths.toFixed(1)}
                    <span className="text-lg font-normal text-muted-foreground">
                      mo
                    </span>
                  </p>
                </div>
                <div
                  className={`rounded-xl p-3 ${
                    status === "ready"
                      ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                      : status === "building"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  }`}
                >
                  <Shield className="h-6 w-6" />
                </div>
              </div>
              <Progress value={emergencyData.progress} className="h-2 mt-4" />
              <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                <span>{format(emergencyData.currentReserve)} saved</span>
                <span>{format(emergencyData.targetReserve)} target</span>
              </div>
              <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-start gap-2">
                  {status === "ready" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {status === "ready"
                      ? `You have reached the ${targetMonths}-month buffer target.`
                      : `Add around ${format(emergencyData.suggestedContribution)}/mo to close the gap in about 12 months.`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {[
            {
              label: "Essential Spend",
              value: format(emergencyData.monthlyEssential),
              sub: "Monthly average",
              icon: Wallet,
              color: "text-blue-500",
            },
            {
              label: "Reserve Gap",
              value: format(emergencyData.gap),
              sub: `${targetMonths}-month target`,
              icon: PiggyBank,
              color: emergencyData.gap > 0 ? "text-amber-500" : "text-green-500",
            },
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
                  <p className="font-mono text-xl font-bold">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {item.sub}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="text-sm flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-500" />
                Liquid Reserve Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {emergencyData.liquidAssets.length > 0 ? (
                <div className="divide-y divide-border">
                  {emergencyData.liquidAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{asset.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {asset.type}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-bold shrink-0">
                        {format(asset.value)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Landmark className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold">No liquid assets tagged</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add cash or bank assets in Net Worth to track reserves.
                  </p>
                  <Link href="/net-worth">
                    <Button size="sm" variant="outline" className="mt-3">
                      Add Asset
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wallet className="h-4 w-4 text-blue-500" />
                Essential Expense Mix
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {emergencyData.topEssentials.length > 0 ? (
                <div className="divide-y divide-border">
                  {emergencyData.topEssentials.map((item) => {
                    const pct =
                      emergencyData.monthlyEssential > 0
                        ? (item.monthly / emergencyData.monthlyEssential) * 100
                        : 0;
                    return (
                      <div key={item.category} className="p-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{item.category}</p>
                            <p className="text-xs text-muted-foreground">
                              {pct.toFixed(0)}% of essentials
                            </p>
                          </div>
                          <p className="font-mono text-sm font-bold shrink-0">
                            {format(item.monthly)}
                          </p>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Wallet className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold">No essential pattern yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Categorize rent, bills, groceries, transport, and insurance transactions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Conservative Target
                </p>
                <p className="font-mono text-lg font-bold mt-1">
                  {shortAmount(emergencyData.monthlyEssential * 12)}
                </p>
                <Badge variant="outline" className="mt-2 text-[9px]">12 months</Badge>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Balanced Target
                </p>
                <p className="font-mono text-lg font-bold mt-1">
                  {shortAmount(emergencyData.monthlyEssential * 6)}
                </p>
                <Badge variant="outline" className="mt-2 text-[9px]">6 months</Badge>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Starter Buffer
                </p>
                <p className="font-mono text-lg font-bold mt-1">
                  {shortAmount(emergencyData.monthlyEssential * 3)}
                </p>
                <Badge variant="outline" className="mt-2 text-[9px]">3 months</Badge>
              </div>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Reserve estimate uses cash/bank assets plus assets named emergency or liquid.
              </p>
              <Link href="/net-worth" className="shrink-0">
                <Button size="sm" variant="outline" className="gap-1.5">
                  Manage Assets <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
