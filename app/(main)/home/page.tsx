"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  Receipt,
  Flag,
  Scale,
  TrendingUp,
  ChevronRight,
  Wallet,
  Target,
  ArrowRight,
  ArrowLeftRight,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useTransactionsStore } from "@/store/transactions-store";
import { useNetWorthStore } from "@/store/net-worth-store";
import { useGoalsStore } from "@/store/goals-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}

// ─── Finance quick links ───────────────────────────────────────────────────────

const FINANCE_LINKS = [
  { href: "/dashboard",   label: "Dashboard",    icon: BarChart3,      color: "text-primary" },
  { href: "/transactions",label: "Transactions", icon: Receipt,        color: "text-blue-500" },
  { href: "/expenses",    label: "Money Flow",   icon: ArrowLeftRight, color: "text-cyan-500" },
  { href: "/budgets",     label: "Budgets",      icon: Target,         color: "text-pink-500" },
  { href: "/goals",       label: "Goals",        icon: Flag,           color: "text-green-500" },
  { href: "/investments", label: "Investments",  icon: TrendingUp,     color: "text-orange-500" },
  { href: "/net-worth",   label: "Net Worth",    icon: Scale,          color: "text-violet-500" },
  { href: "/analytics",   label: "Analytics",    icon: BarChart3,      color: "text-indigo-500" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user } = useAuthStore();
  const { transactions, fetchTransactions } = useTransactionsStore();
  const { assets, liabilities, fetchAssets, fetchLiabilities } = useNetWorthStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { format } = useFormatCurrency();

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  useEffect(() => {
    fetchTransactions();
    fetchAssets();
    fetchLiabilities();
    fetchGoals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Finance stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthIncome = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const monthSavings = monthIncome - monthExpense;
  const activeGoals = goals.filter((g) => g.status === "active").length;
  const totalAssets = assets.reduce((s, a) => s + (a.value ?? 0), 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + (l.balance ?? 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 pb-10">
      {/* ── Greeting ── */}
      <div className="space-y-0.5 pt-2">
        <h1 className="text-2xl font-bold text-foreground">
          {greeting()}, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">{formatDay(new Date())}</p>
      </div>

      {/* ── Finance card ── */}
      <Link href="/dashboard" className="group block">
        <Card className="border-0 shadow-md overflow-hidden bg-linear-to-br from-primary/10 via-background to-primary/5 hover:shadow-lg transition-shadow">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary">Finance</p>
                  <p className="text-sm font-semibold text-foreground">Dashboard</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>

            <div className="space-y-2">
              {netWorth !== 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Net Worth</p>
                  <p className="text-lg font-bold text-foreground">{format(netWorth)}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-500/10 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Income</p>
                  <p className="text-sm font-bold text-green-600">{format(monthIncome)}</p>
                </div>
                <div className="bg-red-500/10 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">Expenses</p>
                  <p className="text-sm font-bold text-red-500">{format(monthExpense)}</p>
                </div>
              </div>
              {monthSavings !== 0 && (
                <p className="text-xs text-muted-foreground">
                  {monthSavings >= 0 ? "Saved" : "Overspent"}{" "}
                  <span className={`font-semibold ${monthSavings >= 0 ? "text-green-600" : "text-red-500"}`}>{format(Math.abs(monthSavings))}</span>
                  {" "}this month
                  {activeGoals > 0 && ` · ${activeGoals} active goal${activeGoals > 1 ? "s" : ""}`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* ── Finance Quick Links ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Finance</h2>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {FINANCE_LINKS.map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-2.5 flex flex-col items-center gap-1 text-center">
                  <Icon className={`h-4 w-4 ${color} group-hover:scale-110 transition-transform`} />
                  <span className="text-[10px] font-medium text-foreground leading-tight text-center">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
