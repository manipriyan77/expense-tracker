"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Plus,
  Repeat,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Pause,
  Play,
  Trash2,
  Zap,
  Lightbulb,
  CheckCircle2,
  Loader2,
  Receipt,
  AlertCircle,
  Clock,
  Pencil,
} from "lucide-react";
import type { Transaction } from "@/store/transactions-store";
import {
  useRecurringPatternsStore,
  type RecurringPattern,
} from "@/store/recurring-patterns-store";
import { useTransactionsStore } from "@/store/transactions-store";
import { useGoalsStore } from "@/store/goals-store";
import { useBudgetsStore } from "@/store/budgets-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

export default function RecurringPage() {
  const { format } = useFormatCurrency();
  const {
    patterns,
    loading,
    fetchPatterns,
    addPattern,
    updatePattern,
    deletePattern,
    createTransaction,
  } = useRecurringPatternsStore();
  const { transactions: allTransactions, fetchTransactions } =
    useTransactionsStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { budgets, fetchBudgets } = useBudgetsStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<RecurringPattern | null>(
    null,
  );
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [creatingTransaction, setCreatingTransaction] = useState<string | null>(
    null,
  );
  const [editFormData, setEditFormData] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    amount: "",
    description: "",
    category: "",
    subtype: "",
    frequency: "monthly" as
      | "daily"
      | "weekly"
      | "biweekly"
      | "monthly"
      | "quarterly"
      | "yearly",
    day_of_month: "" as string | number,
    start_date: "",
    end_date: "",
    auto_create: false,
    linked_goal_id: "",
    linked_budget_id: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    amount: "",
    description: "",
    category: "",
    subtype: "",
    frequency: "monthly" as
      | "daily"
      | "weekly"
      | "biweekly"
      | "monthly"
      | "quarterly"
      | "yearly",
    day_of_month: "" as string | number, // 1-31 for monthly; empty = use start date day
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    auto_create: false,
    linked_goal_id: "",
    linked_budget_id: "",
  });

  useEffect(() => {
    fetchPatterns();
    fetchTransactions();
    fetchGoals();
    fetchBudgets();
  }, [fetchPatterns, fetchTransactions, fetchGoals, fetchBudgets]);

  // Smart detection: Find potential recurring transactions
  const potentialRecurring = useMemo(() => {
    const potential: Array<{
      description: string;
      category: string;
      amount: number;
      count: number;
      frequency: string;
    }> = [];
    const grouped = new Map<
      string,
      { transactions: Transaction[]; amounts: number[] }
    >();

    // Group transactions by description and category
    allTransactions.forEach((t: Transaction) => {
      const key = `${t.description.toLowerCase()}_${t.category}`;
      if (!grouped.has(key)) {
        grouped.set(key, { transactions: [], amounts: [] });
      }
      const group = grouped.get(key)!;
      group.transactions.push(t);
      group.amounts.push(t.amount);
    });

    // Find groups with 3+ occurrences (likely recurring)
    grouped.forEach((group) => {
      if (group.transactions.length >= 3) {
        const avgAmount =
          group.amounts.reduce((a, b) => a + b, 0) / group.amounts.length;
        const dates = group.transactions
          .map((t: Transaction) => new Date(t.date).getTime())
          .sort((a, b) => a - b);

        // Detect frequency
        let frequency = "monthly";
        if (dates.length >= 2) {
          const avgDaysBetween =
            (dates[dates.length - 1] - dates[0]) / (dates.length - 1);
          if (avgDaysBetween <= 2) frequency = "daily";
          else if (avgDaysBetween <= 9) frequency = "weekly";
          else if (avgDaysBetween <= 18) frequency = "biweekly";
          else if (avgDaysBetween <= 35) frequency = "monthly";
          else if (avgDaysBetween <= 100) frequency = "quarterly";
          else frequency = "yearly";
        }

        potential.push({
          description: group.transactions[0].description,
          category: group.transactions[0].category,
          amount: avgAmount,
          count: group.transactions.length,
          frequency,
        });
      }
    });

    return potential.slice(0, 5); // Top 5 potential recurring
  }, [allTransactions]);

  // Upcoming recurring transactions (due in next 7 days)
  const upcomingRecurring = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    return patterns
      .filter((p) => p.is_active)
      .map((p) => {
        const nextDate = new Date(p.next_date);
        return {
          ...p,
          daysUntil: Math.ceil(
            (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
          ),
        };
      })
      .filter((p) => p.daysUntil >= 0 && p.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [patterns]);

  const handleAddCustomCategory = () => {
    if (newCategoryName.trim()) {
      const trimmedName = newCategoryName.trim();
      const allCategories = [
        "Salary",
        "Bills",
        "Subscriptions",
        "Food",
        "Transportation",
        "Entertainment",
        "Healthcare",
        "Other",
        ...customCategories,
      ];
      if (!allCategories.includes(trimmedName)) {
        setCustomCategories([...customCategories, trimmedName]);
        setFormData({ ...formData, category: trimmedName });
      }
      setNewCategoryName("");
      setShowCategoryInput(false);
    }
  };

  // First occurrence for monthly + day_of_month: that day in start month or next month
  const getFirstMonthlyNextDate = (
    startDateStr: string,
    dayOfMonth: number,
  ) => {
    const d = new Date(startDateStr + "T12:00:00");
    const startDay = d.getDate();
    if (startDay <= dayOfMonth) {
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(dayOfMonth, lastDay));
    } else {
      d.setMonth(d.getMonth() + 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(dayOfMonth, lastDay));
    }
    return d.toISOString().split("T")[0];
  };

  const handleAddTransaction = async () => {
    if (
      !formData.amount ||
      !formData.description ||
      !formData.category ||
      !formData.name
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const dayOfMonth =
      formData.frequency === "monthly" && formData.day_of_month !== ""
        ? Math.min(31, Math.max(1, Number(formData.day_of_month) || 0))
        : null;
    const nextDateStr =
      formData.frequency === "monthly" && dayOfMonth != null
        ? getFirstMonthlyNextDate(formData.start_date, dayOfMonth)
        : new Date(formData.start_date).toISOString().split("T")[0];

    try {
      await addPattern({
        name: formData.name,
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        subtype: formData.subtype || "Other",
        frequency: formData.frequency,
        day_of_month: dayOfMonth,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        next_date: nextDateStr,
        is_active: true,
        auto_create: formData.auto_create,
        linked_goal_id: formData.linked_goal_id || null,
        linked_budget_id: formData.linked_budget_id || null,
        tags: [],
        notes: null,
      });
      toast.success("Recurring pattern added successfully!");
      setFormData({
        name: "",
        type: "expense",
        amount: "",
        description: "",
        category: "",
        subtype: "",
        frequency: "monthly",
        day_of_month: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        auto_create: false,
        linked_goal_id: "",
        linked_budget_id: "",
      });
      setIsAddDialogOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to add recurring pattern",
      );
    }
  };

  const handleCreateTransaction = async (patternId: string) => {
    setCreatingTransaction(patternId);
    try {
      await createTransaction(patternId);
      await fetchTransactions();
      toast.success("Transaction created successfully!");
    } catch {
      toast.error("Failed to create transaction");
    } finally {
      setCreatingTransaction(null);
    }
  };

  const toggleActive = async (id: string) => {
    const pattern = patterns.find((p) => p.id === id);
    if (!pattern) return;
    try {
      await updatePattern(id, { is_active: !pattern.is_active });
      toast.success(`Pattern ${!pattern.is_active ? "activated" : "paused"}`);
    } catch {
      toast.error("Failed to update pattern");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this recurring pattern?"))
      return;
    try {
      await deletePattern(id);
      toast.success("Pattern deleted successfully");
    } catch {
      toast.error("Failed to delete pattern");
    }
  };

  const handleOpenEdit = (pattern: RecurringPattern) => {
    setEditingPattern(pattern);
    setEditFormData({
      name: pattern.name,
      type: pattern.type,
      amount: String(pattern.amount),
      description: pattern.description,
      category: pattern.category,
      subtype: pattern.subtype || "",
      frequency: pattern.frequency,
      day_of_month: pattern.day_of_month ?? "",
      start_date: pattern.start_date,
      end_date: pattern.end_date || "",
      auto_create: pattern.auto_create,
      linked_goal_id: pattern.linked_goal_id || "",
      linked_budget_id: pattern.linked_budget_id || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdatePattern = async () => {
    if (
      !editingPattern ||
      !editFormData.amount ||
      !editFormData.description ||
      !editFormData.category ||
      !editFormData.name
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    const dayOfMonth =
      editFormData.frequency === "monthly" && editFormData.day_of_month !== ""
        ? Math.min(31, Math.max(1, Number(editFormData.day_of_month) || 0))
        : null;
    try {
      await updatePattern(editingPattern.id, {
        name: editFormData.name,
        type: editFormData.type,
        amount: parseFloat(editFormData.amount),
        description: editFormData.description,
        category: editFormData.category,
        subtype: editFormData.subtype || "Other",
        frequency: editFormData.frequency,
        day_of_month: dayOfMonth,
        start_date: editFormData.start_date,
        end_date: editFormData.end_date || null,
        auto_create: editFormData.auto_create,
        linked_goal_id: editFormData.linked_goal_id || null,
        linked_budget_id: editFormData.linked_budget_id || null,
      });
      toast.success("Pattern updated successfully!");
      setIsEditDialogOpen(false);
      setEditingPattern(null);
    } catch {
      toast.error("Failed to update pattern");
    }
  };

  const handleSmartDetect = async (
    potential: (typeof potentialRecurring)[0],
  ) => {
    try {
      const nextDate = new Date();
      const validFrequencies: RecurringPattern["frequency"][] = [
        "daily",
        "weekly",
        "biweekly",
        "monthly",
        "quarterly",
        "yearly",
      ];
      const frequency = validFrequencies.includes(
        potential.frequency as RecurringPattern["frequency"],
      )
        ? (potential.frequency as RecurringPattern["frequency"])
        : "monthly";

      await addPattern({
        name: potential.description,
        type: "expense",
        amount: potential.amount,
        description: potential.description,
        category: potential.category,
        subtype: "Other",
        frequency,
        start_date: new Date().toISOString().split("T")[0],
        end_date: null,
        next_date: nextDate.toISOString().split("T")[0],
        is_active: true,
        auto_create: false,
        tags: [],
        notes: `Auto-detected from ${potential.count} transactions`,
      });
      toast.success("Recurring pattern created from detection!");
    } catch {
      toast.error("Failed to create pattern");
    }
  };

  // Bills tab logic
  const bills = useMemo(
    () => patterns.filter((p) => p.type === "expense" && p.is_active),
    [patterns],
  );
  const [payingId, setPayingId] = useState<string | null>(null);

  const billsToday = new Date();
  billsToday.setHours(0, 0, 0, 0);
  const billsSevenDaysLater = new Date(billsToday);
  billsSevenDaysLater.setDate(billsToday.getDate() + 7);

  const overdueBills = bills.filter(
    (b) => b.next_date && new Date(b.next_date) < billsToday,
  );
  const upcomingBills = bills.filter((b) => {
    if (!b.next_date) return false;
    const d = new Date(b.next_date);
    return d >= billsToday && d <= billsSevenDaysLater;
  });
  const allBills = [...bills].sort((a, b) =>
    (a.next_date || "").localeCompare(b.next_date || ""),
  );

  const monthlyBillsTotal = useMemo(() => {
    return bills.reduce((sum, b) => {
      switch (b.frequency) {
        case "daily":
          return sum + b.amount * 30;
        case "weekly":
          return sum + b.amount * 4.33;
        case "biweekly":
          return sum + b.amount * 2.17;
        case "monthly":
          return sum + b.amount;
        case "quarterly":
          return sum + b.amount / 3;
        case "yearly":
          return sum + b.amount / 12;
        default:
          return sum + b.amount;
      }
    }, 0);
  }, [bills]);

  const paidThisMonth = useMemo(() => {
    const now = new Date();
    return bills.filter((b) => {
      if (!b.next_date) return false;
      const d = new Date(b.next_date);
      return (
        d.getMonth() > now.getMonth() || d.getFullYear() > now.getFullYear()
      );
    }).length;
  }, [bills]);

  const handlePayNow = async (id: string, name: string) => {
    setPayingId(id);
    try {
      await createTransaction(id);
      toast.success(`${name} marked as paid!`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to record payment",
      );
    } finally {
      setPayingId(null);
    }
  };

  const getDaysLabel = (nextDate: string) => {
    const d = new Date(nextDate);
    const diff = Math.ceil(
      (d.getTime() - billsToday.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff < 0)
      return { label: `${Math.abs(diff)}d overdue`, color: "text-red-600" };
    if (diff === 0) return { label: "Due today", color: "text-orange-600" };
    if (diff <= 7) return { label: `Due in ${diff}d`, color: "text-amber-600" };
    return { label: `Due in ${diff}d`, color: "text-muted-foreground" };
  };

  const frequencyLabel: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  };

  const activePatterns = patterns.filter((p) => p.is_active);
  const totalMonthlyIncome = activePatterns
    .filter(
      (p) =>
        p.type === "income" &&
        (p.frequency === "monthly" || p.frequency === "biweekly"),
    )
    .reduce((sum, p) => {
      const multiplier = p.frequency === "biweekly" ? 2 : 1;
      return sum + p.amount * multiplier;
    }, 0);
  const totalMonthlyExpenses = activePatterns
    .filter(
      (p) =>
        p.type === "expense" &&
        (p.frequency === "monthly" || p.frequency === "biweekly"),
    )
    .reduce((sum, p) => {
      const multiplier = p.frequency === "biweekly" ? 2 : 1;
      return sum + p.amount * multiplier;
    }, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-0">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
              Recurring & Bills
            </p>
            <p className="text-xs text-slate-500">
              Manage recurring patterns and track upcoming bills
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Monthly Income
              </p>
              <p className="font-mono text-base font-semibold text-green-400">
                {format(totalMonthlyIncome)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                From recurring sources
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Monthly Expenses
              </p>
              <p className="font-mono text-base font-semibold text-red-400">
                {format(totalMonthlyExpenses)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                From recurring bills
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Net Monthly
              </p>
              <p
                className={`font-mono text-base font-semibold ${totalMonthlyIncome - totalMonthlyExpenses >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {format(totalMonthlyIncome - totalMonthlyExpenses)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Expected balance change
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-3">
        <Tabs defaultValue="recurring" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recurring">Recurring Patterns</TabsTrigger>
            <TabsTrigger value="bills">
              Bills & Subscriptions
              {overdueBills.length > 0 && (
                <span className="ml-1.5 rounded-full bg-red-500 text-white text-[10px] px-1.5 py-0.5 leading-none">
                  {overdueBills.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recurring" className="space-y-4 mt-0">
            {/* Upcoming Recurring Transactions */}
            {upcomingRecurring.length > 0 && (
              <Card className="mb-4 border-blue-200 bg-blue-50">
                <CardHeader className="p-2 pb-1">
                  <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Upcoming This Week
                  </CardTitle>
                  <CardDescription>
                    Recurring transactions due in the next 7 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {upcomingRecurring.map((pattern) => (
                      <div
                        key={pattern.id}
                        className="flex items-center justify-between border-b border-border/40 last:border-0 py-2.5"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">
                              {pattern.description}
                            </p>
                            <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                              {pattern.daysUntil === 0
                                ? "Due today"
                                : pattern.daysUntil === 1
                                  ? "Tomorrow"
                                  : `${pattern.daysUntil}d`}
                            </span>
                          </div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                            {pattern.category} •{" "}
                            <span className="font-mono font-semibold normal-case tracking-normal">
                              {format(pattern.amount)}
                            </span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCreateTransaction(pattern.id)}
                          disabled={creatingTransaction === pattern.id}
                        >
                          {creatingTransaction === pattern.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Post Now
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Add Button */}
            <div className="mb-6 flex gap-2">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Recurring Pattern
                  </Button>
                </DialogTrigger>
                <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
                  <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6 pb-2 pr-14 text-left">
                    <DialogTitle>Add Recurring Transaction</DialogTitle>
                    <DialogDescription>
                      Set up automatic income or expense tracking. You can set
                      an end date so it repeats until a specific date.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-2">
                    <div className="space-y-4 pb-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Pattern Name *</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Monthly Rent"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value: "income" | "expense") =>
                            setFormData({
                              ...formData,
                              type: value,
                              linked_budget_id:
                                value === "income"
                                  ? ""
                                  : formData.linked_budget_id,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.amount}
                          onChange={(e) =>
                            setFormData({ ...formData, amount: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Input
                          id="description"
                          placeholder="e.g., Monthly Rent Payment"
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subtype">Subtype</Label>
                        <Input
                          id="subtype"
                          placeholder="Optional subtype"
                          value={formData.subtype}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              subtype: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        {showCategoryInput ? (
                          <div className="flex space-x-2">
                            <Input
                              value={newCategoryName}
                              onChange={(e) =>
                                setNewCategoryName(e.target.value)
                              }
                              placeholder="Enter category name"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddCustomCategory();
                                } else if (e.key === "Escape") {
                                  setShowCategoryInput(false);
                                  setNewCategoryName("");
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleAddCustomCategory}
                              disabled={!newCategoryName.trim()}
                            >
                              Add
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowCategoryInput(false);
                                setNewCategoryName("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={formData.category}
                            onValueChange={(value) => {
                              if (value === "add_custom") {
                                setShowCategoryInput(true);
                              } else {
                                setFormData({ ...formData, category: value });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Salary">Salary</SelectItem>
                              <SelectItem value="Bills">Bills</SelectItem>
                              <SelectItem value="Subscriptions">
                                Subscriptions
                              </SelectItem>
                              <SelectItem value="Food">Food</SelectItem>
                              <SelectItem value="Transportation">
                                Transportation
                              </SelectItem>
                              <SelectItem value="Entertainment">
                                Entertainment
                              </SelectItem>
                              <SelectItem value="Healthcare">
                                Healthcare
                              </SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                              {customCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
                              <SelectItem
                                value="add_custom"
                                className="text-blue-600 font-medium border-t mt-1 pt-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <Plus className="h-4 w-4" />
                                  <span>Add Category</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="frequency">Frequency</Label>
                        <Select
                          value={formData.frequency}
                          onValueChange={(
                            value:
                              | "daily"
                              | "weekly"
                              | "biweekly"
                              | "monthly"
                              | "quarterly"
                              | "yearly",
                          ) => setFormData({ ...formData, frequency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="biweekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.frequency === "monthly" && (
                        <div className="space-y-2">
                          <Label htmlFor="day_of_month">
                            Day of month (e.g. 15 = every 15th)
                          </Label>
                          <Select
                            value={
                              formData.day_of_month === ""
                                ? "same"
                                : String(formData.day_of_month)
                            }
                            onValueChange={(value) =>
                              setFormData({
                                ...formData,
                                day_of_month:
                                  value === "same" ? "" : Number(value),
                              })
                            }
                          >
                            <SelectTrigger id="day_of_month">
                              <SelectValue placeholder="Pick a day" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="same">
                                Same as start date
                              </SelectItem>
                              {Array.from({ length: 31 }, (_, i) => {
                                const d = i + 1;
                                const ord =
                                  d === 1 || d === 21 || d === 31
                                    ? "st"
                                    : d === 2 || d === 22
                                      ? "nd"
                                      : d === 3 || d === 23
                                        ? "rd"
                                        : "th";
                                return (
                                  <SelectItem key={d} value={String(d)}>
                                    {d}
                                    {ord}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.start_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              start_date: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end_date">
                          End Date (optional – repeats until this date)
                        </Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              end_date: e.target.value,
                            })
                          }
                          min={formData.start_date}
                        />
                      </div>

                      {formData.type === "expense" && budgets.length > 0 && (
                        <div className="space-y-2">
                          <Label>Link to budget (optional)</Label>
                          <Select
                            value={formData.linked_budget_id || "none"}
                            onValueChange={(v) =>
                              setFormData({
                                ...formData,
                                linked_budget_id: v === "none" ? "" : v,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Auto-match by category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                Auto-match by category
                              </SelectItem>
                              {budgets.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                  {b.category}
                                  {b.subtype ? ` · ${b.subtype}` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Generated transactions use this budget. If unset, a
                            matching budget is chosen from category/subtype.
                          </p>
                        </div>
                      )}

                      {goals.filter((g) => g.status === "active").length >
                        0 && (
                        <div className="space-y-2">
                          <Label>Link to Goal (optional)</Label>
                          <Select
                            value={formData.linked_goal_id || "none"}
                            onValueChange={(v) =>
                              setFormData({
                                ...formData,
                                linked_goal_id: v === "none" ? "" : v,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="No goal linked" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                No goal linked
                              </SelectItem>
                              {goals
                                .filter((g) => g.status === "active")
                                .map((g) => (
                                  <SelectItem key={g.id} value={g.id}>
                                    {g.title}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            When auto-created, this transaction will contribute
                            to the selected goal.
                          </p>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="auto_create"
                          checked={formData.auto_create}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, auto_create: checked })
                          }
                        />
                        <Label htmlFor="auto_create" className="cursor-pointer">
                          Auto-create transactions (experimental)
                        </Label>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 border-t bg-background px-6 py-4">
                    <Button
                      onClick={handleAddTransaction}
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? "Adding..." : "Add Pattern"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
                <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6 pb-2 pr-14 text-left">
                  <DialogTitle>Edit Recurring Pattern</DialogTitle>
                  <DialogDescription>
                    Update the details of this recurring transaction.
                  </DialogDescription>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-2">
                  <div className="space-y-4 pb-2">
                    <div className="space-y-2">
                      <Label>Pattern Name *</Label>
                      <Input
                        placeholder="e.g., Monthly Rent"
                        value={editFormData.name}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={editFormData.type}
                        onValueChange={(value: "income" | "expense") =>
                          setEditFormData({
                            ...editFormData,
                            type: value,
                            linked_budget_id:
                              value === "income"
                                ? ""
                                : editFormData.linked_budget_id,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="income">Income</SelectItem>
                          <SelectItem value="expense">Expense</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Amount *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={editFormData.amount}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            amount: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description *</Label>
                      <Input
                        placeholder="e.g., Monthly Rent Payment"
                        value={editFormData.description}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subtype</Label>
                      <Input
                        placeholder="Optional subtype"
                        value={editFormData.subtype}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            subtype: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select
                        value={editFormData.category}
                        onValueChange={(value) =>
                          setEditFormData({ ...editFormData, category: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Salary">Salary</SelectItem>
                          <SelectItem value="Bills">Bills</SelectItem>
                          <SelectItem value="Subscriptions">
                            Subscriptions
                          </SelectItem>
                          <SelectItem value="Food">Food</SelectItem>
                          <SelectItem value="Transportation">
                            Transportation
                          </SelectItem>
                          <SelectItem value="Entertainment">
                            Entertainment
                          </SelectItem>
                          <SelectItem value="Healthcare">Healthcare</SelectItem>
                          <SelectItem value="Loan">Loan</SelectItem>
                          <SelectItem value="Savings">Savings</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          {customCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Frequency</Label>
                      <Select
                        value={editFormData.frequency}
                        onValueChange={(
                          value:
                            | "daily"
                            | "weekly"
                            | "biweekly"
                            | "monthly"
                            | "quarterly"
                            | "yearly",
                        ) =>
                          setEditFormData({ ...editFormData, frequency: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="biweekly">Bi-weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {editFormData.frequency === "monthly" && (
                      <div className="space-y-2">
                        <Label>Day of month</Label>
                        <Select
                          value={
                            editFormData.day_of_month === ""
                              ? "same"
                              : String(editFormData.day_of_month)
                          }
                          onValueChange={(value) =>
                            setEditFormData({
                              ...editFormData,
                              day_of_month:
                                value === "same" ? "" : Number(value),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="same">
                              Same as start date
                            </SelectItem>
                            {Array.from({ length: 31 }, (_, i) => {
                              const d = i + 1;
                              const ord =
                                d === 1 || d === 21 || d === 31
                                  ? "st"
                                  : d === 2 || d === 22
                                    ? "nd"
                                    : d === 3 || d === 23
                                      ? "rd"
                                      : "th";
                              return (
                                <SelectItem key={d} value={String(d)}>
                                  {d}
                                  {ord}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={editFormData.start_date}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            start_date: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date (optional)</Label>
                      <Input
                        type="date"
                        value={editFormData.end_date}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            end_date: e.target.value,
                          })
                        }
                        min={editFormData.start_date}
                      />
                    </div>
                    {editFormData.type === "expense" && budgets.length > 0 && (
                      <div className="space-y-2">
                        <Label>Link to budget (optional)</Label>
                        <Select
                          value={editFormData.linked_budget_id || "none"}
                          onValueChange={(v) =>
                            setEditFormData({
                              ...editFormData,
                              linked_budget_id: v === "none" ? "" : v,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Auto-match by category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              Auto-match by category
                            </SelectItem>
                            {budgets.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.category}
                                {b.subtype ? ` · ${b.subtype}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {goals.filter((g) => g.status === "active").length > 0 && (
                      <div className="space-y-2">
                        <Label>Link to Goal (optional)</Label>
                        <Select
                          value={editFormData.linked_goal_id || "none"}
                          onValueChange={(v) =>
                            setEditFormData({
                              ...editFormData,
                              linked_goal_id: v === "none" ? "" : v,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="No goal linked" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No goal linked</SelectItem>
                            {goals
                              .filter((g) => g.status === "active")
                              .map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.title}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="edit_auto_create"
                        checked={editFormData.auto_create}
                        onCheckedChange={(checked) =>
                          setEditFormData({
                            ...editFormData,
                            auto_create: checked,
                          })
                        }
                      />
                      <Label
                        htmlFor="edit_auto_create"
                        className="cursor-pointer"
                      >
                        Auto-create transactions
                      </Label>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 border-t bg-background px-6 py-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdatePattern}
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Patterns List */}
            <Card className="overflow-hidden p-0">
              <div className="divide-y divide-border">
                {patterns.map((pattern) => {
                  const nextDate = new Date(pattern.next_date);
                  const daysUntil = Math.ceil(
                    (nextDate.getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24),
                  );
                  const isDue = daysUntil <= 0;

                  return (
                    <div
                      key={pattern.id}
                      className={`flex items-center justify-between gap-3 px-4 py-2.5 ${!pattern.is_active ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`p-1.5 rounded-full shrink-0 ${
                            pattern.type === "income"
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {pattern.type === "income" ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-medium text-sm truncate">
                              {pattern.name}
                            </p>
                            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                              {pattern.frequency === "monthly" &&
                              pattern.day_of_month != null
                                ? `${pattern.day_of_month}${pattern.day_of_month === 1 || pattern.day_of_month === 21 || pattern.day_of_month === 31 ? "st" : pattern.day_of_month === 2 || pattern.day_of_month === 22 ? "nd" : pattern.day_of_month === 3 || pattern.day_of_month === 23 ? "rd" : "th"}`
                                : pattern.frequency}
                            </span>
                            {pattern.auto_create && (
                              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">
                                Auto
                              </span>
                            )}
                            {isDue && pattern.is_active && (
                              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 shrink-0">
                                Due
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              {pattern.category}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Next: {nextDate.toLocaleDateString()}
                              {daysUntil >= 0 &&
                                ` · ${daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `${daysUntil}d`}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p
                            className={`font-mono font-semibold text-sm ${
                              pattern.type === "income"
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {pattern.type === "income" ? "+" : "−"}
                            {format(pattern.amount)}
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          {isDue && pattern.is_active && (
                            <Button
                              size="sm"
                              onClick={() =>
                                handleCreateTransaction(pattern.id)
                              }
                              disabled={creatingTransaction === pattern.id}
                            >
                              {creatingTransaction === pattern.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Post
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(pattern)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleActive(pattern.id)}
                          >
                            {pattern.is_active ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(pattern.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {patterns.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Repeat className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                  No recurring transactions
                </p>
                <p className="text-xs text-muted-foreground">
                  Add your first recurring income or expense
                </p>
              </div>
            )}
          </TabsContent>

          {/* Bills Tab */}
          <TabsContent value="bills" className="space-y-4 mt-0">
            {/* Bills summary strip */}
            <Card className="overflow-hidden p-0">
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Monthly Cost
                  </p>
                  <p className="font-mono font-semibold text-red-600 dark:text-red-400">
                    {format(monthlyBillsTotal)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {bills.length} bills
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Overdue
                  </p>
                  <p
                    className={`font-mono font-semibold ${overdueBills.length > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                  >
                    {overdueBills.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Past due date
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Paid This Month
                  </p>
                  <p className="font-mono font-semibold text-green-600 dark:text-green-400">
                    {paidThisMonth}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    of {bills.length} bills
                  </p>
                </div>
              </div>
            </Card>

            {/* Overdue alert */}
            {overdueBills.length > 0 && (
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                <CardHeader className="p-2 pb-0.5">
                  <CardTitle className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Overdue Bills
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 pt-0.5 space-y-2">
                  {overdueBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <span className="font-medium text-sm">{bill.name}</span>
                        <span className="text-xs text-red-600 dark:text-red-400 ml-2">
                          {getDaysLabel(bill.next_date).label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {format(bill.amount)}
                        </span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handlePayNow(bill.id, bill.name)}
                          disabled={payingId === bill.id}
                        >
                          {payingId === bill.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Pay Now"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Upcoming this week */}
            {upcomingBills.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Due This Week
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  {upcomingBills.map((bill) => {
                    const { label, color } = getDaysLabel(bill.next_date);
                    return (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between"
                      >
                        <div>
                          <span className="font-medium text-sm">
                            {bill.name}
                          </span>
                          <span className={`text-xs ml-2 ${color}`}>
                            {label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {format(bill.amount)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePayNow(bill.id, bill.name)}
                            disabled={payingId === bill.id}
                          >
                            {payingId === bill.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              "Mark Paid"
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* All bills */}
            <Card>
              <CardHeader className="p-2 pb-1">
                <CardTitle className="text-base">All Bills</CardTitle>
                <CardDescription>
                  Active recurring expense bills sorted by next due date
                </CardDescription>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                {loading ? (
                  <div className="flex items-center justify-center py-5">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : allBills.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="No bills tracked"
                    description="Add recurring expense patterns in the Recurring tab to track your bills here"
                    actionLabel="Go to Recurring"
                    onAction={() =>
                      document
                        .querySelector<HTMLButtonElement>(
                          '[data-state][value="recurring"]',
                        )
                        ?.click()
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    {allBills.map((bill) => {
                      const { label, color } = getDaysLabel(bill.next_date);
                      return (
                        <div
                          key={bill.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 shrink-0">
                              <Receipt className="h-4 w-4 text-red-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {bill.name}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="secondary"
                                  className="text-xs px-1.5"
                                >
                                  {frequencyLabel[bill.frequency]}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {bill.category}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <p className="font-semibold text-sm">
                                {format(bill.amount)}
                              </p>
                              <p
                                className={`text-xs ${color} flex items-center gap-1 justify-end`}
                              >
                                <Calendar className="h-3 w-3" />
                                {label}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePayNow(bill.id, bill.name)}
                              disabled={payingId === bill.id}
                            >
                              {payingId === bill.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Pay"
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
