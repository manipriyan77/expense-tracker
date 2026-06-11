"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton, StatsSkeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Edit,
  Trash2,
  Check,
  Flag,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  AlertTriangle,
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
  Trophy,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGoalsStore, Goal } from "@/store/goals-store";
import { useTransactionsStore } from "@/store/transactions-store";
import { useBudgetsStore } from "@/store/budgets-store";
import { goalFormSchema, GoalFormData } from "@/lib/schemas/goal-form-schema";
import GoalDetailsModal from "@/components/goals/GoalDetailsModal";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { toast, Toaster } from "sonner";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { useConfetti } from "@/lib/hooks/useConfetti";

// ─── Goals Intelligence helpers ───────────────────────────────────────────────

const fmtIntelligence = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtShortIntelligence = (n: number) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return fmtIntelligence(n);
};

const monthsUntil = (dateStr: string) => {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.max(0, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
};

function yearsMonths(months: number): string {
  if (months <= 0) return "Overdue";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
}

const PRIORITY_ORDER_INTEL: Record<string, number> = { high: 0, medium: 1, low: 2 };

export interface GoalScore {
  goal: Goal;
  months: number;
  remaining: number;
  progress: number;
  suggestedMonthly: number;
  currentMonthly: number;
  monthlyGap: number;
  onTrack: boolean;
  urgency: "overdue" | "critical" | "near" | "comfortable";
  status: "critical" | "at-risk" | "on-track" | "ahead" | "completed";
  healthScore: number;
  actionSteps: string[];
}

function buildActionSteps(goal: Goal, months: number, remaining: number, suggestedMonthly: number, currentMonthly: number, monthlyGap: number, onTrack: boolean, urgency: GoalScore["urgency"], progress: number): string[] {
  const steps: string[] = [];
  if (goal.status === "completed") { steps.push("Goal achieved! Redirect freed contributions to your next priority."); return steps; }
  if (months <= 0) { steps.push("Deadline has passed — extend the target date or close this goal."); steps.push("If you still want this, set a new realistic deadline and restart contributions."); return steps; }
  if (urgency === "critical") { steps.push(`Only ${months} month${months > 1 ? "s" : ""} left — consider a one-time lumpsum to close the ${fmtShortIntelligence(remaining)} gap.`); steps.push("Check liquid savings or short-term FDs you can liquidate."); return steps; }
  if (onTrack) { steps.push(`You are on track. Keep contributing ${fmtShortIntelligence(currentMonthly)}/mo consistently.`); if (progress > 50) steps.push("You are past the halfway mark — don't reduce contributions now."); steps.push("Set up an auto-debit so contributions happen before spending."); return steps; }
  steps.push(`You need ${fmtShortIntelligence(suggestedMonthly)}/mo to reach this goal in ${yearsMonths(months)}.`);
  if (currentMonthly > 0) steps.push(`You are currently contributing ${fmtShortIntelligence(currentMonthly)}/mo — increase by ${fmtShortIntelligence(monthlyGap)}/mo.`);
  else steps.push(`Start a dedicated monthly contribution of ${fmtShortIntelligence(suggestedMonthly)}/mo.`);
  steps.push("Auto-debit on salary day ensures contributions happen before expenses.");
  if (months > 24) steps.push(`If the monthly amount feels high, extend your deadline by ${Math.ceil(monthlyGap / (suggestedMonthly / months))} months to ease the burden.`);
  return steps;
}

function scoreGoalIntelligence(goal: Goal): GoalScore {
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
  const healthScore = goal.status === "completed" ? 100 : onTrack ? Math.min(100, Math.round(70 + progress * 0.3)) : Math.max(0, Math.round(progress * 0.4 + (months > 0 ? Math.min(40, (months / 60) * 40) : 0) + (monthlyGap === 0 ? 20 : Math.max(0, 20 - (monthlyGap / suggestedMonthly) * 20))));
  const actionSteps = buildActionSteps(goal, months, remaining, suggestedMonthly, currentMonthly, monthlyGap, onTrack, urgency, progress);
  return { goal, months, remaining, progress, suggestedMonthly, currentMonthly, monthlyGap, onTrack, urgency, status, healthScore, actionSteps };
}

function sortedRoadmap(goals: Goal[]): GoalScore[] {
  const scored = goals.map(scoreGoalIntelligence);
  const active = scored.filter((s) => s.status !== "completed").sort((a, b) => {
    const pa = PRIORITY_ORDER_INTEL[a.goal.priority] ?? 1;
    const pb = PRIORITY_ORDER_INTEL[b.goal.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return a.months - b.months;
  });
  return [...active, ...scored.filter((s) => s.status === "completed")];
}

const STATUS_CFG = {
  critical: { label: "Critical", dot: "bg-red-500", pill: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400", border: "border-l-red-500", icon: XCircle, bar: "bg-red-500" },
  "at-risk": { label: "At Risk", dot: "bg-orange-500", pill: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400", border: "border-l-orange-500", icon: AlertTriangle, bar: "bg-orange-500" },
  "on-track": { label: "On Track", dot: "bg-blue-500", pill: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400", border: "border-l-blue-500", icon: TrendingUp, bar: "bg-blue-500" },
  ahead: { label: "Ahead", dot: "bg-green-500", pill: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400", border: "border-l-green-500", icon: Rocket, bar: "bg-green-500" },
  completed: { label: "Completed", dot: "bg-purple-500", pill: "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400", border: "border-l-purple-500", icon: CheckCircle2, bar: "bg-purple-500" },
};

const PRIORITY_CFG_INTEL = {
  high: { label: "High", pill: "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800" },
  medium: { label: "Medium", pill: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800" },
  low: { label: "Low", pill: "bg-gray-100 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400 border border-gray-200 dark:border-gray-700" },
};

function FocusGoalHero({ gs }: { gs: GoalScore }) {
  const scfg = STATUS_CFG[gs.status];
  const pcfg = PRIORITY_CFG_INTEL[gs.goal.priority as keyof typeof PRIORITY_CFG_INTEL] ?? PRIORITY_CFG_INTEL.medium;
  const StatusIcon = scfg.icon;
  const pct = Math.min(100, gs.progress);
  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-card shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-blue-400 to-purple-500" />
      <div className="p-5 md:p-6 space-y-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-widest"><Flame className="h-3.5 w-3.5" /> Focus Now</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${pcfg.pill}`}>{pcfg.label} Priority</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${scfg.pill}`}><StatusIcon className="h-3 w-3" />{scfg.label}</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">{gs.goal.title}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5" /> {gs.goal.category}
              {gs.months > 0 && (<><span className="text-muted-foreground/40 mx-0.5">·</span><Clock className="h-3.5 w-3.5" /> {yearsMonths(gs.months)} left</>)}
            </p>
          </div>
          <div className="text-right shrink-0"><p className="text-3xl font-bold">{pct.toFixed(1)}%</p><p className="text-xs text-muted-foreground mt-0.5">complete</p></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full transition-all duration-700 ${scfg.bar}`} style={{ width: `${pct}%` }} /></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{fmtShortIntelligence(gs.goal.currentAmount)} saved</span><span className="font-semibold text-foreground">{fmtShortIntelligence(gs.goal.targetAmount)} goal</span></div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Remaining", value: fmtShortIntelligence(gs.remaining), accent: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900" },
            { label: "Time Left", value: yearsMonths(gs.months), accent: gs.months <= 6 ? "text-red-600 dark:text-red-400" : "text-foreground", bg: "bg-muted/50 border-border/50" },
            { label: "Need / Month", value: gs.status === "completed" ? "Done" : fmtShortIntelligence(gs.suggestedMonthly), accent: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900" },
            { label: "Contributing", value: gs.currentMonthly > 0 ? fmtShortIntelligence(gs.currentMonthly) : "—", accent: gs.onTrack ? "text-green-600 dark:text-green-400" : "text-muted-foreground", bg: "bg-muted/50 border-border/50" },
          ].map((s) => (<div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}><p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p><p className={`text-base font-bold ${s.accent}`}>{s.value}</p></div>))}
        </div>
        <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5 text-yellow-500" /> What to do now</p>
          <div className="space-y-2">{gs.actionSteps.map((step, i) => (<div key={i} className="flex items-start gap-3 text-sm"><div className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5"><span className="text-[10px] font-bold text-primary">{i + 1}</span></div><p className="text-foreground/80 leading-relaxed">{step}</p></div>))}</div>
        </div>
      </div>
    </div>
  );
}

function QueueCard({ gs, rank, open, onToggle }: { gs: GoalScore; rank: number; open: boolean; onToggle: () => void }) {
  const scfg = STATUS_CFG[gs.status];
  const pcfg = PRIORITY_CFG_INTEL[gs.goal.priority as keyof typeof PRIORITY_CFG_INTEL] ?? PRIORITY_CFG_INTEL.medium;
  const StatusIcon = scfg.icon;
  const pct = Math.min(100, gs.progress);
  return (
    <div className={`rounded-2xl border border-border bg-card shadow-sm border-l-4 ${scfg.border} hover:shadow-md transition-all duration-200`}>
      <button className="w-full text-left px-4 py-3.5" onClick={onToggle}>
        <div className="flex items-center gap-3">
          {gs.status === "completed" ? (<div className="shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center"><Trophy className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /></div>) : (<div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</div>)}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="font-semibold text-sm truncate">{gs.goal.title}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${pcfg.pill}`}>{pcfg.label}</span>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${scfg.pill}`}><StatusIcon className="h-2.5 w-2.5" />{scfg.label}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5"><div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${scfg.dot}`} style={{ width: `${pct}%` }} /></div><span className="text-[10px] font-semibold text-muted-foreground shrink-0">{pct.toFixed(0)}%</span></div>
          </div>
          <div className="shrink-0 text-right"><p className="text-sm font-bold">{fmtShortIntelligence(gs.goal.targetAmount)}</p><p className="text-[10px] text-muted-foreground">{yearsMonths(gs.months)}</p></div>
          <div className="shrink-0 text-muted-foreground ml-1">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 space-y-4 border-t border-border/60">
          <div className="grid grid-cols-3 gap-2.5">{[{ label: "Saved", value: fmtShortIntelligence(gs.goal.currentAmount) }, { label: "Remaining", value: fmtShortIntelligence(gs.remaining) }, { label: "Need / mo", value: gs.status === "completed" ? "—" : fmtShortIntelligence(gs.suggestedMonthly) }].map((s) => (<div key={s.label} className="rounded-xl bg-muted/50 border border-border/50 p-2.5 text-center"><p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">{s.label}</p><p className="text-sm font-bold">{s.value}</p></div>))}</div>
          <div className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action Plan</p>{gs.actionSteps.map((step, i) => (<div key={i} className="flex gap-2 text-xs"><div className="shrink-0 w-4 h-4 rounded-full bg-muted flex items-center justify-center mt-0.5"><span className="text-[9px] font-bold text-muted-foreground">{i + 1}</span></div><p className="text-muted-foreground leading-relaxed">{step}</p></div>))}</div>
          <div className="space-y-1"><div className="flex justify-between text-[10px] text-muted-foreground"><span>Goal Health</span><span className="font-semibold">{gs.healthScore}/100</span></div><div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${gs.healthScore >= 70 ? "bg-green-500" : gs.healthScore >= 45 ? "bg-orange-500" : "bg-red-500"}`} style={{ width: `${gs.healthScore}%` }} /></div></div>
        </div>
      )}
    </div>
  );
}
export default function GoalsPage() {
  const searchParams = useSearchParams();
  const { format } = useFormatCurrency();
  const { fire: fireConfetti } = useConfetti();
  const { goals, loading, error, fetchGoals, addGoal, updateGoal, deleteGoal } =
    useGoalsStore();
  const { transactions, fetchTransactions } = useTransactionsStore();
  const { fetchBudgets } = useBudgetsStore();

  // Tab state — supports ?tab=intelligence deep-link
  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") === "intelligence" ? "intelligence" : "goals");

  // Intelligence tab state
  const [intelExpandedId, setIntelExpandedId] = useState<string | null>(null);
  const [intelTab, setIntelTab] = useState("roadmap");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Priority state for forms
  const [addPriority, setAddPriority] = useState<"high" | "medium" | "low">(
    "medium",
  );
  const [editPriority, setEditPriority] = useState<"high" | "medium" | "low">(
    "medium",
  );

  // Transaction dialog
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [transactionGoal, setTransactionGoal] = useState<Goal | null>(null);

  // Filter + sort
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed" | "overdue">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "high" | "medium" | "low">("all");
  const [sortBy, setSortBy] = useState<"priority" | "progress" | "deadline" | "remaining">("priority");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetchGoals();
    fetchTransactions();
    fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intelligence tab: roadmap (must be before early returns — hook rule)
  const roadmap = useMemo(() => sortedRoadmap(goals), [goals]);

  // Intelligence tab: monthly surplus (avg last 3 months)
  const monthlySurplusIntel = useMemo(() => {
    const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 3);
    const recent = transactions.filter((t) => new Date(t.date) >= cutoff);
    const inc = recent.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const exp = recent.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return Math.max(0, (inc - exp) / 3);
  }, [transactions]);

  // Calculate monthly savings rate from transactions (current month, with fallback to recent months average)
  const monthlySavingsRate = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Current month only
    const monthTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      );
    });
    const income = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    const currentMonthSavings = income - expenses;

    // If we have positive savings this month, use it
    if (currentMonthSavings > 0) return currentMonthSavings;

    // Fallback: average monthly savings over the last 6 months (so probability isn't stuck at 5%)
    const monthsToCheck = 6;
    let totalSavings = 0;
    let monthsWithData = 0;
    for (let i = 0; i < monthsToCheck; i++) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const tx = transactions.filter((t) => {
        const date = new Date(t.date);
        return date.getMonth() === m && date.getFullYear() === y;
      });
      const inc = tx
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const exp = tx
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);
      const savings = inc - exp;
      if (inc > 0 || exp > 0) {
        totalSavings += savings;
        monthsWithData += 1;
      }
    }
    const avgSavings = monthsWithData > 0 ? totalSavings / monthsWithData : 0;
    return avgSavings > 0 ? avgSavings : currentMonthSavings;
  }, [transactions]);

  // Calculate goal completion probability
  const calculateGoalProbability = (
    goal: Goal,
  ): {
    probability: number;
    message: string;
    status: "on-track" | "at-risk" | "unlikely";
  } => {
    if (goal.status === "completed") {
      return { probability: 100, message: "Completed!", status: "on-track" };
    }

    const remaining = goal.targetAmount - goal.currentAmount;
    const targetDate = new Date(goal.targetDate);
    const today = new Date();
    const daysRemaining = Math.ceil(
      (targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const monthsRemaining = daysRemaining / 30;

    if (daysRemaining < 0) {
      return {
        probability: 0,
        message: "Target date has passed",
        status: "unlikely",
      };
    }

    if (remaining <= 0) {
      return {
        probability: 100,
        message: "Goal achieved!",
        status: "on-track",
      };
    }

    // Calculate required monthly savings
    const requiredMonthly =
      monthsRemaining > 0 ? remaining / monthsRemaining : remaining;

    // Use transaction-based monthly savings, or fall back to goal's planned monthly contribution
    const effectiveMonthly =
      monthlySavingsRate > 0
        ? monthlySavingsRate
        : (goal.monthlyContribution ?? 0);

    // Probability based on effective monthly rate vs required rate
    let probability = 0;
    let status: "on-track" | "at-risk" | "unlikely" = "on-track";

    if (effectiveMonthly > 0) {
      if (effectiveMonthly >= requiredMonthly) {
        probability = 95; // Very likely if saving more than needed
        status = "on-track";
      } else {
        // Probability decreases as gap increases
        const ratio = effectiveMonthly / requiredMonthly;
        probability = Math.min(95, Math.max(10, ratio * 80));
        status =
          ratio >= 0.8 ? "on-track" : ratio >= 0.5 ? "at-risk" : "unlikely";
      }
    } else {
      probability = 5; // Very unlikely if not saving
      status = "unlikely";
    }

    const isPlannedOnly =
      monthlySavingsRate <= 0 && (goal.monthlyContribution ?? 0) > 0;
    const currentLabel = isPlannedOnly ? "planned" : "currently";
    const message =
      effectiveMonthly >= requiredMonthly
        ? `On track! Saving ${format(effectiveMonthly)}/month (need ${format(requiredMonthly)})`
        : `Need to save ${format(requiredMonthly)}/month (${currentLabel} ${format(effectiveMonthly)})`;

    return { probability, message, status };
  };

  const addForm = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "",
      targetAmount: 0,
      currentAmount: 0,
      targetDate: "",
      category: "General",
      priority: "medium",
      monthlyContribution: 0,
    },
  });

  const editForm = useForm<GoalFormData>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: "",
      targetAmount: 0,
      currentAmount: 0,
      targetDate: "",
      category: "General",
      priority: "medium",
      monthlyContribution: 0,
    },
  });

  const {
    register: addRegister,
    handleSubmit: handleAddSubmit,
    reset: resetAdd,
    formState: { errors: addErrors, isSubmitting: isAddSubmitting },
  } = addForm;

  const {
    register: editRegister,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = editForm;

  const handleAddGoal = async (data: GoalFormData) => {
    const newGoal = {
      title: data.title,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount || 0,
      targetDate: data.targetDate,
      category: data.category || "General",
      priority: addPriority,
      monthlyContribution: data.monthlyContribution ?? 0,
      status: "active" as const,
    };

    await addGoal(newGoal);
    resetAdd();
    setAddPriority("medium");
    setIsAddDialogOpen(false);
  };

  const handleEditGoal = async (data: GoalFormData) => {
    if (!editingGoalId) return;

    await updateGoal(editingGoalId, {
      title: data.title,
      targetAmount: data.targetAmount,
      currentAmount: data.currentAmount || 0,
      targetDate: data.targetDate,
      category: data.category || "General",
      priority: editPriority,
      monthlyContribution: data.monthlyContribution ?? 0,
    });
    resetEdit();
    setIsEditDialogOpen(false);
    setEditingGoalId(null);
  };

  const handleDeleteGoal = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this goal? This action cannot be undone.",
      )
    ) {
      try {
        await deleteGoal(id);
      } catch (error) {
        // Error is already set in the store and logged
        // Show alert to user
        if (error instanceof Error) {
          alert(error.message);
        }
      }
    }
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setEditPriority(goal.priority ?? "medium");
    resetEdit({
      title: goal.title,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetDate: goal.targetDate,
      category: goal.category,
      priority: goal.priority ?? "medium",
      monthlyContribution: goal.monthlyContribution ?? 0,
    });
    setIsEditDialogOpen(true);
  };

  const openDetailsModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsDetailsModalOpen(true);
  };

  const handleDetailsModalClose = () => {
    setIsDetailsModalOpen(false);
    setSelectedGoal(null);
  };

  const handleTransactionDeleted = () => {
    // Refresh goals to update amounts
    fetchGoals();
  };

  const openAddTransactionDialog = (goal: Goal) => {
    setTransactionGoal(goal);
    setIsAddTransactionOpen(true);
  };

  const handleTransactionSuccess = () => {
    setIsAddTransactionOpen(false);
    setTransactionGoal(null);
    fetchGoals(); // Refresh to update goal amounts
    toast.success("Transaction added successfully!");
  };

  const handleMarkGoalComplete = async (
    e: React.MouseEvent,
    goalId: string,
  ) => {
    e.stopPropagation();
    try {
      await updateGoal(goalId, { status: "completed" });
      toast.success("Goal completed!");
      fireConfetti();
    } catch {
      toast.error("Failed to update goal");
    }
  };

  if (loading && goals.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-slate-900 dark:bg-black px-3 sm:px-6 lg:px-8 pt-4 pb-4">
          <Skeleton className="h-4 w-16 bg-slate-700 mb-2" />
          <Skeleton className="h-3 w-48 bg-slate-800" />
        </div>
        <div className="px-3 sm:px-6 lg:px-8 py-4 space-y-4">
          <StatsSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-2 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchGoals} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const PRIORITY_LABEL: Record<string, string> = { high: "High", medium: "Medium", low: "Low" };
  const PRIORITY_COLOR: Record<string, string> = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;
  const activeGoals = goals.filter((g) => g.status === "active").length;
  const overdueGoals = goals.filter((g) => g.status !== "completed" && new Date(g.targetDate) < new Date()).length;
  const totalTargetAmount = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalCurrentAmount = goals.reduce((s, g) => s + g.currentAmount, 0);
  const totalRequired = goals
    .filter((g) => g.status !== "completed")
    .reduce((s, g) => {
      const months = Math.max(1, Math.ceil((new Date(g.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
      return s + (g.targetAmount - g.currentAmount) / months;
    }, 0);

  // Intelligence tab computed data
  const focusGoal = roadmap.find((s) => s.status !== "completed") ?? roadmap[0];
  const queueGoals = roadmap.filter((s) => s !== focusGoal);
  const totalTargetIntel = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSavedIntel = goals.reduce((s, g) => s + g.currentAmount, 0);
  const overallPctIntel = totalTargetIntel > 0 ? (totalSavedIntel / totalTargetIntel) * 100 : 0;
  const completedCountIntel = roadmap.filter((s) => s.status === "completed").length;
  const criticalCountIntel = roadmap.filter((s) => s.status === "critical").length;
  const avgHealthIntel = roadmap.length > 0 ? Math.round(roadmap.reduce((s, g) => s + g.healthScore, 0) / roadmap.length) : 0;
  const healthColorIntel = avgHealthIntel >= 70 ? "text-green-600 dark:text-green-400" : avgHealthIntel >= 45 ? "text-orange-500" : "text-red-500";
  const healthBgIntel = avgHealthIntel >= 70 ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : avgHealthIntel >= 45 ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800";

  // Per-goal analytics
  const goalAnalytics = (goal: Goal) => {
    const progress = Math.min(100, goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0);
    const isCompleted = goal.status === "completed";
    const daysLeft = Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysLeft < 0 && !isCompleted;
    const monthsLeft = Math.max(0.5, daysLeft / 30);
    const remaining = goal.targetAmount - goal.currentAmount;
    const requiredMonthly = remaining > 0 ? remaining / monthsLeft : 0;
    const priority = goal.priority ?? "medium";

    // Projected completion date at current contribution pace
    const monthly = goal.monthlyContribution ?? 0;
    let projectedDate: Date | null = null;
    let projectedLate = false;
    if (!isCompleted && remaining > 0 && monthly > 0) {
      const monthsNeeded = Math.ceil(remaining / monthly);
      projectedDate = new Date();
      projectedDate.setMonth(projectedDate.getMonth() + monthsNeeded);
      projectedLate = projectedDate > new Date(goal.targetDate);
    }

    // Milestone reached: highest crossed milestone
    const milestones = [75, 50, 25];
    const latestMilestone = milestones.find(m => progress >= m) ?? null;

    return { progress, isCompleted, isOverdue, daysLeft, monthsLeft, remaining, requiredMonthly, priority, projectedDate, projectedLate, latestMilestone };
  };

  // Filtered + sorted goals
  const displayGoals = [...goals]
    .filter((g) => {
      const { isOverdue, isCompleted } = goalAnalytics(g);
      if (filterStatus === "active") return !isCompleted && !isOverdue;
      if (filterStatus === "completed") return isCompleted;
      if (filterStatus === "overdue") return isOverdue;
      return true;
    })
    .filter((g) => filterPriority === "all" || (g.priority ?? "medium") === filterPriority)
    .sort((a, b) => {
      const aA = goalAnalytics(a), bA = goalAnalytics(b);
      const mult = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "priority") return mult * ((PRIORITY_ORDER[aA.priority] ?? 1) - (PRIORITY_ORDER[bA.priority] ?? 1));
      if (sortBy === "progress") return mult * (aA.progress - bA.progress);
      if (sortBy === "deadline") return mult * (aA.daysLeft - bA.daysLeft);
      if (sortBy === "remaining") return mult * (aA.remaining - bA.remaining);
      return 0;
    });

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                Goals
              </p>
              <p className="text-xs text-slate-500">
                Track your financial goals
              </p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Goal
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Goal</DialogTitle>
                  <DialogDescription>
                    Set a new financial goal to track your progress.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={handleAddSubmit(handleAddGoal)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="add-title">Goal Title</Label>
                    <Input
                      id="add-title"
                      placeholder="e.g., Emergency Fund, Vacation"
                      {...addRegister("title")}
                    />
                    {addErrors.title && (
                      <p className="text-sm text-red-600">
                        {addErrors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-targetAmount">Target Amount</Label>
                    <Input
                      id="add-targetAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...addRegister("targetAmount", { valueAsNumber: true })}
                    />
                    {addErrors.targetAmount && (
                      <p className="text-sm text-red-600">
                        {addErrors.targetAmount.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-currentAmount">
                      Current Amount (Optional)
                    </Label>
                    <Input
                      id="add-currentAmount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...addRegister("currentAmount", { valueAsNumber: true })}
                    />
                    {addErrors.currentAmount && (
                      <p className="text-sm text-red-600">
                        {addErrors.currentAmount.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-monthlyContribution">
                      Planned monthly amount (Optional)
                    </Label>
                    <Input
                      id="add-monthlyContribution"
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="e.g. 5000"
                      {...addRegister("monthlyContribution", {
                        valueAsNumber: true,
                      })}
                    />
                    <p className="text-xs text-muted-foreground">
                      How much you plan to save toward this goal each month.
                      Used for &quot;chance&quot; when you don&apos;t have
                      income/expense data.
                    </p>
                    {addErrors.monthlyContribution && (
                      <p className="text-sm text-red-600">
                        {addErrors.monthlyContribution.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-targetDate">Target Date</Label>
                    <Input
                      id="add-targetDate"
                      type="date"
                      {...addRegister("targetDate")}
                    />
                    {addErrors.targetDate && (
                      <p className="text-sm text-red-600">
                        {addErrors.targetDate.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="add-category">Category</Label>
                    <Input
                      id="add-category"
                      placeholder="e.g., Savings, Travel, Education"
                      {...addRegister("category")}
                    />
                    {addErrors.category && (
                      <p className="text-sm text-red-600">
                        {addErrors.category.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={addPriority}
                      onValueChange={(v) =>
                        setAddPriority(v as "high" | "medium" | "low")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">
                          <span className="flex items-center gap-1.5">
                            <Flag className="h-3 w-3 text-red-500" /> High —
                            Must achieve first
                          </span>
                        </SelectItem>
                        <SelectItem value="medium">
                          <span className="flex items-center gap-1.5">
                            <Flag className="h-3 w-3 text-amber-500" /> Medium —
                            Important but flexible
                          </span>
                        </SelectItem>
                        <SelectItem value="low">
                          <span className="flex items-center gap-1.5">
                            <Flag className="h-3 w-3 text-blue-500" /> Low —
                            Nice to have
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Higher priority goals appear first and are highlighted in
                      budget planning.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isAddSubmitting}
                  >
                    {isAddSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding Goal...
                      </>
                    ) : (
                      "Add Goal"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Total Goals</p>
              <p className="font-mono text-base font-semibold text-white">{totalGoals}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">All goals</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Active</p>
              <p className="font-mono text-base font-semibold text-blue-400">{activeGoals}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">In progress</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Completed</p>
              <p className="font-mono text-base font-semibold text-emerald-400">{completedGoals}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Achieved</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Saved</p>
              <p className="font-mono text-base font-semibold text-slate-200">{format(totalCurrentAmount)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">of {format(totalTargetAmount)}</p>
            </div>
          </div>

          {/* Overall progress bar */}
          {totalTargetAmount > 0 && (
            <div className="px-4 py-2 border-t border-slate-700/60">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>Overall progress</span>
                <span className="font-mono">{((totalCurrentAmount / totalTargetAmount) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-700"
                  style={{ width: `${Math.min(100, (totalCurrentAmount / totalTargetAmount) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex border-t border-slate-700/60 mt-1">
            <button
              onClick={() => setActiveTab("goals")}
              className={`px-5 py-2.5 text-xs font-medium transition-colors border-b-2 ${activeTab === "goals" ? "border-blue-400 text-white" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
              Goals
            </button>
            <button
              onClick={() => setActiveTab("intelligence")}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-medium transition-colors border-b-2 ${activeTab === "intelligence" ? "border-purple-400 text-white" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
              <Brain className="h-3 w-3" /> Intelligence
            </button>
          </div>
        </div>
      </div>

      {/* Edit Goal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
            <DialogDescription>
              Update your financial goal details.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleEditSubmit(handleEditGoal)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="edit-title">Goal Title</Label>
              <Input
                id="edit-title"
                placeholder="e.g., Emergency Fund, Vacation"
                {...editRegister("title")}
              />
              {editErrors.title && (
                <p className="text-sm text-red-600">
                  {editErrors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-targetAmount">Target Amount</Label>
              <Input
                id="edit-targetAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...editRegister("targetAmount", { valueAsNumber: true })}
              />
              {editErrors.targetAmount && (
                <p className="text-sm text-red-600">
                  {editErrors.targetAmount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-currentAmount">Current Amount</Label>
              <Input
                id="edit-currentAmount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...editRegister("currentAmount", { valueAsNumber: true })}
              />
              {editErrors.currentAmount && (
                <p className="text-sm text-red-600">
                  {editErrors.currentAmount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-monthlyContribution">
                Planned monthly amount (Optional)
              </Label>
              <Input
                id="edit-monthlyContribution"
                type="number"
                step="0.01"
                min={0}
                placeholder="e.g. 5000"
                {...editRegister("monthlyContribution", {
                  valueAsNumber: true,
                })}
              />
              <p className="text-xs text-muted-foreground">
                How much you plan to save toward this goal each month. Used for
                &quot;chance&quot; when you don&apos;t have income/expense data.
              </p>
              {editErrors.monthlyContribution && (
                <p className="text-sm text-red-600">
                  {editErrors.monthlyContribution.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-targetDate">Target Date</Label>
              <Input
                id="edit-targetDate"
                type="date"
                {...editRegister("targetDate")}
              />
              {editErrors.targetDate && (
                <p className="text-sm text-red-600">
                  {editErrors.targetDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                placeholder="e.g., Savings, Travel, Education"
                {...editRegister("category")}
              />
              {editErrors.category && (
                <p className="text-sm text-red-600">
                  {editErrors.category.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={editPriority}
                onValueChange={(v) =>
                  setEditPriority(v as "high" | "medium" | "low")
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <span className="flex items-center gap-1.5">
                      <Flag className="h-3 w-3 text-red-500" /> High — Must
                      achieve first
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-1.5">
                      <Flag className="h-3 w-3 text-amber-500" /> Medium —
                      Important but flexible
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-1.5">
                      <Flag className="h-3 w-3 text-blue-500" /> Low — Nice to
                      have
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isEditSubmitting}
            >
              {isEditSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating Goal...
                </>
              ) : (
                "Update Goal"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {activeTab === "intelligence" && (
        <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
          {/* Intelligence header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-sm">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Goals Intelligence</h1>
                <p className="text-sm text-muted-foreground">Clear one goal at a time · High priority first</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${healthBgIntel} ${healthColorIntel}`}>
              <Star className="h-3.5 w-3.5" />
              Portfolio Health {avgHealthIntel}/100
            </div>
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Saved", value: fmtShortIntelligence(totalSavedIntel), sub: `of ${fmtShortIntelligence(totalTargetIntel)}`, icon: CircleDollarSign, accent: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900" },
              { label: "Monthly Surplus", value: fmtShortIntelligence(monthlySurplusIntel), sub: "avg last 3 months", icon: TrendingUp, accent: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900" },
              { label: "Critical Goals", value: String(criticalCountIntel), sub: "need immediate action", icon: AlertTriangle, accent: criticalCountIntel > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground", bg: criticalCountIntel > 0 ? "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900" : "bg-muted/40 border-border/50" },
              { label: "Completed", value: String(completedCountIntel), sub: `of ${goals.length} goals`, icon: Trophy, accent: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-100 dark:border-purple-900" },
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
              <span className="text-sm font-bold">{overallPctIntel.toFixed(1)}%</span>
            </div>
            <Progress value={overallPctIntel} className="h-2.5 rounded-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{fmtShortIntelligence(totalSavedIntel)} saved</span>
              <span>{fmtShortIntelligence(totalTargetIntel - totalSavedIntel)} remaining</span>
            </div>
          </div>

          {/* Sub-tabs */}
          <Tabs value={intelTab} onValueChange={setIntelTab}>
            <div className="overflow-x-auto no-scrollbar">
              <TabsList className="h-10 rounded-xl bg-muted p-1 gap-1 flex w-max min-w-full">
                <TabsTrigger value="roadmap" className="rounded-lg text-sm flex items-center gap-1.5 px-4"><Flame className="h-3.5 w-3.5" /> Focus</TabsTrigger>
                <TabsTrigger value="queue" className="rounded-lg text-sm flex items-center gap-1.5 px-4"><ListOrdered className="h-3.5 w-3.5" /> Queue</TabsTrigger>
                <TabsTrigger value="analytics" className="rounded-lg text-sm flex items-center gap-1.5 px-4"><BarChart3 className="h-3.5 w-3.5" /> Analytics</TabsTrigger>
                <TabsTrigger value="strategy" className="rounded-lg text-sm flex items-center gap-1.5 px-4"><Brain className="h-3.5 w-3.5" /> Strategy</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="roadmap" className="mt-5 space-y-4">
              {focusGoal ? (
                <>
                  <FocusGoalHero gs={focusGoal} />
                  {queueGoals.filter((s) => s.status !== "completed").length > 0 && (
                    <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/60 bg-muted/30 text-sm text-muted-foreground">
                      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                      <span>After this, your next goal is <strong className="text-foreground">{queueGoals.find((s) => s.status !== "completed")?.goal.title}</strong>. Switch to <strong className="text-foreground">Queue</strong> tab to see the full order.</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground"><Trophy className="h-10 w-10 mx-auto mb-3 text-purple-400" /><p className="font-semibold">All goals completed!</p></div>
              )}
            </TabsContent>

            <TabsContent value="queue" className="mt-5 space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground pb-1">
                <span className="font-medium">Tackle in this order:</span>
                <span className="text-muted-foreground/60">High priority → then by urgency</span>
              </div>
              {roadmap.map((gs, i) => (
                <QueueCard key={gs.goal.id} gs={gs} rank={i + 1} open={intelExpandedId === gs.goal.id} onToggle={() => setIntelExpandedId(intelExpandedId === gs.goal.id ? null : gs.goal.id)} />
              ))}
            </TabsContent>

            <TabsContent value="analytics" className="mt-5 space-y-5">
              <div className="rounded-2xl border bg-card p-5 space-y-4">
                <div><p className="text-sm font-semibold">Goal Completion Progress</p><p className="text-xs text-muted-foreground mt-0.5">How far each goal is toward its target</p></div>
                <div className="space-y-4">
                  {roadmap.map((gs) => {
                    const scfg = STATUS_CFG[gs.status];
                    const pcfg = PRIORITY_CFG_INTEL[gs.goal.priority as keyof typeof PRIORITY_CFG_INTEL] ?? PRIORITY_CFG_INTEL.medium;
                    const pct = Math.min(100, gs.progress);
                    const barColors: Record<GoalScore["status"], string> = { critical: "#ef4444", "at-risk": "#f97316", "on-track": "#3b82f6", ahead: "#22c55e", completed: "#a855f7" };
                    return (
                      <div key={gs.goal.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`shrink-0 w-2 h-2 rounded-full ${scfg.dot}`} />
                            <span className="text-sm font-medium truncate">{gs.goal.title}</span>
                            <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${pcfg.pill}`}>{pcfg.label}</span>
                          </div>
                          <span className="shrink-0 text-sm font-bold" style={{ color: barColors[gs.status] }}>{pct.toFixed(1)}%</span>
                        </div>
                        <div className="relative h-7 rounded-lg bg-muted/50 border border-border/40 overflow-hidden">
                          <div className="h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, 2)}%`, background: `linear-gradient(90deg, ${barColors[gs.status]}99, ${barColors[gs.status]})` }}>
                            {pct > 15 && <span className="text-[10px] font-bold text-white/90">{fmtShortIntelligence(gs.goal.currentAmount)}</span>}
                          </div>
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{fmtShortIntelligence(gs.goal.targetAmount)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{gs.status === "completed" ? "Completed" : `${fmtShortIntelligence(gs.remaining)} remaining`}</span>
                          <span>{gs.status !== "completed" && yearsMonths(gs.months)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="px-5 py-4 border-b"><p className="text-sm font-semibold">Goal Scorecard</p></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b bg-muted/40 text-[11px] text-muted-foreground uppercase tracking-wider"><th className="px-4 py-3 text-left">Goal</th><th className="px-4 py-3 text-center">Priority</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-right">Saved</th><th className="px-4 py-3 text-right">Target</th><th className="px-4 py-3 text-right">Need/mo</th><th className="px-4 py-3 text-right">Time Left</th><th className="px-4 py-3 text-right">Health</th></tr></thead>
                    <tbody className="divide-y divide-border">
                      {roadmap.map((gs) => {
                        const scfg = STATUS_CFG[gs.status];
                        const pcfg = PRIORITY_CFG_INTEL[gs.goal.priority as keyof typeof PRIORITY_CFG_INTEL] ?? PRIORITY_CFG_INTEL.medium;
                        const StatusIcon = scfg.icon;
                        const pct = Math.min(100, gs.progress);
                        return (
                          <tr key={gs.goal.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3"><p className="font-medium text-sm leading-snug max-w-[180px] truncate">{gs.goal.title}</p><div className="flex items-center gap-2 mt-1.5"><div className="flex-1 h-1 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${scfg.dot}`} style={{ width: `${pct}%` }} /></div><span className="text-[10px] text-muted-foreground w-7 text-right shrink-0">{pct.toFixed(0)}%</span></div></td>
                            <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${pcfg.pill}`}>{pcfg.label}</span></td>
                            <td className="px-4 py-3 text-center"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${scfg.pill}`}><StatusIcon className="h-2.5 w-2.5" />{scfg.label}</span></td>
                            <td className="px-4 py-3 text-right text-xs text-muted-foreground">{fmtShortIntelligence(gs.goal.currentAmount)}</td>
                            <td className="px-4 py-3 text-right text-xs text-muted-foreground">{fmtShortIntelligence(gs.goal.targetAmount)}</td>
                            <td className="px-4 py-3 text-right text-xs font-medium">{gs.status === "completed" ? <span className="text-muted-foreground">—</span> : fmtShortIntelligence(gs.suggestedMonthly)}</td>
                            <td className="px-4 py-3 text-right text-xs text-muted-foreground">{gs.status === "completed" ? "Done" : yearsMonths(gs.months)}</td>
                            <td className="px-4 py-3"><div className="flex items-center gap-2 justify-end"><div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]"><div className={`h-full rounded-full ${gs.healthScore >= 70 ? "bg-green-500" : gs.healthScore >= 45 ? "bg-orange-500" : "bg-red-500"}`} style={{ width: `${gs.healthScore}%` }} /></div><span className="text-xs font-bold w-6 text-right">{gs.healthScore}</span></div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="strategy" className="mt-5 space-y-4">
              <div className="rounded-2xl border bg-card p-5 space-y-5">
                <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" /><p className="font-semibold">Your Personalised Master Plan</p></div>
                {[
                  { num: 1, icon: Flame, color: "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400", title: "Focus 100% on your highest priority goal", body: focusGoal ? (<div className="space-y-2 text-xs text-muted-foreground"><p>Your current focus is <strong className="text-foreground">{focusGoal.goal.title}</strong>.{focusGoal.remaining > 0 && (<> You need {fmtShortIntelligence(focusGoal.remaining)} more and have {yearsMonths(focusGoal.months)} to achieve it.</>)}</p><p>Suggested monthly: <strong className="text-foreground">{fmtShortIntelligence(focusGoal.suggestedMonthly)}/mo</strong>. Don&apos;t dilute focus by funding all goals at once.</p></div>) : (<p className="text-xs text-muted-foreground">All goals completed — outstanding!</p>) },
                  { num: 2, icon: ArrowRight, color: "bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400", title: "Complete goals in order — then redirect freed cash", body: (<div className="space-y-2"><p className="text-xs text-muted-foreground">Once a goal is complete, redirect its monthly contribution to the next one — your effective monthly contribution compounds as goals close.</p>{roadmap.filter((s) => s.status !== "completed").slice(0, 4).map((s, i) => (<div key={s.goal.id} className="flex items-center gap-2 text-xs"><span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold shrink-0">{i + 1}</span><span className="font-medium text-foreground">{s.goal.title}</span><span className="text-muted-foreground">— {fmtShortIntelligence(s.remaining)} left</span></div>))}</div>) },
                  { num: 3, icon: Shield, color: "bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400", title: "Automate contributions — pay yourself first", body: (<p className="text-xs text-muted-foreground">Set up an auto-debit or standing instruction on salary credit day. Money that never hits your spending account never gets spent. Even a small consistent amount beats sporadic large deposits.</p>) },
                  { num: 4, icon: TrendingDown, color: "bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400", title: "Extend deadlines rather than abandoning goals", body: (<p className="text-xs text-muted-foreground">If the required monthly feels unaffordable, extend the deadline by 12–24 months rather than stopping contributions entirely. Momentum matters more than the exact date.</p>) },
                ].map(({ num, icon: Icon, color, title, body }) => (
                  <div key={num} className="flex gap-4">
                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${color}`}><Icon className="h-4 w-4" /></div>
                    <div className="flex-1 space-y-1.5"><p className="font-semibold text-sm">{title}</p><div>{body}</div></div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {activeTab === "goals" && <main className="px-4 sm:px-6 lg:px-8 py-4 min-w-0 overflow-x-hidden space-y-3">
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
              <Circle className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">No goals yet</p>
            <p className="text-xs text-muted-foreground/60">Click &ldquo;New Goal&rdquo; to set your first financial target</p>
          </div>
        ) : (
          <>
            {/* ── Summary strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Total needed/mo", value: format(totalRequired), sub: "across active goals", color: "text-blue-600 dark:text-blue-400", icon: TrendingUp },
                { label: "Total remaining", value: format(totalTargetAmount - totalCurrentAmount), sub: `of ${format(totalTargetAmount)}`, color: "text-amber-600 dark:text-amber-400", icon: Clock },
                { label: "Overdue", value: String(overdueGoals), sub: overdueGoals === 0 ? "All on schedule" : "need attention", color: overdueGoals > 0 ? "text-red-500" : "text-emerald-600", icon: AlertTriangle },
                { label: "Completed", value: `${completedGoals}/${totalGoals}`, sub: `${activeGoals} active`, color: "text-emerald-600 dark:text-emerald-400", icon: CheckCircle },
              ].map(({ label, value, sub, color, icon: Icon }) => (
                <Card key={label} className="px-3 py-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
                    <Icon className={`h-3 w-3 ${color}`} />
                  </div>
                  <p className={`font-mono text-sm font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground">{sub}</p>
                </Card>
              ))}
            </div>

            {/* ── Filter + Sort bar ── */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status filters */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                {(["all", "active", "overdue", "completed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`text-[11px] px-2.5 py-1 rounded-md capitalize transition-colors ${filterStatus === s ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {s === "all" ? `All ${goals.length}` : s === "active" ? `Active ${activeGoals}` : s === "overdue" ? `Overdue ${overdueGoals}` : `Done ${completedGoals}`}
                  </button>
                ))}
              </div>

              {/* Priority filter */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
                {(["all", "high", "medium", "low"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={`text-[11px] px-2.5 py-1 rounded-md capitalize transition-colors ${filterPriority === p ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {p === "all" ? "All priority" : <span className="flex items-center gap-1"><Flag className={`h-2.5 w-2.5 ${p === "high" ? "text-red-500" : p === "medium" ? "text-amber-500" : "text-blue-500"}`} />{PRIORITY_LABEL[p]}</span>}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ArrowUpDown className="h-3 w-3" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-transparent text-[11px] border-none outline-none cursor-pointer"
                >
                  <option value="priority">Priority</option>
                  <option value="progress">Progress</option>
                  <option value="deadline">Deadline</option>
                  <option value="remaining">Remaining</option>
                </select>
                <button
                  onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
                  className="px-1.5 py-0.5 rounded bg-muted hover:bg-border transition-colors font-mono"
                >
                  {sortOrder === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>

            {/* ── Goals list ── */}
            {displayGoals.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No goals match the current filters.</p>
            ) : (
              <Card className="overflow-hidden">
                <div className="divide-y divide-border">
                  {displayGoals.map((goal) => {
                    const { progress, isCompleted, isOverdue, daysLeft, requiredMonthly, priority, projectedDate, projectedLate, latestMilestone } = goalAnalytics(goal);
                    const probability = calculateGoalProbability(goal);
                    const accentColor = isCompleted ? "#10b981" : isOverdue ? "#ef4444" : priority === "high" ? "#f43f5e" : priority === "medium" ? "#f59e0b" : "#60a5fa";
                    const barColor = isCompleted ? "bg-emerald-500" : isOverdue ? "bg-red-400" : progress >= 75 ? "bg-emerald-500" : progress >= 40 ? "bg-blue-500" : "bg-amber-400";
                    const chanceCls = isCompleted ? "text-emerald-600" : probability.status === "on-track" ? "text-emerald-600" : probability.status === "at-risk" ? "text-amber-500" : "text-red-500";
                    const daysCls = isOverdue ? "text-red-500 font-semibold" : daysLeft < 30 ? "text-amber-500 font-semibold" : "text-muted-foreground";
                    const daysLabel = isCompleted ? "Done" : isOverdue ? `${Math.abs(daysLeft)}d late` : daysLeft < 60 ? `${daysLeft}d` : `${Math.ceil(daysLeft / 30)}mo`;

                    return (
                      <div
                        key={goal.id}
                        className="relative px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => openDetailsModal(goal)}
                      >
                        {/* Left accent */}
                        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full" style={{ backgroundColor: accentColor }} />

                        {/* Row 1: icon + title + badges + right stats */}
                        <div className="flex items-center gap-2 ml-1">
                          {/* Status icon */}
                          <div className="shrink-0">
                            {isCompleted
                              ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                              : isOverdue
                                ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                                : <Circle className="h-3.5 w-3.5 text-muted-foreground/25" />}
                          </div>

                          {/* Title + priority */}
                          <p className="text-sm font-medium truncate flex-1 min-w-0">{goal.title}</p>
                          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold ${isCompleted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : isOverdue ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : PRIORITY_COLOR[priority]}`}>
                            {isCompleted ? "Done" : isOverdue ? "Overdue" : PRIORITY_LABEL[priority]}
                          </span>

                          {/* Right: saved/target + days */}
                          <div className="shrink-0 text-right hidden sm:block ml-2">
                            <span className="font-mono text-xs font-semibold tabular-nums">{format(goal.currentAmount)}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums"> / {format(goal.targetAmount)}</span>
                          </div>
                          <div className={`shrink-0 text-right hidden md:flex flex-col items-end ml-3 min-w-14`}>
                            <span className={`text-xs font-semibold tabular-nums ${daysCls}`}>{daysLabel}</span>
                            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              {new Date(goal.targetDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                            </span>
                          </div>
                          {!isCompleted && (
                            <div className="shrink-0 text-right hidden lg:block ml-3 min-w-20">
                              <p className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums">{format(requiredMonthly)}<span className="text-[9px] font-normal text-muted-foreground">/mo</span></p>
                              <p className="text-[9px] text-muted-foreground">needed</p>
                            </div>
                          )}
                        </div>

                        {/* Row 2: progress bar + on-track + actions */}
                        <div className="flex items-center gap-2 mt-2 ml-1" onClick={(e) => e.stopPropagation()}>
                          {/* Progress bar */}
                          <div className="flex-1 relative h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${progress}%` }} />
                            {[25, 50, 75].map(m => (
                              <div key={m} className="absolute inset-y-0 w-px bg-background/50" style={{ left: `${m}%` }} />
                            ))}
                          </div>
                          <span className={`text-[10px] font-mono font-bold tabular-nums shrink-0 ${chanceCls}`}>{progress.toFixed(0)}%</span>
                          <span className={`text-[10px] shrink-0 hidden sm:inline ${chanceCls}`}>
                            {isCompleted ? "Achieved!" : `${probability.probability.toFixed(0)}% on-track`}
                          </span>
                          {/* Milestone badge */}
                          {latestMilestone !== null && !isCompleted && (
                            <span className="shrink-0 hidden sm:inline px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary">
                              {latestMilestone}%+
                            </span>
                          )}
                          {/* Projected date */}
                          {projectedDate && !isCompleted && (
                            <span className={`shrink-0 hidden lg:inline text-[9px] font-mono ${projectedLate ? "text-amber-500" : "text-emerald-500"}`}>
                              {projectedLate ? "⚠ " : "✓ "}proj {projectedDate.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}
                            </span>
                          )}

                          {/* Actions */}
                          <div className="shrink-0 flex items-center gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                            {!isCompleted && (
                              <Button size="sm" className="h-6 px-2 text-[11px] gap-1"
                                onClick={(e) => { e.stopPropagation(); openAddTransactionDialog(goal); }}>
                                <Plus className="h-2.5 w-2.5" />Contribute
                              </Button>
                            )}
                            {!isCompleted && progress >= 100 && (
                              <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-emerald-600 border-emerald-500"
                                onClick={(e) => { e.stopPropagation(); handleMarkGoalComplete(e, goal.id); }}>
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                              onClick={(e) => { e.stopPropagation(); openEditDialog(goal); }}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                              onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}
      </main>}

      {/* Goal Details Modal */}
      <GoalDetailsModal
        goal={selectedGoal}
        isOpen={isDetailsModalOpen}
        onClose={handleDetailsModalClose}
        onTransactionDeleted={handleTransactionDeleted}
      />

      {/* Add Transaction Dialog */}
      <Dialog
        open={isAddTransactionOpen}
        onOpenChange={setIsAddTransactionOpen}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Add a transaction for goal: {transactionGoal?.title}
            </DialogDescription>
          </DialogHeader>
          {isAddTransactionOpen && transactionGoal && (
            <AddTransactionForm
              onSuccess={handleTransactionSuccess}
              onCancel={() => setIsAddTransactionOpen(false)}
              initialValues={{
                type: "expense",
                category: "Savings",
                subtype: "Goal Savings",
                goalId: transactionGoal.id,
                description: `Contribution to ${transactionGoal.title}`,
              }}
              contextInfo={{
                source: "goal",
                sourceName: transactionGoal.title,
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Toaster position="top-right" />
    </div>
  );
}
