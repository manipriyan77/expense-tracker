"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  Sparkles,
  CreditCard,
  PiggyBank,
  Repeat,
  Wallet,
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
import { useTransactionsStore } from "@/store/transactions-store";

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
  subtype: z.string(),
  budgetId: z.string().optional(),
  goalId: z.string().optional(),
  debtId: z.string().optional(),
  date: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringFrequency: z
    .enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"])
    .optional(),
  recurringEndDate: z.string().optional(),
  recurringDayOfMonth: z.number().min(1).max(31).optional(),
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;

/** Sentinel for Radix Select when subtype is empty (must not collide with real subcategory names). */
const SUBTYPE_SELECT_NONE = "__subtype_none__";

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
    description?: string;
    date?: string;
  };
  contextInfo?: {
    source?: "budget" | "goal";
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
  const { transactions } = useTransactionsStore();

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

  const duplicates = !transactionId && amount && selectedCategory && formDate
    ? transactions.filter(
        (t) =>
          Math.abs(t.amount - parseFloat(amount)) < 0.01 &&
          t.category === selectedCategory &&
          t.date === formDate
      )
    : [];

  // Budgets for the calendar month of the transaction date (so the list matches the month you’re adding for)
  useEffect(() => {
    const run = async () => {
      try {
        const d = formDate
          ? new Date(formDate + "T12:00:00")
          : new Date();
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        const response = await fetch(
          `/api/budgets?month=${month}&year=${year}`,
        );
        if (response.ok) {
          const data = await response.json();
          setBudgets(data);
        }
      } catch (error) {
        console.error("Error fetching budgets:", error);
      }
    };
    run();
  }, [formDate]);

  // Load goals and debts for expenses
  useEffect(() => {
    if (transactionType === "expense") {
      fetchGoals();
      fetchDebts();
    }
  }, [transactionType]);

  // Check budget when expense details change (subtype optional)
  useEffect(() => {
    if (transactionType === "expense" && selectedCategory && amount) {
      checkBudget();
    } else {
      setBudgetInfo(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactionType, selectedCategory, selectedSubtype, amount]);

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


  const checkBudget = async () => {
    try {
      const response = await fetch("/api/budgets/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          subtype: selectedSubtype?.trim() || "",
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
    const amount = Number.parseFloat(String(data.amount).replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setIsSubmitting(false);
      alert("Enter a valid positive amount.");
      return;
    }
    const payload = {
      amount,
      type: data.type,
      description: data.description,
      category: data.category,
      subtype: (data.subtype ?? "").trim(),
      budgetId:
        data.budgetId &&
        data.budgetId !== "auto" &&
        data.budgetId !== "none"
          ? data.budgetId
          : null,
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
        const linkedBudgetId =
          data.type === "expense" &&
          data.budgetId &&
          data.budgetId !== "auto" &&
          data.budgetId !== "none"
            ? data.budgetId
            : null;

        const patternRes = await fetch("/api/recurring-patterns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.description,
            type: data.type,
            amount,
            description: data.description,
            category: data.category,
            subtype: (data.subtype ?? "").trim(),
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
            linked_budget_id: linkedBudgetId,
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
            ? (data.recurringDayOfMonth ?? null)
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
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add transaction");
      }

      const hasDebt = data.debtId && data.debtId !== "none";

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


      reset();
      onSuccess();
    } catch (error) {
      console.error(
        transactionId
          ? "Error updating transaction:"
          : "Error adding transaction:",
        error,
      );
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

  // Budgets that match this category (and subtype when set)
  const getMatchingBudgets = () => {
    if (!selectedCategory) return [];

    const norm = (s: string | null | undefined) => (s ?? "").trim();
    const selectedSub = norm(selectedSubtype);

    return budgets.filter((budget) => {
      if (budget.category !== selectedCategory) return false;
      const budgetSub = norm(budget.subtype);
      if (!selectedSub) return true;
      if (budgetSub === selectedSub) return true;
      if (!budgetSub) return true;
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

  const availableCategories = [
    ...(transactionType === "income" ? incomeCategories : expenseCategories),
    ...customCategories,
  ];

  const availableSubtypes = selectedCategory
    ? getSubtypes(selectedCategory, transactionType)
    : [];

  const subtypeSelectOptions = useMemo(() => {
    const list = [...availableSubtypes];
    const v = (selectedSubtype ?? "").trim();
    if (v && !list.includes(v)) list.push(v);
    return list;
  }, [availableSubtypes, selectedSubtype]);

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-6">
      {/* Context Info Banner */}
      {contextInfo && contextInfo.source && (
        <div className="rounded-xl border border-blue-200 bg-linear-to-r from-blue-50 to-blue-50/50 p-4 dark:border-blue-900/30 dark:from-blue-950/40 dark:to-blue-950/20">
          <div className="flex items-start gap-3">
            {contextInfo.source === "budget" && (
              <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            )}
            {contextInfo.source === "goal" && (
              <Target className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {contextInfo.source === "budget"
                  ? "Budget context"
                  : contextInfo.source === "goal"
                    ? "Goal context"
                    : "Context"}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {contextInfo.sourceName}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Detection Warning */}
      {duplicates.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Possible duplicate
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {duplicates[0].description} — same amount, category &amp; date already exists.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Type Selector - Modern Tabs */}
      <div className="flex gap-2 bg-muted p-1.5 rounded-lg">
        {["income", "expense"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setValue("type", t as "income" | "expense");
              setValue("category", "");
              setValue("subtype", "");
            }}
            className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all ${
              transactionType === t
                ? t === "income"
                  ? "bg-green-500 text-white shadow-md dark:bg-green-600"
                  : "bg-red-500 text-white shadow-md dark:bg-red-600"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "income" ? "Income" : "Expense"}
          </button>
        ))}
      </div>

      {/* Amount Input - Large and Prominent */}
      <div className="rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-linear-to-b from-muted/50 to-muted/25 p-8 text-center">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 block">
          Amount
        </Label>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-3xl font-light text-muted-foreground">₹</span>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0"
                className={`border-0 bg-transparent text-5xl font-bold text-center placeholder-muted-foreground/30 focus-visible:ring-0 focus-visible:outline-none ${
                  errors.amount ? "text-red-600" : ""
                }`}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
        </div>
        {errors.amount && (
          <p className="text-sm text-red-600 mt-3">{errors.amount.message}</p>
        )}
      </div>

      {/* Quick Entry: Date + Description */}
      <div className="grid grid-cols-2 gap-4">
        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="date" className="text-xs font-medium">
            Date
          </Label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <Input
                id="date"
                type="date"
                value={field.value}
                onChange={field.onChange}
                className={`text-sm ${errors.date ? "border-red-500" : ""}`}
              />
            )}
          />
          {errors.date && (
            <p className="text-xs text-red-600">{errors.date.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label
            htmlFor="description"
            className="text-xs font-medium flex items-center gap-1"
          >
            Description
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          </Label>
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Input
                id="description"
                placeholder="What for?"
                className="text-sm"
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  const match = matchRule(e.target.value);
                  setAutoRuleSuggestion(match);
                }}
              />
            )}
          />
        </div>
      </div>

      {/* Auto-Rule Suggestion */}
      {autoRuleSuggestion && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-950/30 dark:border-amber-900/50">
          <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Smart categorization detected
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Auto-map{" "}
              <span className="font-semibold">
                "{autoRuleSuggestion.category}"
              </span>
              {autoRuleSuggestion.subtype && (
                <> / {autoRuleSuggestion.subtype}</>
              )}
            </p>
          </div>
          <button
            type="button"
            className="text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 font-medium text-sm"
            onClick={() => {
              setValue("category", autoRuleSuggestion.category);
              if (autoRuleSuggestion.subtype)
                setValue("subtype", autoRuleSuggestion.subtype);
              setAutoRuleSuggestion(null);
            }}
          >
            Apply
          </button>
          <button
            type="button"
            className="text-amber-600 hover:text-amber-800 dark:text-amber-500"
            onClick={() => setAutoRuleSuggestion(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Category Selection - Button Grid */}
      <div className="space-y-3">
        <Label className="text-xs font-medium">Category *</Label>
        <div className="grid grid-cols-3 gap-2">
          {availableCategories.slice(0, 6).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setValue("category", cat);
                setValue("subtype", "");
              }}
              className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-foreground text-background shadow-md"
                  : "bg-muted text-foreground hover:bg-muted/80 border border-transparent hover:border-muted-foreground/20"
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCategoryInput(true)}
            className="py-2.5 px-3 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50"
          >
            + Add
          </button>
        </div>
        {showCategoryInput && (
          <div className="flex gap-2">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCustomCategory();
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
        )}
        {errors.category && (
          <p className="text-sm text-red-600">{errors.category.message}</p>
        )}
      </div>

      {/* Subcategory + budget: always visible so users see them; enabled after a category is chosen */}
      <div className="space-y-4 rounded-lg border border-muted bg-muted/30 p-4">
        {!selectedCategory && (
          <p className="text-xs text-muted-foreground rounded-md border border-dashed border-border bg-background/60 px-3 py-2.5">
            Choose a <span className="font-medium text-foreground">category</span> above
            first — then you can set a subcategory
            {transactionType === "expense" && " and link this expense to a budget"}.
          </p>
        )}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Subcategory (optional)</Label>
          <Controller
            name="subtype"
            control={control}
            render={({ field }) => (
              <Select
                disabled={!selectedCategory}
                value={
                  field.value?.trim()
                    ? field.value
                    : SUBTYPE_SELECT_NONE
                }
                onValueChange={(v) =>
                  field.onChange(v === SUBTYPE_SELECT_NONE ? "" : v)
                }
              >
                <SelectTrigger className="text-sm w-full">
                  <SelectValue
                    placeholder={
                      selectedCategory
                        ? "Choose subcategory"
                        : "Select a category first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SUBTYPE_SELECT_NONE}>
                    {!selectedCategory
                      ? "Select a category first"
                      : "None / not specified"}
                  </SelectItem>
                  {subtypeSelectOptions.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto text-xs"
            disabled={!selectedCategory}
            onClick={() => setShowSubtypeInput(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add custom subcategory
          </Button>
          {selectedCategory && showSubtypeInput && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={newSubtypeName}
                  onChange={(e) => setNewSubtypeName(e.target.value)}
                  placeholder="Subcategory name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomSubtype();
                    }
                  }}
                  autoFocus
                  className="flex-1"
                />
                <div className="flex gap-2 shrink-0">
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
              </div>
            )}
          </div>

        {transactionType === "expense" && (
          <div className="space-y-2 pt-3 border-t border-border">
            <Label className="text-xs font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 shrink-0" />
              Link to budget (optional)
            </Label>
            {!selectedCategory ? (
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted/80 px-3 text-sm text-muted-foreground">
                Select a category first
              </div>
            ) : allBudgetsForExpense.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No budgets for this month yet.{" "}
                <a
                  href="/budgets"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium"
                >
                  Create a budget
                </a>
              </p>
            ) : (
              <Controller
                name="budgetId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value?.trim() ? field.value : "none"}
                    onValueChange={(v) =>
                      field.onChange(v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger className="text-sm w-full">
                      <SelectValue placeholder="Select budget (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No budget</SelectItem>
                      {getMatchingBudgets().length > 0 && (
                        <SelectGroup>
                          <SelectLabel className="text-xs font-semibold text-green-600">
                            Matching your category
                          </SelectLabel>
                          {getMatchingBudgets().map((budget) => (
                            <SelectItem key={budget.id} value={budget.id}>
                              <span className="font-medium">
                                {budget.category}
                              </span>
                              {budget.subtype && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({budget.subtype})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                      {allBudgetsForExpense
                        .filter(
                          (b) =>
                            !getMatchingBudgets().some((m) => m.id === b.id),
                        )
                        .map((budget) => (
                          <SelectItem key={budget.id} value={budget.id}>
                            <span className="font-medium">
                              {budget.category}
                            </span>
                            {budget.subtype && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({budget.subtype})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>
        )}
      </div>

      {/* Recurring option */}
      {!transactionId && (
        <div className="space-y-3 rounded-lg border border-muted bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Repeat className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium cursor-pointer">
                  Repeat this transaction
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Set up a recurring pattern
                </p>
              </div>
            </div>
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
            <div className="space-y-2 pt-2 border-t border-muted-foreground/10">
              {/* Frequency */}
              <div className="space-y-2">
                <Label
                  htmlFor="recurringFrequency"
                  className="text-xs font-medium"
                >
                  Frequency
                </Label>
                <Controller
                  name="recurringFrequency"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="recurringFrequency"
                        className="text-sm"
                      >
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

              {/* Day of month (conditional) */}
              {recurringFrequency === "monthly" && (
                <div className="space-y-2">
                  <Label
                    htmlFor="recurringDayOfMonth"
                    className="text-xs font-medium"
                  >
                    Day of month
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
                        <SelectTrigger
                          id="recurringDayOfMonth"
                          className="text-sm"
                        >
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

              {/* End date */}
              <div className="space-y-2">
                <Label
                  htmlFor="recurringEndDate"
                  className="text-xs font-medium"
                >
                  End date (optional)
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
                      className="text-sm"
                    />
                  )}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Budget Warning (for expenses) */}
      {transactionType === "expense" &&
        budgetInfo &&
        budgetInfo.budgetLimit !== undefined && (
          <div
            className={`rounded-lg border-2 p-4 ${
              budgetInfo.isOverLimit
                ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
                : budgetInfo.isNearLimit
                  ? "border-orange-500 bg-orange-50/50 dark:bg-orange-950/20"
                  : "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className={`h-5 w-5 shrink-0 mt-0.5 ${
                  budgetInfo.isOverLimit
                    ? "text-red-600 dark:text-red-400"
                    : budgetInfo.isNearLimit
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-blue-600 dark:text-blue-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold mb-3">Budget Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Limit:</span>
                    <span className="font-semibold">
                      {format(budgetInfo.budgetLimit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Spent:</span>
                    <span className="font-semibold">
                      {format(budgetInfo.totalSpent)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">After this:</span>
                    <span
                      className={`font-semibold ${
                        budgetInfo.isOverLimit
                          ? "text-red-600 dark:text-red-400"
                          : ""
                      }`}
                    >
                      {format(budgetInfo.newTotal)}
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-1.5 mt-2">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
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
                  <p className="text-xs text-center font-medium text-muted-foreground mt-2">
                    {(budgetInfo.percentage || 0).toFixed(0)}% used
                  </p>
                  {budgetInfo.isOverLimit &&
                    budgetInfo.remainingAmount !== undefined && (
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        ⚠️ Will exceed by{" "}
                        {format(Math.abs(budgetInfo.remainingAmount))}
                      </p>
                    )}
                  {budgetInfo.isNearLimit &&
                    !budgetInfo.isOverLimit &&
                    budgetInfo.remainingAmount !== undefined && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                        ⚠️ Remaining: {format(budgetInfo.remainingAmount)}
                      </p>
                    )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Link to Goal / Loan / Savings Challenge (expenses only) */}
      {showLinkToSection && (
        <div className="space-y-3 rounded-lg border border-muted bg-muted/30 p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Link to goal, loan, or savings
            {isGoalRequired && (
              <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
                Required
              </span>
            )}
          </h3>

          {/* Goal */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <Target className="h-3.5 w-3.5" />
              Goal {isGoalRequired ? "*" : "(optional)"}
            </Label>
            {goals.length === 0 && isGoalRequired ? (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded border border-red-200 dark:border-red-900/50">
                No active goals.{" "}
                <a
                  href="/goals"
                  target="_blank"
                  rel="noreferrer"
                  className="underline font-medium"
                >
                  Create one
                </a>
              </div>
            ) : (
              <Controller
                name="goalId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={
                      field.value?.trim()
                        ? field.value
                        : isGoalRequired
                          ? undefined
                          : "none"
                    }
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  >
                    <SelectTrigger
                      className={`text-sm ${errors.goalId ? "border-red-500" : ""}`}
                    >
                      <SelectValue
                        placeholder={
                          isGoalRequired ? "Select a goal *" : "Select a goal"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {!isGoalRequired && (
                        <SelectItem value="none">No goal</SelectItem>
                      )}
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          <div className="flex items-center gap-2">
                            <span>{goal.title}</span>
                            <span className="text-xs text-muted-foreground">
                              ({format(goal.currentAmount)}/
                              {format(goal.targetAmount)})
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
              <p className="text-xs text-red-600">{errors.goalId.message}</p>
            )}
          </div>

          {/* Loan */}
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5" />
              Loan payment (optional)
            </Label>
            <Controller
              name="debtId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value?.trim() ? field.value : "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select a loan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No loan</SelectItem>
                    {debts.map((debt) => (
                      <SelectItem key={debt.id} value={debt.id}>
                        <div className="flex items-center gap-2">
                          <span>{debt.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({format(debt.balance)})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 sticky bottom-0 bg-background pt-4 border-t border-muted">
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
          className="flex-1 bg-foreground text-background hover:bg-foreground/90"
          disabled={isSubmitting}
          size="lg"
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
    </form>
  );
}
