"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWorkout } from "../../workout-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Trophy, Dumbbell, TrendingUp, Hash } from "lucide-react";
import { ExerciseImage } from "@/components/workout/ExerciseImage";

interface SessionData {
  id: string;
  exercise_name: string;
  totalVolume: number;
  estimated1RM: number;
  workout_log_sets: { set_number: number; weight: number; reps: number; completed: boolean }[];
  workout_logs: { id: string; date: string; name: string };
}

type ChartView = "volume" | "e1rm" | "max_weight";

const PR_LABELS: Record<string, string> = {
  heaviest_weight: "Heaviest Weight",
  max_reps: "Max Reps",
  estimated_1rm: "Estimated 1RM",
  max_volume_set: "Best Set Volume",
};

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { exercises, personalRecords } = useWorkout();
  const [history, setHistory] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<ChartView>("e1rm");

  const exercise = exercises.find((e) => e.id === id);
  const prs = personalRecords.filter((p) => p.exercise_id === id);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/workout/exercise-history?exercise_id=${id}&limit=20`)
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data.reverse() : []))
      .finally(() => setLoading(false));
  }, [id]);

  const chartData = history.map((session) => {
    const completedSets = session.workout_log_sets.filter((s) => s.completed);
    const maxWeight = completedSets.reduce((max, s) => Math.max(max, s.weight ?? 0), 0);
    return {
      date: new Date(session.workout_logs.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      volume: session.totalVolume,
      e1rm: session.estimated1RM,
      max_weight: maxWeight,
    };
  });

  const chartKey = chartView;
  const chartLabel = chartView === "volume" ? "Volume (kg)" : chartView === "e1rm" ? "E1RM (kg)" : "Max Weight (kg)";

  if (!exercise) return <div className="p-6 text-muted-foreground">Exercise not found.</div>;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      {/* Header with image */}
      <div className="space-y-3">
        <ExerciseImage name={exercise.name} muscleGroup={exercise.muscle_group} variant="detail" />
        <div>
          <h1 className="text-xl font-bold">{exercise.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{exercise.muscle_group}</Badge>
            <Badge variant="outline">{exercise.equipment}</Badge>
            {exercise.is_custom && <Badge variant="secondary">Custom</Badge>}
          </div>
        </div>
      </div>

      {/* Personal Records */}
      {prs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" /> Personal Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {prs.map((pr) => (
                <div key={pr.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{PR_LABELS[pr.record_type]}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(pr.achieved_at + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">
                      {pr.record_type === "max_reps" ? `${pr.value} reps` : `${pr.value} kg`}
                    </p>
                    {pr.reps && pr.record_type !== "max_reps" && (
                      <p className="text-xs text-muted-foreground">@ {pr.reps} reps</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Chart */}
      {history.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" /> Progress
              </CardTitle>
              <div className="flex gap-1">
                {(["e1rm", "volume", "max_weight"] as ChartView[]).map((v) => (
                  <button key={v} type="button" onClick={() => setChartView(v)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${chartView === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                    {v === "e1rm" ? "E1RM" : v === "volume" ? "Volume" : "Max Wt"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={40} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v} kg`, chartLabel]}
                />
                <Line type="monotone" dataKey={chartKey} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Session History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" /> Session History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-6 text-sm">Loading…</p>
          ) : history.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Dumbbell className="h-10 w-10 text-muted-foreground mx-auto opacity-30" />
              <p className="text-sm text-muted-foreground">No history yet for this exercise</p>
            </div>
          ) : (
            <div className="divide-y">
              {[...history].reverse().map((session) => {
                const completedSets = session.workout_log_sets.filter((s) => s.completed);
                const totalVol = session.totalVolume;
                return (
                  <div key={session.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{session.workout_logs.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.workout_logs.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                      </div>
                      {totalVol > 0 && <p className="text-xs text-muted-foreground">{totalVol.toLocaleString()} kg vol</p>}
                    </div>
                    <div className="space-y-0.5">
                      {completedSets.sort((a, b) => a.set_number - b.set_number).map((s, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="w-10">Set {s.set_number}</span>
                          <span>{s.weight ? `${s.weight} kg` : "—"} × {s.reps ?? "—"} reps</span>
                          {session.estimated1RM > 0 && i === 0 && (
                            <span className="ml-auto text-blue-500">e1RM: {session.estimated1RM} kg</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
