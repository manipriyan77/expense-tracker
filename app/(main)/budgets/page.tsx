"use client";

import { useEffect, useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BudgetTemplatesContent } from "@/components/budgets/BudgetTemplatesContent";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast, Toaster } from "sonner";
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
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import { useBudgetsStore, Budget } from "@/store/budgets-store";
import { useTransactionsStore } from "@/store/transactions-store";
import BudgetDetailsModal from "@/components/budgets/BudgetDetailsModal";
import { MonthSelector } from "@/components/ui/month-selector";
import AddTransactionForm from "@/components/transactions/AddTransactionForm";
import { DollarSign } from "lucide-react";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const budgetFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  subtype: z.string().optional(),
  limit_amount: z
    .string()
    .min(1, "Limit is required")
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      "Must be a positive number",
    ),
  period: z.enum(["weekly", "monthly", "yearly"]),
});

type BudgetFormData = z.infer<typeof budgetFormSchema>;

export default function BudgetsPage() {
  const { format } = useFormatCurrency();
  const {
    budgets,
    loading,
    error,
    fetchBudgets,
    addBudget,
    updateBudget,
    deleteBudget,
    currentMonth,
    currentYear,
    setMonth,
  } = useBudgetsStore();
  const { fetchTransactions } = useTransactionsStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [showEditCategoryInput, setShowEditCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  // Transaction dialog
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [transactionBudget, setTransactionBudget] = useState<Budget | null>(
    null,
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const {
    control: addControl,
    handleSubmit: handleAddSubmit,
    reset: resetAdd,
    formState: { errors: addErrors, isSubmitting: isAddSubmitting },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      category: "",
      subtype: "",
      limit_amount: "",
      period: "monthly",
    },
  });

  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema),
  });

  useEffect(() => {
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();
    fetchBudgets(month, year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  const handleAddCustomCategory = (isEditMode = false) => {
    if (newCategoryName.trim()) {
      const trimmedName = newCategoryName.trim();
      const allCategories = [...categories, ...customCategories];
      if (!allCategories.includes(trimmedName)) {
        setCustomCategories([...customCategories, trimmedName]);
        if (isEditMode) {
          editControl._formValues.category = trimmedName;
        } else {
          addControl._formValues.category = trimmedName;
        }
      }
      setNewCategoryName("");
      setShowCategoryInput(false);
      setShowEditCategoryInput(false);
    }
  };

  const handleAddBudget = async (data: BudgetFormData) => {
    await addBudget({
      category: data.category,
      subtype: data.subtype || null,
      limit_amount: parseFloat(data.limit_amount),
      period: data.period,
    });
    resetAdd();
    setIsAddDialogOpen(false);
  };

  const handleEditBudget = async (data: BudgetFormData) => {
    if (!editingBudgetId) return;

    await updateBudget(editingBudgetId, {
      category: data.category,
      subtype: data.subtype || null,
      limit_amount: parseFloat(data.limit_amount),
      period: data.period,
    });
    resetEdit();
    setIsEditDialogOpen(false);
    setEditingBudgetId(null);
  };

  const handleDeleteBudget = async (id: string) => {
    const budget = budgets.find((b) => b.id === id);
    const budgetName = budget
      ? `${budget.category}${budget.subtype ? ` - ${budget.subtype}` : ""}`
      : "this budget";

    if (
      confirm(
        `Are you sure you want to delete ${budgetName}?\n\n⚠️ Warning: All transactions linked to this budget will also be deleted permanently.`,
      )
    ) {
      try {
        const result = await deleteBudget(id);
        // Show success toast with transaction count
        if (result && result.deletedTransactions > 0) {
          toast.success(
            `Budget deleted successfully! ${result.deletedTransactions} linked transaction${result.deletedTransactions > 1 ? "s were" : " was"} also deleted.`,
          );
        } else {
          toast.success("Budget deleted successfully!");
        }
      } catch (error) {
        // Error is already set in the store and logged
        // Show error toast to user
        if (error instanceof Error) {
          toast.error(`Failed to delete budget: ${error.message}`);
        } else {
          toast.error("Failed to delete budget");
        }
      }
    }
  };

  const openEditDialog = (budget: Budget) => {
    setEditingBudgetId(budget.id);
    resetEdit({
      category: budget.category,
      subtype: budget.subtype || "",
      limit_amount: budget.limit_amount.toString(),
      period: budget.period,
    });
    setIsEditDialogOpen(true);
  };

  const openDetailsModal = (budget: Budget) => {
    setSelectedBudget(budget);
    setIsDetailsModalOpen(true);
  };

  const handleDetailsModalClose = () => {
    setIsDetailsModalOpen(false);
    setSelectedBudget(null);
  };

  const handleTransactionDeleted = () => {
    // Refresh budgets to update amounts
    fetchBudgets();
  };

  const openAddTransactionDialog = (budget: Budget) => {
    setTransactionBudget(budget);
    setIsAddTransactionOpen(true);
  };

  const handleTransactionSuccess = () => {
    setIsAddTransactionOpen(false);
    setTransactionBudget(null);
    fetchBudgets(); // Refresh to update spent amounts
    toast.success("Transaction added successfully!");
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-600";
    if (percentage >= 80) return "bg-orange-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-green-600";
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 100)
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (percentage >= 80)
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit_amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0);

  const budgetChartData = useMemo(
    () =>
      budgets.map((b) => ({
        name: b.subtype ? `${b.category} · ${b.subtype}` : b.category,
        Budget: b.limit_amount,
        Spent: b.spent_amount || 0,
        Remaining: Math.max(0, b.limit_amount - (b.spent_amount || 0)),
      })),
    [budgets],
  );

  const CATEGORY_COLORS = [
    "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6",
    "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#84cc16",
    "#6366f1", "#e11d48", "#ef4444",
  ];

  const budgetCategoryBreakdown = useMemo(() => {
    const grouped: Record<string, { total: number; items: { name: string; amount: number }[] }> = {};
    budgets.filter((b) => b.limit_amount > 0).forEach((b) => {
      const cat = b.category;
      if (!grouped[cat]) grouped[cat] = { total: 0, items: [] };
      grouped[cat].total += b.limit_amount;
      grouped[cat].items.push({ name: b.subtype || b.category, amount: b.limit_amount });
    });
    return Object.entries(grouped)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [budgets]);

  const overallPercentage =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const categories = [
    "Food",
    "Transportation",
    "Entertainment",
    "Bills",
    "Shopping",
    "Healthcare",
    "Savings",
    "Investment",
    "Education",
    "Travel",
    "Other",
  ];

  if (loading && budgets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Toaster position="top-right" />
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Toaster position="top-right" />
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchBudgets()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-5 pb-0">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
              Budget Management
            </p>
            <p className="text-xs text-slate-500">
              Manage budgets and reusable templates
            </p>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Total Budget
              </p>
              <p className="font-mono text-base font-semibold text-slate-200">
                {format(totalBudget)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {budgets.length} budget(s)
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Spent
              </p>
              <p className="font-mono text-base font-semibold text-red-400">
                {format(totalSpent)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {overallPercentage.toFixed(1)}% used
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Remaining
              </p>
              <p
                className={`font-mono text-base font-semibold ${totalBudget - totalSpent >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {format(Math.abs(totalBudget - totalSpent))}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {totalBudget - totalSpent >= 0 ? "left" : "over budget"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-4">
        <Tabs defaultValue="budgets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="budgets">Budgets</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="budgets" className="space-y-4 mt-0">
            {/* Month Selector */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <MonthSelector
                selectedMonth={selectedMonth}
                onMonthChange={setSelectedMonth}
                monthsToShow={7}
              />
              <div
                className="text-sm text-muted-foreground shrink-0"
                title={`${budgets.length} budgets`}
              >
                <span className="sm:hidden">{budgets.length}</span>
                <span className="hidden sm:inline">
                  {budgets.length} budget(s)
                </span>
              </div>
            </div>

            {/* Add Budget Button */}
            <div className="mb-4">
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Budget
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Budget</DialogTitle>
                    <DialogDescription>
                      Set a spending limit for a category
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={handleAddSubmit(handleAddBudget)}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="add-category">Category *</Label>
                      {showCategoryInput ? (
                        <div className="flex space-x-2">
                          <Input
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Enter category name"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddCustomCategory(false);
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
                            onClick={() => handleAddCustomCategory(false)}
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
                        <Controller
                          name="category"
                          control={addControl}
                          render={({ field }) => (
                            <Select
                              value={field.value}
                              onValueChange={(value) => {
                                if (value === "add_custom") {
                                  setShowCategoryInput(true);
                                } else {
                                  field.onChange(value);
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat}
                                  </SelectItem>
                                ))}
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
                        />
                      )}
                      {addErrors.category && (
                        <p className="text-sm text-red-600">
                          {addErrors.category.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="add-subtype">Subtype (Optional)</Label>
                      <Controller
                        name="subtype"
                        control={addControl}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="add-subtype"
                            placeholder="e.g., Groceries, Rent"
                          />
                        )}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="add-limit">Budget Limit *</Label>
                      <Controller
                        name="limit_amount"
                        control={addControl}
                        render={({ field }) => (
                          <Input
                            {...field}
                            id="add-limit"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                          />
                        )}
                      />
                      {addErrors.limit_amount && (
                        <p className="text-sm text-red-600">
                          {addErrors.limit_amount.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="add-period">Period *</Label>
                      <Controller
                        name="period"
                        control={addControl}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {addErrors.period && (
                        <p className="text-sm text-red-600">
                          {addErrors.period.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isAddSubmitting}
                    >
                      {isAddSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Budget"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Edit Budget Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Budget</DialogTitle>
                  <DialogDescription>Update budget details</DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={handleEditSubmit(handleEditBudget)}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Category *</Label>
                    {showEditCategoryInput ? (
                      <div className="flex space-x-2">
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Enter category name"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomCategory(true);
                            } else if (e.key === "Escape") {
                              setShowEditCategoryInput(false);
                              setNewCategoryName("");
                            }
                          }}
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddCustomCategory(true)}
                          disabled={!newCategoryName.trim()}
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowEditCategoryInput(false);
                            setNewCategoryName("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Controller
                        name="category"
                        control={editControl}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={(value) => {
                              if (value === "add_custom") {
                                setShowEditCategoryInput(true);
                              } else {
                                field.onChange(value);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                  {cat}
                                </SelectItem>
                              ))}
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
                      />
                    )}
                    {editErrors.category && (
                      <p className="text-sm text-red-600">
                        {editErrors.category.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-subtype">Subtype (Optional)</Label>
                    <Controller
                      name="subtype"
                      control={editControl}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="edit-subtype"
                          placeholder="e.g., Groceries, Rent"
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-limit">Budget Limit *</Label>
                    <Controller
                      name="limit_amount"
                      control={editControl}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="edit-limit"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                        />
                      )}
                    />
                    {editErrors.limit_amount && (
                      <p className="text-sm text-red-600">
                        {editErrors.limit_amount.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-period">Period *</Label>
                    <Controller
                      name="period"
                      control={editControl}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select period" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {editErrors.period && (
                      <p className="text-sm text-red-600">
                        {editErrors.period.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isEditSubmitting}
                  >
                    {isEditSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Budget"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* Budget Analysis Charts */}
            {budgets.length > 0 && (
              <>
                <Card className="mb-4">
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Budget vs Spent
                    </p>
                  </CardHeader>
                  <CardContent className="px-2 pt-4 pb-2">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={budgetChartData}
                        margin={{ top: 0, right: 8, left: 0, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 9 }}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          angle={-45}
                          textAnchor="end"
                          height={70}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) =>
                            v >= 1_000_000
                              ? `${(v / 1_000_000).toFixed(1)}M`
                              : v >= 1_000
                                ? `${(v / 1_000).toFixed(0)}K`
                                : `${v}`
                          }
                          width={40}
                        />
                        <Tooltip
                          formatter={(value) => format(Number(value ?? 0))}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Legend
                          iconType="square"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                        />
                        <Bar dataKey="Budget" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="Spent" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="mb-4">
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Budget Breakdown by Category
                    </p>
                  </CardHeader>
                  <CardContent className="px-4 pt-4 pb-4 space-y-4">
                    {budgetCategoryBreakdown.map((group, idx) => {
                      const catPct = totalBudget > 0 ? (group.total / totalBudget) * 100 : 0;
                      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                      const hasMultiple = group.items.length > 1;
                      return (
                        <div key={group.category}>
                          {/* Category header row */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                              <span className="text-sm font-semibold">{group.category}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">{format(group.total)}</span>
                              <span className="text-xs font-bold" style={{ color }}>{catPct.toFixed(1)}%</span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1.5 w-full rounded-full bg-muted mb-2">
                            <div className="h-1.5 rounded-full" style={{ width: `${catPct}%`, backgroundColor: color }} />
                          </div>
                          {/* Sub-items (only when multiple sub-types) */}
                          {hasMultiple && (
                            <div className="ml-4 space-y-1">
                              {group.items.map((item) => {
                                const itemPct = totalBudget > 0 ? (item.amount / totalBudget) * 100 : 0;
                                return (
                                  <div key={item.name} className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">{item.name}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-muted-foreground">{format(item.amount)}</span>
                                      <span className="text-xs text-muted-foreground w-10 text-right">{itemPct.toFixed(1)}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </>
            )}

            {/* Budget Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {budgets.map((budget) => {
                const spent = budget.spent_amount || 0;
                const percentage = (spent / budget.limit_amount) * 100;
                const remaining = budget.limit_amount - spent;

                return (
                  <Card
                    key={budget.id}
                    className="relative hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => openDetailsModal(budget)}
                  >
                    <CardHeader className="p-2 pb-1">
                      <div className="flex justify-between items-start gap-2 min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">
                              {budget.category}
                              {budget.subtype && (
                                <span className="font-normal text-muted-foreground ml-1">
                                  → {budget.subtype}
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5 capitalize">
                              {budget.category}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-medium ${
                              percentage >= 100
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : percentage >= 80
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                                  : percentage >= 60
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            }`}
                          >
                            {budget.period}
                          </span>
                          <div className="shrink-0">
                            {getStatusIcon(percentage)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 pt-0.5 space-y-2">
                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 pt-0">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0">
                            Spent
                          </p>
                          <p className="font-mono font-semibold text-sm text-red-600 dark:text-red-400">
                            {format(spent)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0">
                            Limit
                          </p>
                          <p className="font-mono font-semibold text-sm">
                            {format(budget.limit_amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0">
                            Left
                          </p>
                          <p
                            className={`font-mono font-semibold text-sm ${remaining < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                          >
                            {remaining < 0 ? "-" : ""}
                            {format(Math.abs(remaining))}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-0.5">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Progress
                          </p>
                          <span
                            className={`text-[10px] font-mono font-medium ${percentage >= 100 ? "text-red-600" : percentage >= 80 ? "text-orange-500" : "text-muted-foreground"}`}
                          >
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="relative w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 h-1.5 ${getProgressColor(percentage)} rounded-full transition-all`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Alert banner */}
                      {percentage >= 80 && (
                        <div
                          className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] ${
                            percentage >= 100
                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                              : "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                          }`}
                        >
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span className="text-[10px] uppercase tracking-widest font-medium">
                            {percentage >= 100
                              ? "Budget exceeded"
                              : "Approaching limit"}
                          </span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex justify-end gap-1.5 pt-0.5 border-t border-border/50">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddTransactionDialog(budget);
                          }}
                          className="h-7 px-2 bg-green-600 hover:bg-green-700"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(budget);
                          }}
                          className="h-7 px-2"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBudget(budget.id);
                          }}
                          className="h-7 px-2"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {budgets.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <TrendingDown className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                    No budgets created yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Start by creating your first budget to track spending
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <BudgetTemplatesContent />
          </TabsContent>
        </Tabs>
      </main>

      {/* Budget Details Modal */}
      <BudgetDetailsModal
        budget={selectedBudget}
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
              Add a transaction for {transactionBudget?.category}
              {transactionBudget?.subtype && ` - ${transactionBudget.subtype}`}
            </DialogDescription>
          </DialogHeader>
          {isAddTransactionOpen && transactionBudget && (
            <AddTransactionForm
              onSuccess={handleTransactionSuccess}
              onCancel={() => setIsAddTransactionOpen(false)}
              initialValues={{
                type: "expense",
                category: transactionBudget.category,
                subtype: transactionBudget.subtype || "",
                budgetId: transactionBudget.id,
              }}
              contextInfo={{
                source: "budget",
                sourceName: `${transactionBudget.category}${transactionBudget.subtype ? ` - ${transactionBudget.subtype}` : ""}`,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
