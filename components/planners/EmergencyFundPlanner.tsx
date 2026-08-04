"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Landmark,
  PiggyBank,
  Shield,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ListPageSkeleton } from "@/components/ui/skeleton";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { useNetWorthStore } from "@/store/net-worth-store";
import { useTransactionsStore } from "@/store/transactions-store";
import { useGoalsStore } from "@/store/goals-store";

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

/** A goal counts as reserve when its title or category mentions "emergency". */
function isEmergencyName(text: string): boolean {
  return text.toLowerCase().includes("emergency");
}

interface ReserveSource {
  key: string;
  name: string;
  sub: string;
  value: number;
  kind: "asset" | "goal";
}

export function EmergencyFundPlanner() {
  const { format } = useFormatCurrency();
  const { assets, loading: assetsLoading, fetchAssets } = useNetWorthStore();
  const { transactions, loading: txLoading, fetchTransactions } =
    useTransactionsStore();
  const { goals, fetchGoals } = useGoalsStore();
  const [targetMonths, setTargetMonths] = useState(6);
  const [contributionOverride, setContributionOverride] = useState<number | null>(null);

  useEffect(() => {
    fetchAssets();
    fetchTransactions();
    fetchGoals();
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

    // Goals you've set aside as an emergency fund also count as reserve.
    // Grams-tracked goals are excluded — their value isn't rupees.
    const emergencyGoals = goals.filter(
      (g) =>
        g.unit !== "grams" &&
        (isEmergencyName(g.title) || isEmergencyName(g.category ?? "")),
    );

    // One list so every rupee of reserve shows where it came from.
    const reserveSources: ReserveSource[] = [
      ...liquidAssets.map((a) => ({
        key: `asset:${a.id}`,
        name: a.name,
        sub: a.type,
        value: a.value,
        kind: "asset" as const,
      })),
      ...emergencyGoals.map((g) => ({
        key: `goal:${g.id}`,
        name: g.title,
        sub: g.autoTracked
          ? `Goal · auto-tracked from ${g.linkedCount} investment${g.linkedCount === 1 ? "" : "s"}`
          : "Goal",
        value: g.currentAmount,
        kind: "goal" as const,
      })),
    ];

    const currentReserve = reserveSources.reduce((s, r) => s + r.value, 0);
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
      reserveSources,
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
  }, [transactions, assets, goals, targetMonths]);

  // Monthly contribution used for the "close the gap" projection — defaults to the
  // suggested amount but the user can override it with the slider below.
  const contribution = contributionOverride ?? emergencyData.suggestedContribution;

  const gapProjection = useMemo(() => {
    const { currentReserve, targetReserve, gap } = emergencyData;
    if (gap <= 0) {
      return { monthsToClose: 0, reachDate: null, points: [] as { month: number; label: string; reserve: number }[] };
    }
    if (contribution <= 0) {
      return { monthsToClose: null, reachDate: null, points: [] as { month: number; label: string; reserve: number }[] };
    }
    const monthsToClose = Math.ceil(gap / contribution);
    const horizon = Math.min(60, monthsToClose + 3);
    const today = new Date();
    const points = Array.from({ length: horizon + 1 }, (_, m) => {
      const d = new Date(today.getFullYear(), today.getMonth() + m, 1);
      return {
        month: m,
        label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        reserve: Math.min(targetReserve * 1.05, currentReserve + contribution * m),
      };
    });
    const reachDate = new Date(today.getFullYear(), today.getMonth() + monthsToClose, 1);
    return { monthsToClose, reachDate, points };
  }, [emergencyData, contribution]);

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
    <div className="px-4 sm:px-6 lg:px-8 py-5 space-y-5">
      <div className="space-y-5">
        {/* ── Hero: coverage + snapshot ─────────────────────────────────── */}
        <div className="rounded-xl bg-slate-900 dark:bg-black text-white overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-800 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">
                  Emergency Fund
                </p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  Essential spend, liquid reserve coverage, and a practical
                  safety buffer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 shrink-0">
              {[3, 6, 12].map((months) => (
                <button
                  key={months}
                  onClick={() => setTargetMonths(months)}
                  className={`text-[11px] px-3 py-1 rounded-md font-medium transition-colors ${
                    targetMonths === months
                      ? "bg-white text-slate-900"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {months} mo
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
              <div>
                <p className="text-xs text-slate-400">Current coverage</p>
                <p
                  className={`font-mono text-3xl font-bold leading-tight mt-0.5 ${
                    status === "ready"
                      ? "text-green-400"
                      : status === "building"
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {emergencyData.coverageMonths.toFixed(1)}
                  <span className="text-base font-normal text-slate-400 ml-1">
                    of {targetMonths} mo target
                  </span>
                </p>
              </div>
              <div className="flex-1 sm:ml-4 min-w-40">
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      status === "ready"
                        ? "bg-green-500"
                        : status === "building"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${emergencyData.progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                  <span>{format(emergencyData.currentReserve)} saved</span>
                  <span>{format(emergencyData.targetReserve)} target</span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-800/60 px-3 py-2.5">
              {status === "ready" ? (
                <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
              )}
              <p className="text-xs text-slate-300">
                {status === "ready"
                  ? `You have reached the ${targetMonths}-month buffer target.`
                  : `Add around ${format(emergencyData.suggestedContribution)}/mo to close the gap in about 12 months.`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-slate-800 border-t border-slate-800">
            <div className="px-5 py-3.5">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Wallet className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-widest">Essential Spend</span>
              </div>
              <p className="font-mono text-base font-bold text-white">
                {format(emergencyData.monthlyEssential)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Monthly average</p>
            </div>
            <div className="px-5 py-3.5">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <PiggyBank className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-widest">Reserve Gap</span>
              </div>
              <p className="font-mono text-base font-bold text-white">
                {format(emergencyData.gap)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{targetMonths}-month target</p>
            </div>
          </div>
        </div>

        {/* ── Close the gap: interactive contribution projection ──────────── */}
        {emergencyData.gap > 0 && (
          <Card>
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-indigo-500" />
                Close the Gap
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Monthly contribution
                    </Label>
                    <span className="font-mono text-sm font-bold">
                      {format(contribution)}/mo
                    </span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={Math.max(5000, Math.ceil((emergencyData.gap / 3) / 500) * 500)}
                    step={500}
                    value={contribution}
                    onChange={(e) => setContributionOverride(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>
                <div className="rounded-lg bg-muted/40 px-4 py-2.5 text-center shrink-0">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Target reached
                  </p>
                  <p className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {gapProjection.monthsToClose !== null
                      ? `~${gapProjection.monthsToClose} mo · ${gapProjection.reachDate?.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
                      : "Set a contribution"}
                  </p>
                </div>
              </div>
              {gapProjection.points.length > 1 && (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={gapProjection.points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reserveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => shortAmount(v as number)} width={44} />
                    <ReferenceLine
                      y={emergencyData.targetReserve}
                      stroke="#22c55e"
                      strokeDasharray="4 3"
                      label={{ value: "Target", position: "right", fontSize: 10, fill: "#22c55e" }}
                    />
                    <Tooltip
                      formatter={(v: unknown) => (typeof v === "number" ? format(v) : "—")}
                      labelFormatter={(l) => `${l}`}
                      contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }}
                    />
                    <Area type="monotone" dataKey="reserve" stroke="#6366f1" strokeWidth={2} fill="url(#reserveGrad)" name="Reserve" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2 border-b border-border">
              <CardTitle className="text-sm flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-500" />
                Liquid Reserve Sources
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {emergencyData.reserveSources.length > 0 ? (
                <div className="divide-y divide-border">
                  {emergencyData.reserveSources.map((source) => (
                    <div key={source.key} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{source.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {source.sub}
                        </p>
                      </div>
                      <p className="font-mono text-sm font-bold shrink-0">
                        {format(source.value)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <Landmark className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-semibold">No reserves found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Counts cash/bank assets in Net Worth, plus any goal named
                    “Emergency…” (including its linked investments).
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Link href="/net-worth">
                      <Button size="sm" variant="outline">
                        Add Asset
                      </Button>
                    </Link>
                    <Link href="/goals">
                      <Button size="sm" variant="outline">
                        View Goals
                      </Button>
                    </Link>
                  </div>
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
      </div>
    </div>
  );
}
