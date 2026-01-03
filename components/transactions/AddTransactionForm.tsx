"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Loader2, Target, AlertCircle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      "Amount must be a positive number"
    ),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  subtype: z.string().min(1, "Subtype is required"),
  budgetId: z.string().optional(), // Optional - will auto-map based on category/subtype
  goalId: z.string().optional(),
  date: z.string().optional(),
}).refine(
  (data) => {
    // If category is Savings, goalId is required
    if (data.category === "Savings" && !data.goalId) {
      return false;
    }
    return true;
  },
  {
    message: "Goal selection is required for savings transactions",
    path: ["goalId"],
  }
);

type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: string;
}

interface Budget {
  id: string;
  category: string;
  subtype: string | null;
  limit_amount: number;
  period: string;
}

interface AddTransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddTransactionForm({ onSuccess, onCancel }: AddTransactionFormProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetInfo, setBudgetInfo] = useState<{
    budgetLimit: number;
    totalSpent: number;
    newTotal: number;
    remainingAmount: number;
    percentage: number;
    isOverLimit: boolean;
    isNearLimit: boolean;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: "expense",
      amount: "",
      description: "",
      category: "",
      subtype: "",
      budgetId: "",
      goalId: "",
      date: new Date().toISOString().split("T")[0],
    },
  });

  const transactionType = watch("type");
  const selectedCategory = watch("category");
  const selectedSubtype = watch("subtype");
  const amount = watch("amount");

  // Load budgets on mount
  useEffect(() => {
    fetchBudgets();
  }, []);

  // Load active goals for income/savings transactions
  useEffect(() => {
    if (transactionType === "income" || selectedCategory === "Savings") {
      fetchGoals();
    }
  }, [transactionType, selectedCategory]);

  // Check budget when expense details change
  useEffect(() => {
    if (transactionType === "expense" && selectedCategory && selectedSubtype && amount) {
      checkBudget();
    } else {
      setBudgetInfo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionType, selectedCategory, selectedSubtype, amount]);

  const fetchBudgets = async () => {
    try {
      const response = await fetch("/api/budgets");
      if (response.ok) {
        const data = await response.json();
        setBudgets(data);
      }
    } catch (error) {
      console.error("Error fetching budgets:", error);
    }
  };

  const fetchGoals = async () => {
    try {
      const response = await fetch("/api/goals");
      if (response.ok) {
        const data = await response.json();
        const activeGoals = data
          .filter((g: { status: string }) => g.status === "active")
          .map((g: { id: string; title: string; target_amount: string; current_amount: string; category: string }) => ({
            id: g.id,
            title: g.title,
            targetAmount: parseFloat(g.target_amount),
            currentAmount: parseFloat(g.current_amount),
            category: g.category,
          }));
        setGoals(activeGoals);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const checkBudget = async () => {
    try {
      const response = await fetch("/api/budgets/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          subtype: selectedSubtype,
          amount: parseFloat(amount),
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setBudgetInfo(data);
      }
    } catch (error) {
      console.error("Error checking budget:", error);
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(data.amount),
          type: data.type,
          description: data.description,
          category: data.category,
          subtype: data.subtype,
          budgetId: data.budgetId,
          goalId: data.goalId || null,
          date: data.date || new Date().toISOString().split("T")[0],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add transaction");
      }

      reset();
      onSuccess();
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert("Failed to add transaction. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter budgets based on category and subtype
  const getMatchingBudgets = () => {
    if (!selectedCategory || !selectedSubtype) return [];
    
    return budgets.filter((budget) => {
      // Exact match: same category and subtype
      if (budget.category === selectedCategory && budget.subtype === selectedSubtype) {
        return true;
      }
      // Fallback match: same category, null subtype (category-level budget)
      if (budget.category === selectedCategory && !budget.subtype) {
        return true;
      }
      return false;
    });
  };

  const incomeCategories = ["Salary", "Freelance", "Investment", "Business", "Gift", "Other", ...customCategories.filter(cat => !["Salary", "Freelance", "Investment", "Business", "Gift", "Other"].includes(cat))];
  const expenseCategories = ["Food", "Transportation", "Entertainment", "Bills", "Shopping", "Healthcare", "Savings", "Other", ...customCategories.filter(cat => !["Food", "Transportation", "Entertainment", "Bills", "Shopping", "Healthcare", "Savings", "Other"].includes(cat))];
  
  const getSubtypes = (category: string, type: string) => {
    if (type === "income") {
      return ["Salary", "Bonus", "Freelance", "Investment Returns", "Business Income", "Other"];
    } else {
      // Expense subtypes
      if (category === "Bills") return ["Electricity", "Water", "Internet", "Phone", "Rent", "Other"];
      if (category === "Food") return ["Groceries", "Dining Out", "Snacks", "Other"];
      if (category === "Transportation") return ["Fuel", "Public Transport", "Parking", "Maintenance", "EMI", "Other"];
      if (category === "Shopping") return ["Clothing", "Electronics", "Home Items", "Personal Care", "Other"];
      if (category === "Savings") return ["Emergency Fund", "Investment", "Fixed Deposit", "Goal Savings", "Other"];
      return ["EMI", "Bills", "Regular", "One-time", "Other"];
    }
  };

  const showGoalMapping = transactionType === "income" || selectedCategory === "Savings";
  const isGoalRequired = selectedCategory === "Savings";

  const handleAddCustomCategory = () => {
    if (newCategoryName.trim()) {
      const trimmedName = newCategoryName.trim();
      if (!customCategories.includes(trimmedName)) {
        setCustomCategories([...customCategories, trimmedName]);
        setValue("category", trimmedName);
        setNewCategoryName("");
        setIsAddCategoryDialogOpen(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Transaction Type */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transaction Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => field.onChange("income")}
                  className={`flex items-center justify-center space-x-2 p-4 rounded-lg border-2 transition-all ${
                    field.value === "income"
                      ? "border-green-600 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-green-300"
                  }`}
                >
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-medium">Income</span>
                </button>
                <button
                  type="button"
                  onClick={() => field.onChange("expense")}
                  className={`flex items-center justify-center space-x-2 p-4 rounded-lg border-2 transition-all ${
                    field.value === "expense"
                      ? "border-red-600 bg-red-50 text-red-700"
                      : "border-gray-200 hover:border-red-300"
                  }`}
                >
                  <TrendingDown className="h-5 w-5" />
                  <span className="font-medium">Expense</span>
                </button>
              </div>
            )}
          />
          {errors.type && (
            <p className="text-sm text-red-600 mt-2">{errors.type.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Basic Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transaction Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <Input
                    {...field}
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-8"
                  />
                </div>
              )}
            />
            {errors.amount && (
              <p className="text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="description"
                  placeholder="What is this for?"
                />
              )}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => (
                <Input {...field} id="date" type="date" />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category & Subtype */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Categorization *</CardTitle>
          <CardDescription>Required for budget tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select 
                  value={field.value} 
                  onValueChange={(value) => {
                    if (value === "add_custom") {
                      setIsAddCategoryDialogOpen(true);
                    } else {
                      field.onChange(value);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(transactionType === "income" ? incomeCategories : expenseCategories).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="add_custom" className="text-blue-600 font-medium border-t mt-1 pt-2">
                      <div className="flex items-center space-x-2">
                        <Plus className="h-4 w-4" />
                        <span>Add Custom Category</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          {/* Subtype */}
          {selectedCategory && (
            <div className="space-y-2">
              <Label htmlFor="subtype">Subtype *</Label>
              <Controller
                name="subtype"
                control={control}
                render={({ field }) => (
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subtype" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSubtypes(selectedCategory, transactionType).map((subtype) => (
                        <SelectItem key={subtype} value={subtype}>
                          {subtype}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.subtype && (
                <p className="text-sm text-red-600">{errors.subtype.message}</p>
              )}
            </div>
          )}

          {/* Budget Selection - Optional, shows available budgets */}
          {selectedCategory && selectedSubtype && getMatchingBudgets().length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="budgetId" className="flex items-center space-x-1">
                <span>Budget (Optional)</span>
                <span className="text-xs text-gray-500">Auto-mapped if not selected</span>
              </Label>
              <Controller
                name="budgetId"
                control={control}
                render={({ field }) => (
                  <Select 
                    value={field.value} 
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-select matching budget" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Auto-select</SelectItem>
                      {getMatchingBudgets().map((budget) => (
                        <SelectItem key={budget.id} value={budget.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {budget.category}
                              {budget.subtype && ` → ${budget.subtype}`}
                            </span>
                            <span className="text-xs text-gray-500">
                              ₹{budget.limit_amount.toLocaleString()} / {budget.period}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-gray-600">
                ℹ️ Transaction will be automatically linked to matching budget
              </p>
            </div>
          )}
          
          {selectedCategory && selectedSubtype && getMatchingBudgets().length === 0 && (
            <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded border border-blue-200">
              ℹ️ No budget exists for {selectedCategory} → {selectedSubtype}. 
              Transaction will be tracked without a budget.
              <a href="/budgets" target="_blank" className="underline ml-1">
                Create budget
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Warning (for expenses) */}
      {transactionType === "expense" && budgetInfo && (
        <Card className={`border-2 ${budgetInfo.isOverLimit ? "border-red-500 bg-red-50" : budgetInfo.isNearLimit ? "border-orange-500 bg-orange-50" : "border-blue-500 bg-blue-50"}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className={`h-5 w-5 ${budgetInfo.isOverLimit ? "text-red-600" : budgetInfo.isNearLimit ? "text-orange-600" : "text-blue-600"}`} />
              <CardTitle className="text-base">Budget Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Budget Limit:</span>
                <span className="font-semibold">₹{budgetInfo.budgetLimit.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Current Spending:</span>
                <span className="font-semibold">₹{budgetInfo.totalSpent.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>After this transaction:</span>
                <span className={`font-semibold ${budgetInfo.isOverLimit ? "text-red-600" : ""}`}>
                  ₹{budgetInfo.newTotal.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                <div
                  className={`h-2 rounded-full transition-all ${
                    budgetInfo.isOverLimit ? "bg-red-600" : budgetInfo.isNearLimit ? "bg-orange-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${Math.min(budgetInfo.percentage, 100)}%` }}
                />
              </div>
              <p className="text-sm text-center font-medium mt-2">
                {budgetInfo.percentage.toFixed(1)}% of budget
              </p>
              {budgetInfo.isOverLimit && (
                <p className="text-sm text-red-600 font-medium text-center">
                  ⚠️ This will exceed your budget by ₹{Math.abs(budgetInfo.remainingAmount).toFixed(2)}
                </p>
              )}
              {budgetInfo.isNearLimit && !budgetInfo.isOverLimit && (
                <p className="text-sm text-orange-600 font-medium text-center">
                  ⚠️ Remaining: ₹{budgetInfo.remainingAmount.toFixed(2)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goal Mapping (for income/savings) */}
      {showGoalMapping && (
        <Card className={`border-2 ${isGoalRequired ? "border-red-500 bg-red-50" : "border-green-500 bg-green-50"}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Target className={`h-5 w-5 ${isGoalRequired ? "text-red-600" : "text-green-600"}`} />
              <CardTitle className="text-base">
                Link to Goal {isGoalRequired ? "*" : "(Optional)"}
              </CardTitle>
            </div>
            <CardDescription>
              {isGoalRequired 
                ? "Required for savings transactions - Select which goal this contributes to"
                : `Contribute this ${transactionType === "income" ? "income" : "savings"} to a financial goal`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <div className="text-sm text-red-600 bg-white p-3 rounded border border-red-200">
                ⚠️ No active goals found. 
                <a href="/goals" target="_blank" className="underline ml-1">
                  Create a goal first
                </a>
              </div>
            ) : (
              <>
                <Controller
                  name="goalId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.goalId ? "border-red-500" : ""}>
                        <SelectValue placeholder={isGoalRequired ? "Select a goal *" : "Select a goal (optional)"} />
                      </SelectTrigger>
                      <SelectContent>
                        {!isGoalRequired && <SelectItem value="">No goal</SelectItem>}
                        {goals.map((goal) => (
                          <SelectItem key={goal.id} value={goal.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{goal.title}</span>
                              <span className="text-xs text-gray-500">
                                ₹{goal.currentAmount.toLocaleString()} / ₹{goal.targetAmount.toLocaleString()}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.goalId && (
                  <p className="text-sm text-red-600 mt-2">{errors.goalId.message}</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Transaction"
          )}
        </Button>
      </div>

      {/* Add Custom Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Category</DialogTitle>
            <DialogDescription>
              Create a new category for your {transactionType === "income" ? "income" : "expense"} transactions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-category">Category Name</Label>
              <Input
                id="new-category"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter category name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddCustomCategory();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewCategoryName("");
                setIsAddCategoryDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAddCustomCategory}
              disabled={!newCategoryName.trim()}
            >
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

