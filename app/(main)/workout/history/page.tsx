"use client";

import { useState } from "react";
import { useWorkout } from "../workout-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Clock, ChevronDown, ChevronUp, Dumbbell } from "lucide-react";
import { toast } from "sonner";

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(mins: number | null) {
  if (!mins) return null;
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function getTotalVolume(exercises: ReturnType<typeof useWorkout>["logs"][number]["workout_log_exercises"]) {
  let v = 0;
  for (const ex of exercises) {
    for (const s of ex.workout_log_sets) {
      if (s.completed && s.weight && s.reps) v += s.weight * s.reps;
    }
  }
  return v;
}

export default function WorkoutHistoryPage() {
  const { logs, loadingLogs, deleteLog } = useWorkout();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this workout log?")) return;
    await deleteLog(id);
    toast.success("Workout deleted");
  };

  // Group by month
  const grouped = logs.reduce<Record<string, typeof logs>>((acc, log) => {
    const key = log.date.slice(0, 7); // YYYY-MM
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  const monthLabel = (key: string) => {
    const [year, month] = key.split("-");
    const d = new Date(parseInt(year), parseInt(month) - 1, 1);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Workout History</h1>

      {loadingLogs ? (
        <div className="text-center text-muted-foreground py-10">Loading…</div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
            <p className="text-muted-foreground">No workouts logged yet.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([month, monthLogs]) => (
            <div key={month} className="space-y-3">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-muted-foreground">{monthLabel(month)}</p>
                <Badge variant="secondary" className="text-xs">{monthLogs.length}</Badge>
              </div>
              <div className="space-y-3">
                {monthLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const volume = getTotalVolume(log.workout_log_exercises);
                  const totalSets = log.workout_log_exercises.reduce((s, e) => s + e.workout_log_sets.length, 0);
                  const completedSets = log.workout_log_exercises.reduce((s, e) => s + e.workout_log_sets.filter((st) => st.completed).length, 0);
                  const duration = formatDuration(log.duration_minutes);

                  return (
                    <Card key={log.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base">{log.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(log.date)}</p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">{log.workout_log_exercises.length} exercises</span>
                              <span className="text-xs text-muted-foreground">{completedSets}/{totalSets} sets</span>
                              {duration && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" /> {duration}
                                </span>
                              )}
                              {volume > 0 && (
                                <span className="text-xs text-muted-foreground">{volume.toLocaleString()} kg volume</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(log.id)}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7"
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {isExpanded && (
                        <CardContent className="pt-0 space-y-3">
                          {log.notes && (
                            <p className="text-sm text-muted-foreground italic border-l-2 pl-3">{log.notes}</p>
                          )}
                          {log.workout_log_exercises
                            .sort((a, b) => a.order_index - b.order_index)
                            .map((ex) => {
                              const exCompleted = ex.workout_log_sets.filter((s) => s.completed).length;
                              return (
                                <div key={ex.id} className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">{ex.exercise_name}</p>
                                    <span className="text-xs text-muted-foreground">{exCompleted}/{ex.workout_log_sets.length} sets</span>
                                  </div>
                                  <div className="divide-y border rounded-md">
                                    {ex.workout_log_sets
                                      .sort((a, b) => a.set_number - b.set_number)
                                      .map((s) => (
                                        <div key={s.id} className={`flex items-center gap-3 px-3 py-1.5 text-xs ${s.completed ? "text-foreground" : "text-muted-foreground"}`}>
                                          <span className="w-10">Set {s.set_number}</span>
                                          <span className="flex-1">{s.weight ? `${s.weight} kg` : "—"}</span>
                                          <span className="flex-1">{s.reps ? `${s.reps} reps` : "—"}</span>
                                          <span className={`w-16 text-right ${s.completed ? "text-green-500" : "text-muted-foreground"}`}>
                                            {s.completed ? "Done" : "Skipped"}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              );
                            })}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
