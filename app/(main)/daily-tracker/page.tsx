"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Flame,
  Sparkles,
  Star,
  Check,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Edit2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useDailyTracker,
  toISODate,
  computeOverallStreak,
  MOODS,
  Journey,
  LifeGoal,
  HabitLog,
} from "./daily-tracker-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDayNumber(startDate: string, currentDate: string) {
  const start = new Date(startDate + "T00:00:00");
  const current = new Date(currentDate + "T00:00:00");
  return Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function parseNumeric(val: string): number | null {
  const lower = val.toLowerCase().replace(/[₹,\s]/g, "");
  const lakhMatch = lower.match(/^([\d.]+)\s*lakh/);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;
  const kMatch = lower.match(/^([\d.]+)k$/);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;
  const num = parseFloat(lower.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? null : num;
}

function goalProgress(
  present: string,
  target: string,
  start?: string,
): { pct: number; direction: "up" | "down" } | null {
  const p = parseNumeric(present);
  const t = parseNumeric(target);
  if (p === null || t === null) return null;
  if (t >= p) {
    if (t === 0) return null;
    return { pct: Math.min(100, Math.round((p / t) * 100)), direction: "up" };
  } else {
    const s = start ? parseNumeric(start) : null;
    if (s === null || s <= t) return { pct: p <= t ? 100 : 0, direction: "down" };
    const pct = Math.min(100, Math.max(0, Math.round(((s - p) / (s - t)) * 100)));
    return { pct, direction: "down" };
  }
}

// ─── Week Summary Bar ─────────────────────────────────────────────────────────

function WeekSummaryBar({
  rangeLogs,
  totalHabits,
  todayStr,
}: {
  rangeLogs: Map<string, Set<string>>;
  totalHabits: number;
  todayStr: string;
}) {
  const today = new Date(todayStr + "T00:00:00");
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const ds = toISODate(d);
    const isFuture = d > today;
    const completed = rangeLogs.get(ds)?.size ?? 0;
    const pct = totalHabits > 0 && !isFuture ? Math.round((completed / totalHabits) * 100) : 0;
    return {
      date: ds,
      label: d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2),
      pct,
      isToday: ds === todayStr,
      isFuture,
    };
  });

  const passedDays = days.filter((d) => !d.isFuture);
  const weekAvg = passedDays.length > 0
    ? Math.round(passedDays.reduce((s, d) => s + d.pct, 0) / passedDays.length)
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">This Week</span>
        <Link href="/daily-tracker/analytics" className="text-xs text-primary hover:underline">
          {weekAvg}% avg
        </Link>
      </div>
      <div className="flex gap-1.5 justify-between">
        {days.map((d) => (
          <Link
            key={d.date}
            href={`/daily-tracker/habits?date=${d.date}`}
            className="flex flex-col items-center gap-1 flex-1 min-w-0"
          >
            <span className={`text-[10px] ${d.isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
              {d.label}
            </span>
            <div className="w-full h-8 rounded bg-muted relative overflow-hidden">
              {!d.isFuture && (
                <div
                  className="absolute bottom-0 left-0 right-0 bg-primary/60 transition-all"
                  style={{ height: `${d.pct}%` }}
                />
              )}
              {d.pct === 100 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>
            <span className={`text-[10px] ${d.isFuture ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
              {d.isFuture ? "—" : `${d.pct}%`}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main Overview Page ───────────────────────────────────────────────────────

export default function DailyTrackerOverviewPage() {
  const { journey, habits, rangeLogs, refetchJourney } = useDailyTracker();
  const todayStr = toISODate(new Date());

  const [logs, setLogs] = useState<Map<string, HabitLog>>(new Map());
  const [lifeGoals, setLifeGoals] = useState<LifeGoal[]>([]);
  const [reflectionSnippet, setReflectionSnippet] = useState("");
  const [reflectionMood, setReflectionMood] = useState("");
  const [journeyDialog, setJourneyDialog] = useState(false);
  const [editJourneyName, setEditJourneyName] = useState("");
  const [editJourneyDays, setEditJourneyDays] = useState(249);

  const fetchTodayData = useCallback(async () => {
    if (!journey) return;
    const [logsRes, reflRes, goalsRes] = await Promise.all([
      fetch(`/api/daily-tracker/logs?date=${todayStr}`),
      fetch(`/api/daily-tracker/reflections?date=${todayStr}`),
      fetch(`/api/daily-tracker/life-goals?journey_id=${journey.id}`),
    ]);
    const logsData: HabitLog[] = await logsRes.json();
    const reflData = await reflRes.json();
    const goalsData: LifeGoal[] = await goalsRes.json();
    const map = new Map<string, HabitLog>();
    for (const log of logsData ?? []) map.set(log.habit_id, log);
    setLogs(map);
    setReflectionSnippet(reflData?.note ?? "");
    setReflectionMood(reflData?.mood ?? "");
    setLifeGoals(goalsData ?? []);
  }, [journey, todayStr]);

  useEffect(() => {
    fetchTodayData();
  }, [fetchTodayData]);

  async function toggleHabit(habitId: string) {
    const existing = logs.get(habitId);
    const newCompleted = !existing?.completed;
    const newLog: HabitLog = { habit_id: habitId, log_date: todayStr, completed: newCompleted, note: existing?.note ?? "" };
    setLogs((prev) => new Map(prev).set(habitId, newLog));
    try {
      await fetch("/api/daily-tracker/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLog),
      });
    } catch {
      toast.error("Failed to save");
    }
  }

  async function saveJourney() {
    if (!journey) return;
    try {
      const res = await fetch(`/api/daily-tracker/journey/${journey.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editJourneyName, total_days: editJourneyDays }),
      });
      if (!res.ok) throw new Error();
      await refetchJourney();
      setJourneyDialog(false);
      toast.success("Journey updated");
    } catch {
      toast.error("Failed to update journey");
    }
  }

  if (!journey) return null;

  const dayNumber = getDayNumber(journey.start_date, todayStr);
  const completedCount = habits.filter((h) => logs.get(h.id)?.completed).length;
  const totalHabits = habits.length;
  const completionPct = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;
  const overallStreak = computeOverallStreak(rangeLogs, totalHabits, todayStr);
  const daysRemaining = Math.max(0, journey.total_days - dayNumber);

  const incompleteHabits = habits.filter((h) => !logs.get(h.id)?.completed).slice(0, 5);
  const topGoals = lifeGoals.slice(0, 4);

  const journeyProgress = Math.min(100, Math.round((dayNumber / journey.total_days) * 100));

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-10">
      {/* ── Journey Banner ── */}
      <Card className="overflow-hidden border-0 shadow-md bg-linear-to-br from-primary/10 via-background to-primary/5">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                  Day {dayNumber} / {journey.total_days}
                </span>
                {overallStreak > 1 && (
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                    <Flame className="h-3 w-3" />{overallStreak}d streak
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setEditJourneyName(journey.name);
                  setEditJourneyDays(journey.total_days);
                  setJourneyDialog(true);
                }}
                className="text-xl font-bold text-foreground hover:text-primary transition-colors text-left flex items-center gap-1.5"
              >
                {journey.name}
                <Edit2 className="h-3.5 w-3.5 opacity-50" />
              </button>
            </div>
          </div>

          {/* Journey progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Journey progress</span>
              <span className="font-semibold text-primary">{journeyProgress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/40 transition-all duration-700"
                style={{ width: `${journeyProgress}%` }}
              />
            </div>
          </div>

          {/* Today's habit progress */}
          {totalHabits > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{completedCount}/{totalHabits} habits today</span>
                <span className={`font-bold ${completionPct === 100 ? "text-green-500" : "text-primary"}`}>
                  {completionPct}%
                </span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${completionPct === 100 ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Week summary */}
          {totalHabits > 0 && (
            <WeekSummaryBar
              rangeLogs={rangeLogs}
              totalHabits={totalHabits}
              todayStr={todayStr}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Day", value: String(dayNumber), sub: `of ${journey.total_days}` },
          { label: "Streak", value: String(overallStreak), sub: overallStreak === 1 ? "day" : "days" },
          { label: "Today", value: `${completionPct}%`, sub: "completion" },
          { label: "Left", value: String(daysRemaining), sub: "days to go" },
        ].map(({ label, value, sub }) => (
          <Card key={label}>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-xl font-bold text-primary leading-tight">{value}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Quick Complete ── */}
      {incompleteHabits.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <h2 className="font-semibold text-sm">Quick Complete</h2>
                <span className="text-xs text-muted-foreground">({incompleteHabits.length} remaining)</span>
              </div>
              <Link href="/daily-tracker/habits" className="text-xs text-primary hover:underline flex items-center gap-1">
                All habits <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y">
              {incompleteHabits.map((habit) => {
                const completed = logs.get(habit.id)?.completed ?? false;
                return (
                  <div key={habit.id} className="flex items-center gap-3 px-4 py-3">
                    <button
                      onClick={() => toggleHabit(habit.id)}
                      className={`shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                        completed
                          ? "bg-primary border-primary scale-105"
                          : "border-muted-foreground/40 hover:border-primary hover:scale-105"
                      }`}
                    >
                      {completed && <Check className="h-3 w-3 text-primary-foreground" />}
                    </button>
                    <span className={`text-sm ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {habit.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {completedCount === totalHabits && totalHabits > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 text-center space-y-1">
            <div className="text-3xl">🎉</div>
            <p className="font-semibold text-green-600 dark:text-green-400">All habits done for today!</p>
            <p className="text-xs text-muted-foreground">Amazing work. Keep the streak alive!</p>
          </CardContent>
        </Card>
      )}

      {/* ── Life Goals Summary ── */}
      {topGoals.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <h2 className="font-semibold text-sm">Life Goals</h2>
              </div>
              <Link href="/daily-tracker/goals" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              {topGoals.map((goal) => {
                const progress = goalProgress(goal.present_value, goal.target_value, goal.start_value);
                return (
                  <div key={goal.id} className="space-y-2 p-3 rounded-lg border bg-card">
                    <p className="text-xs font-medium text-foreground line-clamp-1">{goal.title}</p>
                    {progress ? (
                      <>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{goal.present_value}</span>
                          <div className="flex items-center gap-0.5">
                            {progress.direction === "up"
                              ? <TrendingUp className="h-3 w-3 text-green-500" />
                              : <TrendingDown className="h-3 w-3 text-orange-500" />}
                            <span>{goal.target_value}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progress.direction === "up" ? "bg-primary" : "bg-orange-500"}`}
                            style={{ width: `${progress.pct}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right">{progress.pct}%</p>
                      </>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic">No values set</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Reflection Snippet ── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">Today&apos;s Reflection</h2>
            <Link href="/daily-tracker/journal" className="text-xs text-primary hover:underline flex items-center gap-1">
              Write <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="px-4 py-3 space-y-2">
            {reflectionMood && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Mood:</span>
                <span className="text-xl">{reflectionMood}</span>
              </div>
            )}
            {reflectionSnippet ? (
              <p className="text-sm text-foreground line-clamp-3">{reflectionSnippet}</p>
            ) : (
              <Link href="/daily-tracker/journal">
                <p className="text-sm text-muted-foreground italic hover:text-primary cursor-pointer">
                  No reflection yet — tap to write one...
                </p>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Edit Journey Dialog ── */}
      <Dialog open={journeyDialog} onOpenChange={setJourneyDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Journey</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Journey Name</Label>
              <Input value={editJourneyName} onChange={(e) => setEditJourneyName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total Days</Label>
              <Input
                type="number"
                value={editJourneyDays}
                onChange={(e) => setEditJourneyDays(Number(e.target.value))}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setJourneyDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={saveJourney}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
