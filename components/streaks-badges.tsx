"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

interface StreaksBadgesProps {
  transactions: { amount: number; type: "income" | "expense"; date: string }[];
  budgets: { limit_amount: number; spent_amount: number; month: number; year: number }[];
  goals: { status: string }[];
}

interface Badge {
  id: string;
  emoji: string;
  label: string;
  description: string;
  earned: boolean;
  tier: "bronze" | "silver" | "gold";
}

function computeBadges(props: StreaksBadgesProps): Badge[] {
  const { transactions, budgets, goals } = props;

  // --- Savings badges ---
  const now = new Date();
  const monthsPositive = [0, 1, 2].filter((offset) => {
    const m = (now.getMonth() - offset + 12) % 12;
    const y = now.getFullYear() - (now.getMonth() - offset < 0 ? 1 : 0);
    const inc = transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === m && d.getFullYear() === y && t.type === "income";
      })
      .reduce((s, t) => s + t.amount, 0);
    const exp = transactions
      .filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === m && d.getFullYear() === y && t.type === "expense";
      })
      .reduce((s, t) => s + t.amount, 0);
    return inc > exp;
  }).length;

  // --- Budget badges ---
  const uniqueMonths = Array.from(
    new Set(budgets.map((b) => `${b.year}-${b.month}`)),
  );
  const monthsUnderBudget = uniqueMonths.filter((key) => {
    const [y, m] = key.split("-").map(Number);
    const monthBudgets = budgets.filter((b) => b.year === y && b.month === m);
    return (
      monthBudgets.length > 0 &&
      monthBudgets.every((b) => b.spent_amount <= b.limit_amount)
    );
  }).length;

  // --- Goal badges ---
  const completedGoals = goals.filter((g) => g.status === "completed").length;

  // --- Consistency badges (transactions logged per day) ---
  const last30Days = new Set(
    transactions
      .filter((t) => {
        const d = new Date(t.date);
        const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diff <= 30;
      })
      .map((t) => t.date),
  ).size;

  return [
    {
      id: "saver_bronze",
      emoji: "💰",
      label: "Saver",
      description: "Saved more than you spent for 1 month",
      earned: monthsPositive >= 1,
      tier: "bronze",
    },
    {
      id: "saver_silver",
      emoji: "💰",
      label: "Super Saver",
      description: "Saved more than you spent for 2 months straight",
      earned: monthsPositive >= 2,
      tier: "silver",
    },
    {
      id: "saver_gold",
      emoji: "💰",
      label: "Master Saver",
      description: "Saved more than you spent for 3 months straight",
      earned: monthsPositive >= 3,
      tier: "gold",
    },
    {
      id: "budget_bronze",
      emoji: "🎯",
      label: "Budget Keeper",
      description: "Stayed under budget for 1 full month",
      earned: monthsUnderBudget >= 1,
      tier: "bronze",
    },
    {
      id: "budget_silver",
      emoji: "🎯",
      label: "Budget Pro",
      description: "Stayed under budget for 3 months",
      earned: monthsUnderBudget >= 3,
      tier: "silver",
    },
    {
      id: "budget_gold",
      emoji: "🎯",
      label: "Budget Master",
      description: "Stayed under budget for 6 months",
      earned: monthsUnderBudget >= 6,
      tier: "gold",
    },
    {
      id: "goal_bronze",
      emoji: "🏆",
      label: "Goal Getter",
      description: "Completed your first financial goal",
      earned: completedGoals >= 1,
      tier: "bronze",
    },
    {
      id: "goal_silver",
      emoji: "🏆",
      label: "Goal Crusher",
      description: "Completed 3 financial goals",
      earned: completedGoals >= 3,
      tier: "silver",
    },
    {
      id: "goal_gold",
      emoji: "🏆",
      label: "Goal Champion",
      description: "Completed 5 financial goals",
      earned: completedGoals >= 5,
      tier: "gold",
    },
    {
      id: "consistent_bronze",
      emoji: "📅",
      label: "Consistent",
      description: "Logged transactions on 7 different days this month",
      earned: last30Days >= 7,
      tier: "bronze",
    },
    {
      id: "consistent_silver",
      emoji: "📅",
      label: "Dedicated",
      description: "Logged transactions on 15 different days this month",
      earned: last30Days >= 15,
      tier: "silver",
    },
    {
      id: "consistent_gold",
      emoji: "📅",
      label: "Diligent",
      description: "Logged transactions on 25 different days this month",
      earned: last30Days >= 25,
      tier: "gold",
    },
  ];
}

const tierBorder: Record<string, string> = {
  bronze: "border-amber-600",
  silver: "border-slate-400",
  gold: "border-yellow-400",
};

const tierBg: Record<string, string> = {
  bronze: "bg-amber-50 dark:bg-amber-950/30",
  silver: "bg-slate-50 dark:bg-slate-800/30",
  gold: "bg-yellow-50 dark:bg-yellow-950/30",
};

export function StreaksBadges(props: StreaksBadgesProps) {
  const badges = useMemo(() => computeBadges(props), [props]);
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Achievements
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {earned.length}/{badges.length} earned
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {earned.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            Keep tracking your finances to earn badges!
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {earned.map((badge) => (
              <div
                key={badge.id}
                className={`flex items-center gap-2 p-2 rounded-lg border-2 ${tierBorder[badge.tier]} ${tierBg[badge.tier]}`}
              >
                <span className="text-lg">{badge.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{badge.label}</p>
                  <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                    {badge.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {locked.length > 0 && (
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
              {locked.length} locked badge{locked.length !== 1 ? "s" : ""} — click to preview
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {locked.map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-muted-foreground/30 opacity-50 grayscale"
                >
                  <span className="text-lg">{badge.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{badge.label}</p>
                    <p className="text-xs text-muted-foreground leading-tight line-clamp-2">
                      {badge.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
