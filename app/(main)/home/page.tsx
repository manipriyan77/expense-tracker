"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  BookOpen,
  BarChart3,
  Receipt,
  Flag,
  Scale,
  TrendingUp,
  Flame,
  ChevronRight,
  Wallet,
  Target,
  ArrowRight,
  CheckSquare,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useTransactionsStore } from "@/store/transactions-store";
import { useNetWorthStore } from "@/store/net-worth-store";
import { useGoalsStore } from "@/store/goals-store";
import { useFormatCurrency } from "@/lib/hooks/useFormatCurrency";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Journey {
  id: string;
  name: string;
  start_date: string;
  total_days: number;
}

interface HabitLog {
  habit_id: string;
  completed: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getDayNumber(startDate: string, currentDate: string) {
  const start = new Date(startDate + "T00:00:00");
  const current = new Date(currentDate + "T00:00:00");
  return Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

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
  { href: "/dashboard", label: "Dashboard", icon: BarChart3, color: "text-primary" },
  { href: "/transactions", label: "Transactions", icon: Receipt, color: "text-blue-500" },
  { href: "/goals", label: "Goals", icon: Flag, color: "text-green-500" },
  { href: "/net-worth", label: "Net Worth", icon: Scale, color: "text-violet-500" },
  { href: "/investments", label: "Investments", icon: TrendingUp, color: "text-orange-500" },
  { href: "/budgets", label: "Budgets", icon: Target, color: "text-pink-500" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const today = toISODate(new Date());
  const { user } = useAuthStore();
  const { transactions, fetchTransactions } = useTransactionsStore();
  const { assets, liabilities, fetchAssets, fetchLiabilities } = useNetWorthStore();
  const { goals, fetchGoals } = useGoalsStore();
  const { format } = useFormatCurrency();

  const [journey, setJourney] = useState<Journey | null>(null);
  const [todayHabits, setTodayHabits] = useState<{ total: number; done: number }>({ total: 0, done: 0 });
  const [streak, setStreak] = useState(0);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  useEffect(() => {
    fetchTransactions();
    fetchAssets();
    fetchLiabilities();
    fetchGoals();
    loadTrackerData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadTrackerData() {
    try {
      const [journeyRes, habitsRes] = await Promise.all([
        fetch("/api/daily-tracker/journey"),
        fetch("/api/daily-tracker/habits"),
      ]);
      const journeyData = await journeyRes.json();
      const habitsData = await habitsRes.json();
      if (!journeyData) return;
      setJourney(journeyData);

      const total = habitsData?.length ?? 0;
      if (total === 0) return;

      const logsRes = await fetch(`/api/daily-tracker/logs?date=${today}`);
      const logsData: HabitLog[] = await logsRes.json();
      const done = logsData?.filter((l) => l.completed).length ?? 0;
      setTodayHabits({ total, done });

      // Compute streak (check last 60 days from range logs)
      const from = toISODate(new Date(new Date(today + "T00:00:00").getTime() - 59 * 86400000));
      const rangeRes = await fetch(`/api/daily-tracker/logs/range?from=${from}&to=${today}`);
      const rangeLogs: { habit_id: string; log_date: string; completed: boolean }[] = await rangeRes.json();

      const byDate = new Map<string, number>();
      for (const log of rangeLogs ?? []) {
        if (log.completed) byDate.set(log.log_date, (byDate.get(log.log_date) ?? 0) + 1);
      }
      let s = 0;
      const d = new Date(today + "T00:00:00");
      for (let i = 0; i < 60; i++) {
        const ds = toISODate(d);
        const completed = byDate.get(ds) ?? 0;
        if (completed / total < 0.5) break;
        s++;
        d.setDate(d.getDate() - 1);
      }
      setStreak(s);
    } catch {
      // silent — tracker not set up yet
    }
  }

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

  const dayNumber = journey ? getDayNumber(journey.start_date, today) : null;
  const trackerPct = todayHabits.total > 0 ? Math.round((todayHabits.done / todayHabits.total) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 pb-10">
      {/* ── Greeting ── */}
      <div className="space-y-0.5 pt-2">
        <h1 className="text-2xl font-bold text-foreground">
          {greeting()}, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">{formatDay(new Date())}</p>
      </div>

      {/* ── Two-path cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Life Tracker card */}
        <Link href="/daily-tracker" className="group">
          <Card className="h-full border-0 shadow-md overflow-hidden bg-linear-to-br from-orange-500/10 via-background to-amber-500/5 hover:shadow-lg transition-shadow">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-orange-500">Life</p>
                    <p className="text-sm font-semibold text-foreground">Daily Tracker</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-500 transition-colors" />
              </div>

              {journey ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Sparkles className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-xs font-semibold text-orange-500">
                        Day {dayNumber} / {journey.total_days}
                      </span>
                      {streak > 1 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                          <Flame className="h-3 w-3" />{streak}d
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{journey.name}</p>
                  </div>

                  {todayHabits.total > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Today's tasks</span>
                        <span className="font-semibold text-foreground">{todayHabits.done}/{todayHabits.total}</span>
                      </div>
                      <div className="h-2 bg-orange-500/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${trackerPct === 100 ? "bg-green-500" : "bg-orange-500"}`}
                          style={{ width: `${trackerPct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-right">{trackerPct}% done</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Add your daily tasks to start tracking</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Start your journey — track daily habits, life goals, and your progress day by day.</p>
                  <Button size="sm" variant="outline" className="gap-1.5 border-orange-500/30 text-orange-600 hover:bg-orange-500/10 hover:text-orange-600">
                    <Sparkles className="h-3.5 w-3.5" />Begin Journey
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Finance card */}
        <Link href="/dashboard" className="group">
          <Card className="h-full border-0 shadow-md overflow-hidden bg-linear-to-br from-primary/10 via-background to-primary/5 hover:shadow-lg transition-shadow">
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
      </div>

      {/* ── Finance Quick Links ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Finance</h2>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {FINANCE_LINKS.map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-3 flex flex-col items-center gap-1.5 text-center">
                  <Icon className={`h-5 w-5 ${color} group-hover:scale-110 transition-transform`} />
                  <span className="text-xs font-medium text-foreground">{label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Life Quick Links ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-orange-500">Life</h2>
        <div className="grid grid-cols-1 gap-2">
          {[
            { href: "/daily-tracker", icon: BookOpen, label: "Daily Tracker", sub: "Habits · Life goals · Journal · Streaks" },
            { href: "/tasks",         icon: CheckSquare, label: "Tasks",         sub: "To-dos · Lists · Priorities · Due dates" },
          ].map(({ href, icon: Icon, label, sub }) => (
            <Link key={href} href={href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                      <Icon className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{sub}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
