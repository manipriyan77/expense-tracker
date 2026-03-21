"use client";

import { useMemo } from "react";
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
    () => goals.filter((g) => g.status === "active" && g.currentAmount < g.targetAmount),
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
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Numbers for{" "}
        <span className="font-medium text-foreground">{monthLabel}</span> use
        this month&apos;s budgets and transactions. Goal timelines use
        today&apos;s date.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Budget headroom
            </CardTitle>
            <CardDescription>Caps minus spent (this month)</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-mono font-semibold ${budgetRemaining >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {format(Math.abs(budgetRemaining))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {budgetRemaining >= 0 ? "Under aggregate budget" : "Over aggregate budget"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Cash surplus
            </CardTitle>
            <CardDescription>Income − expenses (recorded)</CardDescription>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-mono font-semibold ${cashSurplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
            >
              {monthIncome > 0 || monthExpenses > 0
                ? format(Math.abs(cashSurplus))
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{cashFlowNote}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
              Planning cap
            </CardTitle>
            <CardDescription>Conservative ceiling for goal ideas</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-semibold text-foreground">
              {format(capForGoals)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              If both headroom and surplus are positive, uses the smaller; otherwise
              the positive one (or 0).
            </p>
          </CardContent>
        </Card>
      </div>

      {budgets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Where it&apos;s left</CardTitle>
            <CardDescription>Per-budget remaining for {monthLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {budgets.map((b) => {
              const spent = b.spent_amount || 0;
              const rem = b.limit_amount - spent;
              const pct =
                b.limit_amount > 0
                  ? Math.min(100, (spent / b.limit_amount) * 100)
                  : 0;
              const label = b.subtype ? `${b.category} · ${b.subtype}` : b.category;
              return (
                <div key={b.id} className="space-y-1">
                  <div className="flex justify-between text-sm gap-2">
                    <span className="truncate font-medium">{label}</span>
                    <span
                      className={`font-mono shrink-0 ${rem >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {rem >= 0 ? format(rem) : `−${format(Math.abs(rem))}`}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Ideas based on your goals
          </CardTitle>
          <CardDescription>
            Illustrative amounts — not automatic transfers. Each goal is calculated
            separately, so ideas may add up to more than your planning cap; pick what
            fits you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ideas.length > 0 && (
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
              {ideas.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}

          {activeGoals.length === 0 ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-dashed p-4">
              <p className="text-sm text-muted-foreground flex-1">
                No active goals yet. Create one to tie leftover budget to a target.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/goals">
                  Add goal <ArrowRight className="h-3.5 w-3.5 ml-1" />
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
                    className="rounded-lg border bg-card/50 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Target className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium truncate">{g.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ~{monthsLeft} mo left
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:text-sm">
                      <span className="text-muted-foreground">Still needed</span>
                      <span className="font-mono text-right">{format(remaining)}</span>
                      <span className="text-muted-foreground">To hit target on time</span>
                      <span className="font-mono text-right">
                        ~{format(neededPerMonth)}/mo
                      </span>
                      {planned != null && (
                        <>
                          <span className="text-muted-foreground">Your plan</span>
                          <span className="font-mono text-right">
                            {format(planned)}/mo
                          </span>
                        </>
                      )}
                    </div>
                    {gap > 0 && suggestion > 0 && (
                      <p className="text-sm text-foreground border-t border-border pt-2">
                        From up to{" "}
                        <span className="font-mono font-semibold">
                          {format(capForGoals)}
                        </span>{" "}
                        you could steer{" "}
                        <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                          {format(suggestion)}
                        </span>{" "}
                        toward this goal this month to cover roughly{" "}
                        <span className="font-medium">
                          {`${Math.min(100, Math.round((suggestion / gap) * 100))}%`}
                        </span>{" "}
                        of the monthly gap vs your plan.
                      </p>
                    )}
                    {gap <= 0 && planned != null && (
                      <p className="text-xs text-green-600 dark:text-green-400 pt-1">
                        Planned contribution meets or exceeds the pace needed for the target date.
                      </p>
                    )}
                    {gap > 0 && suggestion <= 0 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        Increase budget headroom or cash surplus to fund more toward this goal.
                      </p>
                    )}
                  </div>
                ),
              )}
            </div>
          )}

          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link href="/goals">
              Manage goals <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
