"use client";

import { useMemo, type ComponentType } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Budget } from "@/store/budgets-store";
import type { Goal } from "@/store/goals-store";
import type { Transaction } from "@/store/transactions-store";
import {
  Lightbulb,
  PiggyBank,
  Target,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Info,
  Calendar,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CircleDot,
} from "lucide-react";

export interface BudgetPlanningTabProps {
  readonly selectedMonth: Date;
  readonly budgets: readonly Budget[];
  readonly transactions: readonly Transaction[];
  readonly goals: readonly Goal[];
  readonly format: (value: number) => string;
}

function monthsFromToTarget(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 1;
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(1, months + 1);
}

/**
 * Available for goals = actual cash surplus (income − expenses).
 * Budget headroom is informational only — it's already embedded in the surplus;
 * adding it would double-count the same money.
 */
function planningCap(_headroom: number, surplus: number): number {
  return Math.max(0, surplus);
}

// SVG circular progress ring
function CircularRing({
  pct,
  size = 56,
  stroke = 5,
  color = "hsl(var(--primary))",
  trackColor = "hsl(var(--muted))",
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, pct) / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 transform">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

// Segmented income-vs-expense bar
function FlowBar({
  income,
  expenses,
  format,
}: {
  income: number;
  expenses: number;
  format: (v: number) => string;
}) {
  const total = income + expenses;
  const incPct = total > 0 ? (income / total) * 100 : 50;
  const expPct = 100 - incPct;
  return (
    <div className="space-y-1.5">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        <div
          className="bg-emerald-500 transition-all duration-700"
          style={{ width: `${incPct}%` }}
        />
        <div
          className="bg-rose-500/80 transition-all duration-700"
          style={{ width: `${expPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Income {format(income)}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-rose-500/80" />
          Expenses {format(expenses)}
        </span>
      </div>
    </div>
  );
}

// Enhanced metric stat card
function StatCard({
  icon: Icon,
  label,
  value,
  footnote,
  accent,
  ring,
  ringColor,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  footnote: string;
  accent?: "green" | "red" | "amber" | "blue";
  ring?: number;
  ringColor?: string;
}) {
  const accentMap = {
    green: "from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    red: "from-rose-500/10 to-transparent border-rose-500/20 text-rose-600 dark:text-rose-400",
    amber: "from-amber-500/10 to-transparent border-amber-500/20 text-amber-600 dark:text-amber-400",
    blue: "from-blue-500/10 to-transparent border-blue-500/20 text-blue-600 dark:text-blue-400",
  };
  const cls = accent ? accentMap[accent] : "from-muted/40 to-transparent border-border";
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-linear-to-br p-4 shadow-sm ${cls}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background/60 shadow-sm backdrop-blur">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums leading-none tracking-tight">
              {value}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{footnote}</p>
          </div>
        </div>
        {ring != null && (
          <CircularRing
            pct={ring}
            size={52}
            stroke={5}
            color={ringColor ?? "hsl(var(--primary))"}
          >
            <span className="text-[9px] font-bold tabular-nums">
              {Math.round(ring)}%
            </span>
          </CircularRing>
        )}
      </div>
    </div>
  );
}

// Insight pill types
type InsightType = "warning" | "success" | "info" | "tip";

function InsightCard({ type, text }: { type: InsightType; text: string }) {
  const cfg = {
    warning: {
      bg: "bg-rose-500/5 border-rose-500/20 dark:bg-rose-500/10",
      icon: AlertTriangle,
      iconCls: "text-rose-500",
    },
    success: {
      bg: "bg-emerald-500/5 border-emerald-500/20 dark:bg-emerald-500/10",
      icon: CheckCircle2,
      iconCls: "text-emerald-500",
    },
    info: {
      bg: "bg-blue-500/5 border-blue-500/20 dark:bg-blue-500/10",
      icon: Info,
      iconCls: "text-blue-500",
    },
    tip: {
      bg: "bg-amber-500/5 border-amber-500/20 dark:bg-amber-500/10",
      icon: Lightbulb,
      iconCls: "text-amber-500",
    },
  }[type];
  const Icon = cfg.icon;
  return (
    <div className={`flex gap-3 rounded-xl border px-3.5 py-3 text-sm leading-relaxed ${cfg.bg}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${cfg.iconCls}`} />
      <span className="text-foreground/90">{text}</span>
    </div>
  );
}

export function BudgetPlanningTab({
  selectedMonth,
  budgets,
  transactions,
  goals,
  format,
}: BudgetPlanningTabProps) {
  const monthStart = useMemo(() => {
    const y = selectedMonth.getFullYear();
    const m = selectedMonth.getMonth();
    return { y, m };
  }, [selectedMonth]);

  const monthLabel = useMemo(
    () =>
      selectedMonth.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
    [selectedMonth],
  );

  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === monthStart.y && d.getMonth() === monthStart.m;
    });
  }, [transactions, monthStart.y, monthStart.m]);

  const { monthIncome, monthExpenses } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of monthTransactions) {
      if (t.type === "income") inc += t.amount;
      else exp += t.amount;
    }
    return { monthIncome: inc, monthExpenses: exp };
  }, [monthTransactions]);

  const totalBudget = budgets.reduce((s, b) => s + b.limit_amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent_amount || 0), 0);
  const budgetRemaining = totalBudget - totalSpent;
  const budgetHeadroom = Math.max(0, budgetRemaining);
  const budgetUsedPct =
    totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  const cashSurplus = monthIncome - monthExpenses;
  const capForGoals = planningCap(budgetHeadroom, cashSurplus);

  const savingsRatePct =
    monthIncome > 0 ? Math.max(0, (cashSurplus / monthIncome) * 100) : 0;

  const PRIORITY_ORDER: Record<"high" | "medium" | "low", number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const activeGoals = useMemo(
    () =>
      goals
        .filter(
          (g) => g.status === "active" && g.currentAmount < g.targetAmount,
        )
        .sort(
          (a, b) =>
            PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
        ),
    [goals],
  );

  const goalPlans = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Pool split: 80% high · 15% medium · 5% low
    // Within each tier the pool is divided equally among goals in that tier.
    // Any tier that doesn't consume its full share cascades the leftover down.
    const TIER_SHARE = { high: 0.80, medium: 0.15, low: 0.05 } as const;

    const byPriority = {
      high:   activeGoals.filter((g) => g.priority === "high"),
      medium: activeGoals.filter((g) => g.priority === "medium"),
      low:    activeGoals.filter((g) => g.priority === "low"),
    };

    // Compute per-goal base values (independent of pool)
    function baseValues(g: (typeof activeGoals)[number]) {
      const target = new Date(g.targetDate);
      target.setHours(0, 0, 0, 0);
      const remaining = Math.max(0, g.targetAmount - g.currentAmount);
      const monthsLeft = monthsFromToTarget(today, target);
      const neededPerMonth = remaining / monthsLeft;
      const planned =
        g.monthlyContribution != null && g.monthlyContribution > 0
          ? g.monthlyContribution : null;
      const gap = planned != null ? Math.max(0, neededPerMonth - planned) : neededPerMonth;
      const progressPct =
        g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
      return { remaining, monthsLeft, neededPerMonth, planned, gap, progressPct };
    }

    // Allocate a pool equally across goals; ceiling per goal depends on priority.
    // Returns the plans and the unused leftover from this tier.
    function allocateTier(
      goals: (typeof activeGoals)[number][],
      pool: number,
      getCeiling: (bv: ReturnType<typeof baseValues>) => number,
    ) {
      const perGoal = goals.length > 0 ? pool / goals.length : 0;
      const plans = goals.map((g) => {
        const bv = baseValues(g);
        const ceiling = getCeiling(bv);
        const raw = Math.min(perGoal, ceiling, bv.remaining);
        const suggestion = Number.isFinite(raw) && raw > 0 ? raw : 0;
        const totalMonthly = suggestion + (bv.planned ?? 0);
        const projectedMonths =
          totalMonthly > 0 ? Math.ceil(bv.remaining / totalMonthly) : null;
        return {
          goal: g,
          ...bv,
          suggestion,
          projectedMonths,
          isAccelerated: suggestion > bv.neededPerMonth,
        };
      });
      const used = plans.reduce((s, p) => s + p.suggestion, 0);
      return { plans, leftover: Math.max(0, pool - used) };
    }

    // --- Tier 1: high (80%) ---
    const { plans: highPlans, leftover: highLeftover } = allocateTier(
      byPriority.high,
      capForGoals * TIER_SHARE.high,
      (bv) => bv.remaining, // accelerate: fund as much of remaining as possible
    );

    // --- Tier 2: medium (15% + high cascade) ---
    let mediumPool = capForGoals * TIER_SHARE.medium + highLeftover;
    const { plans: mediumPlans, leftover: mediumLeftover } = allocateTier(
      byPriority.medium,
      mediumPool,
      (bv) => bv.neededPerMonth, // keep on pace
    );
    // --- Tier 3: low (5% + medium cascade) ---
    const lowPool = capForGoals * TIER_SHARE.low + mediumLeftover;
    const { plans: lowPlans } = allocateTier(
      byPriority.low,
      lowPool,
      (bv) => bv.gap, // only fill the shortfall vs stated plan
    );

    // Merge back in priority order and attach a cumulative poolLeftAfter
    let displayPool = capForGoals;
    return [...highPlans, ...mediumPlans, ...lowPlans].map((p) => {
      displayPool = Math.max(0, displayPool - p.suggestion);
      return { ...p, poolLeftAfter: displayPool };
    });
  }, [activeGoals, capForGoals]);

  const totalMonthlyNeed = goalPlans.reduce((s, p) => s + p.neededPerMonth, 0);
  const totalGap = goalPlans.reduce((s, p) => s + p.gap, 0);

  const insights = useMemo<{ type: InsightType; text: string }[]>(() => {
    const lines: { type: InsightType; text: string }[] = [];
    if (budgetHeadroom > 0) {
      lines.push({
        type: "success",
        text: `You have ${format(budgetHeadroom)} unused within your ${monthLabel} budget caps — that room can absorb extra spending or be redirected.`,
      });
    } else if (budgetRemaining < 0) {
      lines.push({
        type: "warning",
        text: `You're ${format(Math.abs(budgetRemaining))} over aggregate budget for ${monthLabel}. Prioritize essentials before adding goal contributions.`,
      });
    }
    if (monthIncome > 0 && cashSurplus > 0) {
      lines.push({
        type: "success",
        text: `Cash flow for ${monthLabel}: income beat expenses by ${format(cashSurplus)}. Consider moving part of that surplus toward savings or goals.`,
      });
    } else if (monthIncome > 0 && cashSurplus < 0) {
      lines.push({
        type: "warning",
        text: `Spending exceeded income by ${format(Math.abs(cashSurplus))} in ${monthLabel}. Any goal top-ups should wait until cash flow is positive.`,
      });
    } else if (monthIncome === 0 && monthExpenses > 0) {
      lines.push({
        type: "info",
        text: `No income recorded for ${monthLabel} — goal suggestions assume you fund goals from other months or sources.`,
      });
    }
    if (activeGoals.length === 0) {
      lines.push({
        type: "tip",
        text: "Add a goal to see how your leftover budget could map to a target date and monthly amount.",
      });
    } else if (totalGap > 0 && budgetHeadroom > 0) {
      lines.push({
        type: "tip",
        text: `Your active goals need about ${format(totalMonthlyNeed)} per month combined to reach targets on time; about ${format(totalGap)} of that is still unplanned.`,
      });
    }
    return lines;
  }, [
    activeGoals.length,
    budgetHeadroom,
    budgetRemaining,
    cashSurplus,
    format,
    monthExpenses,
    monthIncome,
    monthLabel,
    totalGap,
    totalMonthlyNeed,
  ]);

  return (
    <div className="space-y-6">
      {/* ── Hero snapshot ───────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-linear-to-br from-primary/5 via-background to-muted/30 p-5 shadow-sm">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-6 left-4 h-28 w-28 rounded-full bg-amber-500/5 blur-2xl" />

        <div className="relative">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {monthLabel} · Planning Snapshot
            </span>
          </div>

          {monthIncome > 0 || monthExpenses > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Income
                  </p>
                  <p className="flex items-center gap-1 font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="h-4 w-4 shrink-0" />
                    {format(monthIncome)}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Expenses
                  </p>
                  <p className="flex items-center gap-1 font-mono text-lg font-bold text-rose-600 dark:text-rose-400">
                    <ArrowDownRight className="h-4 w-4 shrink-0" />
                    {format(monthExpenses)}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Net surplus
                  </p>
                  <p
                    className={`font-mono text-lg font-bold ${
                      cashSurplus >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {cashSurplus >= 0 ? "+" : "−"}
                    {format(Math.abs(cashSurplus))}
                  </p>
                </div>
              </div>
              <FlowBar
                income={monthIncome}
                expenses={monthExpenses}
                format={format}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No transactions recorded for {monthLabel} yet.
            </p>
          )}
        </div>
      </div>

      {/* ── Three stat cards ────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="Budget headroom"
          value={
            <span
              className={
                budgetRemaining >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }
            >
              {budgetRemaining >= 0 ? "" : "−"}
              {format(Math.abs(budgetRemaining))}
            </span>
          }
          footnote={budgetRemaining >= 0 ? "Spending room left within budget caps" : "Over aggregate budget"}
          accent={budgetRemaining >= 0 ? "green" : "red"}
          ring={budgetUsedPct}
          ringColor={
            budgetUsedPct > 90
              ? "#f43f5e"
              : budgetUsedPct > 70
                ? "#f59e0b"
                : "#10b981"
          }
        />
        <StatCard
          icon={monthIncome > 0 && cashSurplus >= 0 ? TrendingUp : TrendingDown}
          label="Cash surplus"
          value={
            monthIncome > 0 || monthExpenses > 0 ? (
              <span
                className={
                  cashSurplus >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }
              >
                {cashSurplus >= 0 ? "+" : "−"}
                {format(Math.abs(cashSurplus))}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          footnote={
            monthIncome > 0
              ? `Savings rate ≈ ${savingsRatePct.toFixed(0)}%`
              : "No income recorded"
          }
          accent={
            monthIncome === 0 ? "blue" : cashSurplus >= 0 ? "green" : "red"
          }
          ring={monthIncome > 0 ? savingsRatePct : undefined}
          ringColor="#10b981"
        />
        <StatCard
          icon={PiggyBank}
          label="Available for goals"
          value={format(capForGoals)}
          footnote={`Income − expenses · ${monthLabel}`}
          accent="amber"
          ring={
            totalMonthlyNeed > 0
              ? Math.min(100, (capForGoals / totalMonthlyNeed) * 100)
              : undefined
          }
          ringColor="#f59e0b"
        />
      </div>

      {/* ── Budget allocation breakdown ─────────────────────────────── */}
      {budgets.length > 0 && (
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-muted/20 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Budget allocation
                </CardTitle>
                <CardDescription className="text-xs">
                  Remaining vs limit · {monthLabel}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {budgets.length} categor{budgets.length === 1 ? "y" : "ies"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {budgets.map((b) => {
                const spent = b.spent_amount || 0;
                const rem = b.limit_amount - spent;
                const pct =
                  b.limit_amount > 0
                    ? Math.min(100, (spent / b.limit_amount) * 100)
                    : 0;
                const label = b.subtype
                  ? `${b.category} · ${b.subtype}`
                  : b.category;
                const isOver = rem < 0;
                const isWarning = pct >= 80 && !isOver;
                const barColor = isOver
                  ? "#f43f5e"
                  : isWarning
                    ? "#f59e0b"
                    : "#10b981";
                return (
                  <div
                    key={b.id}
                    className="group flex flex-col gap-2.5 rounded-xl border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <CircularRing pct={pct} size={36} stroke={3.5} color={barColor}>
                        <span
                          className={`text-[7px] font-bold ${
                            isOver
                              ? "text-rose-500"
                              : isWarning
                                ? "text-amber-500"
                                : "text-emerald-500"
                          }`}
                        >
                          {pct.toFixed(0)}%
                        </span>
                      </CircularRing>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold leading-tight">
                          {label}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(spent)} / {format(b.limit_amount)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, pct)}%`, background: barColor }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">
                          {isOver ? "over by" : "remaining"}
                        </span>
                        <span
                          className={`font-mono text-xs font-bold tabular-nums ${
                            isOver
                              ? "text-rose-600 dark:text-rose-400"
                              : isWarning
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {isOver ? `−${format(Math.abs(rem))}` : format(rem)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Goal planning cards ─────────────────────────────────────── */}
      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-linear-to-br from-primary/5 via-transparent to-transparent px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold tracking-tight">
                Goal funding plan
              </CardTitle>
              <CardDescription className="mt-0.5 text-xs leading-relaxed">
                80% to high · 15% to medium · 5% to low priority goals.
                Unused share cascades down. Illustrative, not automatic transfers.
              </CardDescription>
            </div>
            {activeGoals.length > 0 && (
              <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                {activeGoals.length} active
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5 px-5 py-5">
          {activeGoals.length === 0 ? (
            <div className="flex flex-col items-stretch gap-4 rounded-2xl border border-dashed border-border bg-muted/10 p-6 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted">
                <Target className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground">No active goals yet</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Create a goal to see how your leftover budget maps to a target
                  date and monthly amount.
                </p>
              </div>
              <Button asChild size="sm" className="shrink-0 gap-1.5">
                <Link href="/goals">
                  Add goal
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Surplus pool allocation bar — full width above grid */}
              {capForGoals > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between text-[11px]">
                    <span className="font-medium text-muted-foreground">
                      {monthLabel} · cash surplus available
                    </span>
                    <span className="font-mono font-semibold">
                      {format(capForGoals)} available
                    </span>
                  </div>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                    {goalPlans.map((p, idx) =>
                      p.suggestion > 0 ? (
                        <div
                          key={p.goal.id}
                          title={`${p.goal.title}: ${format(p.suggestion)}`}
                          className={`transition-all duration-700 ${
                            idx % 3 === 0
                              ? "bg-primary"
                              : idx % 3 === 1
                                ? "bg-blue-500"
                                : "bg-violet-500"
                          }`}
                          style={{
                            width: `${(p.suggestion / capForGoals) * 100}%`,
                          }}
                        />
                      ) : null,
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {goalPlans
                      .filter((p) => p.suggestion > 0)
                      .map((p, idx) => (
                        <span
                          key={p.goal.id}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground"
                        >
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              idx % 3 === 0
                                ? "bg-primary"
                                : idx % 3 === 1
                                  ? "bg-blue-500"
                                  : "bg-violet-500"
                            }`}
                          />
                          {p.goal.title} ({format(p.suggestion)})
                        </span>
                      ))}
                    {goalPlans[goalPlans.length - 1]?.poolLeftAfter > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/30" />
                        Unallocated (
                        {format(goalPlans[goalPlans.length - 1].poolLeftAfter)})
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {goalPlans.map(
                  ({
                    goal: g,
                    remaining,
                    monthsLeft,
                    neededPerMonth,
                    planned,
                    gap,
                    suggestion,
                    progressPct,
                    poolLeftAfter,
                    projectedMonths,
                    isAccelerated,
                  }) => {
                    const onTrack = gap <= 0 && planned != null;
                    const noFunds = gap > 0 && suggestion <= 0;
                    const ringColor = onTrack
                      ? "#10b981"
                      : progressPct > 60
                        ? "#3b82f6"
                        : "hsl(var(--primary))";
                    return (
                      <div
                        key={g.id}
                        className="group relative flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-all duration-200 hover:border-border hover:shadow-md"
                      >
                        {/* priority accent top bar */}
                        <div
                          className={`h-0.5 w-full ${
                            g.priority === "high"
                              ? "bg-rose-500"
                              : g.priority === "medium"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                          }`}
                        />

                        <div className="flex flex-1 flex-col gap-3 p-3.5">
                          {/* header: ring + title + badges */}
                          <div className="flex items-start gap-2.5">
                            <CircularRing pct={progressPct} size={44} stroke={4} color={ringColor}>
                              <span className="text-[7px] font-bold tabular-nums">
                                {progressPct.toFixed(0)}%
                              </span>
                            </CircularRing>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold leading-tight">
                                {g.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {g.category}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                <Badge
                                  className={`text-[9px] font-semibold px-1.5 py-0 ${
                                    g.priority === "high"
                                      ? "bg-rose-500/15 text-rose-700 hover:bg-rose-500/15 dark:text-rose-400"
                                      : g.priority === "medium"
                                        ? "bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
                                        : "bg-slate-500/15 text-slate-600 hover:bg-slate-500/15 dark:text-slate-400"
                                  }`}
                                >
                                  {g.priority}
                                </Badge>
                                {onTrack && (
                                  <Badge className="gap-0.5 bg-emerald-500/15 px-1.5 py-0 text-[9px] text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    on track
                                  </Badge>
                                )}
                                <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {monthsLeft}mo
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* thin progress bar */}
                          <div className="space-y-0.5">
                            <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                                style={{ width: `${progressPct}%`, background: ringColor }}
                              />
                            </div>
                            <div className="flex justify-between text-[9px] text-muted-foreground">
                              <span>{format(g.currentAmount)} saved</span>
                              <span>{format(g.targetAmount)}</span>
                            </div>
                          </div>

                          {/* compact stats row */}
                          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                            <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                              <p className="text-muted-foreground">Still needed</p>
                              <p className="font-mono font-bold tabular-nums text-xs">
                                {format(remaining)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                              <p className="text-muted-foreground">On-pace/mo</p>
                              <p className="font-mono font-bold tabular-nums text-xs">
                                ~{format(neededPerMonth)}
                              </p>
                            </div>
                            {planned != null && (
                              <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                                <p className="text-muted-foreground">Your plan</p>
                                <p className="font-mono font-bold tabular-nums text-xs">
                                  {format(planned)}/mo
                                  {gap <= 0 && (
                                    <span className="ml-1 font-normal text-emerald-600 dark:text-emerald-400">
                                      ✓
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                            {projectedMonths != null && suggestion > 0 && (
                              <div className={`rounded-lg px-2.5 py-2 ${isAccelerated ? "bg-rose-500/10" : "bg-primary/8"}`}>
                                <p className="text-muted-foreground">
                                  {isAccelerated ? "Projected done" : "Est. done"}
                                </p>
                                <p className={`font-mono font-bold tabular-nums text-xs ${isAccelerated ? "text-rose-600 dark:text-rose-400" : "text-primary"}`}>
                                  ~{projectedMonths}mo
                                  {isAccelerated && projectedMonths < monthsLeft && (
                                    <span className="ml-1 text-[9px] font-normal">
                                      ({monthsLeft - projectedMonths}mo faster)
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* suggestion / no-funds footer */}
                          {suggestion > 0 && (
                            <div className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px] ${
                              isAccelerated
                                ? "border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10"
                                : "border-primary/20 bg-primary/5 dark:bg-primary/10"
                            }`}>
                              <Zap className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isAccelerated ? "text-rose-500" : "text-primary"}`} />
                              <p className="leading-snug text-foreground/90">
                                {isAccelerated ? (
                                  <>
                                    Allocate{" "}
                                    <span className={`font-mono font-semibold text-rose-600 dark:text-rose-400`}>
                                      {format(suggestion)}
                                    </span>{" "}
                                    this month to accelerate completion
                                    {projectedMonths != null && projectedMonths < monthsLeft && (
                                      <> — done in ~{projectedMonths}mo instead of {monthsLeft}mo</>
                                    )}.
                                  </>
                                ) : (
                                  <>
                                    Contribute{" "}
                                    <span className="font-mono font-semibold text-primary">
                                      {format(suggestion)}
                                    </span>{" "}
                                    from {monthLabel} to stay on pace.
                                  </>
                                )}
                                {poolLeftAfter > 0 && (
                                  <span className="text-muted-foreground">
                                    {" "}{format(poolLeftAfter)} left for lower-priority goals.
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                          {noFunds && (
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <CircleDot className="h-3 w-3 shrink-0" />
                              {capForGoals <= 0
                                ? "No surplus available this month."
                                : `This goal's tier share (${g.priority === "high" ? "80%" : g.priority === "medium" ? "15%" : "5%"}) was fully consumed.`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}

          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl"
          >
            <Link href="/goals">
              Manage goals
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* ── Insights ────────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader className="border-b border-border/50 bg-linear-to-br from-amber-500/5 via-transparent to-transparent px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold tracking-tight">
                  Insights &amp; tips
                </CardTitle>
                <CardDescription className="text-xs">
                  Personalized observations for {monthLabel}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 px-5 py-4">
            {insights.map((ins, i) => (
              <InsightCard
                key={`${i}-${ins.text.slice(0, 32)}`}
                type={ins.type}
                text={ins.text}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
