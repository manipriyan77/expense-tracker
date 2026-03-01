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
  Repeat,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { useCategorizationRulesStore } from "@/store/categorization-rules-store";

const recurringFrequencyOptions = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "quarterly",
  "yearly",
] as const;
type RecurringFrequency = (typeof recurringFrequencyOptions)[number];

const transactionFormSchema = z.object({
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
  isRecurring: z.boolean().optional(),
  recurringFrequency: z
    .enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"])
    .optional(),
  recurringEndDate: z.string().optional(),
  recurringDayOfMonth: z.number().min(1).max(31).optional(),
});

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
  transactionId?: string;
  initialValues?: {
    type?: "income" | "expense";
    amount?: string;
    category?: string;
    subtype?: string;
    budgetId?: string;
    goalId?: string;
    debtId?: string;
    savingsChallengeId?: string;
    description?: string;
    date?: string;
  };
  contextInfo?: {
    source?: "budget" | "goal" | "savings-challenge";
    sourceName?: string;
  };
}

export default function AddTransactionForm({
  onSuccess,
  onCancel,
  transactionId,
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
  const [autoRuleSuggestion, setAutoRuleSuggestion] = useState<{
    category: string;
    subtype: string | null;
  } | null>(null);
  const { matchRule, fetchRules } = useCategorizationRulesStore();

  useEffect(() => {
    fetchRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      amount: initialValues?.amount ?? "",
      description: initialValues?.description || "",
      category: initialValues?.category || "",
      subtype: initialValues?.subtype || "",
      budgetId: initialValues?.budgetId || "",
      goalId: initialValues?.goalId || "",
      debtId: initialValues?.debtId || "",
      savingsChallengeId: initialValues?.savingsChallengeId || "",
      date: initialValues?.date ?? new Date().toISOString().split("T")[0],
      isRecurring: false,
      recurringFrequency: "monthly",
      recurringEndDate: "",
      recurringDayOfMonth: undefined,
    },
  });

  const transactionType = watch("type");
  const selectedCategory = watch("category");
  const selectedSubtype = watch("subtype");
  const amount = watch("amount");
  const isRecurring = watch("isRecurring");
  const formDate = watch("date");
  const recurringFrequency = watch("recurringFrequency");

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
    const payload = {
      amount,
      type: data.type,
      description: data.description,
      category: data.category,
      subtype: data.subtype,
      budgetId:
        data.budgetId && data.budgetId !== "auto" ? data.budgetId : null,
      goalId: data.goalId && data.goalId !== "none" ? data.goalId : null,
      date: txDate,
    };

    try {
      if (transactionId) {
        const response = await fetch(`/api/transactions/${transactionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to update transaction");
        }
        reset();
        onSuccess();
        return;
      }

      // Recurring: create pattern, then first transaction, then advance pattern's next_date
      if (data.isRecurring && data.recurringFrequency) {
        const patternRes = await fetch("/api/recurring-patterns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.description,
            type: data.type,
            amount,
            description: data.description,
            category: data.category,
            subtype: data.subtype,
            frequency: data.recurringFrequency,
            day_of_month:
              data.recurringFrequency === "monthly" && data.recurringDayOfMonth
                ? data.recurringDayOfMonth
                : null,
            start_date: txDate,
            end_date: data.recurringEndDate || null,
            next_date: txDate,
            is_active: true,
            auto_create: false,
            tags: [],
            notes: null,
          }),
        });
        if (!patternRes.ok) {
          const err = await patternRes.json();
          throw new Error(err.error || "Failed to create recurring pattern");
        }
        const pattern = await patternRes.json();

        const txRes = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!txRes.ok) {
          const err = await txRes.json();
          throw new Error(err.error || "Failed to add transaction");
        }

        const nextDate = getNextRecurringDate(
          txDate,
          data.recurringFrequency as RecurringFrequency,
          data.recurringFrequency === "monthly"
            ? data.recurringDayOfMonth ?? null
            : null,
        );
        await fetch(`/api/recurring-patterns/${pattern.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ next_date: nextDate }),
        });

        reset();
        onSuccess();
        return;
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      console.error(transactionId ? "Error updating transaction:" : "Error adding transaction:", error);
      alert(
        error instanceof Error
          ? error.message
          : transactionId
            ? "Failed to update transaction. Please try again."
            : "Failed to add transaction. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter budgets that match current category + subtype (for "matching" highlight)
  const getMatchingBudgets = () => {
    if (!selectedCategory || !selectedSubtype) return [];

    const norm = (s: string | null | undefined) => (s ?? "").trim();

    return budgets.filter((budget) => {
      if (budget.category !== selectedCategory) return false;
      const budgetSub = norm(budget.subtype);
      const selectedSub = norm(selectedSubtype);
      if (budgetSub === selectedSub) return true;
      if (!budgetSub) return true; // category-level budget matches any subtype
      return false;
    });
  };

  // All budgets for expense type (so user can always assign to any budget)
  const allBudgetsForExpense = budgets;

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

  // Advance date by one interval for recurring pattern
  const getNextRecurringDate = (
    dateStr: string,
    frequency: RecurringFrequency,
    dayOfMonth?: number | null,
  ): string => {
    const d = new Date(dateStr);
    switch (frequency) {
      case "daily":
        d.setDate(d.getDate() + 1);
        break;
      case "weekly":
        d.setDate(d.getDate() + 7);
        break;
      case "biweekly":
        d.setDate(d.getDate() + 14);
        break;
      case "monthly": {
        d.setMonth(d.getMonth() + 1);
        if (dayOfMonth != null && dayOfMonth >= 1 && dayOfMonth <= 31) {
          const lastDay = new Date(
            d.getFullYear(),
            d.getMonth() + 1,
            0,
          ).getDate();
          d.setDate(Math.min(dayOfMonth, lastDay));
        }
        break;
      }
      case "quarterly":
        d.setMonth(d.getMonth() + 3);
        break;
      case "yearly":
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    return d.toISOString().split("T")[0];
  };

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
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
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
                  onChange={(e) => {
                    field.onChange(e);
                    const match = matchRule(e.target.value);
                    setAutoRuleSuggestion(match);
                  }}
                />
              )}
            />
            {errors.description && (
              <p className="text-sm text-red-600">
                {errors.description.message}
              </p>
            )}
            {autoRuleSuggestion && (
              <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md text-xs">
                <Sparkles className="h-3 w-3 text-yellow-600 shrink-0" />
                <span className="text-yellow-800 dark:text-yellow-300">
                  Auto-rule matched: <strong>{autoRuleSuggestion.category}</strong>
                  {autoRuleSuggestion.subtype && <> / {autoRuleSuggestion.subtype}</>}
                </span>
                <button
                  type="button"
                  className="ml-auto text-yellow-700 hover:text-yellow-900 dark:text-yellow-400 font-medium"
                  onClick={() => {
                    setValue("category", autoRuleSuggestion.category);
                    if (autoRuleSuggestion.subtype) setValue("subtype", autoRuleSuggestion.subtype);
                    setAutoRuleSuggestion(null);
                  }}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-500"
                  onClick={() => setAutoRuleSuggestion(null)}
                >
                  ×
                </button>
              </div>
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

          {/* Budget Selection - Optional, for expenses */}
          {transactionType === "expense" && selectedCategory && selectedSubtype && (
            <div className="space-y-2">
              <Label
                htmlFor="budgetId"
                className="flex items-center space-x-1"
              >
                <span>Link to budget (Optional)</span>
              </Label>
              <Controller
                name="budgetId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a budget" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Don't link to a budget</SelectItem>
                      <SelectItem value="auto">Auto-select matching budget</SelectItem>
                      {getMatchingBudgets().length > 0 && (
                        <>
                          {getMatchingBudgets().map((budget) => (
                            <SelectItem key={budget.id} value={budget.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {budget.category}
                                  {budget.subtype && ` → ${budget.subtype}`}
                                  <span className="text-xs text-green-600 ml-1">(matches)</span>
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(budget.limit_amount)} / {budget.period}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {allBudgetsForExpense
                        .filter((b) => !getMatchingBudgets().some((m) => m.id === b.id))
                        .map((budget) => (
                          <SelectItem key={budget.id} value={budget.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {budget.category}
                                {budget.subtype && ` → ${budget.subtype}`}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(budget.limit_amount)} / {budget.period}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-muted-foreground">
                {getMatchingBudgets().length > 0
                  ? "Choose a budget to link this expense to, or use Auto-select to match by category."
                  : "Choose a budget to link this expense to, or create one in Budgets."}
                {" "}
                <a href="/budgets" target="_blank" rel="noreferrer" className="underline">
                  Budgets
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring option */}
      {!transactionId && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Repeat className="h-5 w-5" />
              <CardTitle className="text-base">Repeat</CardTitle>
            </div>
            <CardDescription>
              Make this a recurring transaction. You can set an end date so it
              repeats until a specific date. Manage recurring patterns in
              Recurring.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="isRecurring" className="cursor-pointer">
                Repeat this transaction
              </Label>
              <Controller
                name="isRecurring"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="isRecurring"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            {isRecurring && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="recurringFrequency">Frequency</Label>
                  <Controller
                    name="recurringFrequency"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="recurringFrequency">
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
                    )}
                  />
                </div>
                {recurringFrequency === "monthly" && (
                  <div className="space-y-2">
                    <Label htmlFor="recurringDayOfMonth">
                      Day of month (e.g. 15 = every 15th)
                    </Label>
                    <Controller
                      name="recurringDayOfMonth"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value ? String(field.value) : "same"}
                          onValueChange={(v) =>
                            field.onChange(
                              v === "same" ? undefined : parseInt(v, 10),
                            )
                          }
                        >
                          <SelectTrigger id="recurringDayOfMonth">
                            <SelectValue placeholder="Same as transaction date" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="same">
                              Same as transaction date
                            </SelectItem>
                            {Array.from({ length: 31 }, (_, i) => (
                              <SelectItem key={i} value={String(i + 1)}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="recurringEndDate">
                    End date (optional – repeats until this date)
                  </Label>
                  <Controller
                    name="recurringEndDate"
                    control={control}
                    render={({ field }) => (
                      <Input
                        id="recurringEndDate"
                        type="date"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        min={formDate || undefined}
                      />
                    )}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

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
                <div className="w-full bg-border rounded-full h-2 mt-3">
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
          className={
            isGoalRequired
              ? "border-2 border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
              : "border-2 border-border"
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target
                className={`h-5 w-5 shrink-0 ${isGoalRequired ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"}`}
              />
              <div>
                <CardTitle className="text-base font-semibold text-foreground">
                  Link to goal, loan, or savings
                </CardTitle>
                <CardDescription className="mt-1 text-muted-foreground">
                  {isGoalRequired
                    ? "Goal is required for Savings. You can also record this as a loan payment or savings challenge contribution."
                    : "Optionally add this expense to a goal, record as a loan payment, or contribute to a savings challenge."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Goal */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Target className="h-4 w-4 text-muted-foreground" />
                Goal {isGoalRequired ? "*" : "(optional)"}
              </Label>
              {goals.length === 0 && isGoalRequired ? (
                <div className="text-sm text-red-600 bg-background p-3 rounded border border-red-200">
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
                              <span className="text-xs text-muted-foreground">
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
              <Label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
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
                            <span className="text-xs text-muted-foreground">
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
                <p className="text-xs text-muted-foreground">
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
              <Label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Trophy className="h-4 w-4 text-muted-foreground" />
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
                            <span className="text-xs text-muted-foreground">
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
                <p className="text-xs text-muted-foreground">
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
