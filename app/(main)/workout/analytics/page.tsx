"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Flame, Dumbbell, TrendingUp, BarChart3, Target, Clock, Activity } from "lucide-react";
import { useWorkout } from "../workout-context";

interface AnalyticsData {
  weeklyData: { week: string; label: string; workouts: number; volume: number; duration: number }[];
  muscleDistribution: { muscle_group: string; count: number }[];
  topExercises: { name: string; count: number }[];
  streak: number;
  totalWorkouts: number;
}

const MUSCLE_COLORS: Record<string, string> = {
  Chest: "#ef4444",
  Back: "#3b82f6",
  Legs: "#22c55e",
  Shoulders: "#eab308",
  Arms: "#a855f7",
  Core: "#f97316",
  Cardio: "#ec4899",
  Other: "#6b7280",
};

const CHART_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#f97316", "#ec4899", "#6b7280"];

type WeeklyMetric = "workouts" | "volume" | "duration";

// Sets/week recommended ranges for hypertrophy
const MUSCLE_TARGETS: { muscle: string; min: number; max: number; color: string }[] = [
  { muscle: "Chest", min: 10, max: 20, color: "#ef4444" },
  { muscle: "Back", min: 10, max: 20, color: "#3b82f6" },
  { muscle: "Legs", min: 10, max: 20, color: "#22c55e" },
  { muscle: "Shoulders", min: 10, max: 20, color: "#eab308" },
  { muscle: "Arms", min: 6, max: 14, color: "#a855f7" },
  { muscle: "Core", min: 6, max: 14, color: "#f97316" },
];

function WeeklyVolumeTracker({ logs }: { logs: ReturnType<typeof useWorkout>["logs"] }) {
  const weekSets = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const counts: Record<string, number> = {};
    for (const log of logs) {
      if (new Date(log.date + "T00:00:00") < monday) continue;
      for (const ex of log.workout_log_exercises) {
        const completed = ex.workout_log_sets.filter((s) => s.completed).length;
        // We don't have muscle_group directly on log exercises, so we look at exercise name prefix
        // We'll show totals per known muscle in MUSCLE_TARGETS but map all sets
        const name = ex.exercise_name;
        // Try to map by common keywords
        let muscle = "Other";
        if (/chest|bench|fly|pec|push[- ]?up/i.test(name)) muscle = "Chest";
        else if (/back|row|pull|lat|deadlift|chin/i.test(name)) muscle = "Back";
        else if (/leg|squat|lunge|hamstring|quad|calf|hip|glute|rdl/i.test(name)) muscle = "Legs";
        else if (/shoulder|press|delt|raise|military/i.test(name)) muscle = "Shoulders";
        else if (/curl|tricep|bicep|arm|extension|dip/i.test(name)) muscle = "Arms";
        else if (/core|abs|plank|crunch|oblique|sit[- ]?up/i.test(name)) muscle = "Core";
        counts[muscle] = (counts[muscle] ?? 0) + completed;
      }
    }
    return counts;
  }, [logs]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" /> Weekly Volume Tracker
        </CardTitle>
        <p className="text-xs text-muted-foreground">Sets this week vs recommended hypertrophy range (10–20/muscle)</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {MUSCLE_TARGETS.map(({ muscle, min, max, color }) => {
          const sets = weekSets[muscle] ?? 0;
          const pct = Math.min(sets / max, 1);
          const status = sets >= min ? (sets <= max ? "on-track" : "above") : "below";
          return (
            <div key={muscle} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium w-24">{muscle}</span>
                <span className={`font-semibold ${status === "on-track" ? "text-green-500" : status === "above" ? "text-blue-500" : "text-muted-foreground"}`}>
                  {sets} sets
                </span>
                <span className="text-muted-foreground w-16 text-right">{min}–{max} target</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct * 100}%`,
                    background: status === "below" ? "#9ca3af" : color,
                  }}
                />
              </div>
            </div>
          );
        })}
        <div className="flex items-center gap-4 pt-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-gray-400" /> Below target</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" /> On track</span>
          <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-500" /> Above target</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WorkoutAnalyticsPage() {
  const { logs } = useWorkout();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyMetric, setWeeklyMetric] = useState<WeeklyMetric>("workouts");

  useEffect(() => {
    fetch("/api/workout/analytics")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading analytics…</div>;
  if (!data) return <div className="p-6 text-center text-muted-foreground">No data available.</div>;

  const thisWeekWorkouts = data.weeklyData.length > 0 ? data.weeklyData[data.weeklyData.length - 1]?.workouts ?? 0 : 0;
  const avgVolume = data.weeklyData.length > 0
    ? Math.round(data.weeklyData.reduce((s, w) => s + w.volume, 0) / data.weeklyData.length)
    : 0;
  const avgDuration = data.weeklyData.length > 0
    ? Math.round(data.weeklyData.reduce((s, w) => s + w.duration, 0) / data.weeklyData.filter((w) => w.duration > 0).length || 0)
    : 0;

  const metricLabels: Record<WeeklyMetric, string> = {
    workouts: "Workouts",
    volume: "Volume (kg)",
    duration: "Duration (min)",
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <h1 className="text-xl font-bold">Workout Analytics</h1>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{data.streak}</p>
            <p className="text-xs text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Dumbbell className="h-5 w-5 text-violet-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{data.totalWorkouts}</p>
            <p className="text-xs text-muted-foreground">Total Workouts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{thisWeekWorkouts}</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{avgDuration > 0 ? `${avgDuration}m` : "—"}</p>
            <p className="text-xs text-muted-foreground">Avg Duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly trend */}
      {data.weeklyData.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Weekly Trend
              </CardTitle>
              <div className="flex gap-1">
                {(["workouts", "volume", "duration"] as WeeklyMetric[]).map((m) => (
                  <button key={m} type="button" onClick={() => setWeeklyMetric(m)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors capitalize ${weeklyMetric === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [v, metricLabels[weeklyMetric]]}
                />
                <Bar dataKey={weeklyMetric} fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Weekly volume line */}
      {data.weeklyData.length > 1 && weeklyMetric !== "volume" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" /> Volume Trend (last 90 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data.weeklyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${Number(v).toLocaleString()} kg`, "Volume"]}
                />
                <Line type="monotone" dataKey="volume" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Weekly volume tracker */}
      <WeeklyVolumeTracker logs={logs} />

      <div className="grid md:grid-cols-2 gap-4">
        {/* Muscle distribution */}
        {data.muscleDistribution.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-red-500" /> Muscle Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data.muscleDistribution} dataKey="count" nameKey="muscle_group"
                    cx="50%" cy="50%" outerRadius={70} label={(props) => {
                      const pct = props.percent ?? 0;
                      return pct > 0.06 ? `${props.name} ${Math.round(pct * 100)}%` : "";
                    }} labelLine={false} fontSize={10}>
                    {data.muscleDistribution.map((entry, i) => (
                      <Cell key={entry.muscle_group} fill={MUSCLE_COLORS[entry.muscle_group] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {data.muscleDistribution.map((m, i) => (
                  <div key={m.muscle_group} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: MUSCLE_COLORS[m.muscle_group] ?? CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs text-muted-foreground">{m.muscle_group}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top exercises */}
        {data.topExercises.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-violet-500" /> Most Trained
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {data.topExercises.map((ex, i) => (
                  <div key={ex.name} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs text-muted-foreground w-4 text-center font-medium">{i + 1}</span>
                    <span className="text-sm flex-1">{ex.name}</span>
                    <Badge variant="secondary" className="text-xs">{ex.count}×</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {data.weeklyData.length === 0 && data.muscleDistribution.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center space-y-2">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
            <p className="text-muted-foreground">Log some workouts to see your analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
