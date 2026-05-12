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
  Archive,
  RotateCcw,
  Sparkles,
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

// ─── Habit templates ──────────────────────────────────────────────────────────

const HABIT_TEMPLATES: { title: string; category: string; frequency: string }[] = [
  { title: "Morning walk / run", category: "health", frequency: "daily" },
  { title: "Drink 2L water", category: "health", frequency: "daily" },
  { title: "No junk food", category: "health", frequency: "daily" },
  { title: "Sleep by 11 pm", category: "health", frequency: "daily" },
  { title: "Meditate 10 min", category: "spirituality", frequency: "daily" },
  { title: "Read 20 pages", category: "personal", frequency: "daily" },
  { title: "Track expenses", category: "finance", frequency: "daily" },
  { title: "Workout", category: "health", frequency: "custom" },
  { title: "Journaling", category: "personal", frequency: "daily" },
  { title: "No social media before 9 am", category: "personal", frequency: "daily" },
  { title: "Deep work block (2h)", category: "work", frequency: "weekdays" },
  { title: "Review tasks & plan tomorrow", category: "work", frequency: "weekdays" },
  { title: "Gratitude practice", category: "spirituality", frequency: "daily" },
  { title: "Cold shower", category: "health", frequency: "daily" },
  { title: "Learn something new (30 min)", category: "personal", frequency: "daily" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Every day" },
  { value: "weekdays", label: "Weekdays only (Mon–Fri)" },
  { value: "weekly", label: "Once a week" },
  { value: "custom", label: "Custom days" },
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Check if a habit should be logged on a given date based on its frequency
function isHabitScheduledOn(habit: Habit, dateStr: string): boolean {
  if (!habit.frequency || habit.frequency === "daily") return true;
  const d = new Date(dateStr + "T00:00:00");
  const dow = (d.getDay() + 6) % 7; // 0=Mon … 6=Sun
  if (habit.frequency === "weekdays") return dow <= 4;
  if (habit.frequency === "weekly") return true; // show every day, user picks their day
  if (habit.frequency === "custom" && habit.frequency_days?.length) {
    return habit.frequency_days.includes(dow);
  }
  return true;
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function Heatmap({
  rangeLogs,
  totalHabits,
  todayStr,
  onSelectDate,
}: Readonly<{
  rangeLogs: Map<string, Set<string>>;
  totalHabits: number;
  todayStr: string;
  onSelectDate: (date: string) => void;
}>) {
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
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((l) => (
          <div key={l} className="text-center text-[10px] text-muted-foreground">{l[0]}</div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]?.date} className="grid grid-cols-7 gap-0.5">
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
                ${cell.isFuture ? "" : "hover:opacity-80 cursor-pointer"}
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

// ─── Note Textarea ────────────────────────────────────────────────────────────

function NoteInput({
  defaultValue,
  onSave,
  onCancel,
}: Readonly<{
  defaultValue: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}>) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="space-y-1.5">
      <textarea
        autoFocus
        className="w-full text-xs bg-background border border-border rounded-md p-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-16 placeholder:text-muted-foreground"
        placeholder="Add a note for today…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.metaKey) onSave(value);
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={onCancel}>
          <X className="h-3 w-3 mr-1" />Cancel
        </Button>
        <Button size="sm" className="h-6 text-xs flex-1" onClick={() => onSave(value)}>
          <Check className="h-3 w-3 mr-1 text-green-200" />Save
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">⌘ + Enter to save</p>
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
  const [templatesDialog, setTemplatesDialog] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Add habit form state
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState("general");
  const [newHabitFrequency, setNewHabitFrequency] = useState("daily");
  const [newHabitDays, setNewHabitDays] = useState<number[]>([]);

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

  async function addHabit(title: string, category: string, frequency: string, frequencyDays: number[]) {
    if (!title.trim()) return;
    try {
      const res = await fetch("/api/daily-tracker/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          order_index: localHabits.length,
          frequency,
          frequency_days: frequency === "custom" ? frequencyDays : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to add habit");
      await refetchHabits();
      toast.success("Habit added");
    } catch {
      toast.error("Failed to add habit");
    }
  }

  async function submitAddHabit() {
    await addHabit(newHabitTitle, newHabitCategory, newHabitFrequency, newHabitDays);
    setNewHabitTitle("");
    setNewHabitCategory("general");
    setNewHabitFrequency("daily");
    setNewHabitDays([]);
    setHabitDialog(false);
  }

  async function addFromTemplate(t: { title: string; category: string; frequency: string }) {
    await addHabit(t.title, t.category, t.frequency, []);
  }

  async function archiveHabit(id: string) {
    setLocalHabits((prev) => prev.map((h) => h.id === id ? { ...h, is_archived: true } : h));
    try {
      await fetch(`/api/daily-tracker/habits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: true }),
      });
      await refetchHabits();
      toast.success("Habit archived");
    } catch {
      toast.error("Failed to archive");
    }
  }

  async function unarchiveHabit(id: string) {
    try {
      await fetch(`/api/daily-tracker/habits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: false }),
      });
      await refetchHabits();
      toast.success("Habit restored");
    } catch {
      toast.error("Failed to restore");
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
    const activeList = localHabits.filter((h) => !(h as Habit & { is_archived?: boolean }).is_archived);
    const idx = activeList.findIndex((h) => h.id === id);
    if ((dir === "up" && idx === 0) || (dir === "down" && idx === activeList.length - 1)) return;
    const next = [...activeList];
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

  function toggleCustomDay(dow: number) {
    setNewHabitDays((prev) =>
      prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]
    );
  }

  // Derived
  const activeHabits = localHabits.filter((h) => !(h as Habit & { is_archived?: boolean }).is_archived);
  const archivedHabits = localHabits.filter((h) => (h as Habit & { is_archived?: boolean }).is_archived);
  const scheduledHabits = activeHabits.filter((h) => isHabitScheduledOn(h, currentDate));
  const filteredHabits = activeCategory === "all"
    ? scheduledHabits
    : scheduledHabits.filter((h) => (h.category ?? "general") === activeCategory);

  const completedCount = scheduledHabits.filter((h) => logs.get(h.id)?.completed).length;
  const totalHabits = scheduledHabits.length;
  const completionPct = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

  const habitsByCategory = HABIT_CATEGORIES.map((cat) => ({
    ...cat,
    habits: filteredHabits.filter((h) => (h.category ?? "general") === cat.value),
  })).filter((g) => g.habits.length > 0);

  const usedCategories = Array.from(new Set(scheduledHabits.map((h) => h.category ?? "general")));

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
            totalHabits={activeHabits.length}
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
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setTemplatesDialog(true)}
              >
                <Sparkles className="h-3.5 w-3.5" />Templates
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setHabitDialog(true)}
              >
                <Plus className="h-3.5 w-3.5" />Add
              </Button>
            </div>
          </div>

          {/* Category filter pills */}
          {usedCategories.length > 1 && (
            <div className="flex gap-1.5 px-4 py-2 border-b overflow-x-auto">
              <button
                onClick={() => setActiveCategory("all")}
                className={`shrink-0 text-xs px-3 py-1 rounded-full transition-colors ${
                  activeCategory === "all"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                All
              </button>
              {HABIT_CATEGORIES.filter((c) => usedCategories.includes(c.value)).map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`shrink-0 text-xs px-3 py-1 rounded-full transition-colors ${
                    activeCategory === cat.value
                      ? `bg-primary text-primary-foreground font-medium`
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {activeHabits.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No habits yet.</p>
              <div className="flex gap-2 justify-center mt-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setTemplatesDialog(true)}>
                  <Sparkles className="h-3.5 w-3.5" />Start from templates
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setHabitDialog(true)}>
                  <Plus className="h-3.5 w-3.5" />Add your own
                </Button>
              </div>
            </div>
          )}
          {activeHabits.length > 0 && filteredHabits.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No habits in this category today.</p>
            </div>
          )}
          {activeHabits.length > 0 && filteredHabits.length > 0 && (
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
                    const allIdx = activeHabits.findIndex((h) => h.id === habit.id);
                    const freqLabel = habit.frequency && habit.frequency !== "daily"
                      ? FREQUENCY_OPTIONS.find((f) => f.value === habit.frequency)?.label
                      : null;

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
                            {freqLabel && (
                              <span className="ml-2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                {freqLabel}
                              </span>
                            )}
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
                              title="Add note"
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
                              disabled={allIdx === activeHabits.length - 1}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-orange-500"
                              title="Archive habit"
                              onClick={() => archiveHabit(habit.id)}
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              title="Delete habit"
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

          {/* Archived habits section */}
          {archivedHabits.length > 0 && (
            <div className="border-t">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted/20 transition-colors"
              >
                <Archive className="h-3.5 w-3.5" />
                Archived ({archivedHabits.length})
                <ChevronRight className={`h-3 w-3 ml-auto transition-transform ${showArchived ? "rotate-90" : ""}`} />
              </button>
              {showArchived && archivedHabits.map((habit) => (
                <div key={habit.id} className="flex items-center gap-3 px-4 py-2.5 opacity-50 border-t last:border-b">
                  <Archive className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground flex-1 line-through">{habit.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Restore habit"
                    onClick={() => unarchiveHabit(habit.id)}
                  >
                    <RotateCcw className="h-3 w-3" />
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
                onKeyDown={(e) => e.key === "Enter" && submitAddHabit()}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
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
              <div className="space-y-1">
                <Label className="text-xs">Frequency</Label>
                <Select value={newHabitFrequency} onValueChange={setNewHabitFrequency}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {newHabitFrequency === "custom" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Active days</Label>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={label}
                      onClick={() => toggleCustomDay(i)}
                      className={`flex-1 text-xs py-1.5 rounded-md border transition-colors ${
                        newHabitDays.includes(i)
                          ? "bg-primary text-primary-foreground border-primary font-medium"
                          : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                      }`}
                    >
                      {label.slice(0, 2)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setHabitDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={submitAddHabit} disabled={!newHabitTitle.trim()}>
                Add Habit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Templates Dialog ── */}
      <Dialog open={templatesDialog} onOpenChange={setTemplatesDialog}>
        <DialogContent className="max-w-sm max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Popular Habits
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">Tap any habit to add it instantly.</p>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {HABIT_CATEGORIES.map((cat) => {
              const catTemplates = HABIT_TEMPLATES.filter((t) => t.category === cat.value);
              if (catTemplates.length === 0) return null;
              return (
                <div key={cat.value}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider px-1 py-1.5 ${cat.color}`}>
                    {cat.label}
                  </p>
                  {catTemplates.map((t) => {
                    const alreadyAdded = localHabits.some((h) => h.title.toLowerCase() === t.title.toLowerCase());
                    return (
                      <button
                        key={t.title}
                        disabled={alreadyAdded}
                        onClick={async () => {
                          await addFromTemplate(t);
                          toast.success(`"${t.title}" added`);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2 ${
                          alreadyAdded
                            ? "opacity-40 cursor-not-allowed bg-muted/30"
                            : "hover:bg-muted/60 cursor-pointer"
                        }`}
                      >
                        <span>{t.title}</span>
                        {alreadyAdded
                          ? <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          : <Plus className="h-3.5 w-3.5 text-primary shrink-0 opacity-0 group-hover:opacity-100" />}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <Button variant="outline" className="mt-2" onClick={() => setTemplatesDialog(false)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
