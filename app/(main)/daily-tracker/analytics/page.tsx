"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, TrendingUp, BarChart3, Calendar, Lightbulb, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import {
  useDailyTracker,
  toISODate,
  computeHabitStreak,
  computeOverallStreak,
} from "../daily-tracker-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const RANGE_OPTIONS = [7, 30, 60, 90] as const;
type Range = typeof RANGE_OPTIONS[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDayNumber(startDate: string, currentDate: string) {
  const start = new Date(startDate + "T00:00:00");
  const current = new Date(currentDate + "T00:00:00");
  return Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function trendLabel(d: Date, range: number): string {
  if (range <= 14) return d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2);
  if (range <= 30) return String(d.getDate());
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function cellFill(date: string, pct: number, todayStr: string): string {
  if (date === todayStr) return "hsl(var(--primary))";
  if (pct === 0) return "hsl(var(--muted))";
  if (pct >= 100) return "hsl(142 71% 45%)";
  return "hsl(var(--primary) / 0.5)";
}

function pctColor(pct: number): string {
  if (pct >= 70) return "text-green-500 font-semibold";
  if (pct >= 40) return "text-primary";
  return "text-muted-foreground";
}

function insightClass(type: "positive" | "neutral" | "tip"): string {
  if (type === "positive") return "bg-green-500/8 text-green-700 dark:text-green-400";
  if (type === "tip") return "bg-amber-500/8 text-amber-700 dark:text-amber-400";
  return "bg-muted/50 text-muted-foreground";
}

function MomBadge({ diff }: Readonly<{ diff: number }>) {
  let color = "text-muted-foreground";
  let Icon = Minus;
  let text = "No change";
  if (diff > 0) { color = "text-green-500"; Icon = ArrowUpRight; text = `+${diff}%`; }
  else if (diff < 0) { color = "text-red-400"; Icon = ArrowDownRight; text = `${diff}%`; }
  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {text} vs last month
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { journey, habits, rangeLogs } = useDailyTracker();
  const todayStr = toISODate(new Date());
  const [range, setRange] = useState<Range>(30);

  // ── Range-based trend data ─────────────────────────────────────────────────
  const trendData = useMemo(() => {
    const days: { label: string; pct: number; date: string }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(todayStr + "T00:00:00");
      d.setDate(d.getDate() - i);
      const ds = toISODate(d);
      const completed = rangeLogs.get(ds)?.size ?? 0;
      const pct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
      days.push({ date: ds, label: trendLabel(d, range), pct });
    }
    return days;
  }, [range, todayStr, rangeLogs, habits]);

  // ── Avg completion in range ────────────────────────────────────────────────
  const avgRange = useMemo(() => {
    const daysWithData = trendData.filter((d) => d.pct > 0);
    if (daysWithData.length === 0) return 0;
    return Math.round(daysWithData.reduce((s, d) => s + d.pct, 0) / daysWithData.length);
  }, [trendData]);

  // ── Overall streak ────────────────────────────────────────────────────────
  const overallStreak = computeOverallStreak(rangeLogs, habits.length, todayStr);

  // ── Best streak in range ──────────────────────────────────────────────────
  const bestStreak = useMemo(() => {
    if (habits.length === 0) return 0;
    let best = 0, current = 0;
    for (const d of trendData) {
      if (d.pct >= 50) { current++; best = Math.max(best, current); }
      else { current = 0; }
    }
    return best;
  }, [habits, trendData]);

  // ── Days tracked in range ─────────────────────────────────────────────────
  const daysTrackedInRange = useMemo(
    () => trendData.filter((d) => d.pct > 0).length,
    [trendData]
  );

  // ── Per-habit stats ───────────────────────────────────────────────────────
  const habitStats = useMemo(() => {
    return habits.map((h) => {
      let hitInRange = 0;
      const windowLast7: boolean[] = [];
      for (let i = 0; i < range; i++) {
        const d = new Date(todayStr + "T00:00:00");
        d.setDate(d.getDate() - i);
        const hit = rangeLogs.get(toISODate(d))?.has(h.id) ?? false;
        if (hit) hitInRange++;
        if (i < 7) windowLast7.push(hit);
      }
      const currentStreak = computeHabitStreak(h.id, rangeLogs, todayStr);
      return {
        habit: h,
        avgRange: Math.round((hitInRange / range) * 100),
        avg7d: Math.round((windowLast7.filter(Boolean).length / 7) * 100),
        currentStreak,
      };
    });
  }, [habits, rangeLogs, todayStr, range]);

  // ── Most consistent habit ────────────────────────────────────────────────
  const mostConsistent = useMemo(() => {
    if (habitStats.length === 0) return null;
    return habitStats.reduce((best, h) => h.avgRange > best.avgRange ? h : best, habitStats[0]);
  }, [habitStats]);

  // ── Day of week analysis ─────────────────────────────────────────────────
  const dowStats = useMemo(() => {
    const sums = new Array(7).fill(0) as number[];
    const counts = new Array(7).fill(0) as number[];
    for (let i = 0; i < range; i++) {
      const d = new Date(todayStr + "T00:00:00");
      d.setDate(d.getDate() - i);
      const ds = toISODate(d);
      const dow = (d.getDay() + 6) % 7;
      const completed = rangeLogs.get(ds)?.size ?? 0;
      const pct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
      sums[dow] += pct;
      counts[dow]++;
    }
    return DAY_LABELS.map((label, i) => ({
      label,
      avg: counts[i] > 0 ? Math.round(sums[i] / counts[i]) : 0,
    }));
  }, [todayStr, rangeLogs, habits, range]);

  // ── Month-over-month comparison ───────────────────────────────────────────
  const monthComparison = useMemo(() => {
    const now = new Date(todayStr + "T00:00:00");
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    function monthAvg(year: number, month: number) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0); // last day of month
      let total = 0, count = 0;
      const d = new Date(start);
      while (d <= end && toISODate(d) <= todayStr) {
        const ds = toISODate(d);
        const completed = rangeLogs.get(ds)?.size ?? 0;
        const pct = habits.length > 0 ? (completed / habits.length) * 100 : 0;
        total += pct;
        count++;
        d.setDate(d.getDate() + 1);
      }
      return count > 0 ? Math.round(total / count) : 0;
    }

    function monthPerfectDays(year: number, month: number) {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      let count = 0;
      const d = new Date(start);
      while (d <= end && toISODate(d) <= todayStr) {
        const ds = toISODate(d);
        const completed = rangeLogs.get(ds)?.size ?? 0;
        if (habits.length > 0 && completed >= habits.length) count++;
        d.setDate(d.getDate() + 1);
      }
      return count;
    }

    return {
      thisLabel: monthLabel(thisYear, thisMonth),
      prevLabel: monthLabel(prevYear, prevMonth),
      thisAvg: monthAvg(thisYear, thisMonth),
      prevAvg: monthAvg(prevYear, prevMonth),
      thisPerfect: monthPerfectDays(thisYear, thisMonth),
      prevPerfect: monthPerfectDays(prevYear, prevMonth),
    };
  }, [todayStr, rangeLogs, habits]);

  const leastConsistent = useMemo(() => {
    if (habitStats.length < 2) return null;
    return habitStats.reduce((w, h) => h.avgRange < w.avgRange ? h : w, habitStats[0]);
  }, [habitStats]);

  const perfectDaysInRange = useMemo(
    () => trendData.filter((d) => d.pct === 100).length,
    [trendData]
  );

  // ── Dynamic insights ──────────────────────────────────────────────────────
  const insights = useMemo(() => {
    type Insight = { icon: string; text: string; type: "positive" | "neutral" | "tip" };
    const msgs: Insight[] = [];
    if (habits.length === 0) return msgs;

    const sortedDow = [...dowStats].sort((a, b) => b.avg - a.avg);
    const bestDay = sortedDow[0];
    const worstDay = sortedDow.at(-1);

    if (bestDay.avg > 0)
      msgs.push({ icon: "🏆", text: `Your strongest day is ${bestDay.label} with ${bestDay.avg}% average completion.`, type: "positive" });

    if (worstDay && worstDay.avg < 50 && worstDay.avg < bestDay.avg - 20)
      msgs.push({ icon: "💡", text: `${worstDay.label} is your weakest day (${worstDay.avg}%). Consider setting a reminder.`, type: "tip" });

    if (overallStreak >= 7)
      msgs.push({ icon: "🔥", text: `You're on a ${overallStreak}-day streak! Consistency is building.`, type: "positive" });

    if (monthComparison.thisAvg > monthComparison.prevAvg && monthComparison.prevAvg > 0) {
      msgs.push({ icon: "📈", text: `This month is ${monthComparison.thisAvg - monthComparison.prevAvg}% better than last month. Great momentum!`, type: "positive" });
    } else if (monthComparison.prevAvg > monthComparison.thisAvg && monthComparison.thisAvg > 0) {
      msgs.push({ icon: "📉", text: `This month is ${monthComparison.prevAvg - monthComparison.thisAvg}% below last month. You can turn it around.`, type: "neutral" });
    }

    if (mostConsistent && mostConsistent.avgRange >= 80)
      msgs.push({ icon: "⭐", text: `"${mostConsistent.habit.title}" is your most reliable habit at ${mostConsistent.avgRange}%.`, type: "positive" });

    if (leastConsistent && leastConsistent.avgRange < 30)
      msgs.push({ icon: "🎯", text: `"${leastConsistent.habit.title}" needs attention — only ${leastConsistent.avgRange}% in the last ${range} days.`, type: "tip" });

    const s = perfectDaysInRange === 1 ? "" : "s";
    if (perfectDaysInRange > 0)
      msgs.push({ icon: "🌟", text: `You hit 100% completion on ${perfectDaysInRange} day${s} in the last ${range} days.`, type: "positive" });

    return msgs.slice(0, 4);
  }, [dowStats, overallStreak, monthComparison, mostConsistent, leastConsistent, range, perfectDaysInRange, habits]);

  // ── Journey progress ─────────────────────────────────────────────────────
  const dayNumber = journey ? getDayNumber(journey.start_date, todayStr) : 0;
  const journeyPct = journey ? Math.min(100, Math.round((dayNumber / journey.total_days) * 100)) : 0;

  const momDiff = monthComparison.thisAvg - monthComparison.prevAvg;

  const mostConsistentTitle = mostConsistent?.habit.title ?? "";
  const mostConsistentSuffix = mostConsistentTitle.length > 14 ? "…" : "";
  const mostConsistentLabel = mostConsistentTitle
    ? mostConsistentTitle.slice(0, 14) + mostConsistentSuffix
    : "—";

  function xAxisInterval(): number {
    if (range <= 14) return 0;
    if (range <= 30) return 4;
    return 6;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-10">

      {/* ── Range Selector ── */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Range:</span>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors font-medium
                ${range === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* ── Header Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: `Best Streak (${range}d)`, value: `${bestStreak}d`, icon: Flame, color: "text-orange-500" },
          { label: `Avg Daily (${range}d)`, value: `${avgRange}%`, icon: TrendingUp, color: "text-primary" },
          { label: `Days Tracked (${range}d)`, value: String(daysTrackedInRange), icon: Calendar, color: "text-blue-500" },
          {
            label: "Most Consistent",
            value: mostConsistent
              ? mostConsistent.habit.title.slice(0, 14) + (mostConsistent.habit.title.length > 14 ? "…" : "")
              : "—",
            icon: BarChart3,
            color: "text-green-500",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-3 flex items-center gap-3">
              <Icon className={`h-5 w-5 shrink-0 ${color}`} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-bold text-foreground truncate">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Journey Progress ── */}
      {journey && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Journey Progress</h2>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    strokeDasharray={`${journeyPct} ${100 - journeyPct}`}
                    strokeLinecap="round"
                    className="text-primary transition-all"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">{journeyPct}%</span>
                </div>
              </div>
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-foreground text-sm">{journey.name}</p>
                <p className="text-xs text-muted-foreground">Day {dayNumber} of {journey.total_days}</p>
                <p className="text-xs text-muted-foreground">{Math.max(0, journey.total_days - dayNumber)} days remaining</p>
                {overallStreak > 0 && (
                  <p className="text-xs text-orange-500 font-medium flex items-center gap-1">
                    <Flame className="h-3 w-3" />{overallStreak}-day streak
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Completion Trend (Recharts) ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">{range}-Day Completion Trend</h2>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }} barCategoryGap="10%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 8 }}
                tickLine={false}
                axisLine={false}
                interval={range <= 14 ? 0 : range <= 30 ? 4 : 6}
              />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }}
                formatter={(v: number | undefined) => [`${v ?? 0}%`, "Completion"]}
                labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 10 }}
              />
              <Bar dataKey="pct" radius={[2, 2, 0, 0]} name="Completion">
                {trendData.map((d) => (
                  <Cell key={d.date} fill={cellFill(d.date, d.pct, todayStr)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Month-over-Month Comparison ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Month-over-Month</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: monthComparison.prevLabel, avg: monthComparison.prevAvg, perfect: monthComparison.prevPerfect },
              { label: monthComparison.thisLabel, avg: monthComparison.thisAvg, perfect: monthComparison.thisPerfect },
            ].map(({ label, avg, perfect }) => (
              <div key={label} className="rounded-xl border p-3 space-y-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-2xl font-bold text-foreground">{avg}%</p>
                <p className="text-[10px] text-muted-foreground">avg completion</p>
                <p className="text-xs text-foreground font-medium">{perfect} perfect day{perfect === 1 ? "" : "s"}</p>
              </div>
            ))}
          </div>
          {monthComparison.prevAvg > 0 && <MomBadge diff={momDiff} />}
        </CardContent>
      </Card>

      {/* ── Dynamic Insights ── */}
      {insights.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Insights</h2>
            </div>
            <div className="space-y-2">
              {insights.map((ins) => (
                <div
                  key={ins.icon + ins.text.slice(0, 20)}
                  className={`flex items-start gap-2.5 text-xs p-2.5 rounded-lg ${insightClass(ins.type)}`}
                >
                  <span className="text-base leading-none shrink-0">{ins.icon}</span>
                  <span className="leading-snug">{ins.text}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Day-of-Week Analysis (Recharts) ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Average by Day of Week</h2>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={dowStats} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--popover))" }}
                formatter={(v: number) => [`${v}%`, "Avg"]}
              />
              <Bar dataKey="avg" radius={[3, 3, 0, 0]} fill="hsl(var(--primary) / 0.6)" name="Avg" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Per-Habit Stats ── */}
      {habitStats.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-semibold">Per-Habit Stats</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Habit</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">7d</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">{range}d</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {habitStats
                    .sort((a, b) => b.avgRange - a.avgRange)
                    .map(({ habit, avgRange: ar, avg7d, currentStreak }) => (
                      <tr key={habit.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-foreground">{habit.title}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={avg7d >= 70 ? "text-green-500 font-semibold" : avg7d >= 40 ? "text-primary" : "text-muted-foreground"}>
                            {avg7d}%
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={ar >= 70 ? "text-green-500 font-semibold" : ar >= 40 ? "text-primary" : "text-muted-foreground"}>
                            {ar}%
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {currentStreak > 0 ? (
                            <span className="flex items-center justify-end gap-0.5 text-orange-500 font-semibold">
                              <Flame className="h-3 w-3" />{currentStreak}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
