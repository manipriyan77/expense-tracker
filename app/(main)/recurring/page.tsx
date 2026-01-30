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
} from "lucide-react";
import type { Transaction } from "@/store/transactions-store";
import {
  useRecurringPatternsStore,
  type RecurringPattern,
} from "@/store/recurring-patterns-store";
import { useTransactionsStore } from "@/store/transactions-store";
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [creatingTransaction, setCreatingTransaction] = useState<string | null>(
    null,
  );
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
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    auto_create: false,
  });

  useEffect(() => {
    fetchPatterns();
    fetchTransactions();
  }, [fetchPatterns, fetchTransactions]);

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

    try {
      const nextDate = new Date(formData.start_date);
      await addPattern({
        name: formData.name,
        type: formData.type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        category: formData.category,
        subtype: formData.subtype || "Other",
        frequency: formData.frequency,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        next_date: nextDate.toISOString().split("T")[0],
        is_active: true,
        auto_create: formData.auto_create,
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
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        auto_create: false,
      });
      setIsAddDialogOpen(false);
    } catch {
      toast.error("Failed to add recurring pattern");
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Recurring Transactions
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Income
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {format(totalMonthlyIncome)}
              </div>
              <p className="text-xs text-muted-foreground">
                From recurring sources
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monthly Expenses
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {format(totalMonthlyExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                From recurring bills
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Monthly</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {format(totalMonthlyIncome - totalMonthlyExpenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                Expected balance change
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Recurring Transactions */}
        {upcomingRecurring.length > 0 && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Upcoming This Week
              </CardTitle>
              <CardDescription>
                Recurring transactions due in the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingRecurring.map((pattern) => (
                  <div
                    key={pattern.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{pattern.description}</p>
                        <span className="text-xs text-gray-500">
                          {pattern.daysUntil === 0
                            ? "Due today"
                            : pattern.daysUntil === 1
                              ? "Due tomorrow"
                              : `Due in ${pattern.daysUntil} days`}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {pattern.category} • {format(pattern.amount)}
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

        {/* Smart Detection */}
        {potentialRecurring.length > 0 && (
          <Card className="mb-8 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                Smart Detection
              </CardTitle>
              <CardDescription>
                We found potential recurring transactions in your history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {potentialRecurring.map((potential, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-200"
                  >
                    <div className="flex-1">
                      <p className="font-semibold">{potential.description}</p>
                      <p className="text-sm text-gray-600">
                        {potential.category} • {format(potential.amount)} •{" "}
                        {potential.frequency} • Found {potential.count} times
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSmartDetect(potential)}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Create Pattern
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Recurring Transaction</DialogTitle>
                <DialogDescription>
                  Set up automatic income or expense tracking
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                      setFormData({ ...formData, type: value })
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
                      setFormData({ ...formData, description: e.target.value })
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
                      setFormData({ ...formData, subtype: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
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
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
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

                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date (Optional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                  />
                </div>

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

        {/* Patterns List */}
        <div className="space-y-4">
          {patterns.map((pattern) => {
            const nextDate = new Date(pattern.next_date);
            const daysUntil = Math.ceil(
              (nextDate.getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            );
            const isDue = daysUntil <= 0;

            return (
              <Card
                key={pattern.id}
                className={
                  pattern.is_active
                    ? isDue
                      ? "border-orange-200 bg-orange-50"
                      : ""
                    : "opacity-60"
                }
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`p-3 rounded-full ${
                          pattern.type === "income"
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {pattern.type === "income" ? (
                          <TrendingUp className="h-5 w-5" />
                        ) : (
                          <TrendingDown className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-semibold text-lg">
                            {pattern.name}
                          </p>
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                            {pattern.frequency}
                          </span>
                          {pattern.auto_create && (
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700">
                              Auto
                            </span>
                          )}
                          {isDue && pattern.is_active && (
                            <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-700">
                              Due
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {pattern.description} • {pattern.category}
                        </p>
                        <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Next: {nextDate.toLocaleDateString()}
                            {daysUntil >= 0 &&
                              ` (${daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `${daysUntil} days`})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p
                          className={`text-xl font-bold ${
                            pattern.type === "income"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {pattern.type === "income" ? "+" : "-"}
                          {format(pattern.amount)}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {isDue && pattern.is_active && (
                          <Button
                            size="sm"
                            onClick={() => handleCreateTransaction(pattern.id)}
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
                </CardContent>
              </Card>
            );
          })}
        </div>

        {patterns.length === 0 && !loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Repeat className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">
                No recurring transactions
              </p>
              <p className="text-gray-600 mb-4">
                Add your first recurring income or expense
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
