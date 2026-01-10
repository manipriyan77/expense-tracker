"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import BudgetDetailsModal from "@/components/budgets/BudgetDetailsModal";
import { MonthSelector } from "@/components/ui/month-selector";

const budgetFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  subtype: z.string().optional(),
  limit_amount: z
    .string()
    .min(1, "Limit is required")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Must be a positive number"),
  period: z.enum(["weekly", "monthly", "yearly"]),
});

type BudgetFormData = z.infer<typeof budgetFormSchema>;

export default function BudgetsPage() {
  const { budgets, loading, error, fetchBudgets, addBudget, updateBudget, deleteBudget } = useBudgetsStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showEditCategoryInput, setShowEditCategoryInput] = useState(false);
  const [newEditCategoryName, setNewEditCategoryName] = useState("");
  const [customEditCategories, setCustomEditCategories] = useState<string[]>([]);

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
    fetchBudgets();
  }, [fetchBudgets]);

  const handleAddCustomCategory = () => {
    if (newCategoryName.trim()) {
      const trimmedName = newCategoryName.trim();
      const allCategories = [...categories, ...customCategories];
      if (!allCategories.includes(trimmedName)) {
        setCustomCategories([...customCategories, trimmedName]);
        addControl._formValues.category = trimmedName;
      }
      setNewCategoryName("");
      setShowCategoryInput(false);
    }
  };

  const handleAddEditCustomCategory = () => {
    if (newEditCategoryName.trim()) {
      const trimmedName = newEditCategoryName.trim();
      const allCategories = [...categories, ...customEditCategories];
      if (!allCategories.includes(trimmedName)) {
        setCustomEditCategories([...customEditCategories, trimmedName]);
        editControl._formValues.category = trimmedName;
      }
      setNewEditCategoryName("");
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
    if (confirm("Are you sure you want to delete this budget?")) {
      try {
        await deleteBudget(id);
      } catch (error) {
        // Error is already set in the store and logged
        // Show alert to user
        if (error instanceof Error) {
          alert(error.message);
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
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchBudgets} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Budget Management</h1>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Month Selector */}
        <div className="mb-6 flex items-center justify-between">
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            monthsToShow={7}
          />
          <div className="text-sm text-gray-600">
            {budgets.length} budget(s)
          </div>
        </div>

        {/* Overall Budget Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Overall Budget Status</CardTitle>
            <CardDescription>
              Your total budget across all categories for{" "}
              {selectedMonth.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total Budget</p>
                  <p className="text-2xl font-bold">₹{totalBudget.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{totalSpent.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Remaining</p>
                  <p className="text-2xl font-bold text-green-600">
                    ₹{(totalBudget - totalSpent).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{overallPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={overallPercentage} className="h-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Budget Button */}
        <div className="mb-6">
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
              <form onSubmit={handleAddSubmit(handleAddBudget)} className="space-y-4">
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
                            <SelectItem value="add_custom" className="text-blue-600 font-medium border-t mt-1 pt-2">
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
                    <p className="text-sm text-red-600">{addErrors.category.message}</p>
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
                    <p className="text-sm text-red-600">{addErrors.limit_amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-period">Period *</Label>
                  <Controller
                    name="period"
                    control={addControl}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
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
                    <p className="text-sm text-red-600">{addErrors.period.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isAddSubmitting}>
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
            <form onSubmit={handleEditSubmit(handleEditBudget)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                {showEditCategoryInput ? (
                  <div className="flex space-x-2">
                    <Input
                      value={newEditCategoryName}
                      onChange={(e) => setNewEditCategoryName(e.target.value)}
                      placeholder="Enter category name"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddEditCustomCategory();
                        } else if (e.key === "Escape") {
                          setShowEditCategoryInput(false);
                          setNewEditCategoryName("");
                        }
                      }}
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddEditCustomCategory}
                      disabled={!newEditCategoryName.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowEditCategoryInput(false);
                        setNewEditCategoryName("");
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
                          {customEditCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                          <SelectItem value="add_custom" className="text-blue-600 font-medium border-t mt-1 pt-2">
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
                  <p className="text-sm text-red-600">{editErrors.category.message}</p>
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
                  <p className="text-sm text-red-600">{editErrors.limit_amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-period">Period *</Label>
                <Controller
                  name="period"
                  control={editControl}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  <p className="text-sm text-red-600">{editErrors.period.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isEditSubmitting}>
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

        {/* Budget Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => {
            const spent = budget.spent_amount || 0;
            const percentage = (spent / budget.limit_amount) * 100;
            const remaining = budget.limit_amount - spent;

            return (
              <Card 
                key={budget.id} 
                className="relative hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => openDetailsModal(budget)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-lg">
                        {budget.category}
                        {budget.subtype && (
                          <span className="text-sm font-normal text-gray-500 ml-2">
                            → {budget.subtype}
                          </span>
                        )}
                      </CardTitle>
                    </div>
                    {getStatusIcon(percentage)}
                  </div>
                  <CardDescription className="capitalize">
                    {budget.period} budget
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Spent</p>
                      <p className="text-xl font-bold">₹{spent.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Limit</p>
                      <p className="text-xl font-bold">₹{budget.limit_amount.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className={percentage >= 100 ? "text-red-600" : ""}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="relative">
                      <Progress value={Math.min(percentage, 100)} />
                      <div
                        className={`absolute top-0 left-0 h-full ${getProgressColor(percentage)} rounded-full transition-all`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Remaining</p>
                        <p
                          className={`text-lg font-semibold ${
                            remaining < 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          ₹{Math.abs(remaining).toFixed(2)}
                          {remaining < 0 && " over"}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(budget);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBudget(budget.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {percentage >= 80 && (
                    <div
                      className={`flex items-center space-x-2 p-2 rounded ${
                        percentage >= 100
                          ? "bg-red-50 text-red-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {percentage >= 100
                          ? "Budget exceeded!"
                          : "Approaching limit"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {budgets.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TrendingDown className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">
                No budgets created yet
              </p>
              <p className="text-gray-600 mb-4">
                Start by creating your first budget to track spending
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Budget Details Modal */}
      <BudgetDetailsModal
        budget={selectedBudget}
        isOpen={isDetailsModalOpen}
        onClose={handleDetailsModalClose}
        onTransactionDeleted={handleTransactionDeleted}
      />
    </div>
  );
}
