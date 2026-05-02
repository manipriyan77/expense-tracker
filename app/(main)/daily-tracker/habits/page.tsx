"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Flame,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  useDailyTracker,
  toISODate,
  computeHabitStreak,
  heatmapColor,
  HABIT_CATEGORIES,
  Habit,
  HabitLog,
} from "../daily-tracker-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function Heatmap({
  rangeLogs,
  totalHabits,
  todayStr,
  onSelectDate,
}: {
  rangeLogs: Map<string, Set<string>>;
  totalHabits: number;
  todayStr: string;
  onSelectDate: (date: string) => void;
}) {
  const weeks: { date: string; pct: number; isToday: boolean; isFuture: boolean }[][] = [];
  const today = new Date(todayStr + "T00:00:00");
  const start = new Date(today);
  start.setDate(start.getDate() - 34);
  const dow = start.getDay();
  start.setDate(start.getDate() - ((dow + 6) % 7));

  let week: (typeof weeks)[0] = [];
  const d = new Date(start);
  for (let i = 0; i < 42; i++) {
    const ds = toISODate(d);
    const isFuture = d > today;
    const completed = rangeLogs.get(ds)?.size ?? 0;
    const pct = totalHabits > 0 && !isFuture ? Math.round((completed / totalHabits) * 100) : 0;
    week.push({ date: ds, pct, isToday: ds === todayStr, isFuture });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    d.setDate(d.getDate() + 1);
  }

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
          <div key={i} className="text-center text-[10px] text-muted-foreground">{l}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-0.5">
          {week.map((cell) => (
            <button
              key={cell.date}
              title={cell.isFuture ? cell.date : `${cell.date}: ${cell.pct}%`}
              onClick={() => !cell.isFuture && onSelectDate(cell.date)}
              disabled={cell.isFuture}
              className={`
                h-5 w-full rounded-sm transition-all
                ${cell.isFuture ? "bg-muted/30 cursor-default" : heatmapColor(cell.pct)}
                ${cell.isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                ${!cell.isFuture ? "hover:opacity-80 cursor-pointer" : ""}
              `}
            />
          ))}
        </div>
      ))}
      <div className="flex items-center justify-end gap-1 pt-0.5">
        <span className="text-[10px] text-muted-foreground">Less</span>
        {[0, 25, 50, 75, 100].map((p) => (
          <div key={p} className={`h-3 w-3 rounded-sm ${heatmapColor(p)}`} />
        ))}
        <span className="text-[10px] text-muted-foreground">More</span>
      </div>
    </div>
  );
}

// ─── Note Input ───────────────────────────────────────────────────────────────

function NoteInput({
  defaultValue,
  onSave,
  onCancel,
}: {
  defaultValue: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        className="h-7 text-xs flex-1"
        placeholder="Add a note for today..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(value);
          if (e.key === "Escape") onCancel();
        }}
      />
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => onSave(value)}>
        <Check className="h-3.5 w-3.5 text-green-600" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onCancel}>
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const { habits, rangeLogs, refetchHabits } = useDailyTracker();
  const searchParams = useSearchParams();
  const todayStr = toISODate(new Date());

  const [currentDate, setCurrentDate] = useState(() => {
    const d = searchParams.get("date");
    return d ?? todayStr;
  });
  const [logs, setLogs] = useState<Map<string, HabitLog>>(new Map());
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [habitDialog, setHabitDialog] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState("general");
  const [localHabits, setLocalHabits] = useState<Habit[]>(habits);

  useEffect(() => { setLocalHabits(habits); }, [habits]);

  const fetchLogs = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/daily-tracker/logs?date=${date}`);
      const data: HabitLog[] = await res.json();
      const map = new Map<string, HabitLog>();
      for (const log of data ?? []) map.set(log.habit_id, log);
      setLogs(map);
    } catch {
      toast.error("Failed to load logs");
    }
  }, []);

  useEffect(() => {
    fetchLogs(currentDate);
  }, [currentDate, fetchLogs]);

  const isToday = currentDate === todayStr;

  function changeDate(delta: number) {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const newDate = toISODate(d);
    if (newDate <= todayStr) setCurrentDate(newDate);
  }

  async function toggleHabit(habit: Habit) {
    const existing = logs.get(habit.id);
    const newCompleted = !existing?.completed;
    const newLog: HabitLog = {
      habit_id: habit.id,
      log_date: currentDate,
      completed: newCompleted,
      note: existing?.note ?? "",
    };
    setLogs((prev) => new Map(prev).set(habit.id, newLog));
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

  async function saveHabitNote(habitId: string, note: string) {
    const existing = logs.get(habitId);
    const newLog: HabitLog = {
      habit_id: habitId,
      log_date: currentDate,
      completed: existing?.completed ?? false,
      note,
    };
    setLogs((prev) => new Map(prev).set(habitId, newLog));
    setExpandedNote(null);
    try {
      await fetch("/api/daily-tracker/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLog),
      });
    } catch {
      toast.error("Failed to save note");
    }
  }

  async function addHabit() {
    if (!newHabitTitle.trim()) return;
    try {
      const res = await fetch("/api/daily-tracker/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newHabitTitle.trim(),
          category: newHabitCategory,
          order_index: localHabits.length,
        }),
      });
      if (!res.ok) throw new Error();
      setNewHabitTitle("");
      setNewHabitCategory("general");
      setHabitDialog(false);
      await refetchHabits();
      toast.success("Habit added");
    } catch {
      toast.error("Failed to add habit");
    }
  }

  async function deleteHabit(id: string) {
    setLocalHabits((prev) => prev.filter((h) => h.id !== id));
    try {
      await fetch(`/api/daily-tracker/habits/${id}`, { method: "DELETE" });
      await refetchHabits();
    } catch {
      toast.error("Failed to delete habit");
    }
  }

  async function moveHabit(id: string, dir: "up" | "down") {
    const idx = localHabits.findIndex((h) => h.id === id);
    if ((dir === "up" && idx === 0) || (dir === "down" && idx === localHabits.length - 1)) return;
    const next = [...localHabits];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const updated = next.map((h, i) => ({ ...h, order_index: i }));
    setLocalHabits(updated);
    try {
      await Promise.all([
        fetch(`/api/daily-tracker/habits/${updated[idx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_index: updated[idx].order_index }),
        }),
        fetch(`/api/daily-tracker/habits/${updated[swapIdx].id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_index: updated[swapIdx].order_index }),
        }),
      ]);
    } catch {
      toast.error("Failed to reorder");
    }
  }

  const completedCount = localHabits.filter((h) => logs.get(h.id)?.completed).length;
  const totalHabits = localHabits.length;
  const completionPct = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

  const habitsByCategory = HABIT_CATEGORIES.map((cat) => ({
    ...cat,
    habits: localHabits.filter((h) => (h.category ?? "general") === cat.value),
  })).filter((g) => g.habits.length > 0);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-10">
      {/* ── Date Navigator ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-semibold">
                {formatDate(new Date(currentDate + "T00:00:00"))}
              </p>
              {isToday && (
                <span className="text-xs text-primary font-medium">Today</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => changeDate(1)}
              disabled={isToday}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => setCurrentDate(todayStr)}
            >
              Back to Today
            </Button>
          )}
          {totalHabits > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{completedCount}/{totalHabits} done</span>
                <span className={`font-bold ${completionPct === 100 ? "text-green-500" : "text-primary"}`}>
                  {completionPct}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${completionPct === 100 ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Activity Heatmap ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Activity — Last 6 Weeks</h2>
            <span className="text-xs text-muted-foreground">Click a day to jump</span>
          </div>
          <Heatmap
            rangeLogs={rangeLogs}
            totalHabits={totalHabits}
            todayStr={todayStr}
            onSelectDate={setCurrentDate}
          />
        </CardContent>
      </Card>

      {/* ── Habit Checklist ── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <h2 className="font-semibold text-sm">Habits</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => setHabitDialog(true)}
            >
              <Plus className="h-3.5 w-3.5" />Add
            </Button>
          </div>

          {localHabits.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No habits yet.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 gap-1"
                onClick={() => setHabitDialog(true)}
              >
                <Plus className="h-3.5 w-3.5" />Add your first habit
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {habitsByCategory.map((catGroup) => (
                <div key={catGroup.value}>
                  {habitsByCategory.length > 1 && (
                    <div className={`flex items-center gap-1.5 px-4 py-1.5 ${catGroup.bg}`}>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${catGroup.color}`}>
                        {catGroup.label}
                      </span>
                    </div>
                  )}
                  {catGroup.habits.map((habit) => {
                    const log = logs.get(habit.id);
                    const completed = log?.completed ?? false;
                    const note = log?.note ?? "";
                    const streak = computeHabitStreak(habit.id, rangeLogs, todayStr);
                    const isExpanded = expandedNote === habit.id;
                    const allIdx = localHabits.findIndex((h) => h.id === habit.id);

                    return (
                      <div key={habit.id} className="group border-b last:border-b-0">
                        <div className="flex items-center gap-3 px-4 py-3">
                          <button
                            onClick={() => toggleHabit(habit)}
                            className={`shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                              completed
                                ? "bg-primary border-primary scale-105"
                                : "border-muted-foreground/40 hover:border-primary hover:scale-105"
                            }`}
                          >
                            {completed && <Check className="h-3 w-3 text-primary-foreground" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {habit.title}
                            </span>
                            {note && !isExpanded && (
                              <p className="text-xs text-muted-foreground italic truncate mt-0.5">{note}</p>
                            )}
                          </div>
                          {streak > 1 && (
                            <span className="flex items-center gap-0.5 text-xs font-semibold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                              <Flame className="h-3 w-3" />{streak}
                            </span>
                          )}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground"
                              onClick={() => setExpandedNote(isExpanded ? null : habit.id)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => moveHabit(habit.id, "up")}
                              disabled={allIdx === 0}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => moveHabit(habit.id, "down")}
                              disabled={allIdx === localHabits.length - 1}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => deleteHabit(habit.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-3">
                            <NoteInput
                              defaultValue={note}
                              onSave={(v) => saveHabitNote(habit.id, v)}
                              onCancel={() => setExpandedNote(null)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Habit Dialog ── */}
      <Dialog open={habitDialog} onOpenChange={setHabitDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Habit</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Habit Name</Label>
              <Input
                autoFocus
                placeholder="e.g. Walk 10,000 steps"
                value={newHabitTitle}
                onChange={(e) => setNewHabitTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHabit()}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={newHabitCategory} onValueChange={setNewHabitCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HABIT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setHabitDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={addHabit}>
                Add Habit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
