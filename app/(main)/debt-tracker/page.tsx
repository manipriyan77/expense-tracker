"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  CreditCard,
  AlertCircle,
  TrendingDown,
  Calendar,
  DollarSign,
  Target,
  Trash2,
  Edit,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { formatCurrency } from "@/lib/utils/currency";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebtTrackerStore, type Debt } from "@/store/debt-tracker-store";

export default function DebtTrackerPage() {
  const {
    debts,
    payments,
    loading,
    fetchDebts,
    fetchAllPayments,
    addDebt,
    updateDebt,
    deleteDebt,
    addPayment,
  } = useDebtTrackerStore();

  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isEditDebtOpen, setIsEditDebtOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payoffStrategy, setPayoffStrategy] = useState<
    "snowball" | "avalanche"
  >("avalanche");

  // Form states
  const [debtForm, setDebtForm] = useState<{
    name: string;
    type: "credit_card" | "loan" | "mortgage" | "other";
    balance: string;
    original_amount: string;
    interest_rate: string;
    minimum_payment: string;
    due_date: string;
    term_months: string;
    months_remaining: string;
    currency: string;
    notes: string;
  }>({
    name: "",
    type: "credit_card",
    balance: "",
    original_amount: "",
    interest_rate: "",
    minimum_payment: "",
    due_date: "", // Will store full date in YYYY-MM-DD format
    term_months: "",
    months_remaining: "",
    currency: "INR",
    notes: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [calculatorInputs, setCalculatorInputs] = useState({
    currentPayment: "0",
    extraPayment: "0",
  });

  const [calculatorResult, setCalculatorResult] = useState<{
    months: number | null;
    baselineMonths: number | null;
    interestSaved: number | null;
    totalInterest: number | null;
    breakdown: {
      id: string;
      name: string;
      payoffMonth: number | null;
      interestPaid: number;
      baselinePayoffMonth: number | null;
      baselineInterestPaid: number | null;
    }[];
    error: string | null;
  }>({
    months: null,
    baselineMonths: null,
    interestSaved: null,
    totalInterest: null,
    breakdown: [],
    error: null,
  });

  const [extraFocusDebtId, setExtraFocusDebtId] = useState<string>("all");
  const [payoffView, setPayoffView] = useState<"cards" | "list">("cards");

  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const totalMinPayment = debts.reduce(
    (sum, debt) => sum + debt.minimum_payment,
    0,
  );
  const avgInterestRate =
    debts.length > 0
      ? debts.reduce((sum, debt) => sum + debt.interest_rate, 0) / debts.length
      : 0;

  const selectedBreakdown = React.useMemo(() => {
    if (
      !calculatorResult.breakdown ||
      calculatorResult.breakdown.length === 0
    ) {
      return null;
    }
    if (extraFocusDebtId === "all") return null;
    return (
      calculatorResult.breakdown.find((b) => b.id === extraFocusDebtId) ?? null
    );
  }, [calculatorResult.breakdown, extraFocusDebtId]);

  useEffect(() => {
    // Keep calculator default in sync with current minimum payments
    setCalculatorInputs((prev) => ({
      ...prev,
      currentPayment: totalMinPayment.toString(),
    }));
  }, [totalMinPayment]);

  useEffect(() => {
    // When focusing on a specific debt, align current payment with that debt's minimum
    if (extraFocusDebtId === "all") {
      setCalculatorInputs((prev) => ({
        ...prev,
        currentPayment: totalMinPayment.toString(),
      }));
      return;
    }
    const targetDebt = debts.find((d) => d.id === extraFocusDebtId);
    if (targetDebt) {
      setCalculatorInputs((prev) => ({
        ...prev,
        currentPayment: targetDebt.minimum_payment.toString(),
      }));
    }
  }, [extraFocusDebtId, debts, totalMinPayment]);

  const schedulePreview = React.useMemo(
    () =>
      buildDueDateSchedule(
        debtForm.due_date || null,
        debtForm.months_remaining
          ? parseInt(debtForm.months_remaining, 10)
          : debtForm.term_months
            ? parseInt(debtForm.term_months, 10)
            : null,
      ),
    [debtForm.due_date, debtForm.months_remaining, debtForm.term_months],
  );

  useEffect(() => {
    fetchDebts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch payments after debts are loaded
  useEffect(() => {
    if (debts.length > 0) {
      console.log("Debts loaded, fetching payments...");
      fetchAllPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debts.length]);

  // Calculate payoff order based on strategy
  const sortedDebts = [...debts].sort((a, b) => {
    if (payoffStrategy === "snowball") {
      return a.balance - b.balance; // Smallest balance first
    } else {
      return b.interest_rate - a.interest_rate; // Highest interest first
    }
  });

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const termMonths = debtForm.term_months
        ? parseInt(debtForm.term_months, 10)
        : null;
      const monthsRemaining = debtForm.months_remaining
        ? parseInt(debtForm.months_remaining, 10)
        : null;
      await addDebt({
        name: debtForm.name,
        type: debtForm.type,
        balance: parseFloat(debtForm.balance),
        original_amount: parseFloat(debtForm.original_amount),
        interest_rate: parseFloat(debtForm.interest_rate),
        minimum_payment: parseFloat(debtForm.minimum_payment),
        due_date: debtForm.due_date || null,
        term_months: termMonths,
        months_remaining: monthsRemaining,
        currency: debtForm.currency,
        notes: debtForm.notes,
      });
      toast.success("Debt added successfully!");
      setIsAddDebtOpen(false);
      setDebtForm({
        name: "",
        type: "credit_card",
        balance: "",
        original_amount: "",
        interest_rate: "",
        minimum_payment: "",
        due_date: "",
        term_months: "",
        months_remaining: "",
        currency: "INR",
        notes: "",
      });
    } catch (error) {
      toast.error("Failed to add debt");
    }
  };

  const handleEditDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    try {
      const termMonths = debtForm.term_months
        ? parseInt(debtForm.term_months, 10)
        : null;
      const monthsRemaining = debtForm.months_remaining
        ? parseInt(debtForm.months_remaining, 10)
        : null;
      await updateDebt(selectedDebt.id, {
        name: debtForm.name,
        type: debtForm.type,
        balance: parseFloat(debtForm.balance),
        original_amount: parseFloat(debtForm.original_amount),
        interest_rate: parseFloat(debtForm.interest_rate),
        minimum_payment: parseFloat(debtForm.minimum_payment),
        due_date: debtForm.due_date || null,
        term_months: termMonths,
        months_remaining: monthsRemaining,
        notes: debtForm.notes,
      });
      toast.success("Debt updated successfully!");
      setIsEditDebtOpen(false);
      setSelectedDebt(null);
    } catch (error) {
      toast.error("Failed to update debt");
    }
  };

  const handleDeleteDebt = async (debt: Debt) => {
    if (confirm(`Are you sure you want to delete ${debt.name}?`)) {
      try {
        await deleteDebt(debt.id);
        toast.success("Debt deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete debt");
      }
    }
  };

  const openEditDialog = (debt: Debt) => {
    setSelectedDebt(debt);
    setDebtForm({
      name: debt.name,
      type: debt.type,
      balance: debt.balance.toString(),
      original_amount: debt.original_amount.toString(),
      interest_rate: debt.interest_rate.toString(),
      minimum_payment: debt.minimum_payment.toString(),
      due_date: debt.due_date || "",
      term_months: debt.term_months?.toString() || "",
      months_remaining: debt.months_remaining?.toString() || "",
      currency: debt.currency,
      notes: debt.notes || "",
    });
    setIsEditDebtOpen(true);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    try {
      await addPayment({
        liability_id: selectedDebt.id,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        notes: paymentForm.notes,
      });
      // Refresh payments to update chart
      await fetchAllPayments();
      toast.success("Payment recorded successfully!");
      setIsAddPaymentOpen(false);
      setSelectedDebt(null);
      setPaymentForm({
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  // Calculate payment history from actual data
  const paymentHistory = React.useMemo(() => {
    console.log(
      "Calculating payment history. Total payments:",
      payments.length,
    );

    // If no debts yet, return empty data
    if (debts.length === 0) {
      const result = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleDateString("en-US", { month: "short" });
        result.push({
          month: monthName,
          paid: 0,
          balance: 0,
        });
      }
      return result;
    }

    // Group payments by month
    const monthlyData: { [key: string]: { paid: number } } = {};

    payments.forEach((payment) => {
      const date = new Date(payment.payment_date);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { paid: 0 };
      }

      monthlyData[monthKey].paid += payment.amount;
    });

    // Get last 6 months and calculate cumulative balance
    const result = [];
    const now = new Date();

    // Calculate total payments made to adjust starting balance
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const startingBalance = totalDebt + totalPayments;

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}`;
      const monthName = date.toLocaleDateString("en-US", { month: "short" });

      const monthData = monthlyData[monthKey];
      const paid = monthData?.paid || 0;

      // Calculate balance for this month (for visualization purposes)
      // This is a simplified calculation - ideally would track historical balances
      const monthProgress = (5 - i) / 6;
      const balanceForMonth = Math.max(
        0,
        startingBalance - totalPayments * monthProgress,
      );

      result.push({
        month: monthName,
        paid: Math.round(paid),
        balance: Math.round(balanceForMonth),
      });
    }

    console.log("Payment history calculated:", result);
    return result;
  }, [payments, totalDebt, debts.length]);

  function buildDueDateSchedule(
    startDate: string | null,
    monthsRemaining?: number | null,
  ) {
    if (!startDate || !monthsRemaining || monthsRemaining <= 0) return [];
    const base = new Date(startDate);
    if (Number.isNaN(base.getTime())) return [];

    const dates: string[] = [];
    for (let i = 0; i < monthsRemaining; i++) {
      const next = new Date(
        base.getFullYear(),
        base.getMonth() + i,
        base.getDate(),
      );
      dates.push(next.toISOString().split("T")[0]);
    }
    return dates;
  }

  const getNextDueDate = (debt: Debt) => {
    const schedule = buildDueDateSchedule(
      debt.due_date,
      debt.months_remaining ?? debt.term_months ?? null,
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextDate =
      schedule.find((date) => new Date(date).getTime() >= today.getTime()) ||
      debt.due_date;

    return nextDate || null;
  };

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return 999; // Return large number if no due date
    const today = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const calculateMonthsToPayoff = (debt: Debt) => {
    if (debt.months_remaining && debt.months_remaining > 0) {
      return debt.months_remaining;
    }
    if (debt.term_months && debt.term_months > 0) {
      return debt.term_months;
    }
    // Simple calculation: balance / minimum payment
    return Math.ceil(debt.balance / debt.minimum_payment);
  };

  const simulatePayoff = (
    allDebts: Debt[],
    monthlyBudget: number,
    extraTargetId?: string,
  ): {
    success: boolean;
    months: number;
    interestPaid: number;
    debtDetails: {
      id: string;
      name: string;
      payoffMonth: number | null;
      interestPaid: number;
    }[];
    message?: string;
  } => {
    const debtsCopy = allDebts
      .filter((debt) => debt.balance > 0)
      .map((debt) => ({
        id: debt.id,
        name: debt.name,
        balance: debt.balance,
        interest_rate: debt.interest_rate,
        minimum_payment: debt.minimum_payment,
        payoffMonth: null as number | null,
        interestPaid: 0,
      }));

    if (debtsCopy.length === 0) {
      return { success: true, months: 0, interestPaid: 0, debtDetails: [] };
    }

    const minRequired = debtsCopy.reduce(
      (sum, debt) => sum + debt.minimum_payment,
      0,
    );

    if (monthlyBudget < minRequired) {
      return {
        success: false,
        months: 0,
        interestPaid: 0,
        debtDetails: debtsCopy.map((d) => ({
          id: d.id,
          name: d.name,
          payoffMonth: d.payoffMonth,
          interestPaid: d.interestPaid,
        })),
        message: `Monthly payment must be at least ${formatCurrency(minRequired)} (current minimums)`,
      };
    }

    let months = 0;
    let totalInterest = 0;
    const maxMonths = 600; // 50-year safety guard

    while (debtsCopy.some((d) => d.balance > 0) && months < maxMonths) {
      months += 1;

      // Accrue monthly interest
      let interestThisMonth = 0;
      debtsCopy.forEach((debt) => {
        if (debt.balance <= 0) return;
        const interest = (debt.balance * (debt.interest_rate / 100)) / 12;
        debt.balance += interest;
        debt.interestPaid += interest;
        interestThisMonth += interest;
        totalInterest += interest;
      });

      if (monthlyBudget <= interestThisMonth) {
        return {
          success: false,
          months,
          interestPaid: totalInterest,
          debtDetails: debtsCopy.map((d) => ({
            id: d.id,
            name: d.name,
            payoffMonth: d.payoffMonth,
            interestPaid: d.interestPaid,
          })),
          message:
            "Monthly payment is below accrued interest. Increase the payment to make progress.",
        };
      }

      let remaining = monthlyBudget;

      // Pay minimums first
      debtsCopy.forEach((debt) => {
        if (debt.balance <= 0) return;
        const payment = Math.min(debt.minimum_payment, debt.balance);
        debt.balance -= payment;
        remaining -= payment;
      });

      // Direct extra to the selected debt first, if any
      if (extraTargetId && extraTargetId !== "all" && remaining > 0) {
        const target = debtsCopy.find(
          (d) => d.id === extraTargetId && d.balance > 0,
        );
        if (target) {
          const payTarget = Math.min(target.balance, remaining);
          target.balance -= payTarget;
          remaining -= payTarget;
        }
      }

      // Avalanche: apply remaining to highest interest-rate debts
      const avalancheOrder = debtsCopy
        .filter((d) => d.balance > 0)
        .sort(
          (a, b) => b.interest_rate - a.interest_rate || b.balance - a.balance,
        );

      for (const debt of avalancheOrder) {
        if (remaining <= 0) break;
        const payment = Math.min(remaining, debt.balance);
        debt.balance -= payment;
        remaining -= payment;
      }

      // Record payoff month per debt
      debtsCopy.forEach((debt) => {
        if (debt.balance <= 0 && debt.payoffMonth === null) {
          debt.payoffMonth = months;
        }
      });
    }

    if (months >= maxMonths && debtsCopy.some((d) => d.balance > 0)) {
      return {
        success: false,
        months: maxMonths,
        interestPaid: totalInterest,
        debtDetails: debtsCopy.map((d) => ({
          id: d.id,
          name: d.name,
          payoffMonth: d.payoffMonth,
          interestPaid: d.interestPaid,
        })),
        message: "Payoff exceeds the simulation window. Increase your payment.",
      };
    }

    return {
      success: true,
      months,
      interestPaid: totalInterest,
      debtDetails: debtsCopy.map((d) => ({
        id: d.id,
        name: d.name,
        payoffMonth: d.payoffMonth,
        interestPaid: d.interestPaid,
      })),
    };
  };

  const handleCalculatePayoff = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (debts.length === 0) {
      setCalculatorResult({
        months: null,
        baselineMonths: null,
        interestSaved: null,
        totalInterest: null,
        breakdown: [],
        error: "Add at least one debt to run the calculator.",
      });
      return;
    }

    const currentPaymentValue =
      parseFloat(calculatorInputs.currentPayment) || 0;
    const extraPaymentValue = parseFloat(calculatorInputs.extraPayment) || 0;
    const baselineBudget = Math.max(currentPaymentValue, totalMinPayment);
    const acceleratedBudget = baselineBudget + extraPaymentValue;

    if (acceleratedBudget <= 0) {
      setCalculatorResult({
        months: null,
        baselineMonths: null,
        interestSaved: null,
        totalInterest: null,
        breakdown: [],
        error: "Enter a monthly payment greater than 0.",
      });
      return;
    }

    const baseline = simulatePayoff(debts, baselineBudget);
    if (!baseline.success) {
      setCalculatorResult({
        months: null,
        baselineMonths: null,
        interestSaved: null,
        totalInterest: null,
        breakdown: [],
        error: baseline.message || "Unable to calculate payoff.",
      });
      return;
    }

    const accelerated = simulatePayoff(
      debts,
      acceleratedBudget,
      extraFocusDebtId === "all" ? undefined : extraFocusDebtId,
    );
    if (!accelerated.success) {
      setCalculatorResult({
        months: null,
        baselineMonths: null,
        interestSaved: null,
        totalInterest: null,
        breakdown: [],
        error: accelerated.message || "Unable to calculate payoff.",
      });
      return;
    }

    const interestSaved = Math.max(
      0,
      baseline.interestPaid - accelerated.interestPaid,
    );

    const baselineMap = new Map(baseline.debtDetails.map((d) => [d.id, d]));

    setCalculatorResult({
      months: accelerated.months,
      baselineMonths: baseline.months,
      interestSaved,
      totalInterest: accelerated.interestPaid,
      breakdown: accelerated.debtDetails.map((detail) => ({
        ...detail,
        baselinePayoffMonth: baselineMap.get(detail.id)?.payoffMonth ?? null,
        baselineInterestPaid: baselineMap.get(detail.id)?.interestPaid ?? null,
      })),
      error: null,
    });
  };

  const getDebtIcon = (type: string) => {
    switch (type) {
      case "credit_card":
        return <CreditCard className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Debt Tracker</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage and pay off your debts strategically
              </p>
            </div>
            <Dialog open={isAddDebtOpen} onOpenChange={setIsAddDebtOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Debt
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Debt</DialogTitle>
                  <DialogDescription>
                    Track a new debt or liability
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddDebt} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="debtName">Debt Name</Label>
                    <Input
                      id="debtName"
                      placeholder="e.g., Credit Card"
                      value={debtForm.name}
                      onChange={(e) =>
                        setDebtForm({ ...debtForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="debtType">Type</Label>
                    <Select
                      value={debtForm.type}
                      onValueChange={(value: any) =>
                        setDebtForm({ ...debtForm, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="loan">Personal Loan</SelectItem>
                        <SelectItem value="mortgage">Mortgage</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentBalance">Current Balance</Label>
                      <Input
                        id="currentBalance"
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={debtForm.balance}
                        onChange={(e) =>
                          setDebtForm({ ...debtForm, balance: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="originalAmount">Original Amount</Label>
                      <Input
                        id="originalAmount"
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={debtForm.original_amount}
                        onChange={(e) =>
                          setDebtForm({
                            ...debtForm,
                            original_amount: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="interestRate">Interest Rate (%)</Label>
                      <Input
                        id="interestRate"
                        type="number"
                        placeholder="0.0"
                        step="0.1"
                        value={debtForm.interest_rate}
                        onChange={(e) =>
                          setDebtForm({
                            ...debtForm,
                            interest_rate: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="termMonths">Total Months</Label>
                      <Input
                        id="termMonths"
                        type="number"
                        min="1"
                        placeholder="e.g., 60"
                        value={debtForm.term_months}
                        onChange={(e) =>
                          setDebtForm({
                            ...debtForm,
                            term_months: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthsRemaining">Months Remaining</Label>
                      <Input
                        id="monthsRemaining"
                        type="number"
                        min="1"
                        placeholder="e.g., 24"
                        value={debtForm.months_remaining}
                        onChange={(e) =>
                          setDebtForm({
                            ...debtForm,
                            months_remaining: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minPayment">Min Payment</Label>
                      <Input
                        id="minPayment"
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={debtForm.minimum_payment}
                        onChange={(e) =>
                          setDebtForm({
                            ...debtForm,
                            minimum_payment: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">First Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={debtForm.due_date}
                      onChange={(e) =>
                        setDebtForm({ ...debtForm, due_date: e.target.value })
                      }
                    />
                  </div>
                  {schedulePreview.length > 0 && (
                    <div className="space-y-2">
                      <Label>Monthly Due Dates (preview)</Label>
                      <div className="flex flex-wrap gap-2 text-sm">
                        {schedulePreview.slice(0, 6).map((date) => (
                          <span
                            key={date}
                            className="px-2 py-1 rounded-full bg-gray-100"
                          >
                            {new Date(date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        ))}
                        {schedulePreview.length > 6 ? (
                          <span className="text-xs text-gray-500">
                            +{schedulePreview.length - 6} more months
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Add Debt
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Debt</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalDebt)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Across {debts.length} accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Min Payment</CardTitle>
              <Calendar className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalMinPayment)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Per month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Interest Rate
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgInterestRate.toFixed(1)}%
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Annual percentage rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Debt-Free In
              </CardTitle>
              <Target className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">48 months</div>
              <p className="text-xs text-gray-500 mt-1">
                With current payments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payoff Progress Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Debt Payoff Progress</CardTitle>
            <CardDescription>
              Your debt reduction over the past 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip
                  formatter={(value: number | undefined) =>
                    value !== undefined ? formatCurrency(value) : "$0.00"
                  }
                />
                <Bar
                  yAxisId="left"
                  dataKey="balance"
                  fill="#ef4444"
                  name="Remaining Balance"
                />
                <Bar
                  yAxisId="right"
                  dataKey="paid"
                  fill="#10b981"
                  name="Amount Paid"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Tabs defaultValue="active" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="active">Active Debts</TabsTrigger>
              <TabsTrigger value="payoff">Payoff Strategy</TabsTrigger>
              <TabsTrigger value="calculator">Calculator</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="space-y-4">
            {debts.length === 0 ? (
              <EmptyState
                icon={CreditCard}
                title="No debts tracked"
                description="Add your first debt to start tracking payoff progress"
                actionLabel="Add Debt"
                onAction={() => setIsAddDebtOpen(true)}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {debts.map((debt) => {
                  const progress =
                    ((debt.original_amount - debt.balance) /
                      debt.original_amount) *
                    100;
                  const nextDueDate = getNextDueDate(debt);
                  const daysUntilDue = getDaysUntilDue(nextDueDate);
                  const monthsToPayoff = calculateMonthsToPayoff(debt);

                  return (
                    <Card
                      key={debt.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`p-2 rounded-full ${
                                debt.type === "credit_card"
                                  ? "bg-purple-100"
                                  : "bg-blue-100"
                              }`}
                            >
                              {getDebtIcon(debt.type)}
                            </div>
                            <div>
                              <CardTitle className="text-lg">
                                {debt.name}
                              </CardTitle>
                              <p className="text-sm text-gray-500 capitalize">
                                {debt.type.replace("_", " ")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {daysUntilDue <= 7 && (
                              <div className="flex items-center space-x-1 text-amber-600">
                                <Calendar className="h-4 w-4" />
                                <span className="text-xs font-semibold">
                                  {daysUntilDue}d
                                </span>
                              </div>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <span className="sr-only">Open menu</span>
                                  <span className="text-lg">⋮</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => openEditDialog(debt)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteDebt(debt)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-sm text-gray-500">
                              Current Balance
                            </p>
                            <p className="text-2xl font-bold text-red-600">
                              {formatCurrency(debt.balance)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Min Payment</p>
                            <p className="text-lg font-semibold">
                              {formatCurrency(debt.minimum_payment)}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium">
                              {progress.toFixed(0)}% paid off
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-2 border-t text-center">
                          <div>
                            <p className="text-xs text-gray-500">APR</p>
                            <p className="font-semibold">
                              {debt.interest_rate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Payoff Time</p>
                            <p className="font-semibold">{monthsToPayoff}mo</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Next Due</p>
                            <p className="font-semibold">
                              {nextDueDate
                                ? new Date(nextDueDate).toLocaleDateString(
                                    "en-US",
                                    { month: "short", day: "numeric" },
                                  )
                                : "Not set"}
                            </p>
                            {debt.term_months ? (
                              <p className="text-xs text-gray-500">
                                {debt.months_remaining ?? debt.term_months} of{" "}
                                {debt.term_months} months left
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <Button
                          className="w-full"
                          onClick={() => {
                            setSelectedDebt(debt);
                            setPaymentForm({
                              amount: debt.minimum_payment.toString(),
                              payment_date: new Date()
                                .toISOString()
                                .split("T")[0],
                              notes: "",
                            });
                            setIsAddPaymentOpen(true);
                          }}
                        >
                          Record Payment
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payoff">
            <Card>
              <CardHeader>
                <CardTitle>Debt Payoff Strategy</CardTitle>
                <CardDescription>
                  Choose a strategy to pay off your debts faster
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-4">
                  <Button
                    variant={
                      payoffStrategy === "avalanche" ? "default" : "outline"
                    }
                    className="flex-1"
                    onClick={() => setPayoffStrategy("avalanche")}
                  >
                    Avalanche Method
                  </Button>
                  <Button
                    variant={
                      payoffStrategy === "snowball" ? "default" : "outline"
                    }
                    className="flex-1"
                    onClick={() => setPayoffStrategy("snowball")}
                  >
                    Snowball Method
                  </Button>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2">
                    {payoffStrategy === "avalanche"
                      ? "Avalanche Method"
                      : "Snowball Method"}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {payoffStrategy === "avalanche"
                      ? "Pay off debts with the highest interest rates first to save money on interest charges."
                      : "Pay off debts with the smallest balances first to build momentum and motivation."}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold">Recommended Payoff Order:</h4>
                  {sortedDebts.map((debt, index) => (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{debt.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatCurrency(debt.balance)} @{" "}
                            {debt.interest_rate}% APR
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(debt.minimum_payment)}
                        </p>
                        <p className="text-xs text-gray-500">min payment</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calculator">
            <Card>
              <CardHeader>
                <CardTitle>Debt Payoff Calculator</CardTitle>
                <CardDescription>
                  See how extra payments can accelerate your debt freedom
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleCalculatePayoff}>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Current Monthly Payment</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={calculatorInputs.currentPayment}
                        onChange={(e) =>
                          setCalculatorInputs((prev) => ({
                            ...prev,
                            currentPayment: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">
                        Minimum required across all debts:{" "}
                        {formatCurrency(totalMinPayment)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Extra Monthly Payment</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={calculatorInputs.extraPayment}
                        onChange={(e) =>
                          setCalculatorInputs((prev) => ({
                            ...prev,
                            extraPayment: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Focus extra payment on (optional)</Label>
                    <Select
                      value={extraFocusDebtId}
                      onValueChange={(value) => setExtraFocusDebtId(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Spread across debts (avalanche)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          Spread across debts (highest APR first)
                        </SelectItem>
                        {debts.map((debt) => (
                          <SelectItem key={debt.id} value={debt.id}>
                            {debt.name} — {formatCurrency(debt.minimum_payment)}{" "}
                            min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button type="submit" className="w-full">
                    Calculate Payoff
                  </Button>

                  {calculatorResult.error ? (
                    <p className="text-sm text-red-600">
                      {calculatorResult.error}
                    </p>
                  ) : null}

                  {calculatorResult.breakdown.length > 0 ? (
                    <div className="flex items-center gap-2 pt-2">
                      <Label className="text-sm">View</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={
                            payoffView === "cards" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setPayoffView("cards")}
                        >
                          Detail
                        </Button>
                        <Button
                          type="button"
                          variant={
                            payoffView === "list" ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setPayoffView("list")}
                        >
                          List
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-500">Time to Pay Off</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedBreakdown?.payoffMonth != null
                            ? `${selectedBreakdown.payoffMonth} months`
                            : calculatorResult.months != null
                              ? `${calculatorResult.months} months`
                              : "—"}
                        </p>
                        {selectedBreakdown?.baselinePayoffMonth != null &&
                        selectedBreakdown?.payoffMonth != null ? (
                          <p className="text-xs text-gray-500">
                            Was {selectedBreakdown.baselinePayoffMonth} months
                            with minimums
                          </p>
                        ) : calculatorResult.baselineMonths !== null &&
                          calculatorResult.months !== null ? (
                          <p className="text-xs text-gray-500">
                            Was {calculatorResult.baselineMonths} months with
                            minimums
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-500">Interest Saved</p>
                        <p className="text-2xl font-bold text-green-600">
                          {calculatorResult.interestSaved !== null
                            ? formatCurrency(calculatorResult.interestSaved)
                            : formatCurrency(0)}
                        </p>
                        {calculatorResult.totalInterest !== null ? (
                          <p className="text-xs text-gray-500 mt-1">
                            Interest with extra payments:{" "}
                            {formatCurrency(calculatorResult.totalInterest)}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </div>

                  {calculatorResult.breakdown.length > 0 ? (
                    <div className="pt-2 space-y-3">
                      <h4 className="font-semibold">Payoff details</h4>
                      {payoffView === "cards" ? (
                        <div className="grid md:grid-cols-2 gap-3">
                          {calculatorResult.breakdown.map((detail) => (
                            <Card key={detail.id}>
                              <CardContent className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold">{detail.name}</p>
                                  {detail.baselinePayoffMonth !== null &&
                                  detail.payoffMonth !== null ? (
                                    <span className="text-xs text-green-600">
                                      -
                                      {Math.max(
                                        0,
                                        detail.baselinePayoffMonth -
                                          detail.payoffMonth,
                                      )}{" "}
                                      months vs. baseline
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-sm text-gray-500">
                                  Payoff:{" "}
                                  {detail.payoffMonth !== null
                                    ? `${detail.payoffMonth} months`
                                    : "Not reached"}
                                </p>
                                {detail.baselineInterestPaid !== null ? (
                                  <p className="text-sm text-gray-500">
                                    Interest saved on this debt:{" "}
                                    {formatCurrency(
                                      Math.max(
                                        0,
                                        detail.baselineInterestPaid -
                                          detail.interestPaid,
                                      ),
                                    )}
                                  </p>
                                ) : null}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500">
                                <th className="py-2 pr-4">Debt</th>
                                <th className="py-2 pr-4">Payoff (months)</th>
                                <th className="py-2 pr-4">Baseline (months)</th>
                                <th className="py-2 pr-4">Interest Saved</th>
                              </tr>
                            </thead>
                            <tbody>
                              {calculatorResult.breakdown.map((detail) => (
                                <tr key={detail.id} className="border-t">
                                  <td className="py-2 pr-4 font-medium">
                                    {detail.name}
                                  </td>
                                  <td className="py-2 pr-4">
                                    {detail.payoffMonth ?? "—"}
                                  </td>
                                  <td className="py-2 pr-4">
                                    {detail.baselinePayoffMonth ?? "—"}
                                  </td>
                                  <td className="py-2 pr-4">
                                    {detail.baselineInterestPaid !== null
                                      ? formatCurrency(
                                          Math.max(
                                            0,
                                            detail.baselineInterestPaid -
                                              detail.interestPaid,
                                          ),
                                        )
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ) : null}
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Record Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for {selectedDebt?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentForm.payment_date}
                onChange={(e) =>
                  setPaymentForm({
                    ...paymentForm,
                    payment_date: e.target.value,
                  })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Add any notes..."
                value={paymentForm.notes}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, notes: e.target.value })
                }
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Record Payment
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Debt Dialog */}
      <Dialog open={isEditDebtOpen} onOpenChange={setIsEditDebtOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Debt</DialogTitle>
            <DialogDescription>Update debt information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditDebt} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editDebtName">Debt Name</Label>
              <Input
                id="editDebtName"
                placeholder="e.g., Credit Card"
                value={debtForm.name}
                onChange={(e) =>
                  setDebtForm({ ...debtForm, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDebtType">Type</Label>
              <Select
                value={debtForm.type}
                onValueChange={(value: any) =>
                  setDebtForm({ ...debtForm, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="loan">Personal Loan</SelectItem>
                  <SelectItem value="mortgage">Mortgage</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editCurrentBalance">Current Balance</Label>
                <Input
                  id="editCurrentBalance"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={debtForm.balance}
                  onChange={(e) =>
                    setDebtForm({ ...debtForm, balance: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editOriginalAmount">Original Amount</Label>
                <Input
                  id="editOriginalAmount"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={debtForm.original_amount}
                  onChange={(e) =>
                    setDebtForm({
                      ...debtForm,
                      original_amount: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editInterestRate">Interest Rate (%)</Label>
                <Input
                  id="editInterestRate"
                  type="number"
                  placeholder="0.0"
                  step="0.1"
                  value={debtForm.interest_rate}
                  onChange={(e) =>
                    setDebtForm({ ...debtForm, interest_rate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTermMonths">Total Months</Label>
                <Input
                  id="editTermMonths"
                  type="number"
                  min="1"
                  placeholder="e.g., 60"
                  value={debtForm.term_months}
                  onChange={(e) =>
                    setDebtForm({ ...debtForm, term_months: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMonthsRemaining">Months Remaining</Label>
                <Input
                  id="editMonthsRemaining"
                  type="number"
                  min="1"
                  placeholder="e.g., 24"
                  value={debtForm.months_remaining}
                  onChange={(e) =>
                    setDebtForm({
                      ...debtForm,
                      months_remaining: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMinPayment">Min Payment</Label>
                <Input
                  id="editMinPayment"
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  value={debtForm.minimum_payment}
                  onChange={(e) =>
                    setDebtForm({
                      ...debtForm,
                      minimum_payment: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDueDate">First Due Date</Label>
              <Input
                id="editDueDate"
                type="date"
                value={debtForm.due_date}
                onChange={(e) =>
                  setDebtForm({ ...debtForm, due_date: e.target.value })
                }
              />
            </div>
            {schedulePreview.length > 0 && (
              <div className="space-y-2">
                <Label>Monthly Due Dates (preview)</Label>
                <div className="flex flex-wrap gap-2 text-sm">
                  {schedulePreview.slice(0, 6).map((date) => (
                    <span
                      key={date}
                      className="px-2 py-1 rounded-full bg-gray-100"
                    >
                      {new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ))}
                  {schedulePreview.length > 6 ? (
                    <span className="text-xs text-gray-500">
                      +{schedulePreview.length - 6} more months
                    </span>
                  ) : null}
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update Debt
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
