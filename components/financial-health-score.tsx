"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, TrendingUp, Target, CreditCard, Landmark } from "lucide-react";

interface HealthScoreProps {
  transactions: { amount: number; type: "income" | "expense"; date: string }[];
  budgets: { limit_amount: number; spent_amount: number }[];
  goals: { targetAmount: number; currentAmount: number; status: string }[];
  totalDebt: number;
  totalAssets: number;
}

interface ScoreComponent {
  label: string;
  score: number;
  max: number;
  tip: string;
  icon: React.ReactNode;
}

function computeScore(props: HealthScoreProps) {
  const { transactions, budgets, goals, totalDebt, totalAssets } = props;

  // Last 3 months of data
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recent = transactions.filter(
    (t) => new Date(t.date) >= threeMonthsAgo,
  );

  const income = recent
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expenses = recent
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const monthlyExpenses = expenses / 3;

  // 1. Savings rate (0–30 pts)
  const savingsRate = income > 0 ? (income - expenses) / income : 0;
  const savingsScore = Math.min(30, Math.max(0, (savingsRate / 0.2) * 30));
  const savingsTip =
    savingsRate >= 0.2
      ? "Great savings rate! Keep it up."
      : `Aim to save at least 20% of income. Currently saving ${(savingsRate * 100).toFixed(0)}%.`;

  // 2. Budget adherence (0–25 pts)
  const activeBudgets = budgets.filter((b) => b.limit_amount > 0);
  const underBudget = activeBudgets.filter(
    (b) => b.spent_amount <= b.limit_amount,
  ).length;
  const adherenceRate =
    activeBudgets.length > 0 ? underBudget / activeBudgets.length : 1;
  const budgetScore = Math.round(adherenceRate * 25);
  const budgetTip =
    adherenceRate === 1
      ? "All budgets on track!"
      : `${activeBudgets.length - underBudget} budget(s) overspent. Review your spending categories.`;

  // 3. Goal progress (0–20 pts)
  const activeGoals = goals.filter((g) => g.status === "active");
  const avgProgress =
    activeGoals.length > 0
      ? activeGoals.reduce(
          (s, g) => s + Math.min(1, g.currentAmount / (g.targetAmount || 1)),
          0,
        ) / activeGoals.length
      : 0;
  const goalScore = Math.round(avgProgress * 20);
  const goalTip =
    activeGoals.length === 0
      ? "Set financial goals to track your progress."
      : avgProgress >= 0.5
        ? "More than halfway to your goals!"
        : "Keep contributing to your goals regularly.";

  // 4. Debt-to-income (0–15 pts)
  const annualIncome = (income / 3) * 12;
  const dti = annualIncome > 0 ? totalDebt / annualIncome : totalDebt > 0 ? 1 : 0;
  // 0 debt = 15 pts, dti >= 1.5 = 0 pts
  const debtScore = Math.round(Math.max(0, Math.min(15, (1 - dti / 1.5) * 15)));
  const debtTip =
    dti === 0
      ? "Debt-free! Excellent financial position."
      : dti < 0.36
        ? `Debt-to-income ratio is healthy at ${(dti * 100).toFixed(0)}%.`
        : `High debt-to-income ratio (${(dti * 100).toFixed(0)}%). Focus on reducing debt.`;

  // 5. Emergency fund (0–10 pts)
  // Target: 3-6 months of expenses
  const targetEmergencyFund = monthlyExpenses * 3;
  const emergencyRatio =
    targetEmergencyFund > 0
      ? Math.min(1, totalAssets / targetEmergencyFund)
      : totalAssets > 0
        ? 1
        : 0;
  const emergencyScore = Math.round(emergencyRatio * 10);
  const emergencyTip =
    emergencyRatio >= 1
      ? "Emergency fund covers 3+ months of expenses."
      : `Build your emergency fund to cover at least 3 months of expenses (${monthlyExpenses > 0 ? `target: ${Math.round(targetEmergencyFund).toLocaleString()}` : "track your expenses first"}).`;

  const total = savingsScore + budgetScore + goalScore + debtScore + emergencyScore;

  const components: ScoreComponent[] = [
    {
      label: "Savings Rate",
      score: Math.round(savingsScore),
      max: 30,
      tip: savingsTip,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      label: "Budget Adherence",
      score: budgetScore,
      max: 25,
      tip: budgetTip,
      icon: <Target className="h-4 w-4" />,
    },
    {
      label: "Goal Progress",
      score: goalScore,
      max: 20,
      tip: goalTip,
      icon: <Target className="h-4 w-4" />,
    },
    {
      label: "Debt-to-Income",
      score: debtScore,
      max: 15,
      tip: debtTip,
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      label: "Emergency Fund",
      score: emergencyScore,
      max: 10,
      tip: emergencyTip,
      icon: <Landmark className="h-4 w-4" />,
    },
  ];

  return { total, components };
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = Math.PI * radius; // half circle
  const progress = Math.min(1, score / 100);
  const offset = circumference * (1 - progress);

  const color =
    score >= 80
      ? "#22c55e"
      : score >= 60
        ? "#f59e0b"
        : score >= 40
          ? "#f97316"
          : "#ef4444";

  const label =
    score >= 80
      ? "Excellent"
      : score >= 60
        ? "Good"
        : score >= 40
          ? "Fair"
          : "Needs Work";

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Background arc */}
        <path
          d="M 14 70 A 56 56 0 0 1 126 70"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-muted"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 14 70 A 56 56 0 0 1 126 70"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="-mt-6 text-center">
        <div className="text-3xl font-bold" style={{ color }}>
          {score}
        </div>
        <div className="text-xs text-muted-foreground font-medium">{label}</div>
      </div>
    </div>
  );
}

export function FinancialHealthScore(props: HealthScoreProps) {
  const { total, components } = useMemo(() => computeScore(props), [props]);

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-500" />
          Financial Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="shrink-0">
            <ScoreGauge score={total} />
          </div>
          <div className="flex-1 space-y-2 w-full">
            {components.map((c) => (
              <div key={c.label} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {c.icon} {c.label}
                  </span>
                  <span className="font-medium">
                    {c.score}/{c.max}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(c.score / c.max) * 100}%`,
                      backgroundColor:
                        c.score / c.max >= 0.8
                          ? "#22c55e"
                          : c.score / c.max >= 0.5
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{c.tip}</p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
