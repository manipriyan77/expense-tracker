/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  Plus,
  CreditCard,
  TrendingDown,
  Trash2,
  Edit,
  Loader2,
  LayoutGrid,
  List,
  Flame,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebtTrackerStore, type Debt } from "@/store/debt-tracker-store";
import { Skeleton, StatsSkeleton } from "@/components/ui/skeleton";

export default function DebtTrackerPage() {
  const { format } = useFormatCurrency();
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
    deletePayment,
  } = useDebtTrackerStore();

  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isEditDebtOpen, setIsEditDebtOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null);
  const [debtSortBy, setDebtSortBy] = useState<"apr" | "balance" | "due" | "progress">("apr");
  const [debtViewMode, setDebtViewMode] = useState<"grid" | "list">("grid");
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

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

  const [amortizationDebtId, setAmortizationDebtId] = useState<string>("");

  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const totalMinPayment = debts.reduce(
    (sum, debt) => sum + debt.minimum_payment,
    0,
  );
  const avgInterestRate =
    debts.length > 0
      ? debts.reduce((sum, debt) => sum + debt.interest_rate, 0) / debts.length
      : 0;

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
      fetchAllPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debts.length]);

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

  const handleDeletePayment = async (debtId: string, paymentId: string) => {
    if (!confirm("Delete this payment? The debt balance will be restored.")) return;
    try {
      await deletePayment(debtId, paymentId);
      toast.success("Payment deleted");
    } catch {
      toast.error("Failed to delete payment");
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

  // Monthly payments — only months in the current year
  const paymentHistory = React.useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const monthlyData: { [key: string]: number } = {};

    payments.forEach((payment) => {
      const date = new Date(payment.payment_date);
      if (date.getFullYear() !== currentYear) return;
      const monthKey = `${currentYear}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + payment.amount;
    });

    const result = [];
    for (let m = 0; m <= now.getMonth(); m++) {
      const date = new Date(currentYear, m, 1);
      const monthKey = `${currentYear}-${String(m + 1).padStart(2, "0")}`;
      result.push({
        month: date.toLocaleDateString("en-US", { month: "short" }),
        paid: Math.round(monthlyData[monthKey] || 0),
      });
    }
    return result;
  }, [payments]);

  // Balance forecast — current balance projected forward 6 months using min payments
  const balanceForecast = React.useMemo(() => {
    const now = new Date();
    const result = [];
    let balance = totalDebt;
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      result.push({
        month: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        balance: Math.max(0, Math.round(balance)),
        projected: i > 0,
      });
      balance = Math.max(0, balance - totalMinPayment);
    }
    return result;
  }, [totalDebt, totalMinPayment]);

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

  const sortedActiveDebts = React.useMemo(() => {
    return [...debts].sort((a, b) => {
      switch (debtSortBy) {
        case "apr": return b.interest_rate - a.interest_rate;
        case "balance": return b.balance - a.balance;
        case "due": {
          const da = getDaysUntilDue(getNextDueDate(a));
          const db = getDaysUntilDue(getNextDueDate(b));
          return da - db;
        }
        case "progress": {
          const pa = ((a.original_amount - a.balance) / a.original_amount) * 100;
          const pb = ((b.original_amount - b.balance) / b.original_amount) * 100;
          return pa - pb;
        }
        default: return 0;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debts, debtSortBy]);

  const calculateTotalInterestRemaining = (debt: Debt) => {
    const months = calculateMonthsToPayoff(debt);
    const monthlyRate = debt.interest_rate / 100 / 12;
    if (monthlyRate === 0 || months <= 0) return 0;
    const emi = (debt.balance * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    return Math.max(0, emi * months - debt.balance);
  };

  const generateAmortizationSchedule = (debt: Debt) => {
    const balance = debt.balance;
    const annualRate = debt.interest_rate / 100;
    const monthlyRate = annualRate / 12;
    const months =
      debt.months_remaining ||
      debt.term_months ||
      Math.ceil(debt.balance / debt.minimum_payment);

    if (monthlyRate === 0) {
      const payment = balance / months;
      return Array.from({ length: months }, (_, i) => ({
        month: i + 1,
        payment,
        principal: payment,
        interest: 0,
        balance: Math.max(0, balance - payment * (i + 1)),
      }));
    }

    const payment =
      (balance * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
      (Math.pow(1 + monthlyRate, months) - 1);

    const schedule = [];
    let remainingBalance = balance;
    for (let i = 1; i <= months; i++) {
      const interest = remainingBalance * monthlyRate;
      const principal = Math.min(payment - interest, remainingBalance);
      remainingBalance = Math.max(0, remainingBalance - principal);
      schedule.push({
        month: i,
        payment: principal + interest,
        principal,
        interest,
        balance: remainingBalance,
      });
      if (remainingBalance <= 0) break;
    }
    return schedule;
  };

  const amortizationSchedule = React.useMemo(() => {
    const debt = debts.find((d) => d.id === amortizationDebtId) || debts[0];
    if (!debt) return [];
    return generateAmortizationSchedule(debt);
  }, [amortizationDebtId, debts]);

  if (loading && debts.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-slate-900 dark:bg-black px-3 sm:px-6 lg:px-8 pt-4 pb-4">
          <Skeleton className="h-4 w-24 bg-slate-700 mb-2" />
          <Skeleton className="h-3 w-40 bg-slate-800" />
        </div>
        <div className="px-3 sm:px-6 lg:px-8 py-4 space-y-4">
          <StatsSkeleton />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-5 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-2 w-full" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                Debt Tracker
              </p>
              <p className="text-xs text-slate-500">
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
                            className="px-2 py-1 rounded-full bg-muted"
                          >
                            {new Date(date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        ))}
                        {schedulePreview.length > 6 ? (
                          <span className="text-xs text-muted-foreground">
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
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Total Debt
              </p>
              <p className="font-mono text-base font-semibold text-red-400">
                {format(totalDebt)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Across {debts.length} accounts
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Min Payment
              </p>
              <p className="font-mono text-base font-semibold text-slate-200">
                {format(totalMinPayment)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Per month</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Avg Interest
              </p>
              <p className="font-mono text-base font-semibold text-amber-400">
                {avgInterestRate.toFixed(1)}%
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Annual rate</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Debt-Free In
              </p>
              <p className="font-mono text-base font-semibold text-blue-400">
                48 months
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                With current payments
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-4 sm:px-6 lg:px-8 py-3">
        {/* Payoff Progress Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-2 border-b border-border px-4 pt-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Balance Trend
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Projected balance based on minimum payments
              </p>
            </CardHeader>
            <CardContent className="pt-4 px-2 pb-2">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={balanceForecast} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => format(v)} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip
                    formatter={(v: number | undefined) => [v !== undefined ? format(v) : "—", "Balance"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)" }}
                  />
                  <Area type="monotone" dataKey="balance" stroke="#ef4444" strokeWidth={2} fill="url(#balanceGrad)" dot={false} name="Remaining Balance" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 border-b border-border px-4 pt-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Monthly Payments
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Amount paid each month
              </p>
            </CardHeader>
            <CardContent className="pt-4 px-2 pb-2">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={paymentHistory} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => format(v)} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={70} />
                  <Tooltip
                    formatter={(v: number | undefined) => [v !== undefined ? format(v) : "—", "Paid"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)", background: "var(--background)" }}
                  />
                  <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} name="Amount Paid" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="active">Active Debts</TabsTrigger>
              <TabsTrigger value="amortization">Amortization</TabsTrigger>
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
              <>
                {/* Controls bar */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Sort</span>
                    {(["apr", "balance", "due", "progress"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setDebtSortBy(mode)}
                        className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border transition-colors ${
                          debtSortBy === mode
                            ? "bg-foreground text-background border-foreground"
                            : "border-border text-muted-foreground hover:border-foreground/40"
                        }`}
                      >
                        {mode === "apr" ? "APR" : mode === "due" ? "Due Date" : mode === "progress" ? "Progress" : "Balance"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center border rounded-md overflow-hidden">
                    <button
                      onClick={() => setDebtViewMode("grid")}
                      className={`p-1.5 ${debtViewMode === "grid" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDebtViewMode("list")}
                      className={`p-1.5 ${debtViewMode === "list" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {debtViewMode === "grid" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {sortedActiveDebts.map((debt, index) => {
                      const progress = Math.min(100, ((debt.original_amount - debt.balance) / debt.original_amount) * 100);
                      const nextDueDate = getNextDueDate(debt);
                      const daysUntilDue = getDaysUntilDue(nextDueDate);
                      const monthsToPayoff = calculateMonthsToPayoff(debt);
                      const monthlyInterest = (debt.balance * debt.interest_rate / 100) / 12;
                      const totalInterestLeft = calculateTotalInterestRemaining(debt);
                      const isExpanded = expandedDebtId === debt.id;
                      const payoffDate = new Date();
                      payoffDate.setMonth(payoffDate.getMonth() + monthsToPayoff);

                      return (
                        <Card key={debt.id} className={`overflow-hidden transition-shadow hover:shadow-md cursor-pointer ${daysUntilDue < 0 ? "border-red-300 dark:border-red-800" : daysUntilDue <= 7 ? "border-amber-300 dark:border-amber-800" : ""}`} onClick={() => setDetailDebt(debt)}>
                          <div className={`h-0.5 w-full ${index === 0 ? "bg-red-500" : index === 1 ? "bg-orange-400" : index === 2 ? "bg-amber-400" : "bg-slate-200 dark:bg-slate-700"}`} />

                          {/* Header */}
                          <div className="flex items-center justify-between px-3 pt-3 pb-2">
                            <div className="flex items-center gap-2">
                              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold flex-shrink-0 ${index === 0 ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" : index === 1 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400" : "bg-muted text-muted-foreground"}`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-sm leading-tight">{debt.name}</p>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{debt.type.replace("_", " ")}</span>
                                  {index === 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 font-semibold">
                                      <Flame className="h-2.5 w-2.5" /> Priority
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              {daysUntilDue < 0 ? (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 font-semibold">Overdue</span>
                              ) : daysUntilDue <= 7 ? (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-semibold">Due {daysUntilDue}d</span>
                              ) : nextDueDate ? (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-semibold">On Track</span>
                              ) : null}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6">
                                    <span className="text-base leading-none">⋮</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openEditDialog(debt)}>
                                    <Edit className="h-4 w-4 mr-2" />Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteDebt(debt)} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <div className="px-3 pb-3 space-y-2.5" onClick={(e) => e.stopPropagation()}>
                            {/* Balance row */}
                            <div className="flex items-end justify-between">
                              <div>
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Current Balance</p>
                                <p className="font-mono font-bold text-xl text-red-500 leading-tight">{format(debt.balance)}</p>
                                <p className="text-[10px] text-muted-foreground">of {format(debt.original_amount)} original</p>
                              </div>
                              <p className="font-mono font-bold text-base text-emerald-600">{progress.toFixed(0)}%</p>
                            </div>

                            {/* Progress bar */}
                            <div>
                              <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${progress}%` }} />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{format(debt.original_amount - debt.balance)} paid · {format(debt.balance)} remaining</p>
                            </div>

                            {/* Metrics grid */}
                            <div className="grid grid-cols-4 border rounded-md overflow-hidden divide-x text-center">
                              <div className="py-1.5">
                                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">APR</p>
                                <p className="font-mono font-bold text-xs text-amber-600">{debt.interest_rate}%</p>
                              </div>
                              <div className="py-1.5">
                                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Monthly ₹</p>
                                <p className="font-mono font-bold text-xs text-red-500">{format(monthlyInterest)}</p>
                              </div>
                              <div className="py-1.5">
                                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Months</p>
                                <p className="font-mono font-bold text-xs">{monthsToPayoff}</p>
                              </div>
                              <div className="py-1.5">
                                <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Total Int.</p>
                                <p className="font-mono font-bold text-xs text-orange-500">{format(totalInterestLeft)}</p>
                              </div>
                            </div>

                            {/* Payment info row */}
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Zap className="h-3 w-3 text-blue-500" />
                                Min: <span className="font-mono font-semibold text-foreground ml-0.5">{format(debt.minimum_payment)}/mo</span>
                              </span>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {nextDueDate ? <>Due <span className="font-semibold text-foreground ml-0.5">{new Date(nextDueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></> : "No due date"}
                              </span>
                              <span className="text-muted-foreground">
                                Free by <span className="font-semibold text-foreground">{payoffDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
                              </span>
                            </div>

                            {/* Payment history toggle */}
                            <button
                              className="w-full flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors border-t pt-2"
                              onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                            >
                              <span>Payment history</span>
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>

                            {isExpanded && (() => {
                              const debtPayments = payments
                                .filter((p) => p.liability_id === debt.id)
                                .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                                .slice(0, 5);
                              return (
                                <div className="space-y-1">
                                  {debtPayments.length === 0 ? (
                                    <p className="text-xs text-muted-foreground py-1 text-center">No payments recorded yet</p>
                                  ) : debtPayments.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">{new Date(p.payment_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                      <span className="font-mono font-semibold text-emerald-600">+{format(p.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}

                            <Button
                              className="w-full"
                              size="sm"
                              onClick={() => {
                                setSelectedDebt(debt);
                                setPaymentForm({
                                  amount: debt.minimum_payment.toString(),
                                  payment_date: new Date().toISOString().split("T")[0],
                                  notes: "",
                                });
                                setIsAddPaymentOpen(true);
                              }}
                            >
                              <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
                              Record Payment
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  /* List view */
                  <div className="border rounded-lg overflow-hidden divide-y">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-2 bg-muted/50">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Debt</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground w-24 text-right">Balance</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground w-14 text-right">APR</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground w-20 text-right">Min Pay</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground w-20 text-right">Payoff</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground w-24 text-right">Actions</p>
                    </div>
                    {sortedActiveDebts.map((debt, index) => {
                      const nextDueDate = getNextDueDate(debt);
                      const daysUntilDue = getDaysUntilDue(nextDueDate);
                      const monthsToPayoff = calculateMonthsToPayoff(debt);
                      const progress = Math.min(100, ((debt.original_amount - debt.balance) / debt.original_amount) * 100);

                      return (
                        <div key={debt.id} className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-4 px-4 py-3 items-center hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${index === 0 ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`}>{index + 1}</span>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{debt.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{debt.type.replace("_", " ")}</span>
                                {daysUntilDue < 0 ? (
                                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">Overdue</span>
                                ) : daysUntilDue <= 7 ? (
                                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-semibold">Due {daysUntilDue}d</span>
                                ) : null}
                              </div>
                              <div className="mt-1.5 relative h-1 bg-muted rounded-full w-32 overflow-hidden">
                                <div className="absolute left-0 top-0 h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          </div>
                          <p className="font-mono font-semibold text-sm text-red-500 w-24 text-right">{format(debt.balance)}</p>
                          <p className="font-mono text-sm text-amber-600 w-14 text-right">{debt.interest_rate}%</p>
                          <p className="font-mono text-sm w-20 text-right">{format(debt.minimum_payment)}</p>
                          <p className="font-mono text-sm text-muted-foreground w-20 text-right">{monthsToPayoff}mo</p>
                          <div className="flex items-center gap-1 w-24 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                setSelectedDebt(debt);
                                setPaymentForm({
                                  amount: debt.minimum_payment.toString(),
                                  payment_date: new Date().toISOString().split("T")[0],
                                  notes: "",
                                });
                                setIsAddPaymentOpen(true);
                              }}
                            >
                              Pay
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <span className="text-base leading-none">⋮</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(debt)}>
                                  <Edit className="h-4 w-4 mr-2" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteDebt(debt)} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="amortization">
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Amortization Schedule
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Month-by-month principal and interest breakdown
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {debts.length === 0 ? (
                  <EmptyState
                    icon={CreditCard}
                    title="No debts tracked"
                    description="Add a debt to view its amortization schedule"
                    actionLabel="Add Debt"
                    onAction={() => setIsAddDebtOpen(true)}
                  />
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Select Debt</Label>
                      <Select
                        value={amortizationDebtId || debts[0]?.id}
                        onValueChange={setAmortizationDebtId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a debt" />
                        </SelectTrigger>
                        <SelectContent>
                          {debts.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name} — {format(d.balance)} @ {d.interest_rate}
                              %
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {amortizationSchedule.length > 0 && (
                      <>
                        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg text-sm">
                          <div>
                            <p className="text-muted-foreground">
                              Monthly Payment
                            </p>
                            <p className="font-bold">
                              {format(amortizationSchedule[0].payment)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">
                              Total Interest
                            </p>
                            <p className="font-bold text-red-600">
                              {format(
                                amortizationSchedule.reduce(
                                  (s, r) => s + r.interest,
                                  0,
                                ),
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Total Cost</p>
                            <p className="font-bold">
                              {format(
                                amortizationSchedule.reduce(
                                  (s, r) => s + r.payment,
                                  0,
                                ),
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="overflow-x-auto max-h-100 overflow-y-auto">
                          <table className="min-w-full text-sm">
                            <thead className="sticky top-0 bg-background">
                              <tr className="text-left text-muted-foreground border-b">
                                <th className="py-2 pr-4 font-medium">Month</th>
                                <th className="py-2 pr-4 font-medium">
                                  Payment
                                </th>
                                <th className="py-2 pr-4 font-medium">
                                  Principal
                                </th>
                                <th className="py-2 pr-4 font-medium">
                                  Interest
                                </th>
                                <th className="py-2 font-medium">Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {amortizationSchedule.map((row) => (
                                <tr
                                  key={row.month}
                                  className="border-b hover:bg-muted/50"
                                >
                                  <td className="py-2 pr-4">{row.month}</td>
                                  <td className="py-2 pr-4">
                                    {format(row.payment)}
                                  </td>
                                  <td className="py-2 pr-4 text-green-600">
                                    {format(row.principal)}
                                  </td>
                                  <td className="py-2 pr-4 text-red-500">
                                    {format(row.interest)}
                                  </td>
                                  <td className="py-2">
                                    {format(row.balance)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                )}
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

      {/* Debt Detail Modal */}
      <Dialog open={!!detailDebt} onOpenChange={(open) => { if (!open) setDetailDebt(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailDebt?.name}</DialogTitle>
            <DialogDescription>
              {detailDebt?.type.replace("_", " ")} · {detailDebt?.interest_rate}% APR · Balance: {detailDebt ? format(detailDebt.balance) : ""}
            </DialogDescription>
          </DialogHeader>

          {detailDebt && (() => {
            const debtPayments = payments
              .filter((p) => p.liability_id === detailDebt.id)
              .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
            const progress = Math.min(100, ((detailDebt.original_amount - detailDebt.balance) / detailDebt.original_amount) * 100);

            return (
              <div className="space-y-4 pt-1">
                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{format(detailDebt.original_amount - detailDebt.balance)} paid</span>
                    <span>{progress.toFixed(0)}% complete</span>
                  </div>
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div className="absolute left-0 top-0 h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{format(detailDebt.balance)} remaining of {format(detailDebt.original_amount)}</p>
                </div>

                {/* Transactions */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                    Payment History ({debtPayments.length})
                  </p>
                  {debtPayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No payments recorded yet</p>
                  ) : (
                    <div className="divide-y border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                      {debtPayments.map((p) => (
                        <div key={p.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition-colors">
                          <div>
                            <p className="text-sm font-mono font-semibold text-emerald-600">+{format(p.amount)}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(p.payment_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              {p.notes ? ` · ${p.notes}` : ""}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-600"
                            onClick={() => handleDeletePayment(detailDebt.id, p.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Record payment shortcut */}
                <Button
                  className="w-full"
                  onClick={() => {
                    setDetailDebt(null);
                    setSelectedDebt(detailDebt);
                    setPaymentForm({
                      amount: detailDebt.minimum_payment.toString(),
                      payment_date: new Date().toISOString().split("T")[0],
                      notes: "",
                    });
                    setIsAddPaymentOpen(true);
                  }}
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </div>
            );
          })()}
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
                      className="px-2 py-1 rounded-full bg-muted"
                    >
                      {new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  ))}
                  {schedulePreview.length > 6 ? (
                    <span className="text-xs text-muted-foreground">
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
