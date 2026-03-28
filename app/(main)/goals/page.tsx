"use client";

import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Circle,
  Loader2,
  Edit,
  Trash2,
  DollarSign,
  Check,
  Flag,
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
import Link from "next/link";

export default function GoalsPage() {
  const { format } = useFormatCurrency();
  const { fire: fireConfetti } = useConfetti();
  const { goals, loading, error, fetchGoals, addGoal, updateGoal, deleteGoal } =
    useGoalsStore();
  const { transactions, fetchTransactions } = useTransactionsStore();
  const { budgets, fetchBudgets } = useBudgetsStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Priority state for forms
  const [addPriority, setAddPriority] = useState<"high" | "medium" | "low">("medium");
  const [editPriority, setEditPriority] = useState<"high" | "medium" | "low">("medium");

  // Transaction dialog
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [transactionGoal, setTransactionGoal] = useState<Goal | null>(null);

  useEffect(() => {
    fetchGoals();
    fetchTransactions();
    fetchBudgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleMarkGoalComplete = async (e: React.MouseEvent, goalId: string) => {
    e.stopPropagation();
    try {
      await updateGoal(goalId, { status: "completed" });
      toast.success("Goal completed!");
      fireConfetti();
    } catch { toast.error("Failed to update goal"); }
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
  const STATUS_ORDER: Record<string, number> = { active: 0, overdue: 1, completed: 2 };
  const sortedGoals = [...goals].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
    if (statusDiff !== 0) return statusDiff;
    return (PRIORITY_ORDER[a.priority ?? "medium"] ?? 1) - (PRIORITY_ORDER[b.priority ?? "medium"] ?? 1);
  });

  const PRIORITY_LABEL: Record<string, string> = { high: "High", medium: "Medium", low: "Low" };
  const PRIORITY_COLOR: Record<string, string> = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  };

  const totalGoals = goals.length;
  const completedGoals = goals.filter(
    (goal) => goal.status === "completed",
  ).length;
  const activeGoals = goals.filter((goal) => goal.status === "active").length;
  const totalTargetAmount = goals.reduce(
    (sum, goal) => sum + goal.targetAmount,
    0,
  );
  const totalCurrentAmount = goals.reduce(
    (sum, goal) => sum + goal.currentAmount,
    0,
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">Goals</p>
              <p className="text-xs text-slate-500">Track your financial goals</p>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
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
                    <Select value={addPriority} onValueChange={(v) => setAddPriority(v as "high" | "medium" | "low")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">
                          <span className="flex items-center gap-1.5">
                            <Flag className="h-3 w-3 text-red-500" /> High — Must achieve first
                          </span>
                        </SelectItem>
                        <SelectItem value="medium">
                          <span className="flex items-center gap-1.5">
                            <Flag className="h-3 w-3 text-amber-500" /> Medium — Important but flexible
                          </span>
                        </SelectItem>
                        <SelectItem value="low">
                          <span className="flex items-center gap-1.5">
                            <Flag className="h-3 w-3 text-blue-500" /> Low — Nice to have
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Higher priority goals appear first and are highlighted in budget planning.</p>
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
              <p className="font-mono text-base font-semibold text-green-400">{completedGoals}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Achieved</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Saved</p>
              <p className="font-mono text-base font-semibold text-slate-200">{format(totalCurrentAmount)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">of {format(totalTargetAmount)}</p>
            </div>
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
              <Select value={editPriority} onValueChange={(v) => setEditPriority(v as "high" | "medium" | "low")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">
                    <span className="flex items-center gap-1.5">
                      <Flag className="h-3 w-3 text-red-500" /> High — Must achieve first
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-1.5">
                      <Flag className="h-3 w-3 text-amber-500" /> Medium — Important but flexible
                    </span>
                  </SelectItem>
                  <SelectItem value="low">
                    <span className="flex items-center gap-1.5">
                      <Flag className="h-3 w-3 text-blue-500" /> Low — Nice to have
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

      <main className="px-4 sm:px-6 lg:px-8 py-4 min-w-0 overflow-x-hidden">
        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Circle className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">No goals yet</p>
            <p className="text-xs text-muted-foreground">Add your first goal to start tracking</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedGoals.map((goal) => {
              const progress = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
              const isCompleted = goal.status === "completed";
              const isOverdue = new Date(goal.targetDate) < new Date() && !isCompleted;
              const probability = calculateGoalProbability(goal);
              const priority = goal.priority ?? "medium";

              // Top accent color by priority / status
              const accentColor = isCompleted
                ? "bg-emerald-500"
                : isOverdue
                  ? "bg-red-500"
                  : priority === "high"
                    ? "bg-rose-500"
                    : priority === "medium"
                      ? "bg-amber-500"
                      : "bg-blue-400";

              // Progress bar color
              const barColor = isCompleted
                ? "bg-emerald-500"
                : isOverdue
                  ? "bg-red-500"
                  : "bg-blue-500";

              // Chance badge color
              const chanceCls =
                isCompleted
                  ? "text-emerald-600 dark:text-emerald-400"
                  : probability.status === "on-track"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : probability.status === "at-risk"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-red-600 dark:text-red-400";

              return (
                <Card
                  key={goal.id}
                  className="relative flex flex-col overflow-hidden cursor-pointer border-border/70 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border"
                  onClick={() => openDetailsModal(goal)}
                >
                  {/* priority / status accent bar */}
                  <div className={`h-0.5 w-full ${accentColor}`} />

                  <CardContent className="flex flex-1 flex-col gap-3 p-4">
                    {/* ── Header ── */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {isCompleted
                            ? <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            : <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                          }
                          <p className="truncate text-sm font-semibold">{goal.title}</p>
                        </div>
                        <p className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                          {goal.category}
                        </p>
                      </div>

                      {/* Priority badge */}
                      {!isCompleted && (
                        <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${PRIORITY_COLOR[priority]}`}>
                          <Flag className="h-2.5 w-2.5" />
                          {PRIORITY_LABEL[priority]}
                        </span>
                      )}
                    </div>

                    {/* ── Amount + progress ── */}
                    <div className="space-y-1.5">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="font-mono text-lg font-bold leading-none">
                            {format(goal.currentAmount)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            of {format(goal.targetAmount)}
                          </p>
                        </div>
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {progress.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* ── Budget link ── */}
                    {(() => {
                      const matchedBudget = budgets.find(
                        (b) => b.category.toLowerCase() === goal.category?.toLowerCase() ||
                               b.category.toLowerCase() === goal.title.toLowerCase()
                      );
                      if (matchedBudget) {
                        const used = matchedBudget.spent_amount || 0;
                        const over = used > matchedBudget.limit_amount;
                        return (
                          <Link
                            href="/budgets"
                            onClick={(e) => e.stopPropagation()}
                            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border w-fit ${over ? "border-red-200 bg-red-50 text-red-600 dark:bg-red-950/30 dark:border-red-900/40 dark:text-red-400" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-400"}`}
                          >
                            <DollarSign className="h-3 w-3" />
                            Budget: {format(used)} / {format(matchedBudget.limit_amount)}
                            {over && " (over!)"}
                          </Link>
                        );
                      }
                      if (!isCompleted) {
                        return (
                          <Link
                            href="/budgets"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/40 hover:text-primary w-fit transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                            Add budget for this goal
                          </Link>
                        );
                      }
                      return null;
                    })()}

                    {/* ── Chance + date ── */}
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`font-semibold ${chanceCls}`}>
                        {isCompleted ? "Completed!" : `${probability.probability.toFixed(0)}% chance`}
                      </span>
                      <span className={`flex items-center gap-1 ${isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                        <Calendar className="h-3 w-3" />
                        {isOverdue ? "Overdue · " : ""}
                        {new Date(goal.targetDate).toLocaleDateString()}
                      </span>
                    </div>

                    {/* ── Actions ── */}
                    <div className="mt-auto flex items-center justify-end gap-1 border-t border-border/50 pt-2.5">
                      {!isCompleted && (
                        <Button
                          variant="default" size="sm"
                          className="h-7 gap-1 bg-emerald-600 px-2 text-[10px] hover:bg-emerald-700"
                          onClick={(e) => { e.stopPropagation(); openAddTransactionDialog(goal); }}
                        >
                          <DollarSign className="h-3 w-3" />
                          Add
                        </Button>
                      )}
                      {!isCompleted && progress >= 100 && (
                        <Button
                          variant="outline" size="sm"
                          className="h-7 px-2 text-emerald-600 border-emerald-600"
                          onClick={(e) => handleMarkGoalComplete(e, goal.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="outline" size="sm" className="h-7 px-2"
                        onClick={(e) => { e.stopPropagation(); openEditDialog(goal); }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline" size="sm" className="h-7 px-2"
                        onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

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
