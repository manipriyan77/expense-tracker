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
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Target,
  AlertCircle,
  Plus,
  Trophy,
  Sparkles,
  CreditCard,
  PiggyBank,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

const transactionFormSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine(
        (val) => !isNaN(Number(val)) && Number(val) > 0,
        "Amount must be a positive number",
      ),
    description: z.string().min(1, "Description is required"),
    category: z.string().min(1, "Category is required"),
    subtype: z.string().min(1, "Subtype is required"),
    budgetId: z.string().optional(),
    goalId: z.string().optional(),
    debtId: z.string().optional(),
    savingsChallengeId: z.string().optional(),
    date: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.category === "Savings" && data.type === "expense") {
        if (!data.goalId || data.goalId === "none") return false;
      }
      return true;
    },
    {
      message: "Goal selection is required for savings transactions",
      path: ["goalId"],
    },
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

interface Debt {
  id: string;
  name: string;
  balance: number;
  type: string;
}

interface SavingsChallenge {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  status: string;
}

interface AddTransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialValues?: {
    type?: "income" | "expense";
    category?: string;
    subtype?: string;
    budgetId?: string;
    goalId?: string;
    debtId?: string;
    savingsChallengeId?: string;
    description?: string;
  };
  contextInfo?: {
    source?: "budget" | "goal" | "savings-challenge";
    sourceName?: string;
  };
}

export default function AddTransactionForm({
  onSuccess,
  onCancel,
  initialValues,
  contextInfo,
}: AddTransactionFormProps) {
  const { format } = useFormatCurrency();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [savingsChallenges, setSavingsChallenges] = useState<
    SavingsChallenge[]
  >([]);
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
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [showSubtypeInput, setShowSubtypeInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubtypeName, setNewSubtypeName] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customSubtypes, setCustomSubtypes] = useState<
    Record<string, string[]>
  >({});

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
      type: initialValues?.type || "expense",
      amount: "",
      description: initialValues?.description || "",
      category: initialValues?.category || "",
      subtype: initialValues?.subtype || "",
      budgetId: initialValues?.budgetId || "",
      goalId: initialValues?.goalId || "",
      debtId: initialValues?.debtId || "",
      savingsChallengeId: initialValues?.savingsChallengeId || "",
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

  // Load goals, debts, and savings challenges for expenses
  useEffect(() => {
    if (transactionType === "expense") {
      fetchGoals();
      fetchDebts();
      fetchSavingsChallenges();
    }
  }, [transactionType]);

  // Check budget when expense details change
  useEffect(() => {
    if (
      transactionType === "expense" &&
      selectedCategory &&
      selectedSubtype &&
      amount
    ) {
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
          .map(
            (g: {
              id: string;
              title: string;
              target_amount: string;
              current_amount: string;
              category: string;
            }) => ({
              id: g.id,
              title: g.title,
              targetAmount: parseFloat(g.target_amount),
              currentAmount: parseFloat(g.current_amount),
              category: g.category,
            }),
          );
        setGoals(activeGoals);
      }
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const fetchDebts = async () => {
    try {
      const response = await fetch("/api/debt-tracker");
      if (response.ok) {
        const data = await response.json();
        setDebts(
          data.map(
            (d: {
              id: string;
              name: string;
              balance: number;
              type: string;
            }) => ({
              id: d.id,
              name: d.name,
              balance: d.balance,
              type: d.type,
            }),
          ),
        );
      }
    } catch (error) {
      console.error("Error fetching debts:", error);
    }
  };

  const fetchSavingsChallenges = async () => {
    try {
      const response = await fetch("/api/savings-challenges");
      if (response.ok) {
        const data = await response.json();
        setSavingsChallenges(
          data
            .filter((c: { status: string }) => c.status === "active")
            .map(
              (c: {
                id: string;
                name: string;
                target_amount: number;
                current_amount: number;
                status: string;
              }) => ({
                id: c.id,
                name: c.name,
                target_amount: c.target_amount,
                current_amount: c.current_amount,
                status: c.status,
              }),
            ),
        );
      }
    } catch (error) {
      console.error("Error fetching savings challenges:", error);
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
        // Only set budgetInfo if we have valid data with required properties
        if (
          data &&
          typeof data.budgetLimit !== "undefined" &&
          typeof data.totalSpent !== "undefined"
        ) {
          setBudgetInfo(data);
        } else {
          setBudgetInfo(null);
        }
      } else {
        setBudgetInfo(null);
      }
    } catch (error) {
      console.error("Error checking budget:", error);
      setBudgetInfo(null);
    }
  };

  const onSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    const txDate = data.date || new Date().toISOString().split("T")[0];
    const amount = parseFloat(data.amount);
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          type: data.type,
          description: data.description,
          category: data.category,
          subtype: data.subtype,
          budgetId:
            data.budgetId && data.budgetId !== "auto" ? data.budgetId : null,
          goalId: data.goalId && data.goalId !== "none" ? data.goalId : null,
          date: txDate,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add transaction");
      }

      const hasDebt = data.debtId && data.debtId !== "none";
      const hasChallenge =
        data.savingsChallengeId && data.savingsChallengeId !== "none";

      if (hasDebt) {
        const debtRes = await fetch(
          `/api/debt-tracker/${data.debtId}/payments`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount,
              payment_date: txDate,
              notes: data.description
                ? `From expense: ${data.description}`
                : undefined,
            }),
          },
        );
        if (!debtRes.ok) {
          throw new Error(
            "Transaction saved but failed to record loan payment.",
          );
        }
      }

      if (hasChallenge) {
        const challengeRes = await fetch(
          `/api/savings-challenges/${data.savingsChallengeId}/contributions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount,
              contribution_date: txDate,
              notes: data.description
                ? `From expense: ${data.description}`
                : undefined,
            }),
          },
        );
        if (!challengeRes.ok) {
          throw new Error(
            "Transaction saved but failed to record savings challenge contribution.",
          );
        }
      }

      reset();
      onSuccess();
    } catch (error) {
      console.error("Error adding transaction:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to add transaction. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter budgets based on category and subtype
  const getMatchingBudgets = () => {
    if (!selectedCategory || !selectedSubtype) return [];

    return budgets.filter((budget) => {
      // Exact match: same category and subtype
      if (
        budget.category === selectedCategory &&
        budget.subtype === selectedSubtype
      ) {
        return true;
      }
      // Fallback match: same category, null subtype (category-level budget)
      if (budget.category === selectedCategory && !budget.subtype) {
        return true;
      }
      return false;
    });
  };

  const incomeCategories = [
    "Salary",
    "Freelance",
    "Investment",
    "Business",
    "Gift",
    "Other",
    ...customCategories.filter(
      (cat) =>
        ![
          "Salary",
          "Freelance",
          "Investment",
          "Business",
          "Gift",
          "Other",
        ].includes(cat),
    ),
  ];
  const expenseCategories = [
    "Food",
    "Transportation",
    "Entertainment",
    "Bills",
    "Shopping",
    "Healthcare",
    "Savings",
    "Other",
    ...customCategories.filter(
      (cat) =>
        ![
          "Food",
          "Transportation",
          "Entertainment",
          "Bills",
          "Shopping",
          "Healthcare",
          "Savings",
          "Other",
        ].includes(cat),
    ),
  ];

  const getSubtypes = (category: string, type: string) => {
    const baseSubtypes =
      type === "income"
        ? [
            "Salary",
            "Bonus",
            "Freelance",
            "Investment Returns",
            "Business Income",
            "Other",
          ]
        : category === "Bills"
          ? ["Electricity", "Water", "Internet", "Phone", "Rent", "Other"]
          : category === "Food"
            ? ["Groceries", "Dining Out", "Snacks", "Other"]
            : category === "Transportation"
              ? [
                  "Fuel",
                  "Public Transport",
                  "Parking",
                  "Maintenance",
                  "EMI",
                  "Other",
                ]
              : category === "Shopping"
                ? [
                    "Clothing",
                    "Electronics",
                    "Home Items",
                    "Personal Care",
                    "Other",
                  ]
                : category === "Savings"
                  ? [
                      "Emergency Fund",
                      "Investment",
                      "Fixed Deposit",
                      "Goal Savings",
                      "Other",
                    ]
                  : ["EMI", "Bills", "Regular", "One-time", "Other"];

    const customForCategory = customSubtypes[category] || [];
    return [
      ...baseSubtypes,
      ...customForCategory.filter((sub) => !baseSubtypes.includes(sub)),
    ];
  };

  const showLinkToSection = transactionType === "expense";
  const isGoalRequired = selectedCategory === "Savings";

  const handleAddCustomCategory = () => {
    if (newCategoryName.trim()) {
      const trimmedName = newCategoryName.trim();
      const allCategories =
        transactionType === "income" ? incomeCategories : expenseCategories;
      if (!allCategories.includes(trimmedName)) {
        setCustomCategories([...customCategories, trimmedName]);
        setValue("category", trimmedName);
      }
      setNewCategoryName("");
      setShowCategoryInput(false);
    }
  };

  const handleAddCustomSubtype = () => {
    if (newSubtypeName.trim() && selectedCategory) {
      const trimmedName = newSubtypeName.trim();
      const currentSubtypes = customSubtypes[selectedCategory] || [];
      if (!currentSubtypes.includes(trimmedName)) {
        setCustomSubtypes({
          ...customSubtypes,
          [selectedCategory]: [...currentSubtypes, trimmedName],
        });
        setValue("subtype", trimmedName);
      }
      setNewSubtypeName("");
      setShowSubtypeInput(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Context Info Banner */}
      {contextInfo && contextInfo.source && (
        <Card className="border-2 border-blue-500 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2">
              {contextInfo.source === "budget" && (
                <Target className="h-5 w-5 text-blue-600" />
              )}
              {contextInfo.source === "goal" && (
                <Trophy className="h-5 w-5 text-blue-600" />
              )}
              {contextInfo.source === "savings-challenge" && (
                <Sparkles className="h-5 w-5 text-blue-600" />
              )}
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Adding transaction for{" "}
                  {contextInfo.source === "budget"
                    ? "Budget"
                    : contextInfo.source === "goal"
                      ? "Goal"
                      : "Savings Challenge"}
                </p>
                <p className="text-sm text-blue-700">
                  {contextInfo.sourceName}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    ₹
                  </span>
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
              <p className="text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Controller
              name="date"
              control={control}
              render={({ field }) => <Input {...field} id="date" type="date" />}
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
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (value === "add_custom") {
                        setShowCategoryInput(true);
                      } else {
                        field.onChange(value);
                        setValue("subtype", ""); // Reset subtype when category changes
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(transactionType === "income"
                        ? incomeCategories
                        : expenseCategories
                      ).map((cat) => (
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
            {errors.category && (
              <p className="text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          {/* Subtype */}
          {selectedCategory && (
            <div className="space-y-2">
              <Label htmlFor="subtype">Subtype *</Label>
              {showSubtypeInput ? (
                <div className="flex space-x-2">
                  <Input
                    value={newSubtypeName}
                    onChange={(e) => setNewSubtypeName(e.target.value)}
                    placeholder="Enter subtype name"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomSubtype();
                      } else if (e.key === "Escape") {
                        setShowSubtypeInput(false);
                        setNewSubtypeName("");
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomSubtype}
                    disabled={!newSubtypeName.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowSubtypeInput(false);
                      setNewSubtypeName("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Controller
                  name="subtype"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        if (value === "add_custom") {
                          setShowSubtypeInput(true);
                        } else {
                          field.onChange(value);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subtype" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSubtypes(selectedCategory, transactionType).map(
                          (subtype) => (
                            <SelectItem key={subtype} value={subtype}>
                              {subtype}
                            </SelectItem>
                          ),
                        )}
                        <SelectItem
                          value="add_custom"
                          className="text-blue-600 font-medium border-t mt-1 pt-2"
                        >
                          <div className="flex items-center space-x-2">
                            <Plus className="h-4 w-4" />
                            <span>Add Sub-category</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {errors.subtype && (
                <p className="text-sm text-red-600">{errors.subtype.message}</p>
              )}
            </div>
          )}

          {/* Budget Selection - Optional, shows available budgets */}
          {selectedCategory &&
            selectedSubtype &&
            getMatchingBudgets().length > 0 && (
              <div className="space-y-2">
                <Label
                  htmlFor="budgetId"
                  className="flex items-center space-x-1"
                >
                  <span>Budget (Optional)</span>
                  <span className="text-xs text-gray-500">
                    Auto-mapped if not selected
                  </span>
                </Label>
                <Controller
                  name="budgetId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Auto-select matching budget" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-select</SelectItem>
                        {getMatchingBudgets().map((budget) => (
                          <SelectItem key={budget.id} value={budget.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {budget.category}
                                {budget.subtype && ` → ${budget.subtype}`}
                              </span>
                              <span className="text-xs text-gray-500">
                                {format(budget.limit_amount)} / {budget.period}
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

          {selectedCategory &&
            selectedSubtype &&
            getMatchingBudgets().length === 0 && (
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
      {transactionType === "expense" &&
        budgetInfo &&
        budgetInfo.budgetLimit !== undefined && (
          <Card
            className={`border-2 ${budgetInfo.isOverLimit ? "border-red-500 bg-red-50" : budgetInfo.isNearLimit ? "border-orange-500 bg-orange-50" : "border-blue-500 bg-blue-50"}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <AlertCircle
                  className={`h-5 w-5 ${budgetInfo.isOverLimit ? "text-red-600" : budgetInfo.isNearLimit ? "text-orange-600" : "text-blue-600"}`}
                />
                <CardTitle className="text-base">Budget Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Budget Limit:</span>
                  <span className="font-semibold">
                    {format(budgetInfo.budgetLimit || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Current Spending:</span>
                  <span className="font-semibold">
                    {format(budgetInfo.totalSpent || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>After this transaction:</span>
                  <span
                    className={`font-semibold ${budgetInfo.isOverLimit ? "text-red-600" : ""}`}
                  >
                    {format(budgetInfo.newTotal || 0)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      budgetInfo.isOverLimit
                        ? "bg-red-600"
                        : budgetInfo.isNearLimit
                          ? "bg-orange-500"
                          : "bg-blue-600"
                    }`}
                    style={{
                      width: `${Math.min(budgetInfo.percentage || 0, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-center font-medium mt-2">
                  {(budgetInfo.percentage || 0).toFixed(1)}% of budget
                </p>
                {budgetInfo.isOverLimit &&
                  budgetInfo.remainingAmount !== undefined && (
                    <p className="text-sm text-red-600 font-medium text-center">
                      ⚠️ This will exceed your budget by{" "}
                      {format(Math.abs(budgetInfo.remainingAmount))}
                    </p>
                  )}
                {budgetInfo.isNearLimit &&
                  !budgetInfo.isOverLimit &&
                  budgetInfo.remainingAmount !== undefined && (
                    <p className="text-sm text-orange-600 font-medium text-center">
                      ⚠️ Remaining: {format(budgetInfo.remainingAmount)}
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Link to Goal / Loan / Savings Challenge (expenses only) */}
      {showLinkToSection && (
        <Card
          className={`border-2 ${isGoalRequired ? "border-red-500 bg-red-50" : "border-green-500 bg-green-50"}`}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Target
                className={`h-5 w-5 ${isGoalRequired ? "text-red-600" : "text-green-600"}`}
              />
              <CardTitle className="text-base">
                Link to goal, loan, or savings
              </CardTitle>
            </div>
            <CardDescription>
              {isGoalRequired
                ? "Goal is required for Savings. You can also record this as a loan payment or savings challenge contribution."
                : "Optionally add this expense to a goal, record as a loan payment, or contribute to a savings challenge."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Goal */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Target className="h-4 w-4" />
                Goal {isGoalRequired ? "*" : "(optional)"}
              </Label>
              {goals.length === 0 && isGoalRequired ? (
                <div className="text-sm text-red-600 bg-white p-3 rounded border border-red-200">
                  ⚠️ No active goals.{" "}
                  <a
                    href="/goals"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Create a goal
                  </a>
                </div>
              ) : (
                <Controller
                  name="goalId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        className={errors.goalId ? "border-red-500" : ""}
                      >
                        <SelectValue
                          placeholder={
                            isGoalRequired
                              ? "Select a goal *"
                              : "Select a goal (optional)"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {!isGoalRequired && (
                          <SelectItem value="none">No goal</SelectItem>
                        )}
                        {goals.map((goal) => (
                          <SelectItem key={goal.id} value={goal.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{goal.title}</span>
                              <span className="text-xs text-gray-500">
                                {format(goal.currentAmount)} /{" "}
                                {format(goal.targetAmount)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              )}
              {errors.goalId && (
                <p className="text-sm text-red-600">{errors.goalId.message}</p>
              )}
            </div>

            {/* Loan */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <CreditCard className="h-4 w-4" />
                Loan (optional)
              </Label>
              <Controller
                name="debtId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Record as loan payment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No loan</SelectItem>
                      {debts.map((debt) => (
                        <SelectItem key={debt.id} value={debt.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{debt.name}</span>
                            <span className="text-xs text-gray-500">
                              {format(debt.balance)} • {debt.type}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {debts.length === 0 && (
                <p className="text-xs text-gray-500">
                  No loans. Add one in{" "}
                  <a
                    href="/debt-tracker"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Debt Tracker
                  </a>
                  .
                </p>
              )}
            </div>

            {/* Savings Challenge */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <Trophy className="h-4 w-4" />
                Savings challenge (optional)
              </Label>
              <Controller
                name="savingsChallengeId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Contribute to challenge" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No challenge</SelectItem>
                      {savingsChallenges.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-xs text-gray-500">
                              {format(c.current_amount)} /{" "}
                              {format(c.target_amount)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {savingsChallenges.length === 0 && (
                <p className="text-xs text-gray-500">
                  No active challenges.{" "}
                  <a
                    href="/savings-challenges"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Savings Challenges
                  </a>
                  .
                </p>
              )}
            </div>
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
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
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
    </form>
  );
}
