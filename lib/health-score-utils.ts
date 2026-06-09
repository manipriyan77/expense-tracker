// Shared financial health score scoring functions — used by dashboard and health-score pages

export function scoreSavings(savingsRate: number): number {
  if (savingsRate >= 20) return 25;
  if (savingsRate >= 15) return 20;
  if (savingsRate >= 10) return 15;
  if (savingsRate >= 5) return 10;
  if (savingsRate > 0) return 5;
  return 0;
}

export function scoreBudget(budgetCount: number, underCount: number): number {
  if (budgetCount === 0) return 12;
  const rate = (underCount / budgetCount) * 100;
  if (rate >= 100) return 20;
  if (rate >= 80) return 16;
  if (rate >= 60) return 12;
  if (rate >= 40) return 8;
  if (rate >= 20) return 4;
  return 0;
}

// ratio = liabilities / (assets + liabilities) × 100
export function scoreDebt(hasAssets: boolean, debtRatio: number): number {
  if (!hasAssets) return 12;
  if (debtRatio < 15) return 20;
  if (debtRatio < 25) return 16;
  if (debtRatio < 35) return 12;
  if (debtRatio < 50) return 8;
  if (debtRatio < 67) return 4;
  return 0;
}

export function scoreGoals(avgPct: number | null): number {
  if (avgPct === null) return 8;
  if (avgPct >= 75) return 15;
  if (avgPct >= 50) return 12;
  if (avgPct >= 25) return 9;
  if (avgPct >= 10) return 6;
  return 3;
}

export function scoreInvestments(activeTypes: number): number {
  if (activeTypes >= 3) return 20;
  if (activeTypes >= 2) return 15;
  if (activeTypes >= 1) return 10;
  return 5;
}

export function gradeFromTotal(total: number): string {
  if (total >= 85) return "A";
  if (total >= 70) return "B";
  if (total >= 55) return "C";
  if (total >= 40) return "D";
  return "F";
}

export function gradeLabelFromTotal(total: number): string {
  if (total >= 85) return "Excellent";
  if (total >= 70) return "Good";
  if (total >= 55) return "Fair";
  if (total >= 40) return "Needs Work";
  return "Critical";
}

export function ringColorFromTotal(total: number): string {
  if (total >= 85) return "#22c55e";
  if (total >= 70) return "#10b981";
  if (total >= 55) return "#f59e0b";
  if (total >= 40) return "#f97316";
  return "#ef4444";
}

export function pillarRatioColor(pts: number, max: number): string {
  const r = pts / max;
  if (r >= 0.8) return "text-green-600 dark:text-green-400";
  if (r >= 0.6) return "text-emerald-600 dark:text-emerald-400";
  if (r >= 0.4) return "text-amber-600 dark:text-amber-400";
  if (r >= 0.2) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export function pillarBarColor(pts: number, max: number): string {
  const r = pts / max;
  if (r >= 0.8) return "bg-green-500";
  if (r >= 0.6) return "bg-emerald-500";
  if (r >= 0.4) return "bg-amber-500";
  if (r >= 0.2) return "bg-orange-500";
  return "bg-red-500";
}
