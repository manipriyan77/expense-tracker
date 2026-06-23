"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Shield,
  CreditCard,
  Target,
  PiggyBank,
  TrendingUp,
  Gem,
  Landmark,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Wallet,
  Coins,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTransactionsStore } from "@/store/transactions-store";
import { useGoalsStore } from "@/store/goals-store";
import { useDebtTrackerStore } from "@/store/debt-tracker-store";
import { useNetWorthStore } from "@/store/net-worth-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import {
  buildInvestmentPlan,
  type AdvisorGoal,
  type AvenueKey,
  type RiskProfile,
  type Urgency,
} from "@/lib/utils/investment-advisor";

const MONTHS_LOOKBACK = 3;
const HIGH_INTEREST_THRESHOLD = 10; // % p.a.

const AVENUE_META: Record<
  AvenueKey,
  { icon: React.ComponentType<{ className?: string }>; href?: string; tint: string }
> = {
  emergency: { icon: Shield, href: "/net-worth", tint: "text-sky-500 bg-sky-500/10" },
  debt: { icon: CreditCard, href: "/debt-tracker", tint: "text-rose-500 bg-rose-500/10" },
  goal: { icon: Target, href: "/goals", tint: "text-violet-500 bg-violet-500/10" },
  mutual_funds: { icon: TrendingUp, href: "/mutual-funds", tint: "text-emerald-500 bg-emerald-500/10" },
  stocks: { icon: TrendingUp, href: "/stocks", tint: "text-blue-500 bg-blue-500/10" },
  gold: { icon: Gem, href: "/gold", tint: "text-amber-500 bg-amber-500/10" },
  fd: { icon: Landmark, href: "/investments", tint: "text-teal-500 bg-teal-500/10" },
};

const URGENCY_BADGE: Record<Urgency, { label: string; className: string }> = {
  critical: { label: "Do first", className: "border-rose-500/40 text-rose-600 dark:text-rose-400" },
  high: { label: "High priority", className: "border-amber-500/40 text-amber-600 dark:text-amber-400" },
  medium: { label: "Medium", className: "border-sky-500/40 text-sky-600 dark:text-sky-400" },
  low: { label: "Invest", className: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" },
};

function monthsBetween(from: string, to = new Date()): number {
  const d = new Date(from);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, (to.getFullYear() - d.getFullYear()) * 12 + (to.getMonth() - d.getMonth()));
}

export default function InvestmentAdvisorPage() {
  const { transactions, fetchTransactions } = useTransactionsStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { debts, fetchDebts } = useDebtTrackerStore();
  const { assets, fetchAssets } = useNetWorthStore();
  const { format } = useFormatCurrency();

  // Editable inputs are stored as overrides; when null we fall back to the
  // value derived from tracked data (computed below during render).
  const [incomeOverride, setIncomeOverride] = useState<number | null>(null);
  const [expensesOverride, setExpensesOverride] = useState<number | null>(null);
  const [emergencyOverride, setEmergencyOverride] = useState<number | null>(null);
  const [risk, setRisk] = useState<RiskProfile>("balanced");

  useEffect(() => {
    fetchTransactions();
    fetchGoals();
    fetchDebts();
    fetchAssets();
  }, [fetchTransactions, fetchGoals, fetchDebts, fetchAssets]);

  // ── Derive figures from tracked data ───────────────────────────────────────
  const derived = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - MONTHS_LOOKBACK);

    let incomeSum = 0;
    let expenseSum = 0;
    for (const t of transactions) {
      const d = new Date(t.date);
      if (isNaN(d.getTime()) || d < cutoff) continue;
      if (t.type === "income") incomeSum += t.amount;
      else expenseSum += t.amount;
    }
    const monthlyIncome = Math.round(incomeSum / MONTHS_LOOKBACK);
    const monthlyExpenses = Math.round(expenseSum / MONTHS_LOOKBACK);

    // Emergency fund = liquid assets (cash + bank).
    const liquid = assets
      .filter((a) => a.type === "cash" || a.type === "bank")
      .reduce((s, a) => s + (Number(a.value) || 0), 0);

    // High-interest debt.
    const costly = debts.filter((d) => (d.interest_rate || 0) >= HIGH_INTEREST_THRESHOLD);
    const highInterestDebt = costly.reduce((s, d) => s + (Number(d.balance) || 0), 0);
    const topDebtRate = costly.reduce((m, d) => Math.max(m, d.interest_rate || 0), 0);

    // Goal monthly needs.
    const advisorGoals: AdvisorGoal[] = goals
      .filter((g) => g.status === "active")
      .map((g) => {
        let monthlyNeeded = g.monthlyContribution ?? 0;
        if (!monthlyNeeded) {
          const remaining = Math.max(0, g.targetAmount - g.currentAmount);
          const months = Math.max(1, monthsBetween(new Date().toISOString(), new Date(g.targetDate)) || 12);
          monthlyNeeded = Math.round(remaining / months);
        }
        return { title: g.title, priority: g.priority, monthlyNeeded };
      })
      .filter((g) => g.monthlyNeeded > 0);

    return {
      monthlyIncome,
      monthlyExpenses,
      liquid: Math.round(liquid),
      highInterestDebt: Math.round(highInterestDebt),
      topDebtRate,
      advisorGoals,
    };
  }, [transactions, assets, debts, goals]);

  // Effective values: user override if set, otherwise the figure from tracked data.
  const income = incomeOverride ?? derived.monthlyIncome;
  const expenses = expensesOverride ?? derived.monthlyExpenses;
  const emergencyFund = emergencyOverride ?? derived.liquid;

  const resetFromData = () => {
    setIncomeOverride(null);
    setExpensesOverride(null);
    setEmergencyOverride(null);
  };

  const plan = useMemo(
    () =>
      buildInvestmentPlan({
        monthlyIncome: income,
        monthlyExpenses: expenses,
        emergencyFund,
        highInterestDebt: derived.highInterestDebt,
        topDebtRate: derived.topDebtRate,
        goals: derived.advisorGoals,
        riskProfile: risk,
      }),
    [income, expenses, emergencyFund, derived, risk],
  );

  const surplus = income - expenses;

  return (
    <div className="min-h-full">
      <PageHeader
        title="Invest Advisor"
        description="Based on your income and spending, here's where to put your money — in priority order."
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Inputs */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Wallet className="h-4 w-4 text-primary" />
                Your monthly numbers
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFromData}
                className="gap-1.5 text-xs text-muted-foreground h-8"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                From my data
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Monthly income</label>
                <Input
                  type="number"
                  value={income || ""}
                  onChange={(e) => setIncomeOverride(Number(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Monthly expenses</label>
                <Input
                  type="number"
                  value={expenses || ""}
                  onChange={(e) => setExpensesOverride(Number(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Emergency fund (saved)</label>
                <Input
                  type="number"
                  value={emergencyFund || ""}
                  onChange={(e) => setEmergencyOverride(Number(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground">Risk appetite</label>
                <Select value={risk} onValueChange={(v) => setRisk(v as RiskProfile)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative — protect capital</SelectItem>
                    <SelectItem value="balanced">Balanced — steady growth</SelectItem>
                    <SelectItem value="aggressive">Aggressive — maximise growth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">Monthly surplus</p>
                <p
                  className={`text-lg font-bold ${
                    surplus > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {format(surplus)}
                </p>
              </div>
            </div>

            {(derived.highInterestDebt > 0 || derived.advisorGoals.length > 0) && (
              <p className="text-xs text-muted-foreground">
                Also factored in:{" "}
                {derived.highInterestDebt > 0 && (
                  <span>{format(derived.highInterestDebt)} high-interest debt</span>
                )}
                {derived.highInterestDebt > 0 && derived.advisorGoals.length > 0 && " · "}
                {derived.advisorGoals.length > 0 && (
                  <span>{derived.advisorGoals.length} active goal(s)</span>
                )}
                .
              </p>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">{plan.summary}</p>
        </div>

        {/* Warnings */}
        {plan.warnings.length > 0 && (
          <div className="space-y-2">
            {plan.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-700 dark:text-amber-400"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {w}
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {plan.recommendations.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-primary" />
              Your prioritised plan
            </h2>

            {plan.recommendations.map((r) => {
              const meta = AVENUE_META[r.avenue];
              const Icon = meta.icon;
              const badge = URGENCY_BADGE[r.urgency];
              return (
                <Card key={r.id}>
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                          {r.rank}
                        </span>
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.tint}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-foreground">{r.title}</h3>
                              <Badge variant="outline" className={badge.className}>
                                {badge.label}
                              </Badge>
                            </div>
                            {r.meta && (
                              <p className="text-xs text-muted-foreground mt-0.5">{r.meta}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-base font-bold text-foreground">
                              {format(r.monthlyAmount)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">/ month</p>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mt-2">{r.rationale}</p>

                        {meta.href && (
                          <Link
                            href={meta.href}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Go there <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Allocation footer */}
            <div className="flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Coins className="h-4 w-4" />
                Allocated of surplus
              </span>
              <span className="font-semibold text-foreground">
                {format(plan.allocated)} / {format(plan.surplus)}
              </span>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Educational guidance generated from your data — not financial advice.
        </p>
      </div>
    </div>
  );
}
