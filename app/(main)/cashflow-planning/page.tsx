"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Bar,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  ArrowRight,
  Trophy,
  CreditCard,
  Landmark,
  CalendarClock,
  ReceiptText,
  Lightbulb,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Brain,
  TrendingUpIcon,
  Zap,
  Activity,
  Shield,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTransactionsStore } from "@/store/transactions-store";
import { useRecurringPatternsStore } from "@/store/recurring-patterns-store";
import { useBudgetsStore } from "@/store/budgets-store";
import { useGoalsStore } from "@/store/goals-store";
import { useDebtTrackerStore } from "@/store/debt-tracker-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";
import { ListPageSkeleton } from "@/components/ui/skeleton";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

// ── Investment portfolio snapshot (from Tickertape CSV export, 05-Jun-26) ────
const MF_HOLDINGS = [
  { name: "HDFC ELSS Tax Saver", amc: "HDFC", category: "Equity", subCategory: "ELSS", plan: "Direct", nav: 1422.13, units: 1.27, invested: 1998.85, current: 1798.99, weight: 0.24, pnl: -199.86, pnlPct: -10.0, xirr: -15.55, since: "2025-09-17" },
  { name: "HDFC Liquid Fund", amc: "HDFC", category: "Debt", subCategory: "Liquid Fund", plan: "Direct", nav: 5476.95, units: 3.86, invested: 21141.69, current: 21146.51, weight: 2.78, pnl: 4.82, pnlPct: 0.02, xirr: 6.2, since: "2024-09-22" },
  { name: "HDFC Retirement Savings-Equity", amc: "HDFC", category: "Other", subCategory: "Retirement Fund", plan: "Direct", nav: 53.58, units: 44.54, invested: 2499.86, current: 2386.74, weight: 0.31, pnl: -113.12, pnlPct: -4.53, xirr: -4.54, since: "2025-05-07" },
  { name: "HDFC Focused Fund", amc: "HDFC", category: "Equity", subCategory: "Focused Fund", plan: "Standard", nav: 219.81, units: 313.56, invested: 70996.51, current: 68925.32, weight: 9.07, pnl: -2071.19, pnlPct: -2.92, xirr: -11.62, since: "2025-11-07" },
  { name: "HDFC Pharma and Healthcare Fund", amc: "HDFC", category: "Equity", subCategory: "Sectoral - Pharma", plan: "Standard", nav: 19.38, units: 2912.51, invested: 49997.48, current: 56435.71, weight: 7.43, pnl: 6438.23, pnlPct: 12.88, xirr: 17.68, since: "2025-07-07" },
  { name: "Kotak Multicap Fund", amc: "Kotak", category: "Equity", subCategory: "Multi Cap", plan: "Standard", nav: 19.37, units: 2594.97, invested: 49997.51, current: 50262.03, weight: 6.61, pnl: 264.52, pnlPct: 0.53, xirr: 1.93, since: "2025-11-07" },
  { name: "SBI Liquid Fund", amc: "SBI", category: "Debt", subCategory: "Liquid Fund", plan: "Direct", nav: 4359.95, units: 3.29, invested: 14299.78, current: 14339.87, weight: 1.89, pnl: 40.09, pnlPct: 0.28, xirr: 6.12, since: "2024-06-10" },
  { name: "SBI Contra Fund", amc: "SBI", category: "Equity", subCategory: "Contra Fund", plan: "Standard", nav: 368.33, units: 130.51, invested: 49997.65, current: 48071.93, weight: 6.33, pnl: -1925.72, pnlPct: -3.85, xirr: -5.15, since: "2025-07-07" },
  { name: "ICICI Pru Equity Min Variance", amc: "ICICI", category: "Equity", subCategory: "Thematic", plan: "Standard", nav: 10.25, units: 1416.47, invested: 14999.25, current: 14518.84, weight: 1.91, pnl: -480.41, pnlPct: -3.2, xirr: -4.82, since: "2025-09-08" },
  { name: "ICICI Pru India Opp Fund", amc: "ICICI", category: "Equity", subCategory: "Thematic", plan: "Standard", nav: 35.26, units: 1976.41, invested: 70996.44, current: 69688.39, weight: 9.17, pnl: -1308.05, pnlPct: -1.84, xirr: -7.45, since: "2026-02-09" },
  { name: "ICICI Pru Innovation Fund", amc: "ICICI", category: "Equity", subCategory: "Thematic", plan: "Standard", nav: 18.35, units: 529.91, invested: 9999.5, current: 9723.94, weight: 1.28, pnl: -275.56, pnlPct: -2.76, xirr: -4.74, since: "2025-11-07" },
  { name: "Tata Business Cycle Fund", amc: "Tata", category: "Equity", subCategory: "Thematic", plan: "Standard", nav: 18.51, units: 526.34, invested: 9999.5, current: 9743.96, weight: 1.28, pnl: -255.54, pnlPct: -2.56, xirr: -4.4, since: "2025-11-07" },
  { name: "Tata Income Plus Arbitrage FOF", amc: "Tata", category: "Other", subCategory: "FoFs Hybrid", plan: "Standard", nav: 10.43, units: 958.94, invested: 9999.5, current: 10005.92, weight: 1.32, pnl: 6.42, pnlPct: 0.06, xirr: 0.81, since: "2026-05-07" },
  { name: "Tata Resources & Energy Fund", amc: "Tata", category: "Equity", subCategory: "Sectoral - Energy", plan: "Standard", nav: 48.92, units: 907.2, invested: 41997.88, current: 44382.16, weight: 5.84, pnl: 2384.28, pnlPct: 5.68, xirr: 40.77, since: "2026-03-09" },
  { name: "Tata Small Cap Fund", amc: "Tata", category: "Equity", subCategory: "Small Cap", plan: "Standard", nav: 36.11, units: 2815.94, invested: 100994.94, current: 101683.52, weight: 13.38, pnl: 688.58, pnlPct: 0.68, xirr: 1.75, since: "2025-08-07" },
  { name: "ITI Bharat Consumption Fund", amc: "ITI", category: "Equity", subCategory: "Sectoral - Consumption", plan: "Standard", nav: 10.82, units: 868.21, invested: 9999.5, current: 9390.71, weight: 1.24, pnl: -608.79, pnlPct: -6.09, xirr: -10.34, since: "2025-11-07" },
  { name: "Nippon India Banking & FS Fund", amc: "Nippon", category: "Equity", subCategory: "Sectoral - Banking", plan: "Standard", nav: 609.0, units: 113.13, invested: 70995.61, current: 68898.36, weight: 9.07, pnl: -2097.26, pnlPct: -2.95, xirr: -11.76, since: "2025-11-07" },
  { name: "Nippon India Flexi Cap Fund", amc: "Nippon", category: "Equity", subCategory: "Flexi Cap", plan: "Standard", nav: 15.91, units: 8068.53, invested: 129756.52, current: 128408.19, weight: 16.9, pnl: -1348.33, pnlPct: -1.04, xirr: -2.35, since: "2025-07-07" },
  { name: "Nippon India Conservative Hybrid", amc: "Nippon", category: "Hybrid", subCategory: "Conservative Hybrid", plan: "Standard", nav: 60.61, units: 495.17, invested: 29438.28, current: 30012.78, weight: 3.95, pnl: 574.5, pnlPct: 1.95, xirr: 2.24, since: "2025-10-27" },
] as const;


const STOCK_HOLDINGS = [
  { name: "GOLDBEES", type: "ETF", qty: 55, avgCost: 127.47, ltp: 127.78, portfolioWeight: 27.23, invested: 7010.85, current: 7027.90, pnl: 17.05, pnlPct: 0.24, dailyChange: -0.72, dailyChangePct: -0.56 },
  { name: "HDFCBANK", type: "Stock", qty: 10, avgCost: 756.40, ltp: 747.05, portfolioWeight: 28.94, invested: 7564.00, current: 7470.50, pnl: -93.50, pnlPct: -1.24, dailyChange: -7.15, dailyChangePct: -0.95 },
  { name: "RPOWER", type: "Stock", qty: 55, avgCost: 27.49, ltp: 28.59, portfolioWeight: 6.09, invested: 1511.95, current: 1572.45, pnl: 60.50, pnlPct: 4.0, dailyChange: 1.20, dailyChangePct: 4.38 },
  { name: "SILVERBEES", type: "ETF", qty: 40, avgCost: 246.08, ltp: 243.58, portfolioWeight: 37.74, invested: 9843.20, current: 9743.20, pnl: -100.00, pnlPct: -1.02, dailyChange: -2.98, dailyChangePct: -1.21 },
  { name: "Equity & Gold Allocation", type: "Smallcase", qty: null, avgCost: null, ltp: null, portfolioWeight: 2.02, invested: 403.14, current: 520.92, pnl: 117.78, pnlPct: 29.22, dailyChange: null, dailyChangePct: null },
] as const;

function shortAmount(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000) return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
}

export default function CashflowPlanningPage() {
  const { format } = useFormatCurrency();
  const { transactions, loading, fetchTransactions } = useTransactionsStore();
  const { patterns, fetchPatterns } = useRecurringPatternsStore();
  const { budgets, fetchBudgets } = useBudgetsStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { debts, fetchDebts } = useDebtTrackerStore();

  // Forecast scenario controls
  const [scenarioIncomeBoost, setScenarioIncomeBoost] = useState(0); // % boost
  const [scenarioExtraExpense, setScenarioExtraExpense] = useState(0); // flat extra/mo

  // Smart Calculator state
  type CalcItem = { id: string; name: string; amount: number; type: "income" | "expense" };
  type CustomGoal = { id: string; name: string; target: number; current: number; deadline: string };
  const [calcIncomeOverride, setCalcIncomeOverride] = useState<string>("");
  const [calcExpenseOverride, setCalcExpenseOverride] = useState<string>("");
  const [calcItems, setCalcItems] = useState<CalcItem[]>([]);
  const [calcItemForm, setCalcItemForm] = useState({ name: "", amount: "", type: "expense" as "income" | "expense" });
  const [customGoals, setCustomGoals] = useState<CustomGoal[]>([]);
  const [customGoalForm, setCustomGoalForm] = useState({ name: "", target: "", current: "", deadline: "" });
  const [returnRate, setReturnRate] = useState(12);
  const [extraDebtPayment, setExtraDebtPayment] = useState(0);

  useEffect(() => {
    fetchTransactions();
    fetchPatterns();
    fetchBudgets();
    fetchGoals();
    fetchDebts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const currentMonthLabel = now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  // ── Current month ──────────────────────────────────────
  const currentMonthTxns = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }),
    [transactions, currentMonth, currentYear],
  );

  const currentIncome = useMemo(
    () =>
      currentMonthTxns
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + t.amount, 0),
    [currentMonthTxns],
  );

  const currentExpenses = useMemo(
    () =>
      currentMonthTxns
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + t.amount, 0),
    [currentMonthTxns],
  );

  const surplus = currentIncome - currentExpenses;
  const savingsRate =
    currentIncome > 0 ? ((surplus / currentIncome) * 100).toFixed(1) : null;

  // ── 6-month chart ──────────────────────────────────────
  const cashflowData = useMemo(() => {
    const months: Record<
      string,
      { label: string; Income: number; Expenses: number }
    > = {};
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 5);
      cutoff.setDate(1);
      if (d < cutoff) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      if (!months[key]) months[key] = { label, Income: 0, Expenses: 0 };
      if (t.type === "income") months[key].Income += t.amount;
      else months[key].Expenses += t.amount;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [transactions]);

  // ── Recent transactions ───────────────────────────────
  const recentTxns = useMemo(
    () =>
      transactions
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6),
    [transactions],
  );

  // ── Upcoming recurring ────────────────────────────────
  const upcomingRecurring = useMemo(
    () =>
      patterns
        .filter((p) => p.is_active)
        .sort(
          (a, b) =>
            new Date(a.next_date).getTime() - new Date(b.next_date).getTime(),
        )
        .slice(0, 4),
    [patterns],
  );

  // ── Planning data ─────────────────────────────────────
  const activeGoals = useMemo(
    () =>
      goals
        .filter((g) => g.status === "active")
        .sort(
          (a, b) =>
            (PRIORITY_ORDER[a.priority ?? "medium"] ?? 1) -
            (PRIORITY_ORDER[b.priority ?? "medium"] ?? 1),
        ),
    [goals],
  );

  const sortedBudgets = useMemo(
    () =>
      [...budgets].sort((a, b) => {
        const ra =
          a.limit_amount > 0 ? (a.spent_amount || 0) / a.limit_amount : 0;
        const rb =
          b.limit_amount > 0 ? (b.spent_amount || 0) / b.limit_amount : 0;
        return rb - ra;
      }),
    [budgets],
  );

  const totalDebt = useMemo(
    () => debts.reduce((s, d) => s + d.balance, 0),
    [debts],
  );
  const totalMinPayment = useMemo(
    () => debts.reduce((s, d) => s + d.minimum_payment, 0),
    [debts],
  );

  // ── 6-month averages ──────────────────────────────────
  const sixMonthAvg = useMemo(() => {
    const months: Record<
      string,
      { income: number; expenses: number; savings: number }
    > = {};
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 6);
    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d < cutoff) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!months[key]) months[key] = { income: 0, expenses: 0, savings: 0 };
      if (t.type === "income") months[key].income += t.amount;
      else if (t.category === "Savings") months[key].savings += t.amount;
      else months[key].expenses += t.amount;
    });
    const vals = Object.values(months);
    if (vals.length === 0) return { income: 0, expenses: 0, savings: 0 };
    return {
      income: vals.reduce((s, m) => s + m.income, 0) / vals.length,
      expenses: vals.reduce((s, m) => s + m.expenses, 0) / vals.length,
      savings: vals.reduce((s, m) => s + m.savings, 0) / vals.length,
    };
  }, [transactions]);

  // ── 6-month cashflow forecast ─────────────────────────
  const forecastData = useMemo(() => {
    const toMonthly = (amount: number, freq: string) => {
      switch (freq) {
        case "daily":
          return amount * 30.4;
        case "weekly":
          return amount * 4.33;
        case "biweekly":
          return amount * 2.17;
        case "monthly":
          return amount;
        case "quarterly":
          return amount / 3;
        case "yearly":
          return amount / 12;
        default:
          return amount;
      }
    };

    const recurringIncome = patterns
      .filter((p) => p.is_active && p.type === "income")
      .reduce((s, p) => s + toMonthly(p.amount, p.frequency), 0);

    const recurringExpenses = patterns
      .filter((p) => p.is_active && p.type === "expense")
      .reduce((s, p) => s + toMonthly(p.amount, p.frequency), 0);

    const projIncome = Math.max(sixMonthAvg.income, recurringIncome);
    const projExpenses = Math.max(sixMonthAvg.expenses, recurringExpenses);

    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() + 1 + i);
      const label = d.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      return {
        label,
        Income: Math.round(projIncome),
        Expenses: Math.round(projExpenses),
        Surplus: Math.round(projIncome - projExpenses),
      };
    });
  }, [sixMonthAvg, patterns]);

  const projectedAnnualSurplus = forecastData.reduce(
    (s, m) => s + m.Surplus,
    0,
  );

  // ── 18-month advanced forecast (EMI-aware) ────────────
  const forecast18 = useMemo(() => {
    const toMonthly = (amount: number, freq: string) => {
      switch (freq) {
        case "daily":
          return amount * 30.4;
        case "weekly":
          return amount * 4.33;
        case "biweekly":
          return amount * 2.17;
        case "monthly":
          return amount;
        case "quarterly":
          return amount / 3;
        case "yearly":
          return amount / 12;
        default:
          return amount;
      }
    };

    const recurringIncome = patterns
      .filter((p) => p.is_active && p.type === "income")
      .reduce((s, p) => s + toMonthly(p.amount, p.frequency), 0);
    const recurringExpenses = patterns
      .filter((p) => p.is_active && p.type === "expense")
      .reduce((s, p) => s + toMonthly(p.amount, p.frequency), 0);

    const recurringPatternSavings = patterns
      .filter((p) => p.is_active && p.category === "Savings")
      .reduce((s, p) => s + toMonthly(p.amount, p.frequency), 0);

    const baseIncome =
      Math.max(sixMonthAvg.income, recurringIncome) *
      (1 + scenarioIncomeBoost / 100);
    const baseExpenses =
      Math.max(sixMonthAvg.expenses, recurringExpenses) + scenarioExtraExpense;
    const baseSavings = Math.max(sixMonthAvg.savings, recurringPatternSavings);

    // Recurring patterns that end within the 18-month forecast window
    const forecastStart = new Date();
    forecastStart.setDate(1);
    forecastStart.setHours(0, 0, 0, 0);
    const endingPatterns = patterns
      .filter((p) => p.is_active && p.end_date)
      .map((p) => {
        const endDate = new Date(p.end_date!);
        endDate.setDate(1);
        const monthsFromNow =
          (endDate.getFullYear() - forecastStart.getFullYear()) * 12 +
          (endDate.getMonth() - forecastStart.getMonth());
        return {
          ...p,
          monthsFromNow,
          monthlyAmount: toMonthly(p.amount, p.frequency),
        };
      })
      .filter((p) => p.monthsFromNow >= 1 && p.monthsFromNow <= 18);

    // Compute months remaining for each debt using amortization
    const debtTimelines = debts.map((d) => {
      let monthsLeft: number;
      if (d.months_remaining != null && d.months_remaining > 0) {
        monthsLeft = d.months_remaining;
      } else {
        const r = d.interest_rate / (12 * 100);
        const pmt = d.minimum_payment;
        if (pmt <= 0) {
          monthsLeft = 999;
        } else if (r > 0) {
          const ratio = (d.balance * r) / pmt;
          if (ratio >= 1)
            monthsLeft = 999; // payment can't cover interest
          else monthsLeft = Math.ceil(-Math.log(1 - ratio) / Math.log(1 + r));
        } else {
          // 0% interest
          monthsLeft = Math.ceil(d.balance / pmt);
        }
      }
      return { ...d, monthsLeft: Math.min(monthsLeft, 999) };
    });

    let cumSurplus = 0;
    let cumSaved = 0;
    const months = Array.from({ length: 18 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() + 1 + i);
      const label = d.toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });

      // EMIs that closed before this month — freed amount applies from next month after closure
      const closedByNow = debtTimelines.filter((dt) => dt.monthsLeft <= i);
      const closedEMI = closedByNow.reduce(
        (s, dt) => s + dt.minimum_payment,
        0,
      );

      // EMIs closing exactly this month (for event display only)
      const closingThisMonth = debtTimelines.filter(
        (dt) => dt.monthsLeft === i + 1,
      );

      // Recurring patterns ending exactly this month (for event display only)
      const patternsEndingThisMonth = endingPatterns.filter(
        (p) => p.monthsFromNow === i + 1,
      );

      // Savings patterns that ended before this month — reduction applies from next month
      const endedSavingsReduction = endingPatterns
        .filter((p) => p.category === "Savings" && p.monthsFromNow <= i)
        .reduce((s, p) => s + p.monthlyAmount, 0);

      // Non-savings expense patterns that ended before this month — reduction applies from next month
      const endedExpenseReduction = endingPatterns
        .filter(
          (p) =>
            p.type === "expense" &&
            p.category !== "Savings" &&
            p.monthsFromNow <= i,
        )
        .reduce((s, p) => s + p.monthlyAmount, 0);

      const projIncome = Math.round(baseIncome);
      const projExpenses = Math.round(
        Math.max(
          baseExpenses -
            closedEMI -
            endedExpenseReduction -
            endedSavingsReduction,
          0,
        ),
      );
      const monthSavings = Math.round(
        Math.max(baseSavings - endedSavingsReduction, 0),
      );
      const monthSurplus = projIncome - projExpenses;
      cumSurplus += monthSurplus;
      cumSaved += monthSavings;

      const savingsRatePct =
        projIncome > 0 ? Math.round((monthSurplus / projIncome) * 100) : 0;
      const debtToIncomePct =
        projIncome > 0
          ? Math.round(
              ((closedEMI > 0
                ? baseExpenses -
                  closedEMI -
                  endedExpenseReduction -
                  endedSavingsReduction
                : projExpenses) /
                projIncome) *
                100,
            )
          : 0;
      // Health score: savings rate (40pts) + low debt-to-income (40pts) + positive surplus (20pts)
      const healthScore = Math.min(
        100,
        Math.max(
          0,
          Math.min(40, savingsRatePct * 2) +
            Math.max(0, 40 - Math.max(0, debtToIncomePct - 30)) +
            (monthSurplus > 0 ? 20 : 0),
        ),
      );

      // Running debt balance: subtract payments made up to this month
      const runningDebtBalance = debtTimelines.reduce((sum, dt) => {
        if (dt.monthsLeft <= i + 1) return sum; // fully paid
        const paymentsLeft = dt.monthsLeft - (i + 1);
        const r = dt.interest_rate / (12 * 100);
        if (r > 0 && dt.minimum_payment > 0) {
          const remainingBal =
            dt.minimum_payment * ((1 - Math.pow(1 + r, -paymentsLeft)) / r);
          return sum + Math.max(0, remainingBal);
        }
        return sum + Math.max(0, dt.balance - dt.minimum_payment * (i + 1));
      }, 0);

      return {
        label,
        month: i + 1,
        Income: projIncome,
        Expenses: projExpenses,
        Surplus: monthSurplus,
        CumulativeSurplus: Math.round(cumSurplus),
        Saved: monthSavings,
        CumulativeSaved: Math.round(cumSaved),
        TotalForecast: Math.round(cumSurplus + cumSaved),
        freedEMI: Math.round(closedEMI),
        savingsRatePct,
        healthScore,
        runningDebtBalance: Math.round(runningDebtBalance),
        closingThisMonth: closingThisMonth.map((dt) => ({
          id: dt.id,
          name: dt.name,
          payment: dt.minimum_payment,
        })),
        patternsEndingThisMonth: patternsEndingThisMonth.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          type: p.type,
          amount: p.monthlyAmount,
        })),
        hasEvent:
          closingThisMonth.length > 0 || patternsEndingThisMonth.length > 0,
      };
    });

    const closingIn18 = debtTimelines.filter(
      (dt) => dt.monthsLeft <= 18 && dt.monthsLeft < 999,
    );
    const totalFreedEMI = closingIn18.reduce(
      (s, dt) => s + dt.minimum_payment,
      0,
    );
    const total18Surplus = months.reduce((s, m) => s + m.Surplus, 0);
    const breakEvenMonth = months.find((m) => m.CumulativeSurplus > 0);
    const avgHealthScore = Math.round(
      months.reduce((s, m) => s + m.healthScore, 0) / months.length,
    );
    const total18Saved = months.reduce((s, m) => s + m.Saved, 0);
    const allMilestones = months
      .filter((m) => m.hasEvent)
      .flatMap((m) => [
        ...m.closingThisMonth.map((c) => ({
          month: m.label,
          type: "emi" as const,
          name: c.name,
          amount: c.payment,
        })),
        ...m.patternsEndingThisMonth.map((p) => ({
          month: m.label,
          type: "pattern" as const,
          name: p.name,
          amount: p.amount,
        })),
      ]);

    return {
      months,
      debtTimelines,
      closingIn18,
      totalFreedEMI,
      total18Surplus,
      breakEvenMonth,
      avgHealthScore,
      total18Saved,
      allMilestones,
    };
  }, [sixMonthAvg, patterns, debts, scenarioIncomeBoost, scenarioExtraExpense]);

  // ── Last month for delta comparison ──────────────────
  const lastMonthTxns = useMemo(() => {
    const lm = currentMonth === 0 ? 11 : currentMonth - 1;
    const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() === lm && d.getFullYear() === ly;
    });
  }, [transactions, currentMonth, currentYear]);

  const lastMonthIncome = useMemo(
    () => lastMonthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    [lastMonthTxns],
  );
  const lastMonthExpenses = useMemo(
    () => lastMonthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [lastMonthTxns],
  );
  const lastMonthSurplus = lastMonthIncome - lastMonthExpenses;
  const savingsRateNum = currentIncome > 0 ? (surplus / currentIncome) * 100 : 0;
  const lastMonthSavingsRate = lastMonthIncome > 0 ? (lastMonthSurplus / lastMonthIncome) * 100 : 0;

  // ── Category breakdown (current month) ──────────────
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    currentMonthTxns
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        cats[t.category] = (cats[t.category] || 0) + t.amount;
      });
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    return Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 7)
      .map(([cat, amount]) => ({ cat, amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 }));
  }, [currentMonthTxns]);

  // ── Budget / goal health ──────────────────────────────
  const budgetHealthScore = useMemo(() => {
    if (budgets.length === 0) return null;
    const onTrack = budgets.filter((b) => (b.spent_amount || 0) <= b.limit_amount).length;
    return { score: Math.round((onTrack / budgets.length) * 100), onTrack, total: budgets.length };
  }, [budgets]);

  const overallGoalProgress = useMemo(() => {
    if (activeGoals.length === 0) return null;
    const avg =
      activeGoals.reduce((s, g) => s + Math.min(100, (g.currentAmount / g.targetAmount) * 100), 0) /
      activeGoals.length;
    return Math.round(avg);
  }, [activeGoals]);

  // ── Smart insights ────────────────────────────────────
  const smartInsights = useMemo(() => {
    const insights: { key: string; text: string; type: "positive" | "warning" | "neutral" }[] = [];

    if (currentIncome > 0) {
      const srDelta = savingsRateNum - lastMonthSavingsRate;
      if (Math.abs(srDelta) >= 2) {
        insights.push({
          key: "sr",
          text: srDelta > 0
            ? `Savings rate up ${srDelta.toFixed(1)}pp vs last month`
            : `Savings rate down ${Math.abs(srDelta).toFixed(1)}pp vs last month`,
          type: srDelta > 0 ? "positive" : "warning",
        });
      }
    }

    if (categoryBreakdown.length > 0) {
      const top = categoryBreakdown[0];
      insights.push({ key: "top-cat", text: `${top.cat} is your top spend at ${top.pct}% of expenses`, type: "neutral" });
    }

    const overBudgets = budgets.filter((b) => (b.spent_amount || 0) > b.limit_amount);
    if (overBudgets.length > 0) {
      insights.push({ key: "over-budget", text: `${overBudgets.length} budget${overBudgets.length > 1 ? "s" : ""} over limit this month`, type: "warning" });
    } else if (budgets.length > 0) {
      insights.push({ key: "all-budget", text: "All budgets within limit this month", type: "positive" });
    }

    const urgentGoals = activeGoals.filter((g) => {
      if (!g.targetDate) return false;
      const d = new Date(g.targetDate);
      const moLeft = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
      return moLeft <= 3 && moLeft >= 0;
    });
    if (urgentGoals.length > 0) {
      insights.push({ key: "urgent-goal", text: `"${urgentGoals[0].title}" goal deadline within 3 months`, type: "warning" });
    }

    if (forecast18.totalFreedEMI > 0) {
      insights.push({ key: "emi-free", text: `${forecast18.closingIn18.length} EMI${forecast18.closingIn18.length > 1 ? "s" : ""} clearing in 18 months — frees ${shortAmount(forecast18.totalFreedEMI)}/mo`, type: "positive" });
    }

    return insights.slice(0, 4);
  }, [savingsRateNum, lastMonthSavingsRate, categoryBreakdown, budgets, activeGoals, forecast18, currentIncome, now]);

  if (loading && transactions.length === 0) {
    return <ListPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero Band ── */}
      <div className="bg-slate-900 dark:bg-black text-white">
        <div className="px-3 sm:px-6 lg:px-8 pt-3 pb-0">
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
              Cashflow & Planning
            </p>
            <p className="text-xs text-slate-500">{currentMonthLabel}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-700/60 border-t border-slate-700/60">
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Income
              </p>
              <p className="font-mono text-base font-semibold text-green-400">
                {format(currentIncome)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {currentMonthLabel}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Expenses
              </p>
              <p className="font-mono text-base font-semibold text-red-400">
                {format(currentExpenses)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {currentMonthLabel}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Surplus
              </p>
              <p
                className={`font-mono text-base font-semibold ${surplus >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {surplus < 0 ? "-" : ""}
                {format(Math.abs(surplus))}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {savingsRate ? `${savingsRate}% saved` : "No income logged"}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">
                Active Plans
              </p>
              <p className="font-mono text-base font-semibold text-slate-200">
                {activeGoals.length + budgets.length}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {activeGoals.length} goals · {budgets.length} budgets
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="px-3 sm:px-6 lg:px-8 py-3">
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="forecast">18-Month Forecast</TabsTrigger>
            <TabsTrigger value="calculator" className="flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" /> Smart Calculator
            </TabsTrigger>
            <TabsTrigger value="investments" className="flex items-center gap-1.5">
              <TrendingUpIcon className="h-3.5 w-3.5" /> Investments
            </TabsTrigger>
          </TabsList>

          {/* ══════════════ OVERVIEW TAB ══════════════ */}
          <TabsContent value="overview" className="space-y-4">

            {/* ── Financial Pulse ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Savings Rate */}
              <Card className="relative overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Savings Rate</p>
                    <Activity className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                  <p className={`font-mono font-bold text-xl ${savingsRateNum >= 20 ? "text-green-600 dark:text-green-400" : savingsRateNum >= 10 ? "text-yellow-600 dark:text-yellow-400" : "text-red-500"}`}>
                    {currentIncome > 0 ? `${savingsRateNum.toFixed(1)}%` : "—"}
                  </p>
                  {currentIncome > 0 && lastMonthIncome > 0 && (() => {
                    const delta = savingsRateNum - lastMonthSavingsRate;
                    return (
                      <p className={`text-[10px] flex items-center gap-0.5 mt-0.5 font-mono ${delta >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {delta >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {Math.abs(delta).toFixed(1)}pp vs last mo
                      </p>
                    );
                  })()}
                  {currentIncome === 0 && <p className="text-[10px] text-muted-foreground mt-0.5">No income logged</p>}
                </CardContent>
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${savingsRateNum >= 20 ? "bg-green-500" : savingsRateNum >= 10 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, Math.max(0, savingsRateNum * 2))}%` }} />
              </Card>

              {/* Net Surplus */}
              <Card className="relative overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Net Surplus</p>
                    <Wallet className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                  <p className={`font-mono font-bold text-xl ${surplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                    {surplus < 0 ? "-" : "+"}{shortAmount(Math.abs(surplus))}
                  </p>
                  {lastMonthIncome > 0 && (() => {
                    const delta = surplus - lastMonthSurplus;
                    return (
                      <p className={`text-[10px] flex items-center gap-0.5 mt-0.5 font-mono ${delta >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {delta >= 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {shortAmount(Math.abs(delta))} vs last mo
                      </p>
                    );
                  })()}
                  {lastMonthIncome === 0 && <p className="text-[10px] text-muted-foreground mt-0.5">{currentMonthLabel}</p>}
                </CardContent>
                <div className={`absolute bottom-0 left-0 h-0.5 right-0 ${surplus >= 0 ? "bg-green-500" : "bg-red-500"}`} />
              </Card>

              {/* Budget Health */}
              <Card className="relative overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Budget Health</p>
                    <Shield className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                  {budgetHealthScore ? (
                    <>
                      <p className={`font-mono font-bold text-xl ${budgetHealthScore.score === 100 ? "text-green-600 dark:text-green-400" : budgetHealthScore.score >= 70 ? "text-yellow-600 dark:text-yellow-400" : "text-red-500"}`}>
                        {budgetHealthScore.onTrack}/{budgetHealthScore.total}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">budgets on track</p>
                    </>
                  ) : (
                    <>
                      <p className="font-mono font-bold text-xl text-muted-foreground">—</p>
                      <Link href="/budgets" className="text-[10px] text-primary hover:underline mt-0.5 block">Set budgets</Link>
                    </>
                  )}
                </CardContent>
                {budgetHealthScore && (
                  <div className="absolute bottom-0 left-0 h-0.5 bg-green-500" style={{ width: `${budgetHealthScore.score}%`, right: 0 }} />
                )}
              </Card>

              {/* Goal Progress */}
              <Card className="relative overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Goal Progress</p>
                    <Target className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                  {overallGoalProgress !== null ? (
                    <>
                      <p className={`font-mono font-bold text-xl ${overallGoalProgress >= 75 ? "text-green-600 dark:text-green-400" : overallGoalProgress >= 40 ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"}`}>
                        {overallGoalProgress}%
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">avg across {activeGoals.length} goal{activeGoals.length !== 1 ? "s" : ""}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-mono font-bold text-xl text-muted-foreground">—</p>
                      <Link href="/goals" className="text-[10px] text-primary hover:underline mt-0.5 block">Create a goal</Link>
                    </>
                  )}
                </CardContent>
                {overallGoalProgress !== null && (
                  <div className="absolute bottom-0 left-0 h-0.5 bg-indigo-500" style={{ width: `${overallGoalProgress}%` }} />
                )}
              </Card>
            </div>

            {/* ── Smart Insights ── */}
            {smartInsights.length > 0 && (
              <div className="flex items-start gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Insights</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {smartInsights.map((ins) => (
                    <div key={ins.key} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium border shrink-0
                      ${ins.type === "positive" ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300"
                        : ins.type === "warning" ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300"
                        : "bg-muted border-border text-muted-foreground"}`}>
                      {ins.type === "positive" ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                        : ins.type === "warning" ? <AlertCircle className="h-3 w-3 shrink-0" />
                        : <Lightbulb className="h-3 w-3 shrink-0" />}
                      {ins.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Cashflow section ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Cashflow</p>
                <div className="flex items-center gap-3">
                  <Link href="/transactions" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <ReceiptText className="h-3 w-3" /> Transactions
                  </Link>
                  <Link href="/recurring" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" /> Recurring
                  </Link>
                  <Link href="/insights" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> Insights
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Enhanced chart — bars + surplus line */}
                <Card className="lg:col-span-2 rounded-lg">
                  <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">6-Month Cashflow</p>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />Avg {shortAmount(sixMonthAvg.income)}/mo
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-red-500" />Avg {shortAmount(sixMonthAvg.expenses)}/mo
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 px-2 pb-2">
                    {cashflowData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={210}>
                        <ComposedChart data={cashflowData.map((m) => ({ ...m, Surplus: m.Income - m.Expenses }))} barCategoryGap="28%" barGap={2}>
                          <defs>
                            <linearGradient id="surplusGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.15} />
                              <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={shortAmount} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                            formatter={(v: unknown, name: string) => [format(v as number), name]}
                          />
                          <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
                          <ReferenceLine y={0} stroke="hsl(var(--border))" />
                          <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          <Line type="monotone" dataKey="Surplus" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: "#a855f7", strokeWidth: 0 }} strokeDasharray="4 2" name="Surplus" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[210px] flex items-center justify-center text-muted-foreground text-sm">
                        Add transactions to see cashflow trends
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Transactions */}
                <Card className="rounded-lg">
                  <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                    <div className="flex items-center justify-between pb-2">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Recent</p>
                      <Link href="/transactions" className="text-xs text-primary hover:underline flex items-center gap-1">
                        All <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {recentTxns.length > 0 ? (
                      <div className="divide-y divide-border">
                        {recentTxns.map((t) => (
                          <div key={t.id} className="flex items-center gap-2.5 px-3 py-2.5">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${t.type === "income" ? "bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300" : "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"}`}>
                              {t.type === "income" ? "↑" : "↓"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{t.description || t.category}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {new Date(t.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {t.category}
                              </p>
                            </div>
                            <span className={`text-xs font-mono font-semibold shrink-0 ${t.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                              {t.type === "income" ? "+" : "-"}{format(t.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-[140px] flex items-center justify-center text-muted-foreground text-xs">No transactions yet</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Upcoming Recurring */}
              {upcomingRecurring.length > 0 && (
                <Card className="rounded-lg mt-4">
                  <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Upcoming Recurring</p>
                      </div>
                      <Link href="/recurring" className="text-xs text-primary hover:underline flex items-center gap-1">
                        Manage <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
                      {upcomingRecurring.map((p) => (
                        <div key={p.id} className="px-4 py-3">
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          <p className={`font-mono text-sm font-semibold mt-0.5 ${p.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {p.type === "expense" ? "-" : "+"}{format(p.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                            {p.frequency} · {new Date(p.next_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </section>

            {/* ── Spending Breakdown + 6-Month Forecast ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Category breakdown */}
              <Card className="lg:col-span-2 rounded-lg">
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Spending by Category — {currentMonthLabel}</p>
                    <Link href="/analytics" className="text-xs text-primary hover:underline flex items-center gap-1">
                      Full breakdown <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="px-4 py-3">
                  {categoryBreakdown.length > 0 ? (
                    <div className="space-y-2.5">
                      {categoryBreakdown.map((c, i) => {
                        const COLORS = ["#6366f1","#f97316","#3b82f6","#ec4899","#22c55e","#eab308","#ef4444"];
                        const color = COLORS[i % COLORS.length];
                        return (
                          <div key={c.cat}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-xs font-medium">{c.cat}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                                <span>{format(c.amount)}</span>
                                <span className="text-[10px] w-6 text-right">{c.pct}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: `${c.pct}%`, backgroundColor: color }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-24 flex items-center justify-center text-muted-foreground text-xs">
                      No expenses logged this month
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 6-Month Forecast mini */}
              <Card className="rounded-lg">
                <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                  <div className="flex items-center justify-between pb-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">6-Month Forecast</p>
                    <span className="text-[10px] font-mono text-muted-foreground italic">Projected</span>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex flex-col">
                  <div className="divide-y divide-border overflow-y-auto max-h-52">
                    {forecastData.map((m) => (
                      <div key={m.label} className="flex items-center justify-between px-4 py-2">
                        <span className="text-xs font-medium w-14 shrink-0">{m.label}</span>
                        <div className="flex-1 mx-3 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${m.Surplus >= 0 ? "bg-green-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(100, Math.abs(m.Surplus) / Math.max(m.Income, 1) * 100)}%` }}
                          />
                        </div>
                        <span className={`text-xs font-mono font-semibold shrink-0 w-16 text-right ${m.Surplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                          {m.Surplus >= 0 ? "+" : ""}{shortAmount(m.Surplus)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t border-border shrink-0">
                    <div>
                      <span className="text-xs font-semibold">Total projected</span>
                      <p className="text-[10px] text-muted-foreground">Cumulative 6-mo surplus</p>
                    </div>
                    <span className={`text-sm font-mono font-bold ${projectedAnnualSurplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {projectedAnnualSurplus >= 0 ? "+" : ""}{shortAmount(projectedAnnualSurplus)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Planning section ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Planning</p>
                <div className="flex items-center gap-3">
                  <Link href="/goals" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Target className="h-3 w-3" /> Goals
                  </Link>
                  <Link href="/budgets" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Budgets
                  </Link>
                  <Link href="/debt-tracker" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Landmark className="h-3 w-3" /> Debts
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Goals — ring progress */}
                <Card className="rounded-lg">
                  <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Goals</p>
                        {activeGoals.length > 0 && (
                          <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{activeGoals.length}</span>
                        )}
                      </div>
                      <Link href="/goals" className="text-xs text-primary hover:underline flex items-center gap-1">
                        All <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto max-h-72">
                    {activeGoals.length > 0 ? (
                      <div className="divide-y divide-border">
                        {activeGoals.map((g) => {
                          const pct = Math.min(100, (g.currentAmount / g.targetAmount) * 100);
                          const ringColor = pct >= 75 ? "#22c55e" : pct >= 40 ? "#6366f1" : "#f97316";
                          const deadlineDate = g.targetDate ? new Date(g.targetDate) : null;
                          const moLeft = deadlineDate
                            ? Math.max(0, (deadlineDate.getFullYear() - now.getFullYear()) * 12 + (deadlineDate.getMonth() - now.getMonth()))
                            : null;
                          return (
                            <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                              <div className="relative shrink-0">
                                <RingProgress value={pct} size={44} stroke={4} color={ringColor} />
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold font-mono" style={{ color: ringColor }}>
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{g.title}</p>
                                <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                                  {format(g.currentAmount)} / {format(g.targetAmount)}
                                </p>
                                {moLeft !== null && (
                                  <p className={`text-[10px] mt-0.5 ${moLeft <= 3 ? "text-amber-500" : "text-muted-foreground"}`}>
                                    {moLeft === 0 ? "Due this month" : `${moLeft} mo left`}
                                  </p>
                                )}
                              </div>
                              {g.priority === "high" && (
                                <Badge variant="outline" className="text-[9px] border-red-200 text-red-600 dark:border-red-800 dark:text-red-400 shrink-0">High</Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[140px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Trophy className="h-6 w-6 opacity-40" />
                        <p className="text-xs">No active goals</p>
                        <Link href="/goals"><Button size="sm" variant="outline">Create Goal</Button></Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Budgets — gauge-style */}
                <Card className="rounded-lg">
                  <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Budgets</p>
                        {budgets.length > 0 && (
                          <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{budgets.length}</span>
                        )}
                      </div>
                      <Link href="/budgets" className="text-xs text-primary hover:underline flex items-center gap-1">
                        All <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 overflow-y-auto max-h-72">
                    {sortedBudgets.length > 0 ? (
                      <div className="divide-y divide-border">
                        {sortedBudgets.map((b) => {
                          const spent = b.spent_amount || 0;
                          const pct = b.limit_amount > 0 ? Math.min(100, (spent / b.limit_amount) * 100) : 0;
                          const over = spent > b.limit_amount;
                          const warn = !over && pct >= 80;
                          const barColor = over ? "#ef4444" : warn ? "#f59e0b" : "#22c55e";
                          return (
                            <div key={b.id} className="px-4 py-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {over ? (
                                    <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />
                                  ) : warn ? (
                                    <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                                  )}
                                  <span className="text-xs font-medium truncate">{b.category}</span>
                                </div>
                                <span className={`text-xs font-mono ml-2 shrink-0 ${over ? "text-red-500" : "text-muted-foreground"}`}>
                                  {format(spent)} / {format(b.limit_amount)}
                                </span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% used</span>
                                {over ? (
                                  <span className="text-[10px] text-red-500 font-medium">Over by {format(spent - b.limit_amount)}</span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground">{format(b.limit_amount - spent)} left</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[140px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <CreditCard className="h-6 w-6 opacity-40" />
                        <p className="text-xs">No budgets set</p>
                        <Link href="/budgets"><Button size="sm" variant="outline">Set Budget</Button></Link>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Debts */}
                <Card className="rounded-lg">
                  <CardHeader className="pb-0 border-b border-border px-4 pt-4">
                    <div className="flex items-center justify-between pb-2">
                      <div className="flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Debts</p>
                        {debts.length > 0 && (
                          <span className="text-[9px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{debts.length}</span>
                        )}
                      </div>
                      <Link href="/debt-tracker" className="text-xs text-primary hover:underline flex items-center gap-1">
                        All <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 flex flex-col">
                    {debts.length > 0 ? (
                      <div className="divide-y divide-border flex flex-col">
                        <div className="px-4 py-3 bg-muted/30 shrink-0">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Total Outstanding</span>
                            <span className="font-mono text-lg font-bold text-red-600 dark:text-red-400">{format(totalDebt)}</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            {totalMinPayment > 0 && (
                              <span className="text-[10px] text-muted-foreground">{format(totalMinPayment)}/mo minimum</span>
                            )}
                            {forecast18.totalFreedEMI > 0 && (
                              <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                                {shortAmount(forecast18.totalFreedEMI)}/mo freed in 18mo
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="overflow-y-auto max-h-52 divide-y divide-border">
                          {debts.map((d) => {
                            const paidPct = d.original_amount > 0
                              ? Math.min(100, ((d.original_amount - d.balance) / d.original_amount) * 100)
                              : 0;
                            return (
                              <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                                <div className="relative shrink-0">
                                  <RingProgress value={paidPct} size={40} stroke={3.5} color="#3b82f6" />
                                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold font-mono text-blue-600 dark:text-blue-400">
                                    {paidPct.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{d.name}</p>
                                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{format(d.balance)} remaining</p>
                                  {d.minimum_payment > 0 && (
                                    <p className="text-[10px] text-muted-foreground">{format(d.minimum_payment)}/mo</p>
                                  )}
                                </div>
                                <Badge variant="outline" className="text-[9px] capitalize shrink-0">{d.type}</Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="h-[140px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <Landmark className="h-6 w-6 opacity-40" />
                        <p className="text-xs">No debts tracked</p>
                        <Link href="/debt-tracker"><Button size="sm" variant="outline">Add Debt</Button></Link>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>
          </TabsContent>

          {/* ══════════════ 18-MONTH FORECAST TAB ══════════════ */}
          <TabsContent value="forecast" className="space-y-4">
            {/* ── Scenario Controls ── */}
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader className="pb-2 px-4 pt-3">
                <CardTitle className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  <Lightbulb className="h-3.5 w-3.5" /> What-If Scenario
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Adjust to model different income or expense scenarios live
                </p>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium">
                        Income Boost
                      </span>
                      <span
                        className={`font-mono font-semibold ${scenarioIncomeBoost > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
                      >
                        {scenarioIncomeBoost > 0
                          ? `+${scenarioIncomeBoost}%`
                          : "None"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={1}
                      value={scenarioIncomeBoost}
                      onChange={(e) =>
                        setScenarioIncomeBoost(Number(e.target.value))
                      }
                      className="w-full accent-green-500"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>0%</span>
                      <span>+50%</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-medium">
                        Extra Expense
                      </span>
                      <span
                        className={`font-mono font-semibold ${scenarioExtraExpense > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}
                      >
                        {scenarioExtraExpense > 0
                          ? `+${shortAmount(scenarioExtraExpense)}/mo`
                          : "None"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100000}
                      step={1000}
                      value={scenarioExtraExpense}
                      onChange={(e) =>
                        setScenarioExtraExpense(Number(e.target.value))
                      }
                      className="w-full accent-red-500"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>₹0</span>
                      <span>₹1L/mo</span>
                    </div>
                  </div>
                </div>
                {(scenarioIncomeBoost > 0 || scenarioExtraExpense > 0) && (
                  <button
                    onClick={() => {
                      setScenarioIncomeBoost(0);
                      setScenarioExtraExpense(0);
                    }}
                    className="mt-2 text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reset to baseline
                  </button>
                )}
              </CardContent>
            </Card>

            {/* ── Summary Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Monthly EMI Burden
                  </p>
                  <p className="font-mono font-bold text-base text-red-600 dark:text-red-400">
                    {format(totalMinPayment)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {debts.length} active loan{debts.length !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Cash Freed by Mo 18
                  </p>
                  <p className="font-mono font-bold text-base text-green-600 dark:text-green-400">
                    {format(forecast18.totalFreedEMI)}
                    <span className="text-xs font-normal">/mo</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {forecast18.closingIn18.length} loan
                    {forecast18.closingIn18.length !== 1 ? "s" : ""} closing
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Total Forecast
                  </p>
                  <p
                    className={`font-mono font-bold text-base ${forecast18.total18Surplus + forecast18.total18Saved >= 0 ? "text-purple-600 dark:text-purple-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {shortAmount(
                      forecast18.total18Surplus + forecast18.total18Saved,
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Surplus + Savings
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Avg Health Score
                  </p>
                  <p
                    className={`font-mono font-bold text-base ${forecast18.avgHealthScore >= 70 ? "text-green-600 dark:text-green-400" : forecast18.avgHealthScore >= 45 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {forecast18.avgHealthScore}/100
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {forecast18.avgHealthScore >= 70
                      ? "Strong cashflow"
                      : forecast18.avgHealthScore >= 45
                        ? "Moderate"
                        : "Needs attention"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* ── EMI Payoff Timeline ── */}
            {debts.length > 0 && (
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <CardTitle className="text-sm font-semibold">
                    EMI Payoff Timeline
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Amortization-based payoff schedule. Progress bar = % of
                    original loan paid.
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {forecast18.debtTimelines
                      .slice()
                      .sort((a, b) => a.monthsLeft - b.monthsLeft)
                      .map((d) => {
                        const paidPct =
                          d.original_amount > 0
                            ? Math.min(
                                100,
                                ((d.original_amount - d.balance) /
                                  d.original_amount) *
                                  100,
                              )
                            : 0;
                        const closesIn18 =
                          d.monthsLeft < 999 && d.monthsLeft <= 18;
                        const closeDate = (() => {
                          const cd = new Date();
                          cd.setDate(1);
                          cd.setMonth(cd.getMonth() + d.monthsLeft);
                          return cd.toLocaleDateString("en-IN", {
                            month: "short",
                            year: "numeric",
                          });
                        })();
                        return (
                          <div key={d.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium truncate">
                                    {d.name}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] capitalize ${closesIn18 ? "text-green-600 border-green-200 dark:border-green-800" : "text-muted-foreground"}`}
                                  >
                                    {d.type}
                                  </Badge>
                                  {closesIn18 ? (
                                    <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-medium">
                                      <CheckCircle2 className="h-3 w-3" />{" "}
                                      Closes {closeDate}
                                    </span>
                                  ) : d.monthsLeft >= 999 ? (
                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <AlertCircle className="h-3 w-3" />{" "}
                                      Ongoing
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                                      <Clock className="h-3 w-3" /> Closes{" "}
                                      {closeDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
                                  {format(d.minimum_payment)}
                                  <span className="text-[10px] font-normal text-muted-foreground">
                                    /mo
                                  </span>
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {d.monthsLeft < 999
                                    ? `${d.monthsLeft} mo left`
                                    : "Ongoing"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Progress
                                value={paidPct}
                                className="h-1.5 flex-1 [&>div]:bg-blue-500"
                              />
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                {paidPct.toFixed(0)}% paid
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                {format(d.balance)} left
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Milestone Timeline ── */}
            {forecast18.allMilestones.length > 0 && (
              <Card>
                <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                  <CardTitle className="text-sm font-semibold">
                    Upcoming Milestones
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Key cashflow events over the next 18 months
                  </p>
                </CardHeader>
                <CardContent className="px-4 py-3">
                  <div className="relative pl-5">
                    <div className="absolute left-1.5 top-0 bottom-0 w-px bg-border" />
                    {forecast18.allMilestones.map((ms, idx) => (
                      <div key={idx} className="relative mb-3 last:mb-0">
                        <div
                          className={`absolute -left-3.5 top-1 h-3 w-3 rounded-full border-2 border-background ${ms.type === "emi" ? "bg-green-500" : "bg-blue-500"}`}
                        />
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-medium">
                              {ms.name}{" "}
                              {ms.type === "emi" ? "EMI closes" : "ends"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {ms.month}
                            </p>
                          </div>
                          <span
                            className={`text-xs font-mono font-semibold shrink-0 ${ms.type === "emi" ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}`}
                          >
                            +{format(ms.amount)}/mo freed
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Month-by-Month Table ── */}
            <Card>
              <CardHeader className="pb-2 border-b border-border px-4 pt-4">
                <CardTitle className="text-sm font-semibold">
                  Month-by-Month Breakdown
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Green rows = EMI closes. Blue = pattern ends. Health score out
                  of 100.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                          Month
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Income
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Expenses
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Surplus
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Sav Rate
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Cumulative
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          EMI Freed
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Saved
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Total Forecast
                        </th>
                        <th className="text-right px-4 py-2 font-medium text-muted-foreground">
                          Health
                        </th>
                        <th className="px-4 py-2 font-medium text-muted-foreground">
                          Event
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast18.months.map((m) => (
                        <tr
                          key={m.label}
                          className={`border-b border-border transition-colors ${m.hasEvent ? (m.closingThisMonth.length > 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-blue-50 dark:bg-blue-950/20") : "hover:bg-muted/30"}`}
                        >
                          <td className="px-4 py-2.5 font-medium">{m.label}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-green-600 dark:text-green-400">
                            {shortAmount(m.Income)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-red-600 dark:text-red-400">
                            {shortAmount(m.Expenses)}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono font-semibold ${m.Surplus >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                          >
                            {m.Surplus >= 0 ? "+" : ""}
                            {shortAmount(m.Surplus)}
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono text-xs ${m.savingsRatePct >= 20 ? "text-green-600 dark:text-green-400" : m.savingsRatePct >= 10 ? "text-yellow-600 dark:text-yellow-400" : "text-red-500"}`}
                          >
                            {m.savingsRatePct}%
                          </td>
                          <td
                            className={`px-4 py-2.5 text-right font-mono ${m.CumulativeSurplus >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"}`}
                          >
                            {shortAmount(m.CumulativeSurplus)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {m.freedEMI > 0 ? (
                              <span className="text-green-600 dark:text-green-400">
                                +{shortAmount(m.freedEMI)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono">
                            {m.Saved > 0 ? (
                              <span className="text-blue-600 dark:text-blue-400">
                                +{shortAmount(m.Saved)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-purple-600 dark:text-purple-400">
                            {shortAmount(m.TotalForecast)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono ${m.healthScore >= 70 ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : m.healthScore >= 45 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}
                            >
                              {m.healthScore}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 space-y-0.5">
                            {m.closingThisMonth.map((c) => (
                              <span
                                key={c.id}
                                className="flex items-center gap-1 text-[10px] text-green-700 dark:text-green-400 font-medium"
                              >
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                {c.name} done
                              </span>
                            ))}
                            {m.patternsEndingThisMonth.map((p) => (
                              <span
                                key={p.id}
                                className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium"
                              >
                                <Target className="h-3 w-3 shrink-0" />
                                {p.name} ends
                              </span>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════ SMART CALCULATOR TAB ══════════════ */}
          <TabsContent value="calculator" className="space-y-4">

            {/* ── Top: compact input strip ── */}
            <Card className="border-violet-200 dark:border-violet-800">
              <CardContent className="px-4 py-3">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-violet-500 shrink-0" />
                  <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Intelligence Calculator</p>
                  <span className="text-[10px] text-muted-foreground hidden sm:block">· Edit values to model different scenarios</span>
                </div>

                {/* Row 1: income + expenses + one-time adder */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wide">Monthly Income</Label>
                    <Input type="number" placeholder={`${Math.round(sixMonthAvg.income)}`}
                      value={calcIncomeOverride} onChange={(e) => setCalcIncomeOverride(e.target.value)}
                      className="h-8 text-xs font-mono" />
                    <p className="text-[9px] text-muted-foreground mt-0.5">avg {format(sixMonthAvg.income)}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wide">Monthly Expenses</Label>
                    <Input type="number" placeholder={`${Math.round(sixMonthAvg.expenses)}`}
                      value={calcExpenseOverride} onChange={(e) => setCalcExpenseOverride(e.target.value)}
                      className="h-8 text-xs font-mono" />
                    <p className="text-[9px] text-muted-foreground mt-0.5">avg {format(sixMonthAvg.expenses)}</p>
                  </div>
                  {/* One-time item quick-add */}
                  <div className="col-span-2">
                    <Label className="text-[10px] text-muted-foreground mb-1 block uppercase tracking-wide">Add One-time Item</Label>
                    <div className="flex gap-1.5">
                      <Input placeholder="Name" value={calcItemForm.name}
                        onChange={(e) => setCalcItemForm((f) => ({ ...f, name: e.target.value }))}
                        className="h-8 text-xs flex-1 min-w-0" />
                      <Input type="number" placeholder="₹" value={calcItemForm.amount}
                        onChange={(e) => setCalcItemForm((f) => ({ ...f, amount: e.target.value }))}
                        className="h-8 text-xs w-20 font-mono shrink-0" />
                      <select value={calcItemForm.type}
                        onChange={(e) => setCalcItemForm((f) => ({ ...f, type: e.target.value as "income" | "expense" }))}
                        className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground shrink-0">
                        <option value="expense">Exp</option>
                        <option value="income">Inc</option>
                      </select>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0"
                        disabled={!calcItemForm.name || !calcItemForm.amount}
                        onClick={() => {
                          const amt = parseFloat(calcItemForm.amount);
                          if (!calcItemForm.name || isNaN(amt) || amt <= 0) return;
                          setCalcItems((prev) => [...prev, { id: crypto.randomUUID(), name: calcItemForm.name, amount: amt, type: calcItemForm.type }]);
                          setCalcItemForm({ name: "", amount: "", type: "expense" });
                        }}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* One-time items + custom goal pills */}
                {(calcItems.length > 0 || customGoals.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-border">
                    {calcItems.map((item) => (
                      <div key={item.id} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${item.type === "income" ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300" : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-300"}`}>
                        <span>{item.type === "income" ? "+" : "-"}{format(item.amount)} {item.name}</span>
                        <button onClick={() => setCalcItems((prev) => prev.filter((i) => i.id !== item.id))} className="opacity-60 hover:opacity-100 ml-0.5">×</button>
                      </div>
                    ))}
                    {customGoals.map((g) => (
                      <div key={g.id} className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-950/20 dark:border-violet-800 dark:text-violet-300">
                        <span>🎯 {g.name} · {format(g.target)}</span>
                        <button onClick={() => setCustomGoals((prev) => prev.filter((x) => x.id !== g.id))} className="opacity-60 hover:opacity-100 ml-0.5">×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom goal quick-add */}
                <details className="mt-2">
                  <summary className="text-[10px] text-violet-600 dark:text-violet-400 cursor-pointer hover:underline select-none">+ Add custom goal</summary>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                    <Input placeholder="Goal name" value={customGoalForm.name}
                      onChange={(e) => setCustomGoalForm((f) => ({ ...f, name: e.target.value }))}
                      className="h-8 text-xs" />
                    <Input type="number" placeholder="Target (₹)" value={customGoalForm.target}
                      onChange={(e) => setCustomGoalForm((f) => ({ ...f, target: e.target.value }))}
                      className="h-8 text-xs font-mono" />
                    <Input type="number" placeholder="Saved so far (₹)" value={customGoalForm.current}
                      onChange={(e) => setCustomGoalForm((f) => ({ ...f, current: e.target.value }))}
                      className="h-8 text-xs font-mono" />
                    <div className="flex gap-1.5">
                      <Input type="month" value={customGoalForm.deadline}
                        onChange={(e) => setCustomGoalForm((f) => ({ ...f, deadline: e.target.value }))}
                        className="h-8 text-xs flex-1" />
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0"
                        disabled={!customGoalForm.name || !customGoalForm.target}
                        onClick={() => {
                          const tgt = parseFloat(customGoalForm.target);
                          if (!customGoalForm.name || isNaN(tgt) || tgt <= 0) return;
                          setCustomGoals((prev) => [...prev, { id: crypto.randomUUID(), name: customGoalForm.name, target: tgt, current: parseFloat(customGoalForm.current) || 0, deadline: customGoalForm.deadline }]);
                          setCustomGoalForm({ name: "", target: "", current: "", deadline: "" });
                        }}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>

            {/* ── Bottom: tabbed results ── */}
            <SmartCalculatorResults
              sixMonthAvg={sixMonthAvg}
              calcIncomeOverride={calcIncomeOverride}
              calcExpenseOverride={calcExpenseOverride}
              calcItems={calcItems}
              customGoals={customGoals}
              activeGoals={activeGoals}
              debts={debts}
              returnRate={returnRate}
              setReturnRate={setReturnRate}
              extraDebtPayment={extraDebtPayment}
              setExtraDebtPayment={setExtraDebtPayment}
              format={format}
            />
          </TabsContent>

          {/* ══════════════ INVESTMENTS TAB ══════════════ */}
          <TabsContent value="investments" className="space-y-4">
            <InvestmentsTab format={format} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ── Ring progress SVG ─────────────────────────────────────────────────────────
function RingProgress({ value, size = 44, stroke = 4, color = "#6366f1" }: { value: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, value)) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/40" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

// ── Investments Tab ───────────────────────────────────────────────────────────
type SortKey = "name" | "invested" | "current" | "pnl" | "pnlPct" | "xirr" | "weight";

function SortIcon({ active, dir }: { active: boolean; dir: 1 | -1 }) {
  if (!active) return <span className="text-muted-foreground/40">⇅</span>;
  return <span>{dir === -1 ? "↓" : "↑"}</span>;
}

function InvestmentsTab({ format }: { format: (v: number) => string }) {
  const [mfSort, setMfSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "weight", dir: -1 });
  const [mfFilter, setMfFilter] = useState<string>("All");
  const [activeView, setActiveView] = useState<"overview" | "mf" | "stocks">("overview");
  const [expandedSector, setExpandedSector] = useState<string | null>(null);

  // ── Derived totals ──────────────────────────────────────────────────────────
  const mfInvested = MF_HOLDINGS.reduce((s, f) => s + f.invested, 0);
  const mfCurrent  = MF_HOLDINGS.reduce((s, f) => s + f.current, 0);
  const mfPnl      = mfCurrent - mfInvested;

  const stInvested = STOCK_HOLDINGS.reduce((s, f) => s + f.invested, 0);
  const stCurrent  = STOCK_HOLDINGS.reduce((s, f) => s + f.current, 0);
  const stPnl      = stCurrent - stInvested;

  const totalInvested = mfInvested + stInvested;
  const totalCurrent  = mfCurrent + stCurrent;
  const totalPnl      = totalCurrent - totalInvested;
  const totalPnlPct   = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;

  // ── Asset allocation by MF category ────────────────────────────────────────
  const CAT_COLORS: Record<string, string> = {
    Equity: "#6366f1", Debt: "#22c55e", Hybrid: "#f97316", Other: "#a855f7", "Stocks/ETFs": "#3b82f6",
  };
  const catMap: Record<string, number> = {};
  MF_HOLDINGS.forEach((f) => { catMap[f.category] = (catMap[f.category] ?? 0) + f.current; });
  catMap["Stocks/ETFs"] = stCurrent;
  const allocItems = Object.entries(catMap)
    .map(([cat, val]) => ({ cat, val, pct: totalCurrent > 0 ? (val / totalCurrent) * 100 : 0, color: CAT_COLORS[cat] ?? "#94a3b8" }))
    .sort((a, b) => b.val - a.val);

  // ── AMC breakdown ─────────────────────────────────────────────────────────
  const amcMap: Record<string, { invested: number; current: number; count: number }> = {};
  MF_HOLDINGS.forEach((f) => {
    if (!amcMap[f.amc]) amcMap[f.amc] = { invested: 0, current: 0, count: 0 };
    amcMap[f.amc].invested += f.invested;
    amcMap[f.amc].current  += f.current;
    amcMap[f.amc].count    += 1;
  });
  const amcItems = Object.entries(amcMap)
    .map(([amc, v]) => ({ amc, ...v, pct: mfCurrent > 0 ? (v.current / mfCurrent) * 100 : 0, pnlPct: v.invested > 0 ? ((v.current - v.invested) / v.invested) * 100 : 0 }))
    .sort((a, b) => b.current - a.current);

  // ── Sector (sub-category) breakdown with constituent funds ─────────────────
  const SECTOR_COLORS = [
    "#6366f1","#3b82f6","#22c55e","#f97316","#ec4899",
    "#eab308","#14b8a6","#a855f7","#ef4444","#64748b",
    "#0ea5e9","#84cc16","#f43f5e","#8b5cf6","#06b6d4",
  ];
  type SectorEntry = { sector: string; current: number; invested: number; count: number; pct: number; pnlPct: number; color: string; funds: { name: string; current: number; invested: number; pnl: number; xirr: number }[] };
  const sectorMap: Record<string, { current: number; invested: number; count: number; funds: { name: string; current: number; invested: number; pnl: number; xirr: number }[] }> = {};
  MF_HOLDINGS.forEach((f) => {
    if (!sectorMap[f.subCategory]) sectorMap[f.subCategory] = { current: 0, invested: 0, count: 0, funds: [] };
    sectorMap[f.subCategory].current  += f.current;
    sectorMap[f.subCategory].invested += f.invested;
    sectorMap[f.subCategory].count    += 1;
    sectorMap[f.subCategory].funds.push({ name: f.name, current: f.current, invested: f.invested, pnl: f.pnl, xirr: f.xirr });
  });
  STOCK_HOLDINGS.forEach((s) => {
    if (!sectorMap[s.type]) sectorMap[s.type] = { current: 0, invested: 0, count: 0, funds: [] };
    sectorMap[s.type].current  += s.current;
    sectorMap[s.type].invested += s.invested;
    sectorMap[s.type].count    += 1;
    sectorMap[s.type].funds.push({ name: s.name, current: s.current, invested: s.invested, pnl: s.pnl, xirr: s.pnlPct });
  });
  const sectorItems: SectorEntry[] = Object.entries(sectorMap)
    .map(([sector, v], i) => ({
      sector, current: v.current, invested: v.invested, count: v.count, funds: v.funds,
      pct:    totalCurrent > 0 ? (v.current / totalCurrent) * 100 : 0,
      pnlPct: v.invested > 0 ? ((v.current - v.invested) / v.invested) * 100 : 0,
      color:  SECTOR_COLORS[i % SECTOR_COLORS.length],
    }))
    .sort((a, b) => b.current - a.current);

  // ── Top performers / laggards ─────────────────────────────────────────────
  const mfByXirr = [...MF_HOLDINGS].sort((a, b) => b.xirr - a.xirr);
  const topGainers  = mfByXirr.slice(0, 4);
  const topLaggards = [...mfByXirr].reverse().slice(0, 4);

  // ── Portfolio health score ────────────────────────────────────────────────
  const numProfitable = MF_HOLDINGS.filter((f) => f.xirr > 0).length;
  const profitPct     = (numProfitable / MF_HOLDINGS.length) * 100;
  const directPct     = (MF_HOLDINGS.filter((f) => f.plan === "Direct").length / MF_HOLDINGS.length) * 100;
  const maxSectorPct  = Math.max(...sectorItems.map((s) => s.pct));
  const diversScore   = Math.round(Math.max(0, 100 - maxSectorPct));
  const healthScore   = Math.round((profitPct * 0.4) + (directPct * 0.3) + (diversScore * 0.3));

  // ── Filtered + sorted MF table ────────────────────────────────────────────
  const categories = ["All", ...Array.from(new Set(MF_HOLDINGS.map((f) => f.category)))];
  const filteredMF = [...MF_HOLDINGS]
    .filter((f) => mfFilter === "All" || f.category === mfFilter)
    .sort((a, b) => (a[mfSort.key] as number) > (b[mfSort.key] as number) ? mfSort.dir : -mfSort.dir);

  function toggleSort(key: SortKey) {
    setMfSort((prev) => prev.key === key ? { key, dir: prev.dir === -1 ? 1 : -1 } : { key, dir: -1 });
  }

  // ── avg XIRR ──────────────────────────────────────────────────────────────
  const avgXirr = MF_HOLDINGS.reduce((s, f) => s + f.xirr, 0) / MF_HOLDINGS.length;
  const greenFunds = MF_HOLDINGS.filter((f) => f.xirr > 0).length;

  return (
    <div className="space-y-4">

      {/* ══ HERO BAND — always visible ══ */}
      <div className="rounded-xl bg-slate-900 dark:bg-black overflow-hidden">
        <div className="flex h-1.5 w-full">
          {allocItems.map((item) => (
            <div key={item.cat} style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
          ))}
        </div>
        <div className="px-5 py-4 grid grid-cols-3 sm:grid-cols-6 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Value</p>
            <p className="font-mono font-bold text-base text-white">{format(totalCurrent)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">05 Jun 2026</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Invested</p>
            <p className="font-mono font-bold text-base text-white">{format(totalInvested)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{MF_HOLDINGS.length}MF · {STOCK_HOLDINGS.length}stocks</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">P&amp;L</p>
            <p className={`font-mono font-bold text-base ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
              {totalPnl >= 0 ? "+" : ""}{format(Math.abs(totalPnl))}
            </p>
            <p className={`text-[10px] font-mono mt-0.5 ${totalPnlPct >= 0 ? "text-green-500" : "text-red-500"}`}>
              {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(3)}%
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Avg XIRR</p>
            <p className={`font-mono font-bold text-base ${avgXirr >= 0 ? "text-green-400" : "text-red-400"}`}>
              {avgXirr >= 0 ? "+" : ""}{avgXirr.toFixed(2)}%
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">across MF</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Profitable</p>
            <p className="font-mono font-bold text-base text-white">{greenFunds}/{MF_HOLDINGS.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">funds in green</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-0.5">Health</p>
            <p className={`font-mono font-bold text-base ${healthScore >= 70 ? "text-green-400" : healthScore >= 45 ? "text-yellow-400" : "text-red-400"}`}>
              {healthScore}/100
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{healthScore >= 70 ? "Diversified" : "Review"}</p>
          </div>
        </div>
        <div className="px-5 pb-3 flex gap-4 flex-wrap border-t border-slate-800 pt-2">
          {allocItems.map((item) => (
            <div key={item.cat} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-slate-400">{item.cat}</span>
              <span className="text-[10px] font-mono text-slate-500">{item.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ INNER TAB NAV ══ */}
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {(["overview", "mf", "stocks"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setActiveView(v)}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeView === v
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v === "overview" ? "Overview" : v === "mf" ? `Mutual Funds (${MF_HOLDINGS.length})` : `Stocks & ETFs (${STOCK_HOLDINGS.length})`}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════ */}
      {activeView === "overview" && (
        <div className="space-y-4">

          {/* 6 stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "MF Portfolio", value: format(mfCurrent), sub: `${mfPnl >= 0 ? "+" : ""}${format(Math.abs(mfPnl))} P&L`, pos: mfPnl >= 0, bar: (mfCurrent / totalCurrent) * 100, color: "bg-indigo-500" },
              { label: "Stocks / ETFs", value: format(stCurrent), sub: `${stPnl >= 0 ? "+" : ""}${format(Math.abs(stPnl))} P&L`, pos: stPnl >= 0, bar: (stCurrent / totalCurrent) * 100, color: "bg-blue-500" },
              { label: "Best XIRR", value: `+${topGainers[0]?.xirr.toFixed(2)}%`, sub: topGainers[0]?.name ?? "", pos: true, bar: 100, color: "bg-green-500" },
              { label: "Worst XIRR", value: `${topLaggards[0]?.xirr.toFixed(2)}%`, sub: topLaggards[0]?.name ?? "", pos: false, bar: Math.min(100, Math.abs(topLaggards[0]?.xirr ?? 0) * 5), color: "bg-red-500" },
              { label: "Direct Plans", value: `${MF_HOLDINGS.filter((f) => f.plan === "Direct").length}/${MF_HOLDINGS.length}`, sub: `${directPct.toFixed(0)}% direct`, pos: directPct > 50, bar: directPct, color: "bg-violet-500" },
              { label: "Profitable Funds", value: `${greenFunds}/${MF_HOLDINGS.length}`, sub: `${((greenFunds / MF_HOLDINGS.length) * 100).toFixed(0)}% in green`, pos: greenFunds > MF_HOLDINGS.length / 2, bar: (greenFunds / MF_HOLDINGS.length) * 100, color: "bg-emerald-500" },
            ].map((s) => (
              <Card key={s.label} className="relative overflow-hidden">
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{s.label}</p>
                  <p className={`font-mono font-bold text-base ${s.pos ? "" : "text-red-500"}`}>{s.value}</p>
                  <p className={`text-[10px] mt-0.5 truncate font-mono ${s.pos ? "text-muted-foreground" : "text-red-400"}`}>{s.sub}</p>
                </CardContent>
                <div className={`absolute bottom-0 left-0 h-0.5 ${s.color}`} style={{ width: `${s.bar}%` }} />
              </Card>
            ))}
          </div>

          {/* Sector grid */}
          {/* ══ SECTOR BREAKDOWN — tile grid ══ */}
      <Card>
        <CardHeader className="pb-0 px-4 pt-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Sector / Sub-Category Allocation</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tap a tile to inspect constituent funds</p>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{sectorItems.length} sectors</span>
          </div>
          {/* Proportional stacked bar */}
          <div className="flex h-2 w-full overflow-hidden mt-3 mb-0.5 rounded-sm">
            {sectorItems.map((s) => (
              <div key={s.sector} style={{ width: `${s.pct}%`, backgroundColor: s.color, cursor: "pointer" }}
                title={`${s.sector}: ${s.pct.toFixed(1)}%`}
                onClick={() => setExpandedSector(expandedSector === s.sector ? null : s.sector)} />
            ))}
          </div>
        </CardHeader>

        <CardContent className="px-4 pt-3 pb-4 space-y-1.5">
          {/* Row-based grid — detail panel injects immediately after the row containing the selected tile */}
          {(() => {
            const COLS = 4;
            const rows: (typeof sectorItems[number])[][] = [];
            for (let i = 0; i < sectorItems.length; i += COLS) {
              rows.push(sectorItems.slice(i, i + COLS));
            }
            const selItem = sectorItems.find((s) => s.sector === expandedSector) ?? null;

            return rows.map((row, rowIdx) => {
              const rowHasSel = row.some((s) => s.sector === expandedSector);
              return (
                <div key={rowIdx} className="space-y-1.5">
                  {/* Tile row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {row.map((s) => {
                      const isSelected = expandedSector === s.sector;
                      const pnlAmt = s.current - s.invested;
                      return (
                        <button
                          key={s.sector}
                          onClick={() => setExpandedSector(isSelected ? null : s.sector)}
                          className={`relative rounded-lg border p-3 text-left transition-all ${
                            isSelected
                              ? "border-foreground/30 shadow-sm ring-1 ring-foreground/10 bg-muted/40"
                              : "border-border hover:border-foreground/20 hover:bg-muted/20"
                          }`}
                        >
                          <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full" style={{ backgroundColor: s.color }} />
                          <div className="pl-2.5">
                            <p className="font-mono font-bold text-base leading-none mb-1" style={{ color: s.color }}>
                              {s.pct.toFixed(1)}%
                            </p>
                            <p className="text-[11px] font-semibold truncate leading-tight mb-0.5">{s.sector}</p>
                            <p className="text-[9px] text-muted-foreground mb-2">{s.count} holding{s.count !== 1 ? "s" : ""}</p>
                            <div className="h-1 rounded-full bg-muted overflow-hidden mb-2">
                              <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                                s.pnlPct >= 0
                                  ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                                  : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                              }`}>
                                {s.pnlPct >= 0 ? "+" : ""}{s.pnlPct.toFixed(2)}%
                              </span>
                              <span className={`text-[9px] font-mono ${pnlAmt >= 0 ? "text-green-500" : "text-red-500"}`}>
                                {pnlAmt >= 0 ? "+" : ""}{shortAmount(Math.abs(pnlAmt))}
                              </span>
                            </div>
                          </div>
                          {/* Triangle pointer when selected */}
                          {isSelected && (
                            <div className="absolute -bottom-1.75 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-r border-b border-foreground/20 bg-card z-10" />
                          )}
                        </button>
                      );
                    })}
                    {/* Phantom tiles to preserve grid alignment on last row */}
                    {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => (
                      <div key={`ph-${i}`} className="hidden sm:block" />
                    ))}
                  </div>

                  {/* Inline detail panel — only renders below the row that contains the selection */}
                  {rowHasSel && selItem && (
                    <div className="rounded-xl border border-border overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border" style={{ backgroundColor: selItem.color + "15" }}>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: selItem.color }} />
                          <p className="text-xs font-bold">{selItem.sector}</p>
                          <span className="text-[10px] text-muted-foreground">{selItem.count} holding{selItem.count !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono">
                          <span className="text-muted-foreground hidden sm:inline">{format(selItem.current)}</span>
                          <span className={selItem.pnlPct >= 0 ? "text-green-500" : "text-red-500"}>
                            {selItem.pnlPct >= 0 ? "+" : ""}{selItem.pnlPct.toFixed(2)}%
                          </span>
                          <button onClick={() => setExpandedSector(null)} className="ml-1 h-5 w-5 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-[10px] text-muted-foreground hover:text-foreground transition-colors">✕</button>
                        </div>
                      </div>
                      {/* Fund rows */}
                      <div className="divide-y divide-border/60">
                        {selItem.funds.map((fund) => {
                          const fundPct = selItem.current > 0 ? (fund.current / selItem.current) * 100 : 0;
                          return (
                            <div key={fund.name} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-2.5 hover:bg-muted/20 transition-colors">
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{fund.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-24 h-1 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${fundPct}%`, backgroundColor: selItem.color }} />
                                  </div>
                                  <span className="text-[9px] font-mono text-muted-foreground">{fundPct.toFixed(1)}%</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-mono font-semibold">{format(fund.current)}</p>
                                <p className={`text-[10px] font-mono ${fund.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                                  {fund.pnl >= 0 ? "+" : ""}{format(Math.abs(fund.pnl))}
                                </p>
                              </div>
                              <div className="text-right w-16 shrink-0">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                                  fund.xirr >= 10 ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                                  : fund.xirr >= 0 ? "bg-muted text-muted-foreground"
                                  : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                                }`}>
                                  {fund.xirr >= 0 ? "+" : ""}{fund.xirr.toFixed(2)}%
                                </span>
                                <p className="text-[9px] text-muted-foreground mt-0.5">XIRR</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </CardContent>
      </Card>

      {/* ══ AMC CONCENTRATION + TOP PERFORMERS ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* AMC Concentration */}
        <Card>
          <CardHeader className="pb-2 border-b border-border px-4 pt-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">AMC Concentration</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Fund house exposure as % of MF portfolio</p>
          </CardHeader>
          <CardContent className="px-4 py-3 space-y-3">
            {amcItems.map((a, i) => {
              const pnl = a.current - a.invested;
              const AMC_COLORS = ["#6366f1","#3b82f6","#22c55e","#f97316","#a855f7","#ec4899"];
              const color = AMC_COLORS[i % AMC_COLORS.length];
              return (
                <div key={a.amc}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                        {a.amc.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{a.amc}</p>
                        <p className="text-[9px] text-muted-foreground">{a.count} fund{a.count !== 1 ? "s" : ""} · {format(a.invested)} in</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-semibold">{format(a.current)}</p>
                      <p className={`text-[10px] font-mono ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {pnl >= 0 ? "+" : ""}{a.pnlPct.toFixed(2)}% {pnl >= 0 ? "↑" : "↓"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${a.pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground w-9 text-right">{a.pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Top Performers vs Laggards */}
        <Card>
          <CardHeader className="pb-0 border-b border-border px-4 pt-4">
            <div className="flex items-center justify-between pb-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Performance Leaderboard</p>
              <span className="text-[10px] text-muted-foreground">By XIRR</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Winners */}
            <div className="px-3 pt-2 pb-1">
              <p className="text-[9px] uppercase tracking-widest text-green-600 dark:text-green-400 font-bold mb-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Top performers
              </p>
            </div>
            {topGainers.map((f, i) => (
              <div key={f.name} className="flex items-center gap-2.5 px-3 py-2 border-b border-border/50">
                <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate">{f.name}</p>
                  <div className="mt-0.5 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(100, (f.xirr / 50) * 100)}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-bold text-green-600 dark:text-green-400">+{f.xirr.toFixed(2)}%</p>
                  <p className="text-[9px] text-muted-foreground">{format(f.current)}</p>
                </div>
              </div>
            ))}
            {/* Laggards */}
            <div className="px-3 pt-2 pb-1">
              <p className="text-[9px] uppercase tracking-widest text-red-500 font-bold mb-1 flex items-center gap-1">
                <TrendingDown className="h-3 w-3" /> Needs review
              </p>
            </div>
            {topLaggards.map((f, i) => (
              <div key={f.name} className="flex items-center gap-2.5 px-3 py-2 border-b border-border/50 last:border-0">
                <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate">{f.name}</p>
                  <div className="mt-0.5 h-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-red-500" style={{ width: `${Math.min(100, (Math.abs(f.xirr) / 20) * 100)}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-mono font-bold text-red-600 dark:text-red-400">{f.xirr.toFixed(2)}%</p>
                  <p className="text-[9px] text-muted-foreground">{format(f.current)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

        </div>
      )}

      {/* ══════════════════════════════════════════
          MUTUAL FUNDS TAB
      ══════════════════════════════════════════ */}
      {activeView === "mf" && (
        <Card>
          <CardHeader className="pb-2 border-b border-border px-4 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Mutual Fund Holdings</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                  Invested {format(mfInvested)} · Current {format(mfCurrent)} · P&amp;L{" "}
                  <span className={mfPnl >= 0 ? "text-green-500" : "text-red-500"}>
                    {mfPnl >= 0 ? "+" : ""}{format(Math.abs(mfPnl))}
                  </span>
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button key={cat} onClick={() => setMfFilter(cat)}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${mfFilter === cat ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("name")}>Fund <SortIcon active={mfSort.key === "name"} dir={mfSort.dir} /></th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">Sub-Category</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground cursor-pointer whitespace-nowrap" onClick={() => toggleSort("invested")}>Invested <SortIcon active={mfSort.key === "invested"} dir={mfSort.dir} /></th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground cursor-pointer whitespace-nowrap" onClick={() => toggleSort("current")}>Current <SortIcon active={mfSort.key === "current"} dir={mfSort.dir} /></th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground cursor-pointer whitespace-nowrap" onClick={() => toggleSort("pnl")}>P&amp;L <SortIcon active={mfSort.key === "pnl"} dir={mfSort.dir} /></th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground cursor-pointer whitespace-nowrap" onClick={() => toggleSort("pnlPct")}>P&amp;L% <SortIcon active={mfSort.key === "pnlPct"} dir={mfSort.dir} /></th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("xirr")}>XIRR <SortIcon active={mfSort.key === "xirr"} dir={mfSort.dir} /></th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground cursor-pointer" onClick={() => toggleSort("weight")}>Wt% <SortIcon active={mfSort.key === "weight"} dir={mfSort.dir} /></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMF.map((f) => {
                    const rowBg = f.xirr > 5 ? "bg-green-50/40 dark:bg-green-950/10" : f.xirr < -5 ? "bg-red-50/40 dark:bg-red-950/10" : "";
                    return (
                      <tr key={f.name} className={`border-b border-border hover:bg-muted/30 transition-colors ${rowBg}`}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium truncate max-w-45">{f.name}</p>
                          <p className="text-[10px] text-muted-foreground">{f.plan} · NAV ₹{f.nav.toLocaleString()}</p>
                        </td>
                        <td className="px-3 py-2.5 hidden md:table-cell">
                          <span className="text-[10px] text-muted-foreground">{f.subCategory}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono">{format(f.invested)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{format(f.current)}</td>
                        <td className={`px-3 py-2.5 text-right font-mono font-semibold ${f.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                          {f.pnl >= 0 ? "+" : ""}{format(Math.abs(f.pnl))}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-mono ${f.pnlPct >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                          {f.pnlPct >= 0 ? "+" : ""}{f.pnlPct.toFixed(2)}%
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${f.xirr >= 10 ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400" : f.xirr >= 0 ? "bg-muted text-muted-foreground" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"}`}>
                            {f.xirr >= 0 ? "+" : ""}{f.xirr.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden hidden sm:block">
                              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, f.weight / 0.17 * 100)}%` }} />
                            </div>
                            <span className="font-mono text-[10px] text-muted-foreground">{f.weight.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-semibold">
                    <td className="px-4 py-2.5" colSpan={2}>Total · {filteredMF.length} funds</td>
                    <td className="px-3 py-2.5 text-right font-mono">{format(filteredMF.reduce((s, f) => s + f.invested, 0))}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{format(filteredMF.reduce((s, f) => s + f.current, 0))}</td>
                    <td className={`px-3 py-2.5 text-right font-mono ${filteredMF.reduce((s, f) => s + f.pnl, 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                      {(() => { const t = filteredMF.reduce((s, f) => s + f.pnl, 0); return `${t >= 0 ? "+" : ""}${format(Math.abs(t))}`; })()}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Stocks & ETFs Table ── */}
      {activeView === "stocks" && (
        <Card>
          <CardHeader className="pb-2 border-b border-border px-4 pt-4">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Stocks, ETFs &amp; Smallcases</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              Invested {format(stInvested)} · Current {format(stCurrent)} · P&amp;L{" "}
              <span className={stPnl >= 0 ? "text-green-500" : "text-red-500"}>{stPnl >= 0 ? "+" : ""}{format(Math.abs(stPnl))}</span>
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {STOCK_HOLDINGS.map((s, si) => {
              const priceDiff = s.ltp != null && s.avgCost != null ? s.ltp - s.avgCost : null;
              return (
                <div key={s.name} className={`${si < STOCK_HOLDINGS.length - 1 ? "border-b border-border" : ""} px-4 py-3 hover:bg-muted/20 transition-colors`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${s.pnl >= 0 ? "bg-green-600" : "bg-red-500"}`}>
                        {s.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold">{s.name}</p>
                          <Badge variant="outline" className="text-[9px]">{s.type}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {s.qty != null ? `${s.qty} units` : ""}
                          {s.avgCost != null ? ` · Avg ₹${s.avgCost.toFixed(2)}` : ""}
                          {s.ltp != null ? ` · LTP ₹${s.ltp.toFixed(2)}` : ""}
                          {priceDiff != null && (
                            <span className={priceDiff >= 0 ? " text-green-500" : " text-red-500"}>
                              {" "}({priceDiff >= 0 ? "+" : ""}₹{priceDiff.toFixed(2)}/unit)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-sm font-mono font-bold">{format(s.current)}</p>
                      <p className={`text-xs font-mono font-semibold ${s.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                        {s.pnl >= 0 ? "+" : ""}{format(Math.abs(s.pnl))} ({s.pnlPct >= 0 ? "+" : ""}{s.pnlPct.toFixed(2)}%)
                      </p>
                      {s.dailyChangePct != null && (
                        <p className={`text-[10px] font-mono ${s.dailyChangePct >= 0 ? "text-green-500" : "text-red-500"}`}>
                          Day: {s.dailyChangePct >= 0 ? "+" : ""}{s.dailyChangePct.toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Mini weight + P&L bar */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] text-muted-foreground mb-0.5">Portfolio weight</p>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${s.portfolioWeight}%` }} />
                      </div>
                      <p className="text-[9px] font-mono text-muted-foreground mt-0.5">{s.portfolioWeight.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground mb-0.5">Invested {format(s.invested)}</p>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${s.pnl >= 0 ? "bg-green-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(100, Math.abs(s.pnlPct) * 3)}%` }} />
                      </div>
                      <p className={`text-[9px] font-mono mt-0.5 ${s.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {s.pnlPct >= 0 ? "+" : ""}{s.pnlPct.toFixed(2)}% return
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Stocks total footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-t-2 border-border">
              <div>
                <p className="text-xs font-semibold">Total · {STOCK_HOLDINGS.length} holdings</p>
                <p className="text-[10px] text-muted-foreground font-mono">Invested {format(stInvested)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono font-bold">{format(stCurrent)}</p>
                <p className={`text-xs font-mono font-semibold ${stPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                  {stPnl >= 0 ? "+" : ""}{format(Math.abs(stPnl))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Smart Calculator Results panel ────────────────────────────────────────────

type CalcItem = { id: string; name: string; amount: number; type: "income" | "expense" };
type CustomGoal = { id: string; name: string; target: number; current: number; deadline: string };

function SmartCalculatorResults({
  sixMonthAvg,
  calcIncomeOverride,
  calcExpenseOverride,
  calcItems,
  customGoals,
  activeGoals,
  debts,
  returnRate,
  setReturnRate,
  extraDebtPayment,
  setExtraDebtPayment,
  format,
}: {
  sixMonthAvg: { income: number; expenses: number; savings: number };
  calcIncomeOverride: string;
  calcExpenseOverride: string;
  calcItems: CalcItem[];
  customGoals: CustomGoal[];
  activeGoals: import("@/store/goals-store").Goal[];
  debts: import("@/store/debt-tracker-store").Debt[];
  returnRate: number;
  setReturnRate: (v: number) => void;
  extraDebtPayment: number;
  setExtraDebtPayment: (v: number) => void;
  format: (v: number) => string;
}) {
  const baseIncome = calcIncomeOverride ? parseFloat(calcIncomeOverride) || 0 : sixMonthAvg.income;
  const baseExpenses = calcExpenseOverride ? parseFloat(calcExpenseOverride) || 0 : sixMonthAvg.expenses;

  const oneTimeIncome = calcItems.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0);
  const oneTimeExpense = calcItems.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0);

  const totalIncome = baseIncome + oneTimeIncome;
  const totalExpenses = baseExpenses + oneTimeExpense;
  const monthlySurplus = totalIncome - totalExpenses;
  const savingsRatePct = totalIncome > 0 ? (monthlySurplus / totalIncome) * 100 : 0;

  // Goal timelines — only 80% of surplus allocated (20% kept as emergency buffer)
  const allocableSurplus = Math.max(0, monthlySurplus) * 0.8;
  const emergencyBuffer = Math.max(0, monthlySurplus) * 0.2;

  // Allocation strategy:
  // If any high-priority goals exist → 90% of allocable surplus goes to high-priority goals (split
  // equally among them), remaining 10% is split equally among medium/low/custom goals.
  // If no high-priority goals → split equally among all goals.
  const highGoals = activeGoals.filter((g) => (g.priority ?? "medium") === "high");
  const otherGoals = [
    ...activeGoals.filter((g) => (g.priority ?? "medium") !== "high"),
    ...customGoals.map((g) => ({ ...g, _isCustom: true as const })),
  ];
  const hasHigh = highGoals.length > 0;
  const highPool = hasHigh ? allocableSurplus * 0.9 : 0;
  const otherPool = hasHigh
    ? allocableSurplus * 0.1
    : allocableSurplus;

  function goalAlloc(_priority: string, isHigh: boolean, groupCount: number): number {
    if (groupCount === 0) return 0;
    return isHigh ? highPool / groupCount : otherPool / Math.max(1, otherGoals.length);
  }

  type GoalResult = {
    id: string;
    name: string;
    remaining: number;
    target: number;
    monthlyAlloc: number;
    monthsToReach: number;
    deadlineMonths: number | null;
    atRisk: boolean;
    priority: string;
    weightPct: number;
  };

  const goalResults: GoalResult[] = [
    ...activeGoals.map((g) => {
      const isHigh = (g.priority ?? "medium") === "high";
      const alloc = goalAlloc(g.priority ?? "medium", isHigh, highGoals.length);
      const remaining = Math.max(0, g.targetAmount - g.currentAmount);
      const months = alloc > 0 ? Math.ceil(remaining / alloc) : Infinity;
      const deadlineDate = g.targetDate ? new Date(g.targetDate) : null;
      const deadlineMonths = deadlineDate
        ? Math.max(0, (deadlineDate.getFullYear() - new Date().getFullYear()) * 12 + (deadlineDate.getMonth() - new Date().getMonth()))
        : null;
      const weightPct = allocableSurplus > 0 ? Math.round((alloc / allocableSurplus) * 100) : 0;
      return { id: g.id, name: g.title, remaining, target: g.targetAmount, monthlyAlloc: alloc, monthsToReach: months, deadlineMonths, atRisk: deadlineMonths != null && months > deadlineMonths, priority: g.priority ?? "medium", weightPct };
    }),
    ...customGoals.map((g) => {
      const alloc = hasHigh
        ? otherPool / Math.max(1, otherGoals.length)
        : allocableSurplus / Math.max(1, activeGoals.length + customGoals.length);
      const remaining = Math.max(0, g.target - g.current);
      const months = alloc > 0 ? Math.ceil(remaining / alloc) : Infinity;
      const deadlineMonths = g.deadline
        ? (() => {
            const [yr, mo] = g.deadline.split("-").map(Number);
            const now = new Date();
            return Math.max(0, (yr - now.getFullYear()) * 12 + (mo - 1 - now.getMonth()));
          })()
        : null;
      const weightPct = allocableSurplus > 0 ? Math.round((alloc / allocableSurplus) * 100) : 0;
      return { id: g.id, name: g.name, remaining, target: g.target, monthlyAlloc: alloc, monthsToReach: months, deadlineMonths, atRisk: deadlineMonths != null && months > deadlineMonths, priority: "medium", weightPct };
    }),
  ];

  // Investment projection: compound monthly, PMT = monthlySurplus
  const r = returnRate / 100 / 12;
  function fv(months: number) {
    if (monthlySurplus <= 0) return 0;
    if (r === 0) return monthlySurplus * months;
    return monthlySurplus * ((Math.pow(1 + r, months) - 1) / r);
  }
  const inv5y = fv(60);
  const inv10y = fv(120);

  // Debt payoff with extra payment
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const baseMonthlyEMI = debts.reduce((s, d) => s + d.minimum_payment, 0);
  function debtPayoffMonths(extraPerMonth: number) {
    if (totalDebt <= 0) return 0;
    const totalPayment = baseMonthlyEMI + extraPerMonth;
    if (totalPayment <= 0) return 999;
    let balance = totalDebt;
    let months = 0;
    while (balance > 0 && months < 999) {
      const avgRate = debts.length > 0
        ? debts.reduce((s, d) => s + (d.interest_rate / 100 / 12) * d.balance, 0) / totalDebt
        : 0;
      const interest = balance * avgRate;
      const principal = Math.min(balance, totalPayment - interest);
      if (principal <= 0) return 999;
      balance -= principal;
      months++;
    }
    return months;
  }
  const basePayoffMonths = debtPayoffMonths(0);
  const extraPayoffMonths = debtPayoffMonths(extraDebtPayment);
  const monthsSaved = Math.max(0, basePayoffMonths - extraPayoffMonths);

  function fmtMonths(m: number) {
    if (m >= 999 || !isFinite(m)) return "N/A";
    const y = Math.floor(m / 12);
    const mo = m % 12;
    if (y === 0) return `${mo}mo`;
    if (mo === 0) return `${y}yr`;
    return `${y}yr ${mo}mo`;
  }

  // Intelligence report bullets
  const insights: { type: "good" | "warn" | "bad"; text: string }[] = [];

  if (monthlySurplus <= 0) {
    insights.push({ type: "bad", text: "Your expenses exceed income — you're running a deficit. Cut discretionary spending first." });
  } else if (savingsRatePct < 10) {
    insights.push({ type: "warn", text: `Savings rate is only ${savingsRatePct.toFixed(1)}%. Aim for at least 20% to build wealth steadily.` });
  } else if (savingsRatePct >= 30) {
    insights.push({ type: "good", text: `Excellent savings rate of ${savingsRatePct.toFixed(1)}%! You're well-positioned to hit your goals early.` });
  } else {
    insights.push({ type: "good", text: `Savings rate of ${savingsRatePct.toFixed(1)}% is healthy. Push it above 30% to accelerate goal timelines.` });
  }

  const atRiskGoals = goalResults.filter((g) => g.atRisk);
  if (atRiskGoals.length > 0) {
    insights.push({ type: "warn", text: `${atRiskGoals.length} goal${atRiskGoals.length > 1 ? "s are" : " is"} at risk of missing deadline: ${atRiskGoals.map((g) => g.name).join(", ")}. Increase monthly allocation or extend deadlines.` });
  }

  if (totalDebt > 0 && extraDebtPayment === 0 && monthlySurplus > 0) {
    const suggestedExtra = Math.round(Math.min(monthlySurplus * 0.2, 10000));
    insights.push({ type: "warn", text: `Adding ₹${suggestedExtra.toLocaleString()}/mo extra to debts would save you ${fmtMonths(Math.max(0, basePayoffMonths - debtPayoffMonths(suggestedExtra)))} and reduce interest burden.` });
  }

  if (extraDebtPayment > 0 && monthsSaved > 0) {
    insights.push({ type: "good", text: `Extra debt payment of ${format(extraDebtPayment)}/mo clears debt ${fmtMonths(monthsSaved)} faster, freeing up ${format(baseMonthlyEMI + extraDebtPayment)}/mo for investments.` });
  }

  if (monthlySurplus > 0) {
    insights.push({ type: "good", text: `Investing your ₹${Math.round(monthlySurplus).toLocaleString()} surplus at ${returnRate}% p.a. grows to ${format(inv5y)} in 5 years and ${format(inv10y)} in 10 years.` });
  }

  if (goalResults.length === 0 && monthlySurplus > 0) {
    insights.push({ type: "warn", text: "You have no active goals. Add savings goals to allocate your surplus effectively." });
  }

  if (monthlySurplus > 0 && goalResults.length > 0) {
    insights.push({ type: "good", text: `${format(emergencyBuffer)}/mo is reserved as an emergency buffer (20% of surplus) — a smart cushion for unexpected expenses.` });
  }

  const fastest = goalResults.filter((g) => isFinite(g.monthsToReach)).sort((a, b) => a.monthsToReach - b.monthsToReach)[0];
  if (fastest) {
    insights.push({ type: "good", text: `"${fastest.name}" is your most achievable goal — only ${fmtMonths(fastest.monthsToReach)} away at current allocation.` });
  }

  // ── Derived display helpers ──────────────────────────────────────────────────

  function projectedDate(monthsFromNow: number): string {
    if (!isFinite(monthsFromNow) || monthsFromNow >= 999) return "—";
    const d = new Date();
    d.setMonth(d.getMonth() + monthsFromNow);
    return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  }

  function requiredMonthlyToMeetDeadline(remaining: number, deadlineMonths: number | null): number | null {
    if (deadlineMonths == null || deadlineMonths <= 0) return null;
    return Math.ceil(remaining / deadlineMonths);
  }

  // Investment year-by-year table
  const invYearData = Array.from({ length: 10 }, (_, i) => {
    const yr = i + 1;
    const months = yr * 12;
    const total = fv(months);
    const contributed = monthlySurplus > 0 ? monthlySurplus * months : 0;
    const growth = Math.max(0, total - contributed);
    return { yr, total, contributed, growth };
  });

  // Investment milestone: when do we first cross each threshold?
  const MILESTONES = [100_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000];
  const invMilestones = MILESTONES.map((target) => {
    if (monthlySurplus <= 0 || r === 0) {
      const mo = monthlySurplus > 0 ? Math.ceil(target / monthlySurplus) : Infinity;
      return { target, months: mo };
    }
    const mo = Math.ceil(Math.log(1 + (target * r) / monthlySurplus) / Math.log(1 + r));
    return { target, months: isFinite(mo) && mo > 0 ? mo : Infinity };
  }).filter((m) => isFinite(m.months) && m.months <= 240);

  // Debt per-loan breakdown
  const debtBreakdown = debts.map((d) => {
    let moLeft: number;
    const ri = d.interest_rate / 100 / 12;
    const pmt = d.minimum_payment;
    if (pmt <= 0) { moLeft = 999; }
    else if (ri > 0) {
      const ratio = (d.balance * ri) / pmt;
      moLeft = ratio >= 1 ? 999 : Math.ceil(-Math.log(1 - ratio) / Math.log(1 + ri));
    } else {
      moLeft = Math.ceil(d.balance / pmt);
    }
    const totalInterest = pmt * moLeft - d.balance;
    return { ...d, moLeft: Math.min(moLeft, 999), totalInterest: Math.max(0, totalInterest) };
  }).sort((a, b) => b.interest_rate - a.interest_rate); // avalanche order

  // Debt balance over time — two series: base EMI only vs EMI + extra payment
  function debtBalanceAt(month: number, extra: number): number {
    if (totalDebt <= 0) return 0;
    const avgRate = debts.reduce((s, d) => s + (d.interest_rate / 100 / 12) * d.balance, 0) / totalDebt;
    let bal = totalDebt;
    const pmt = baseMonthlyEMI + extra;
    for (let m = 0; m < month; m++) {
      const interest = bal * avgRate;
      const principal = Math.min(bal, pmt - interest);
      if (principal <= 0) break;
      bal -= principal;
    }
    return Math.max(0, Math.round(bal));
  }

  const chartMonths = Math.min(Math.max(basePayoffMonths, extraPayoffMonths, 1) + 1, 73);
  const step = chartMonths > 36 ? 3 : 1;
  const debtChartData = Array.from({ length: Math.ceil(chartMonths / step) }, (_, i) => {
    const mo = i * step;
    const label = mo === 0 ? "Now" : mo % 12 === 0 ? `Y${mo / 12}` : `M${mo}`;
    return {
      label,
      "Without Extra": debtBalanceAt(mo, 0),
      "With Extra": extraDebtPayment > 0 ? debtBalanceAt(mo, extraDebtPayment) : undefined,
    };
  });

  // Yearly table: balance at end of each year for both scenarios
  const maxTableYears = Math.ceil(Math.max(basePayoffMonths, extraPayoffMonths, 12) / 12);
  const debtTableData = Array.from({ length: Math.min(maxTableYears, 10) }, (_, i) => {
    const mo = (i + 1) * 12;
    const base = debtBalanceAt(mo, 0);
    const withExtra = extraDebtPayment > 0 ? debtBalanceAt(mo, extraDebtPayment) : null;
    const basePaid = Math.max(0, totalDebt - base);
    const extraPaid = withExtra !== null ? Math.max(0, totalDebt - withExtra) : null;
    return { year: i + 1, base, withExtra, basePaid, extraPaid };
  });

  // Investment area chart data (yearly)
  const invChartData = invYearData.map((d) => ({
    label: `Y${d.yr}`,
    Contributed: Math.round(d.contributed),
    Growth: Math.round(d.growth),
    Total: Math.round(d.total),
  }));

  return (
    <div className="space-y-0">

      {/* ══════ SURPLUS SUMMARY STRIP ══════ */}
      <Card className={`border-2 ${monthlySurplus >= 0 ? "border-green-200 dark:border-green-800" : "border-red-200 dark:border-red-800"}`}>
        <CardContent className="px-4 pt-4 pb-4">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Monthly Cashflow Projection</p>

          {/* Income → Expenses → Surplus flow bar */}
          {totalIncome > 0 && (
            <div className="mb-4">
              <div className="flex rounded-full overflow-hidden h-3 w-full">
                <div className="bg-red-400 dark:bg-red-600 transition-all" style={{ width: `${Math.min(100, (totalExpenses / totalIncome) * 100)}%` }} />
                {monthlySurplus > 0 && (
                  <>
                    <div className="bg-orange-400 dark:bg-orange-500 transition-all" style={{ width: `${(emergencyBuffer / totalIncome) * 100}%` }} />
                    <div className="bg-violet-500 dark:bg-violet-400 transition-all" style={{ width: `${(allocableSurplus / totalIncome) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex gap-3 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="inline-block h-2 w-2 rounded-full bg-red-400" />Expenses</span>
                {monthlySurplus > 0 && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="inline-block h-2 w-2 rounded-full bg-orange-400" />Buffer</span>}
                {monthlySurplus > 0 && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="inline-block h-2 w-2 rounded-full bg-violet-500" />Goals pool</span>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 px-3 py-2.5">
              <p className="text-[10px] text-green-700 dark:text-green-400 font-medium">Income</p>
              <p className="font-mono text-sm font-bold text-green-700 dark:text-green-300">{format(totalIncome)}</p>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2.5">
              <p className="text-[10px] text-red-700 dark:text-red-400 font-medium">Expenses</p>
              <p className="font-mono text-sm font-bold text-red-700 dark:text-red-300">{format(totalExpenses)}</p>
            </div>
            <div className={`rounded-lg px-3 py-2.5 ${monthlySurplus >= 0 ? "bg-violet-50 dark:bg-violet-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
              <p className={`text-[10px] font-medium ${monthlySurplus >= 0 ? "text-violet-700 dark:text-violet-400" : "text-red-600"}`}>Surplus</p>
              <p className={`font-mono text-sm font-bold ${monthlySurplus >= 0 ? "text-violet-700 dark:text-violet-300" : "text-red-600"}`}>
                {monthlySurplus >= 0 ? "+" : ""}{format(monthlySurplus)}
              </p>
              {totalIncome > 0 && <p className="text-[10px] text-muted-foreground">{savingsRatePct.toFixed(1)}%</p>}
            </div>
          </div>

          {monthlySurplus > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border">
              <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 px-3 py-2.5">
                <p className="text-[10px] text-violet-600 dark:text-violet-400 font-medium">Goals Pool · 80%</p>
                <p className="font-mono text-sm font-bold text-violet-700 dark:text-violet-300">{format(allocableSurplus)}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></p>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 px-3 py-2.5">
                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">Emergency Buffer · 20%</p>
                <p className="font-mono text-sm font-bold text-orange-700 dark:text-orange-300">{format(emergencyBuffer)}<span className="text-[10px] font-normal text-muted-foreground">/mo</span></p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════ TABBED DETAIL PANELS ══════ */}
      <Tabs defaultValue="goals" className="mt-4">
        <TabsList className="w-full grid grid-cols-4 h-9">
          <TabsTrigger value="goals" className="text-xs gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Goals {goalResults.length > 0 && <span className="text-[9px] bg-muted rounded px-1">{goalResults.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="debt" className="text-xs gap-1.5">
            <Landmark className="h-3.5 w-3.5" />
            Debt {debts.length > 0 && <span className="text-[9px] bg-muted rounded px-1">{debts.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="invest" className="text-xs gap-1.5">
            <TrendingUpIcon className="h-3.5 w-3.5" />
            Investment
          </TabsTrigger>
          <TabsTrigger value="report" className="text-xs gap-1.5">
            <Brain className="h-3.5 w-3.5" />
            Report
          </TabsTrigger>
        </TabsList>

        {/* ── Goals tab ── */}
        <TabsContent value="goals" className="mt-4">
          {goalResults.length > 0 ? (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground">80% of surplus split by priority (High 3× · Medium 2× · Low 1×). 20% kept as emergency buffer.</p>
              {goalResults.map((g) => {
                const savedAmt = g.target - g.remaining;
                const pct = g.target > 0 ? Math.min(100, (savedAmt / g.target) * 100) : 0;
                const finishDate = projectedDate(g.monthsToReach);
                const requiredForDeadline = requiredMonthlyToMeetDeadline(g.remaining, g.deadlineMonths);
                const shortfall = requiredForDeadline != null ? requiredForDeadline - g.monthlyAlloc : null;
                const boostToSave3Mo = g.remaining > 0 && g.monthsToReach > 3
                  ? Math.ceil(g.remaining / (g.monthsToReach - 3)) - g.monthlyAlloc
                  : null;
                const priorityStyle =
                  g.priority === "high"
                    ? { badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", bar: "bg-red-500", border: "border-red-200 dark:border-red-800" }
                    : g.priority === "low"
                      ? { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", bar: "bg-blue-500", border: "border-blue-200 dark:border-blue-800" }
                      : { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", bar: "bg-amber-500", border: "border-amber-200 dark:border-amber-800" };

            return (
              <Card key={g.id} className={`border ${g.atRisk ? "border-amber-300 dark:border-amber-700" : priorityStyle.border}`}>
                <CardContent className="px-4 pt-4 pb-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {g.atRisk
                        ? <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        : <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{g.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${priorityStyle.badge}`}>{g.priority}</span>
                          <span className="text-[10px] text-muted-foreground">{g.weightPct}% of pool</span>
                          {g.atRisk && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">At Risk</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold font-mono ${g.atRisk ? "text-amber-500" : "text-foreground"}`}>{fmtMonths(g.monthsToReach)}</p>
                      <p className="text-[10px] text-muted-foreground">to goal</p>
                    </div>
                  </div>

                  {/* Progress bar with markers */}
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-mono">
                      <span>{format(savedAmt)} saved</span>
                      <span>{pct.toFixed(0)}%</span>
                      <span>{format(g.target)} target</span>
                    </div>
                    <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${g.atRisk ? "bg-amber-400" : priorityStyle.bar}`}
                        style={{ width: `${pct}%` }}
                      />
                      {/* 50% marker */}
                      <div className="absolute top-0 left-1/2 h-full w-px bg-background/40" />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                      <span>Start</span>
                      <span>50%</span>
                      <span>🎯 Done</span>
                    </div>
                  </div>

                  {/* Action plan steps */}
                  <div className="rounded-lg bg-muted/30 border border-border px-3 py-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Action Plan</p>

                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 text-[10px] font-bold flex items-center justify-center">1</span>
                      <p className="text-xs text-foreground">
                        Set aside <span className="font-semibold font-mono text-violet-700 dark:text-violet-300">{format(g.monthlyAlloc)}/mo</span> from your goals pool every month automatically.
                      </p>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] font-bold flex items-center justify-center">2</span>
                      <p className="text-xs text-foreground">
                        At this pace, you&apos;ll reach <span className="font-semibold">{g.name}</span> by{" "}
                        <span className="font-semibold font-mono text-blue-700 dark:text-blue-300">{finishDate}</span>
                        {" "}({fmtMonths(g.monthsToReach)} from now).
                      </p>
                    </div>

                    {boostToSave3Mo != null && boostToSave3Mo > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 text-[10px] font-bold flex items-center justify-center">3</span>
                        <p className="text-xs text-foreground">
                          Increase by just <span className="font-semibold font-mono text-green-700 dark:text-green-400">{format(boostToSave3Mo)}/mo</span> more to finish <span className="font-semibold">3 months earlier</span>.
                        </p>
                      </div>
                    )}

                    {g.atRisk && requiredForDeadline != null && shortfall != null && shortfall > 0 && (
                      <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/20 px-2.5 py-2 mt-1">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          To meet your deadline, you need <span className="font-semibold font-mono">{format(requiredForDeadline)}/mo</span> — that&apos;s <span className="font-semibold">{format(shortfall)}/mo more</span> than currently allocated.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Mini milestone steps */}
                  {isFinite(g.monthsToReach) && g.monthsToReach > 0 && (
                    <div className="flex items-center gap-0 text-[10px]">
                      {[0.25, 0.5, 0.75, 1].map((milestone) => {
                        const moAtMilestone = Math.round(g.monthsToReach * milestone);
                        const reached = pct >= milestone * 100;
                        return (
                          <div key={milestone} className="flex-1 flex flex-col items-center gap-1">
                            <div className={`h-2 w-2 rounded-full border-2 ${reached ? "bg-green-500 border-green-500" : "bg-background border-muted-foreground/40"}`} />
                            <span className={`text-center leading-tight ${reached ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}`}>
                              {milestone === 1 ? "Done" : `${milestone * 100}%`}
                              <br />{projectedDate(moAtMilestone)}
                            </span>
                          </div>
                        );
                      }).reduce<React.ReactNode[]>((acc, el, i) => {
                        if (i > 0) acc.push(<div key={`line-${i}`} className="flex-1 h-px bg-muted-foreground/20 self-start mt-1" />);
                        acc.push(el);
                        return acc;
                      }, [])}
                    </div>
                  )}
                </CardContent>
              </Card>
            );})}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Target className="h-8 w-8 opacity-30" />
              <p className="text-sm">No active goals yet.</p>
              <p className="text-xs">Add goals in the Goals page or use the custom goal form above.</p>
            </div>
          )}
        </TabsContent>

        {/* ── Debt tab ── */}
        <TabsContent value="debt" className="mt-4">
          {totalDebt > 0 ? (
            <Card>
              <CardHeader className="pb-3 border-b border-border px-4 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-red-500" />
                    <p className="text-sm font-semibold">Debt Clearance Plan</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-bold text-red-500">{fmtMonths(extraPayoffMonths)}</p>
                    <p className="text-[10px] text-muted-foreground">to debt-free · {projectedDate(extraPayoffMonths)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-4 space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1 font-mono">
                    <span>Outstanding: {format(totalDebt)}</span>
                    <span>Min EMI: {format(baseMonthlyEMI)}/mo</span>
                  </div>
                  <div className="h-3 rounded-full bg-red-100 dark:bg-red-950/30 overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Per Loan · Avalanche Order</p>
                  <div className="space-y-2">
                    {debtBreakdown.map((d, idx) => (
                      <div key={d.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 h-5 w-5 rounded-full flex items-center justify-center shrink-0">{idx + 1}</span>
                            <span className="text-xs font-medium truncate">{d.name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono text-xs font-semibold text-red-500">{format(d.balance)}</p>
                            <p className="text-[10px] text-muted-foreground">{d.interest_rate}% p.a.</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                          <span>EMI: {format(d.minimum_payment)}/mo</span>
                          <span className="text-amber-600 dark:text-amber-400">Interest: ~{format(d.totalInterest)}</span>
                          <span className={d.moLeft <= 12 ? "text-green-600 dark:text-green-400 font-semibold" : ""}>{fmtMonths(d.moLeft)} left</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 px-3 py-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-green-700 dark:text-green-400">Extra Payment / mo</span>
                    <span className={`font-mono font-bold ${extraDebtPayment > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                      {extraDebtPayment > 0 ? `+${format(extraDebtPayment)}` : "₹0"}
                    </span>
                  </div>
                  <input type="range" min={0} max={Math.max(50000, Math.round(monthlySurplus))} step={500}
                    value={extraDebtPayment} onChange={(e) => setExtraDebtPayment(Number(e.target.value))}
                    className="w-full accent-green-500" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Without extra</p>
                      <p className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">{fmtMonths(basePayoffMonths)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">With extra</p>
                      <p className="font-mono text-xs font-semibold text-green-600 dark:text-green-400">{fmtMonths(extraPayoffMonths)}</p>
                    </div>
                  </div>
                  {monthsSaved > 0 && (
                    <div className="flex items-center gap-1.5 rounded-md bg-green-100 dark:bg-green-900/30 px-2 py-1.5">
                      <Zap className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                        Save <span className="font-bold">{fmtMonths(monthsSaved)}</span> — debt-free by <span className="font-bold">{projectedDate(extraPayoffMonths)}</span>
                      </p>
                    </div>
                  )}
                </div>

                {debtChartData.length > 2 && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Debt Balance Over Time</p>
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={debtChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="debtGradBase" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.03} />
                            </linearGradient>
                            <linearGradient id="debtGradExtra" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.03} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                          <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.floor(debtChartData.length / 5)} />
                          <YAxis tickFormatter={(v) => v >= 100_000 ? `${(v / 100_000).toFixed(1)}L` : `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={38} />
                          <Tooltip formatter={(v: unknown, name?: string) => [format(Number(v ?? 0)), name ?? ""]} contentStyle={{ fontSize: 11 }} />
                          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                          <Area type="monotone" dataKey="Without Extra" stroke="#ef4444" strokeWidth={2} fill="url(#debtGradBase)" dot={false} strokeDasharray="4 2" />
                          {extraDebtPayment > 0 && (
                            <Area type="monotone" dataKey="With Extra" stroke="#22c55e" strokeWidth={2} fill="url(#debtGradExtra)" dot={false} />
                          )}
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Year-by-year comparison table */}
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Year-by-Year Breakdown</p>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            {extraDebtPayment > 0 && (
                              <tr className="border-b border-border">
                                <th className="px-3 py-1.5" />
                                <th colSpan={2} className="text-center px-3 py-1.5 font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 border-x border-border">
                                  Min EMI only — {format(baseMonthlyEMI)}/mo
                                </th>
                                <th colSpan={2} className="text-center px-3 py-1.5 font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20">
                                  With extra — {format(baseMonthlyEMI + extraDebtPayment)}/mo
                                </th>
                              </tr>
                            )}
                            <tr className="bg-muted/50 border-b border-border">
                              <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Year</th>
                              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Remaining</th>
                              <th className="text-right px-3 py-2 font-medium text-muted-foreground">Paid off</th>
                              {extraDebtPayment > 0 && <th className="text-right px-3 py-2 font-medium text-muted-foreground">Remaining</th>}
                              {extraDebtPayment > 0 && <th className="text-right px-3 py-2 font-medium text-muted-foreground">Paid off</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {debtTableData.map((row, idx) => (
                              <tr key={row.year} className={`border-b border-border last:border-0 ${idx % 2 === 1 ? "bg-muted/20" : ""}`}>
                                <td className="px-3 py-2 font-semibold">Yr {row.year}</td>
                                <td className="px-3 py-2 text-right font-mono">
                                  {row.base <= 0
                                    ? <span className="text-green-600 dark:text-green-400 font-semibold">Cleared ✓</span>
                                    : <span className="text-red-500">{format(row.base)}</span>}
                                </td>
                                <td className="px-3 py-2 text-right font-mono text-foreground">{format(row.basePaid)}</td>
                                {extraDebtPayment > 0 && (
                                  <td className="px-3 py-2 text-right font-mono">
                                    {row.withExtra !== null && row.withExtra <= 0
                                      ? <span className="text-green-600 dark:text-green-400 font-semibold">Cleared ✓</span>
                                      : <span className="text-green-600 dark:text-green-400">{format(row.withExtra ?? 0)}</span>}
                                  </td>
                                )}
                                {extraDebtPayment > 0 && (
                                  <td className="px-3 py-2 text-right font-mono text-foreground">{format(row.extraPaid ?? 0)}</td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Landmark className="h-8 w-8 opacity-30" />
              <p className="text-sm">No debts tracked.</p>
              <p className="text-xs">Add debts in the Debt Tracker page to see payoff plans.</p>
            </div>
          )}
        </TabsContent>

        {/* ── Investment tab ── */}
        <TabsContent value="invest" className="mt-4">
          <Card>
            <CardHeader className="pb-3 border-b border-border px-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUpIcon className="h-4 w-4 text-blue-500" />
                  <p className="text-sm font-semibold">Investment Growth</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-bold text-blue-600 dark:text-blue-400">{monthlySurplus > 0 ? format(fv(120)) : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">in 10 years</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 py-4 space-y-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-blue-700 dark:text-blue-400">Annual Return Rate</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{returnRate}% p.a.</span>
                </div>
                <input type="range" min={4} max={24} step={1} value={returnRate}
                  onChange={(e) => setReturnRate(Number(e.target.value))} className="w-full accent-blue-500" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>4% · FD / PPF</span><span>12% · Equity</span><span>24% · High Risk</span>
                </div>
              </div>

              {monthlySurplus > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Wealth Growth · 10 Years</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={invChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(v) => v >= 10_000_000 ? `${(v / 10_000_000).toFixed(1)}Cr` : v >= 100_000 ? `${(v / 100_000).toFixed(0)}L` : `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={40} />
                      <Tooltip formatter={(v: unknown, name?: string) => [format(Number(v ?? 0)), name ?? ""]} contentStyle={{ fontSize: 11 }} />
                      <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="Contributed" stroke="#3b82f6" strokeWidth={2} fill="url(#contribGrad)" stackId="1" dot={false} />
                      <Area type="monotone" dataKey="Growth" stroke="#8b5cf6" strokeWidth={2} fill="url(#growthGrad)" stackId="1" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {monthlySurplus > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-3 py-2 font-medium text-muted-foreground">Year</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Invested</th>
                        <th className="text-right px-3 py-2 font-medium text-muted-foreground">Returns</th>
                        <th className="text-right px-3 py-2 font-medium text-foreground font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invYearData.filter((_, i) => [0, 2, 4, 6, 9].includes(i)).map((row) => (
                        <tr key={row.yr} className="border-b border-border last:border-0 hover:bg-muted/20">
                          <td className="px-3 py-2 font-medium">Year {row.yr}</td>
                          <td className="px-3 py-2 text-right font-mono text-blue-600 dark:text-blue-400">{format(row.contributed)}</td>
                          <td className="px-3 py-2 text-right font-mono text-violet-600 dark:text-violet-400">+{format(row.growth)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{format(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {invMilestones.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Wealth Milestones</p>
                  <div className="flex flex-wrap gap-2">
                    {invMilestones.map((ms) => (
                      <div key={ms.target} className="rounded-full bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 px-3 py-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">
                          {ms.target >= 10_000_000 ? `₹${ms.target / 10_000_000}Cr` : ms.target >= 100_000 ? `₹${ms.target / 100_000}L` : `₹${ms.target / 1000}K`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">by {projectedDate(ms.months)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {monthlySurplus > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Investing <span className="font-semibold">{format(monthlySurplus)}/mo</span> at <span className="font-semibold">{returnRate}% p.a.</span> compounded monthly.{" "}
                  Wealth multiplier at 10 years: <span className="font-bold text-violet-600 dark:text-violet-400">{(fv(120) / (monthlySurplus * 120)).toFixed(1)}×</span>
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Report tab ── */}
        <TabsContent value="report" className="mt-4">
          <Card className="border-violet-200 dark:border-violet-800 bg-violet-50/40 dark:bg-violet-950/10">
            <CardHeader className="pb-3 border-b border-violet-200 dark:border-violet-800 px-4 pt-4">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">Intelligence Report</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Personalised action steps based on your numbers</p>
            </CardHeader>
            <CardContent className="px-4 py-4 space-y-2">
              {insights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-lg px-3 py-3 ${
                  ins.type === "good"
                    ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                    : ins.type === "warn"
                      ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                      : "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                }`}>
                  <span className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    ins.type === "good"
                      ? "bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300"
                      : ins.type === "warn"
                        ? "bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300"
                        : "bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300"
                  }`}>{i + 1}</span>
                  <p className={`text-xs leading-relaxed ${
                    ins.type === "good" ? "text-green-800 dark:text-green-300"
                      : ins.type === "warn" ? "text-amber-800 dark:text-amber-300"
                        : "text-red-800 dark:text-red-300"
                  }`}>{ins.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
