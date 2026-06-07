"use client";

import { useEffect, useMemo, useState } from "react";
import { useGoalsStore, type Goal } from "@/store/goals-store";
import { useTransactionsStore } from "@/store/transactions-store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trophy,
  Brain,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Flame,
  Rocket,
  Star,
  XCircle,
  Lightbulb,
  Target,
  CircleDollarSign,
  ArrowRight,
  ListOrdered,
  Zap,
  Shield,
  TrendingDown,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return fmt(n);
};

const monthsUntil = (dateStr: string) => {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.max(
    0,
    (target.getFullYear() - now.getFullYear()) * 12 +
      (target.getMonth() - now.getMonth()),
  );
};

function yearsMonths(months: number): string {
  if (months <= 0) return "Overdue";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

// ─── scoring ──────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export interface GoalScore {
  goal: Goal;
  months: number;
  remaining: number;
  progress: number; // 0–100
  suggestedMonthly: number; // remaining / months (simple)
  currentMonthly: number;
  monthlyGap: number;
  onTrack: boolean;
  urgency: "overdue" | "critical" | "near" | "comfortable";
  status: "critical" | "at-risk" | "on-track" | "ahead" | "completed";
  healthScore: number;
  actionSteps: string[];
}

function scoreGoal(goal: Goal): GoalScore {
  const months = monthsUntil(goal.targetDate);
  const corpus = Math.max(0, goal.currentAmount);
  const remaining = Math.max(0, goal.targetAmount - corpus);
  const progress = goal.targetAmount > 0 ? (corpus / goal.targetAmount) * 100 : 0;
  const currentMonthly = goal.monthlyContribution ?? 0;
  const suggestedMonthly = months > 0 ? remaining / months : remaining;
  const monthlyGap = Math.max(0, suggestedMonthly - currentMonthly);
  const onTrack = goal.status === "completed" || (currentMonthly >= suggestedMonthly && months > 0);

  let urgency: GoalScore["urgency"] = "comfortable";
  if (months <= 0) urgency = "overdue";
  else if (months <= 3) urgency = "critical";
  else if (months <= 12) urgency = "near";

  let status: GoalScore["status"] = "on-track";
  if (goal.status === "completed") status = "completed";
  else if (months <= 0 || (urgency === "critical" && !onTrack)) status = "critical";
  else if (!onTrack && monthlyGap > suggestedMonthly * 0.3) status = "at-risk";
  else if (onTrack && progress > 80) status = "ahead";

  const healthScore =
    goal.status === "completed"
      ? 100
      : onTrack
        ? Math.min(100, Math.round(70 + progress * 0.3))
        : Math.max(
            0,
            Math.round(
              progress * 0.4 +
              (months > 0 ? Math.min(40, (months / 60) * 40) : 0) +
              (monthlyGap === 0 ? 20 : Math.max(0, 20 - (monthlyGap / suggestedMonthly) * 20)),
            ),
          );

  const actionSteps = buildActionSteps(goal, months, remaining, suggestedMonthly, currentMonthly, monthlyGap, onTrack, urgency, progress);

  return {
    goal,
    months,
    remaining,
    progress,
    suggestedMonthly,
    currentMonthly,
    monthlyGap,
    onTrack,
    urgency,
    status,
    healthScore,
    actionSteps,
  };
}

function buildActionSteps(
  goal: Goal,
  months: number,
  remaining: number,
  suggestedMonthly: number,
  currentMonthly: number,
  monthlyGap: number,
  onTrack: boolean,
  urgency: GoalScore["urgency"],
  progress: number,
): string[] {
  const steps: string[] = [];

  if (goal.status === "completed") {
    steps.push("Goal achieved! Redirect freed contributions to your next priority.");
    return steps;
  }

  if (months <= 0) {
    steps.push("Deadline has passed — extend the target date or close this goal.");
    steps.push("If you still want this, set a new realistic deadline and restart contributions.");
    return steps;
  }

  if (urgency === "critical") {
    steps.push(`Only ${months} month${months > 1 ? "s" : ""} left — consider a one-time lumpsum to close the ${fmtShort(remaining)} gap.`);
    steps.push("Check liquid savings or short-term FDs you can liquidate.");
    return steps;
  }

  if (onTrack) {
    steps.push(`You are on track. Keep contributing ${fmtShort(currentMonthly)}/mo consistently.`);
    if (progress > 50) steps.push("You are past the halfway mark — don't reduce contributions now.");
    steps.push("Set up an auto-debit so contributions happen before spending.");
    return steps;
  }

  steps.push(`You need ${fmtShort(suggestedMonthly)}/mo to reach this goal in ${yearsMonths(months)}.`);
  if (currentMonthly > 0)
    steps.push(`You are currently contributing ${fmtShort(currentMonthly)}/mo — increase by ${fmtShort(monthlyGap)}/mo.`);
  else
    steps.push(`Start a dedicated monthly contribution of ${fmtShort(suggestedMonthly)}/mo.`);
  steps.push("Auto-debit on salary day ensures contributions happen before expenses.");
  if (months > 24)
    steps.push(`If the monthly amount feels high, extend your deadline by ${Math.ceil(monthlyGap / (suggestedMonthly / months))} months to ease the burden.`);

  return steps;
}

// ─── sort & group ─────────────────────────────────────────────────────────────

function sortedRoadmap(goals: Goal[]): GoalScore[] {
  const scored = goals.map(scoreGoal);
  const active = scored
    .filter((s) => s.status !== "completed")
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.goal.priority] ?? 1;
      const pb = PRIORITY_ORDER[b.goal.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      return a.months - b.months; // more urgent first within same priority
    });
  const done = scored.filter((s) => s.status === "completed");
  return [...active, ...done];
}

// ─── config ────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  critical: {
    label: "Critical",
    dot: "bg-red-500",
    pill: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
    border: "border-l-red-500",
    icon: XCircle,
    bar: "bg-red-500",
  },
  "at-risk": {
    label: "At Risk",
    dot: "bg-orange-500",
    pill: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
    border: "border-l-orange-500",
    icon: AlertTriangle,
    bar: "bg-orange-500",
  },
  "on-track": {
    label: "On Track",
    dot: "bg-blue-500",
    pill: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
    border: "border-l-blue-500",
    icon: TrendingUp,
    bar: "bg-blue-500",
  },
  ahead: {
    label: "Ahead",
    dot: "bg-green-500",
    pill: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400",
    border: "border-l-green-500",
    icon: Rocket,
    bar: "bg-green-500",
  },
  completed: {
    label: "Completed",
    dot: "bg-purple-500",
    pill: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400",
    border: "border-l-purple-500",
    icon: CheckCircle2,
    bar: "bg-purple-500",
  },
};

const PRIORITY_CFG = {
  high: {
    label: "High",
    pill: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800",
    badge: "bg-red-500",
  },
  medium: {
    label: "Medium",
    pill: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800",
    badge: "bg-yellow-500",
  },
  low: {
    label: "Low",
    pill: "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400 border border-gray-200 dark:border-gray-700",
    badge: "bg-gray-400",
  },
};


// ─── FocusGoalHero ─────────────────────────────────────────────────────────────

function FocusGoalHero({ gs }: { gs: GoalScore }) {
  const scfg = STATUS_CFG[gs.status];
  const pcfg = PRIORITY_CFG[gs.goal.priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.medium;
  const StatusIcon = scfg.icon;
  const pct = Math.min(100, gs.progress);

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-card shadow-sm overflow-hidden">
      {/* Top accent bar */}
      <div className="h-1 bg-linear-to-r from-primary via-blue-400 to-purple-500" />

      <div className="p-5 md:p-6 space-y-5">
        {/* Header row */}
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-widest">
                <Flame className="h-3.5 w-3.5" /> Focus Now
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${pcfg.pill}`}>
                {pcfg.label} Priority
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${scfg.pill}`}>
                <StatusIcon className="h-3 w-3" />
                {scfg.label}
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{gs.goal.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" /> {gs.goal.category}
              {gs.months > 0 && (
                <>
                  <span className="text-muted-foreground/40 mx-0.5">·</span>
                  <Clock className="h-3.5 w-3.5" /> {yearsMonths(gs.months)} left
                </>
              )}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold">{pct.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${scfg.bar}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {fmtShort(gs.goal.currentAmount)} saved
            </span>
            <span className="font-semibold text-foreground">
              {fmtShort(gs.goal.targetAmount)} goal
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Remaining",
              value: fmtShort(gs.remaining),
              accent: "text-orange-600 dark:text-orange-400",
              bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900",
            },
            {
              label: "Time Left",
              value: yearsMonths(gs.months),
              accent: gs.months <= 6 ? "text-red-600 dark:text-red-400" : "text-foreground",
              bg: "bg-muted/50 border-border/50",
            },
            {
              label: "Need / Month",
              value: gs.status === "completed" ? "Done" : fmtShort(gs.suggestedMonthly),
              accent: "text-blue-600 dark:text-blue-400",
              bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900",
            },
            {
              label: "Contributing",
              value: gs.currentMonthly > 0 ? fmtShort(gs.currentMonthly) : "—",
              accent: gs.onTrack ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
              bg: "bg-muted/50 border-border/50",
            },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                {s.label}
              </p>
              <p className={`text-base font-bold ${s.accent}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Action steps */}
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5 text-yellow-500" /> What to do now
          </p>
          <div className="space-y-2">
            {gs.actionSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                </div>
                <p className="text-foreground/80 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QueueCard ─────────────────────────────────────────────────────────────────

function QueueCard({
  gs,
  rank,
  open,
  onToggle,
}: {
  gs: GoalScore;
  rank: number;
  open: boolean;
  onToggle: () => void;
}) {
  const scfg = STATUS_CFG[gs.status];
  const pcfg = PRIORITY_CFG[gs.goal.priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.medium;
  const StatusIcon = scfg.icon;
  const pct = Math.min(100, gs.progress);

  return (
    <div className={`rounded-2xl border border-border bg-card shadow-sm border-l-4 ${scfg.border} hover:shadow-md transition-all duration-200`}>
      <button className="w-full text-left px-4 py-3.5" onClick={onToggle}>
        <div className="flex items-center gap-3">
          {/* Rank badge */}
          {gs.status === "completed" ? (
            <div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
              <Trophy className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            </div>
          ) : (
            <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
              {rank}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="font-semibold text-sm truncate">{gs.goal.title}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${pcfg.pill}`}>
                {pcfg.label}
              </span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${scfg.pill}`}>
                <StatusIcon className="h-2.5 w-2.5" />
                {scfg.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${scfg.dot}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                {pct.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-sm font-bold">{fmtShort(gs.goal.targetAmount)}</p>
            <p className="text-[10px] text-muted-foreground">{yearsMonths(gs.months)}</p>
          </div>

          <div className="shrink-0 text-muted-foreground ml-1">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 space-y-4 border-t border-border/60">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Saved", value: fmtShort(gs.goal.currentAmount) },
              { label: "Remaining", value: fmtShort(gs.remaining) },
              { label: "Need / mo", value: gs.status === "completed" ? "—" : fmtShort(gs.suggestedMonthly) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-muted/50 border border-border/50 p-2.5 text-center">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                  {s.label}
                </p>
                <p className="text-sm font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Action steps */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action Plan</p>
            {gs.actionSteps.map((step, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <div className="shrink-0 w-4 h-4 rounded-full bg-muted flex items-center justify-center mt-0.5">
                  <span className="text-[9px] font-bold text-muted-foreground">{i + 1}</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{step}</p>
              </div>
            ))}
          </div>

          {/* Health bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Goal Health</span>
              <span className="font-semibold">{gs.healthScore}/100</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full ${gs.healthScore >= 70 ? "bg-green-500" : gs.healthScore >= 45 ? "bg-orange-500" : "bg-red-500"}`}
                style={{ width: `${gs.healthScore}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function GoalsAnalysisPage() {
  const { goals, loading, fetchGoals } = useGoalsStore();
  const { transactions, fetchTransactions } = useTransactionsStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState("roadmap");

  useEffect(() => {
    fetchGoals();
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { monthlySurplus } = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    const recent = transactions.filter((t) => new Date(t.date) >= cutoff);
    const inc = recent.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const exp = recent.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { monthlySurplus: Math.max(0, (inc - exp) / 3) };
  }, [transactions]);

  const roadmap = useMemo(() => sortedRoadmap(goals), [goals]);

  const focusGoal = roadmap.find((s) => s.status !== "completed") ?? roadmap[0];
  const queueGoals = roadmap.filter((s) => s !== focusGoal);

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const completedCount = roadmap.filter((s) => s.status === "completed").length;
  const criticalCount = roadmap.filter((s) => s.status === "critical").length;
  const avgHealth =
    roadmap.length > 0
      ? Math.round(roadmap.reduce((s, g) => s + g.healthScore, 0) / roadmap.length)
      : 0;

  const healthColor =
    avgHealth >= 70
      ? "text-green-600 dark:text-green-400"
      : avgHealth >= 45
        ? "text-orange-500"
        : "text-red-500";
  const healthBg =
    avgHealth >= 70
      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
      : avgHealth >= 45
        ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
        : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";


  if (loading && goals.length === 0) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Analysing your goals…</p>
        </div>
      </div>
    );
  }

  if (!loading && goals.length === 0) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="text-center space-y-3">
          <Target className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <p className="font-semibold">No goals yet</p>
          <p className="text-sm text-muted-foreground">Create some goals first to get your analysis.</p>
          <Button asChild>
            <a href="/goals">Go to Goals →</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-linear-to-br from-blue-500 to-purple-600 text-white shadow-sm">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Goals Intelligence</h1>
            <p className="text-sm text-muted-foreground">Clear one goal at a time · High priority first</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${healthBg} ${healthColor}`}>
          <Star className="h-3.5 w-3.5" />
          Portfolio Health {avgHealth}/100
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Saved",
            value: fmtShort(totalSaved),
            sub: `of ${fmtShort(totalTarget)}`,
            icon: CircleDollarSign,
            accent: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900",
          },
          {
            label: "Monthly Surplus",
            value: fmtShort(monthlySurplus),
            sub: "avg last 3 months",
            icon: TrendingUp,
            accent: "text-green-600 dark:text-green-400",
            bg: "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900",
          },
          {
            label: "Critical Goals",
            value: String(criticalCount),
            sub: "need immediate action",
            icon: AlertTriangle,
            accent: criticalCount > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
            bg: criticalCount > 0
              ? "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900"
              : "bg-muted/40 border-border/50",
          },
          {
            label: "Completed",
            value: String(completedCount),
            sub: `of ${goals.length} goals`,
            icon: Trophy,
            accent: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900",
          },
        ].map(({ label, value, sub, icon: Icon, accent, bg }) => (
          <div key={label} className={`rounded-2xl border p-4 ${bg}`}>
            <Icon className={`h-4 w-4 mb-2 ${accent}`} />
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold ${accent}`}>{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Overall progress */}
      <div className="rounded-2xl border bg-card p-4 space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold">Overall Portfolio Progress</span>
          <span className="text-sm font-bold">{overallPct.toFixed(1)}%</span>
        </div>
        <Progress value={overallPct} className="h-2.5 rounded-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{fmtShort(totalSaved)} saved</span>
          <span>{fmtShort(totalTarget - totalSaved)} remaining</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto no-scrollbar">
          <TabsList className="h-10 rounded-xl bg-muted p-1 gap-1 flex w-max min-w-full">
            <TabsTrigger value="roadmap" className="rounded-lg text-sm flex items-center gap-1.5 px-4">
              <Flame className="h-3.5 w-3.5" /> Focus
            </TabsTrigger>
            <TabsTrigger value="queue" className="rounded-lg text-sm flex items-center gap-1.5 px-4">
              <ListOrdered className="h-3.5 w-3.5" /> Queue
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg text-sm flex items-center gap-1.5 px-4">
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="strategy" className="rounded-lg text-sm flex items-center gap-1.5 px-4">
              <Brain className="h-3.5 w-3.5" /> Strategy
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Focus tab */}
        <TabsContent value="roadmap" className="mt-5 space-y-4">
          {focusGoal ? (
            <>
              <FocusGoalHero gs={focusGoal} />
              {/* Teaser of what's next */}
              {queueGoals.filter((s) => s.status !== "completed").length > 0 && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/30 text-sm text-muted-foreground">
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    After this, your next goal is{" "}
                    <strong className="text-foreground">
                      {queueGoals.find((s) => s.status !== "completed")?.goal.title}
                    </strong>
                    . Switch to the <strong className="text-foreground">Queue</strong> tab to see the full order.
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-10 w-10 mx-auto mb-3 text-purple-400" />
              <p className="font-semibold">All goals completed!</p>
            </div>
          )}
        </TabsContent>

        {/* Queue tab */}
        <TabsContent value="queue" className="mt-5 space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
            <span className="font-medium">Tackle in this order:</span>
            <span className="text-muted-foreground/60">High priority → then by urgency</span>
          </div>
          {roadmap.map((gs, i) => {
            const isFocus = gs === focusGoal;
            return (
              <div key={gs.goal.id} className="relative">
                {isFocus && (
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
                <QueueCard
                  gs={gs}
                  rank={i + 1}
                  open={expandedId === gs.goal.id}
                  onToggle={() => setExpandedId(expandedId === gs.goal.id ? null : gs.goal.id)}
                />
              </div>
            );
          })}
        </TabsContent>

        {/* Analytics tab */}
        <TabsContent value="analytics" className="mt-5 space-y-5">
          <div className="rounded-2xl border bg-card p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold">Goal Completion Progress</p>
              <p className="text-xs text-muted-foreground mt-0.5">How far each goal is toward its target</p>
            </div>
            <div className="space-y-4">
              {roadmap.map((gs) => {
                const scfg = STATUS_CFG[gs.status];
                const pcfg = PRIORITY_CFG[gs.goal.priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.medium;
                const pct = Math.min(100, gs.progress);
                const barColors: Record<GoalScore["status"], string> = {
                  critical: "#ef4444",
                  "at-risk": "#f97316",
                  "on-track": "#3b82f6",
                  ahead: "#22c55e",
                  completed: "#a855f7",
                };
                return (
                  <div key={gs.goal.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 w-2 h-2 rounded-full ${scfg.dot}`} />
                        <span className="text-sm font-medium truncate">{gs.goal.title}</span>
                        <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${pcfg.pill}`}>
                          {pcfg.label}
                        </span>
                      </div>
                      <span className="shrink-0 text-sm font-bold" style={{ color: barColors[gs.status] }}>
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="relative h-7 rounded-lg bg-muted/50 border border-border/40 overflow-hidden">
                      <div
                        className="h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          background: `linear-gradient(90deg, ${barColors[gs.status]}99, ${barColors[gs.status]})`,
                        }}
                      >
                        {pct > 15 && (
                          <span className="text-[10px] font-bold text-white/90">
                            {fmtShort(gs.goal.currentAmount)}
                          </span>
                        )}
                      </div>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                        {fmtShort(gs.goal.targetAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{gs.status === "completed" ? "Completed" : `${fmtShort(gs.remaining)} remaining`}</span>
                      <span>{gs.status !== "completed" && yearsMonths(gs.months)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scorecard table */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b">
              <p className="text-sm font-semibold">Goal Scorecard</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Goal</th>
                    <th className="px-4 py-3 text-center">Priority</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Saved</th>
                    <th className="px-4 py-3 text-right">Target</th>
                    <th className="px-4 py-3 text-right">Need/mo</th>
                    <th className="px-4 py-3 text-right">Time Left</th>
                    <th className="px-4 py-3 text-right">Health</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roadmap.map((gs) => {
                    const scfg = STATUS_CFG[gs.status];
                    const pcfg = PRIORITY_CFG[gs.goal.priority as keyof typeof PRIORITY_CFG] ?? PRIORITY_CFG.medium;
                    const StatusIcon = scfg.icon;
                    const pct = Math.min(100, gs.progress);
                    return (
                      <tr key={gs.goal.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-sm leading-snug max-w-45 truncate">
                            {gs.goal.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${scfg.dot}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground w-7 text-right shrink-0">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${pcfg.pill}`}>
                            {pcfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${scfg.pill}`}>
                            <StatusIcon className="h-2.5 w-2.5" />
                            {scfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {fmtShort(gs.goal.currentAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {fmtShort(gs.goal.targetAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-medium">
                          {gs.status === "completed" ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            fmtShort(gs.suggestedMonthly)
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                          {gs.status === "completed" ? "Done" : yearsMonths(gs.months)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-15">
                              <div
                                className={`h-full rounded-full ${gs.healthScore >= 70 ? "bg-green-500" : gs.healthScore >= 45 ? "bg-orange-500" : "bg-red-500"}`}
                                style={{ width: `${gs.healthScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold w-6 text-right">{gs.healthScore}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Strategy tab */}
        <TabsContent value="strategy" className="mt-5 space-y-4">
          <div className="rounded-2xl border bg-card p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <p className="font-semibold">Your Personalised Master Plan</p>
            </div>

            {[
              {
                num: 1,
                icon: Flame,
                color: "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400",
                title: "Focus 100% on your highest priority goal",
                body: focusGoal ? (
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p>
                      Your current focus is <strong className="text-foreground">{focusGoal.goal.title}</strong>.
                      {focusGoal.remaining > 0 && (
                        <> You need {fmtShort(focusGoal.remaining)} more and have {yearsMonths(focusGoal.months)} to achieve it.</>
                      )}
                    </p>
                    <p>
                      Suggested monthly contribution:{" "}
                      <strong className="text-foreground">{fmtShort(focusGoal.suggestedMonthly)}/mo</strong>.
                      Do not dilute focus by trying to fund all goals simultaneously.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">All goals completed — outstanding!</p>
                ),
              },
              {
                num: 2,
                icon: ArrowRight,
                color: "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400",
                title: "Complete goals in order — then redirect freed cash",
                body: (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Once a goal is complete, redirect its monthly contribution to the next one — your effective monthly contribution compounds as goals close.
                    </p>
                    {roadmap.filter((s) => s.status !== "completed").slice(0, 4).map((s, i) => (
                      <div key={s.goal.id} className="flex items-center gap-2 text-xs">
                        <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">{i + 1}</span>
                        <span className="font-medium text-foreground">{s.goal.title}</span>
                        <span className="text-muted-foreground">— {fmtShort(s.remaining)} left</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                num: 3,
                icon: Shield,
                color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
                title: "Automate contributions — pay yourself first",
                body: (
                  <p className="text-xs text-muted-foreground">
                    Set up an auto-debit or standing instruction on salary credit day. Money that never hits your spending account never gets spent. Even a small consistent amount beats sporadic large deposits.
                  </p>
                ),
              },
              {
                num: 4,
                icon: TrendingDown,
                color: "bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400",
                title: "Extend deadlines rather than abandoning goals",
                body: (
                  <p className="text-xs text-muted-foreground">
                    If the required monthly for a goal feels unaffordable, extend the deadline by 12–24 months rather than stopping contributions entirely. Momentum matters more than the exact date.
                  </p>
                ),
              },
            ].map(({ num, icon: Icon, color, title, body }) => (
              <div key={num} className="flex gap-4">
                <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="font-semibold text-sm">{title}</p>
                  <div>{body}</div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
