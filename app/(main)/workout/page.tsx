"use client";

import { useWorkout } from "./workout-context";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  Plus,
  ClipboardList,
  History,
  Flame,
  TrendingUp,
  Clock,
  ChevronRight,
  Play,
  BookOpen,
  Calendar,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

function formatDuration(mins: number | null) {
  if (!mins) return "—";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function getTotalVolume(log: ReturnType<typeof useWorkout>["logs"][number]) {
  let volume = 0;
  for (const ex of log.workout_log_exercises) {
    for (const s of ex.workout_log_sets) {
      if (s.completed && s.weight && s.reps) volume += s.weight * s.reps;
    }
  }
  return volume;
}

function getThisWeekCount(logs: ReturnType<typeof useWorkout>["logs"]) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return logs.filter((l) => new Date(l.date + "T00:00:00") >= monday).length;
}

function getStreak(logs: ReturnType<typeof useWorkout>["logs"]) {
  if (!logs.length) return 0;
  const dates = [...new Set(logs.map((l) => l.date))].sort().reverse();
  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  let check = today;
  for (const d of dates) {
    if (d === check) {
      streak++;
      const dt = new Date(check + "T00:00:00");
      dt.setDate(dt.getDate() - 1);
      check = dt.toISOString().split("T")[0];
    } else break;
  }
  return streak;
}

// ─── Calendar Heatmap ─────────────────────────────────────────────────────────

function CalendarHeatmap({ logs }: { logs: ReturnType<typeof useWorkout>["logs"] }) {
  const { cells, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build a count map: date string → count
    const countMap: Record<string, number> = {};
    for (const log of logs) {
      countMap[log.date] = (countMap[log.date] ?? 0) + 1;
    }

    // Go back 52 weeks + pad to start on Monday
    const end = new Date(today);
    // Pad end to nearest Sunday
    const endDow = end.getDay(); // 0=Sun
    end.setDate(end.getDate() + (6 - endDow)); // move to next Sunday

    const start = new Date(end);
    start.setDate(end.getDate() - 52 * 7 + 1); // 52 weeks back

    const cells: { date: string; count: number }[][] = [];
    let week: { date: string; count: number }[] = [];
    const cursor = new Date(start);

    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    let col = 0;

    while (cursor <= end) {
      const dateStr = cursor.toISOString().split("T")[0];
      const dayOfWeek = cursor.getDay(); // 0=Sun

      if (dayOfWeek === 0 && week.length > 0) {
        cells.push(week);
        week = [];
        col++;
      }

      // Track month labels
      const month = cursor.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: cursor.toLocaleString("en-IN", { month: "short" }), col });
        lastMonth = month;
      }

      week.push({ date: dateStr, count: countMap[dateStr] ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    if (week.length > 0) cells.push(week);

    return { cells, monthLabels };
  }, [logs]);

  function getCellColor(count: number) {
    if (count === 0) return "bg-muted";
    if (count === 1) return "bg-green-300 dark:bg-green-800";
    if (count === 2) return "bg-green-400 dark:bg-green-700";
    return "bg-green-500 dark:bg-green-500";
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Month labels */}
        <div className="flex mb-1" style={{ gap: "2px" }}>
          {cells.map((_, colIdx) => {
            const label = monthLabels.find((m) => m.col === colIdx);
            return (
              <div key={colIdx} className="text-[9px] text-muted-foreground" style={{ width: 11, minWidth: 11 }}>
                {label?.label ?? ""}
              </div>
            );
          })}
        </div>
        {/* Grid: 7 rows (Sun–Sat), N columns (weeks) */}
        <div className="flex" style={{ gap: "2px" }}>
          {cells.map((week, colIdx) => (
            <div key={colIdx} className="flex flex-col" style={{ gap: "2px" }}>
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={`${cell.date}: ${cell.count} workout${cell.count !== 1 ? "s" : ""}`}
                  className={`rounded-[2px] ${getCellColor(cell.count)} ${cell.date === today ? "ring-1 ring-green-400" : ""}`}
                  style={{ width: 11, height: 11 }}
                />
              ))}
              {/* Fill missing days in last column */}
              {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                <div key={`pad-${i}`} style={{ width: 11, height: 11 }} />
              ))}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1 mt-2 justify-end">
          <span className="text-[9px] text-muted-foreground">Less</span>
          {["bg-muted", "bg-green-300 dark:bg-green-800", "bg-green-400 dark:bg-green-700", "bg-green-500"].map((cls, i) => (
            <div key={i} className={`rounded-[2px] ${cls}`} style={{ width: 11, height: 11 }} />
          ))}
          <span className="text-[9px] text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  );
}

// ─── Today's Program Workout ──────────────────────────────────────────────────

function TodayProgramCard({ activeProgram, routines, onStart }: {
  activeProgram: ReturnType<typeof useWorkout>["activeProgram"];
  routines: ReturnType<typeof useWorkout>["routines"];
  onStart: (routineId: string, name: string) => void;
}) {
  if (!activeProgram) return null;

  // JS day: 0=Sun, but our schema: 1=Mon…7=Sun
  const jsDay = new Date().getDay();
  const schemaDow = jsDay === 0 ? 7 : jsDay;

  const todayDay = activeProgram.workout_program_days.find((d) => d.day_of_week === schemaDow);
  const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-green-500" />
            Active Program: {activeProgram.name}
          </CardTitle>
          <Link href="/workout/programs" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
            View <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {todayDay ? (
          todayDay.routine_id ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Today ({DAY_NAMES[schemaDow]})</p>
                <p className="font-medium text-sm">{todayDay.label || todayDay.workout_routines?.name || "Workout"}</p>
                {todayDay.workout_routines && (
                  <p className="text-xs text-muted-foreground">{todayDay.workout_routines.workout_routine_exercises.length} exercises</p>
                )}
              </div>
              <Button
                size="sm"
                className="gap-1.5 bg-green-600 hover:bg-green-700"
                onClick={() => onStart(todayDay.routine_id!, todayDay.label || todayDay.workout_routines?.name || "Workout")}
              >
                <Play className="h-3.5 w-3.5" /> Start
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-lg">😴</span>
              <div>
                <p className="text-xs font-medium">Rest Day</p>
                <p className="text-xs">{todayDay.label || "Recovery & rest"}</p>
              </div>
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">No workout scheduled for today ({DAY_NAMES[schemaDow]})</p>
        )}

        {/* Mini 7-day week view */}
        <div className="flex gap-1 mt-3">
          {[1,2,3,4,5,6,7].map((dow) => {
            const day = activeProgram.workout_program_days.find((d) => d.day_of_week === dow);
            const isToday = dow === schemaDow;
            const hasWorkout = day?.routine_id != null;
            return (
              <div
                key={dow}
                className={`flex-1 rounded text-center py-1 text-[10px] font-medium transition-all ${
                  isToday
                    ? hasWorkout ? "bg-green-500 text-white" : "bg-muted-foreground/20 text-foreground"
                    : hasWorkout ? "bg-green-500/20 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"
                }`}
              >
                {DAY_NAMES[dow]}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkoutOverviewPage() {
  const { logs, routines, activeWorkout, loadingLogs, activeProgram } = useWorkout();
  const router = useRouter();

  const recentLogs = logs.slice(0, 5);
  const thisWeek = getThisWeekCount(logs);
  const streak = getStreak(logs);
  const totalWorkouts = logs.length;

  function handleStartProgram(routineId: string, name: string) {
    router.push(`/workout/log?routine=${routineId}`);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Active workout banner */}
      {activeWorkout && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-green-500/20 flex items-center justify-center">
                <Dumbbell className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">{activeWorkout.name}</p>
                <p className="text-xs text-muted-foreground">{activeWorkout.exercises.length} exercises • In progress</p>
              </div>
            </div>
            <Button size="sm" onClick={() => router.push("/workout/log")} className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Today's program workout */}
      <TodayProgramCard
        activeProgram={activeProgram}
        routines={routines}
        onStart={handleStartProgram}
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{streak}</p>
            <p className="text-xs text-muted-foreground">Day streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{thisWeek}</p>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <Dumbbell className="h-5 w-5 text-violet-500" />
            </div>
            <p className="text-2xl font-bold">{totalWorkouts}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          size="lg"
          className="h-14 gap-2 text-base"
          onClick={() => router.push("/workout/log")}
        >
          <Plus className="h-5 w-5" /> Start Workout
        </Button>
        <Button variant="outline" size="lg" className="h-14 gap-2" asChild>
          <Link href="/workout/routines">
            <ClipboardList className="h-5 w-5" /> Routines
            <Badge variant="secondary" className="ml-auto">{routines.length}</Badge>
          </Link>
        </Button>
        <Button variant="outline" size="lg" className="h-14 gap-2" asChild>
          <Link href="/workout/history">
            <History className="h-5 w-5" /> History
          </Link>
        </Button>
      </div>

      {/* Calendar Heatmap */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Workout Activity
          </CardTitle>
          <span className="text-xs text-muted-foreground">{totalWorkouts} total</span>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <CalendarHeatmap logs={logs} />
          )}
        </CardContent>
      </Card>

      {/* Recent workouts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Workouts</CardTitle>
          <Link href="/workout/history" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
            See all <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {loadingLogs ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>
          ) : recentLogs.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <p className="text-muted-foreground text-sm">No workouts yet. Start your first one!</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentLogs.map((log) => {
                const volume = getTotalVolume(log);
                const exerciseCount = log.workout_log_exercises.length;
                const setCount = log.workout_log_exercises.reduce((s, e) => s + e.workout_log_sets.filter((st) => st.completed).length, 0);
                return (
                  <div key={log.id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{log.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">{formatDate(log.date)}</span>
                        <span className="text-xs text-muted-foreground">{exerciseCount} exercises</span>
                        <span className="text-xs text-muted-foreground">{setCount} sets</span>
                        {log.duration_minutes && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> {formatDuration(log.duration_minutes)}
                          </span>
                        )}
                      </div>
                      {volume > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{volume.toLocaleString()} kg volume</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Routines quick view */}
      {routines.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">My Routines</CardTitle>
            <Link href="/workout/routines" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5">
              Manage <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {routines.slice(0, 4).map((routine) => (
                <div key={routine.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{routine.name}</p>
                    <p className="text-xs text-muted-foreground">{routine.workout_routine_exercises.length} exercises</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-xs"
                    onClick={() => router.push(`/workout/log?routine=${routine.id}`)}
                  >
                    <Play className="h-3.5 w-3.5" /> Start
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
