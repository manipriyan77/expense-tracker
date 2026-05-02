"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, TrendingUp, BarChart3, Calendar } from "lucide-react";
import {
  useDailyTracker,
  toISODate,
  computeHabitStreak,
  computeOverallStreak,
} from "../daily-tracker-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDayNumber(startDate: string, currentDate: string) {
  const start = new Date(startDate + "T00:00:00");
  const current = new Date(currentDate + "T00:00:00");
  return Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { journey, habits, rangeLogs } = useDailyTracker();
  const todayStr = toISODate(new Date());

  // ── 30-day completion trend ────────────────────────────────────────────────
  const last30Days = useMemo(() => {
    const days: { date: string; pct: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayStr + "T00:00:00");
      d.setDate(d.getDate() - i);
      const ds = toISODate(d);
      const completed = rangeLogs.get(ds)?.size ?? 0;
      const pct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0;
      days.push({ date: ds, pct });
    }
    return days;
  }, [todayStr, rangeLogs, habits]);

  // ── Avg daily completion (30d) ────────────────────────────────────────────
  const avg30d = useMemo(() => {
    const nonZero = last30Days.filter((d) => d.pct > 0);
    if (nonZero.length === 0) return 0;
    return Math.round(nonZero.reduce((s, d) => s + d.pct, 0) / nonZero.length);
  }, [last30Days]);

  // ── Overall streak ────────────────────────────────────────────────────────
  const overallStreak = computeOverallStreak(rangeLogs, habits.length, todayStr);

  // ── Per-habit stats ───────────────────────────────────────────────────────
  const habitStats = useMemo(() => {
    return habits.map((h) => {
      let streak7 = 0, streak30 = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(todayStr + "T00:00:00");
        d.setDate(d.getDate() - i);
        if (rangeLogs.get(toISODate(d))?.has(h.id)) streak7++;
      }
      for (let i = 0; i < 30; i++) {
        const d = new Date(todayStr + "T00:00:00");
        d.setDate(d.getDate() - i);
        if (rangeLogs.get(toISODate(d))?.has(h.id)) streak30++;
      }
      const currentStreak = computeHabitStreak(h.id, rangeLogs, todayStr);
      return {
        habit: h,
        avg7d: Math.round((streak7 / 7) * 100),
        avg30d: Math.round((streak30 / 30) * 100),
        currentStreak,
      };
    });
  }, [habits, rangeLogs, todayStr]);

  // ── Best streak (approx from rangeLogs) ──────────────────────────────────
  const bestStreak = useMemo(() => {
    if (habits.length === 0) return 0;
    let best = 0, current = 0;
    for (let i = 59; i >= 0; i--) {
      const d = new Date(todayStr + "T00:00:00");
      d.setDate(d.getDate() - i);
      const completed = rangeLogs.get(toISODate(d))?.size ?? 0;
      if (completed / habits.length >= 0.5) {
        current++;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }
    return best;
  }, [habits, rangeLogs, todayStr]);

  // ── Most consistent habit ────────────────────────────────────────────────
  const mostConsistent = useMemo(() => {
    if (habitStats.length === 0) return null;
    return habitStats.reduce((best, h) => h.avg30d > best.avg30d ? h : best, habitStats[0]);
  }, [habitStats]);

  // ── Day of week analysis ─────────────────────────────────────────────────
  const dowStats = useMemo(() => {
    const sums = Array(7).fill(0);
    const counts = Array(7).fill(0);
    for (let i = 0; i < 60; i++) {
      const d = new Date(todayStr + "T00:00:00");
      d.setDate(d.getDate() - i);
      const ds = toISODate(d);
      // getDay(): 0=Sun, 1=Mon … 6=Sat → convert to Mon=0 … Sun=6
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
  }, [todayStr, rangeLogs, habits]);

  // ── Total days tracked ───────────────────────────────────────────────────
  const totalDaysTracked = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(todayStr + "T00:00:00");
      d.setDate(d.getDate() - i);
      if ((rangeLogs.get(toISODate(d))?.size ?? 0) > 0) count++;
    }
    return count;
  }, [rangeLogs, todayStr]);

  // ── Journey progress ─────────────────────────────────────────────────────
  const dayNumber = journey ? getDayNumber(journey.start_date, todayStr) : 0;
  const journeyPct = journey ? Math.min(100, Math.round((dayNumber / journey.total_days) * 100)) : 0;

  const maxBar30 = Math.max(...last30Days.map((d) => d.pct), 1);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-10">
      {/* ── Header Stats ── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Best Streak (60d)", value: `${bestStreak}d`, icon: Flame, color: "text-orange-500" },
          { label: "Avg Daily (30d)", value: `${avg30d}%`, icon: TrendingUp, color: "text-primary" },
          { label: "Days Tracked", value: String(totalDaysTracked), icon: Calendar, color: "text-blue-500" },
          {
            label: "Most Consistent",
            value: mostConsistent ? mostConsistent.habit.title.slice(0, 14) + (mostConsistent.habit.title.length > 14 ? "…" : "") : "—",
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
              {/* Circular-ish indicator using border trick */}
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
                <p className="text-xs text-muted-foreground">
                  Day {dayNumber} of {journey.total_days}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.max(0, journey.total_days - dayNumber)} days remaining
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 30-day Completion Trend ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">30-Day Completion Trend</h2>
          <div className="flex items-end gap-0.5 h-28">
            {last30Days.map((d) => {
              const height = Math.max(2, Math.round((d.pct / maxBar30) * 100));
              const isToday = d.date === todayStr;
              return (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center justify-end gap-0.5"
                  title={`${d.date}: ${d.pct}%`}
                >
                  <div
                    className={`w-full rounded-t-sm transition-all ${isToday ? "bg-primary" : d.pct === 0 ? "bg-muted" : d.pct >= 100 ? "bg-green-500" : "bg-primary/50"}`}
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Day-of-Week Analysis ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Average by Day of Week</h2>
          <div className="space-y-2">
            {dowStats.map(({ label, avg }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-8 shrink-0">{label}</span>
                <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary/60 transition-all"
                    style={{ width: `${avg}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{avg}%</span>
              </div>
            ))}
          </div>
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
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">7d avg</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">30d avg</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground">Streak</th>
                  </tr>
                </thead>
                <tbody>
                  {habitStats.map(({ habit, avg7d, avg30d: a30d, currentStreak }) => (
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
                        <span className={a30d >= 70 ? "text-green-500 font-semibold" : a30d >= 40 ? "text-primary" : "text-muted-foreground"}>
                          {a30d}%
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
