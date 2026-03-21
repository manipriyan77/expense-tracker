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
import type { Budget } from "@/store/budgets-store";
import type { Goal } from "@/store/goals-store";
import type { Transaction } from "@/store/transactions-store";
import {
  Lightbulb,
  PiggyBank,
  Target,
  ArrowRight,
  TrendingUp,
  Wallet,
  Sparkles,
  ChevronRight,
} from "lucide-react";

export interface BudgetPlanningTabProps {
  readonly selectedMonth: Date;
  readonly budgets: readonly Budget[];
  readonly transactions: readonly Transaction[];
  readonly goals: readonly Goal[];
  readonly format: (value: number) => string;
}

/** Whole months from `from` to `to` (inclusive-ish); at least 1 when target is due or past. */
function monthsFromToTarget(from: Date, to: Date): number {
  if (to.getTime() <= from.getTime()) return 1;
  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return Math.max(1, months + 1);
}

/** Conservative amount you might steer toward goals: avoids double-counting when both exist. */
function planningCap(headroom: number, surplus: number): number {
  const h = Math.max(0, headroom);
  const s = Math.max(0, surplus);
  if (h > 0 && s > 0) return Math.min(h, s);
  if (h > 0) return h;
  return s;
}

function MetricTile({
  icon: Icon,
  label,
  sublabel,
  value,
  valueClassName,
  footnote,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  sublabel: string;
  value: React.ReactNode;
  valueClassName?: string;
  footnote: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent"
        aria-hidden
      />
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground/90">
            {sublabel}
          </p>
          <p
            className={`pt-0.5 font-mono text-xl font-semibold tabular-nums tracking-tight sm:text-2xl ${valueClassName ?? "text-foreground"}`}
          >
            {value}
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {footnote}
          </p>
        </div>
      </div>
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

  const cashSurplus = monthIncome - monthExpenses;
  const capForGoals = planningCap(budgetHeadroom, cashSurplus);

  let cashFlowNote = "No transactions this month";
  if (monthIncome > 0 || monthExpenses > 0) {
    cashFlowNote = cashSurplus >= 0 ? "Positive flow" : "Deficit";
  }

  const activeGoals = useMemo(
    () =>
      goals.filter(
        (g) => g.status === "active" && g.currentAmount < g.targetAmount,
      ),
    [goals],
  );

  const goalPlans = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return activeGoals.map((g) => {
      const target = new Date(g.targetDate);
      target.setHours(0, 0, 0, 0);
      const remaining = Math.max(0, g.targetAmount - g.currentAmount);
      const monthsLeft = monthsFromToTarget(today, target);
      const neededPerMonth = remaining / monthsLeft;
      const planned =
        g.monthlyContribution != null && g.monthlyContribution > 0
          ? g.monthlyContribution
          : null;
      let gap = neededPerMonth;
      if (planned != null) {
        gap = Math.max(0, neededPerMonth - planned);
      }
      const suggestion = Math.min(capForGoals, gap, remaining);
      return {
        goal: g,
        remaining,
        monthsLeft,
        neededPerMonth,
        planned,
        gap,
        suggestion: Number.isFinite(suggestion) ? suggestion : 0,
      };
    });
  }, [activeGoals, capForGoals]);

  const totalMonthlyNeed = goalPlans.reduce((s, p) => s + p.neededPerMonth, 0);
  const totalGap = goalPlans.reduce((s, p) => s + p.gap, 0);

  const ideas = useMemo(() => {
    const lines: string[] = [];
    if (budgetHeadroom > 0) {
      lines.push(
        `You have ${format(budgetHeadroom)} unused within your ${monthLabel} budget caps — that room can absorb extra spending or be redirected.`,
      );
    } else if (budgetRemaining < 0) {
      lines.push(
        `You're ${format(Math.abs(budgetRemaining))} over aggregate budget for ${monthLabel}. Prioritize essentials before adding goal contributions.`,
      );
    }
    if (monthIncome > 0 && cashSurplus > 0) {
      lines.push(
        `Cash flow for ${monthLabel}: income beat expenses by ${format(cashSurplus)}. Consider moving part of that surplus toward savings or goals.`,
      );
    } else if (monthIncome > 0 && cashSurplus < 0) {
      lines.push(
        `Spending exceeded income by ${format(Math.abs(cashSurplus))} in ${monthLabel}. Any goal top-ups should wait until cash flow is positive.`,
      );
    } else if (monthIncome === 0 && monthExpenses > 0) {
      lines.push(
        `No income recorded for ${monthLabel} — goal suggestions assume you fund goals from other months or sources.`,
      );
    }
    if (activeGoals.length === 0) {
      lines.push(
        "Add a goal to see how your leftover budget could map to a target date and monthly amount.",
      );
    } else if (totalGap > 0 && budgetHeadroom > 0) {
      lines.push(
        `Your active goals need about ${format(totalMonthlyNeed)} per month combined to reach targets on time; about ${format(totalGap)} of that is still unplanned if you rely only on stated monthly contributions.`,
      );
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
      <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500/90" />
          <span>
            Planning uses{" "}
            <span className="font-medium text-foreground">{monthLabel}</span>{" "}
            budgets &amp; transactions. Goal timelines use{" "}
            <span className="font-medium text-foreground">today</span>.
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile
          icon={Wallet}
          label="Budget headroom"
          sublabel="Caps minus spent · this month"
          value={format(Math.abs(budgetRemaining))}
          valueClassName={
            budgetRemaining >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          }
          footnote={
            budgetRemaining >= 0
              ? "Under aggregate budget"
              : "Over aggregate budget"
          }
        />
        <MetricTile
          icon={TrendingUp}
          label="Cash surplus"
          sublabel="Income − expenses (recorded)"
          value={
            monthIncome > 0 || monthExpenses > 0 ? (
              format(Math.abs(cashSurplus))
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          valueClassName={
            monthIncome > 0 || monthExpenses > 0
              ? cashSurplus >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
              : undefined
          }
          footnote={cashFlowNote}
        />
        <MetricTile
          icon={PiggyBank}
          label="Planning cap"
          sublabel="Conservative ceiling for goal ideas"
          value={format(capForGoals)}
          footnote="If both headroom and surplus are positive, we use the smaller; otherwise the positive one (or 0)."
        />
      </div>

      {budgets.length > 0 && (
        <Card className="overflow-hidden border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
            <CardTitle className="text-sm font-semibold tracking-tight">
              Room left by budget
            </CardTitle>
            <CardDescription className="text-xs">
              Remaining vs limit for {monthLabel}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/60 p-0">
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
              return (
                <div
                  key={b.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">{label}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {format(spent)} of {format(b.limit_amount)} ·{" "}
                      <span className="tabular-nums">{pct.toFixed(0)}%</span>{" "}
                      used
                    </p>
                  </div>
                  <div className="flex w-full flex-col gap-1.5 sm:w-52 sm:shrink-0">
                    <Progress value={pct} className="h-2" />
                    <p
                      className={`text-right font-mono text-sm font-semibold tabular-nums ${
                        rem >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {rem >= 0 ? format(rem) : `−${format(Math.abs(rem))}`}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground">
                        left
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 px-4 py-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base font-semibold tracking-tight">
                Insights &amp; goal ideas
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Illustrative amounts — not automatic transfers. Each goal is
                calculated separately; ideas may add up to more than your planning
                cap. Pick what fits you.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 px-4 py-5 sm:px-5">
          {ideas.length > 0 && (
            <ul className="space-y-2.5">
              {ideas.map((line, i) => (
                <li
                  key={`${i}-${line.slice(0, 48)}`}
                  className="flex gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm leading-relaxed text-foreground/90"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/80"
                    aria-hidden
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}

          {activeGoals.length === 0 ? (
            <div className="flex flex-col items-stretch gap-3 rounded-xl border border-dashed border-border bg-muted/10 p-4 sm:flex-row sm:items-center">
              <p className="flex-1 text-sm text-muted-foreground">
                No active goals yet. Create one to tie leftover budget to a
                target.
              </p>
              <Button asChild size="sm" className="shrink-0 gap-1">
                <Link href="/goals">
                  Add goal
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {goalPlans.map(
                ({
                  goal: g,
                  remaining,
                  monthsLeft,
                  neededPerMonth,
                  planned,
                  gap,
                  suggestion,
                }) => (
                  <div
                    key={g.id}
                    className="rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border/50 pb-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Target className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium leading-tight">{g.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {g.category}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                        ~{monthsLeft} mo to target
                      </span>
                    </div>

                    <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                      <div className="flex justify-between gap-2 rounded-md bg-muted/30 px-3 py-2">
                        <dt className="text-muted-foreground">Still needed</dt>
                        <dd className="font-mono font-semibold tabular-nums">
                          {format(remaining)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2 rounded-md bg-muted/30 px-3 py-2">
                        <dt className="text-muted-foreground">Pace to hit date</dt>
                        <dd className="font-mono font-semibold tabular-nums">
                          ~{format(neededPerMonth)}/mo
                        </dd>
                      </div>
                      {planned != null && (
                        <div className="flex justify-between gap-2 rounded-md bg-muted/30 px-3 py-2 sm:col-span-2">
                          <dt className="text-muted-foreground">Your plan</dt>
                          <dd className="font-mono font-semibold tabular-nums">
                            {format(planned)}/mo
                          </dd>
                        </div>
                      )}
                    </dl>

                    {gap > 0 && suggestion > 0 && (
                      <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2.5 text-sm leading-relaxed dark:bg-green-500/10">
                        <p className="text-foreground">
                          From up to{" "}
                          <span className="font-mono font-semibold">
                            {format(capForGoals)}
                          </span>{" "}
                          you could steer{" "}
                          <span className="font-mono font-semibold text-green-700 dark:text-green-400">
                            {format(suggestion)}
                          </span>{" "}
                          toward this goal this month — roughly{" "}
                          <span className="font-semibold">
                            {`${Math.min(100, Math.round((suggestion / gap) * 100))}%`}
                          </span>{" "}
                          of the monthly gap vs your plan.
                        </p>
                      </div>
                    )}
                    {gap <= 0 && planned != null && (
                      <p className="mt-3 text-xs font-medium text-green-600 dark:text-green-400">
                        Planned contribution meets or exceeds the pace needed for
                        the target date.
                      </p>
                    )}
                    {gap > 0 && suggestion <= 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Increase budget headroom or cash surplus to fund more
                        toward this goal.
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>
          )}

          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href="/goals">
              Manage goals
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
