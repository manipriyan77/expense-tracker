"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
  Sparkles,
  Star,
  Flame,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { toast, Toaster } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Journey {
  id: string;
  name: string;
  start_date: string;
  total_days: number;
}

interface LifeGoal {
  id: string;
  journey_id: string;
  title: string;
  present_value: string;
  target_value: string;
  order_index: number;
  category: string;
}

interface Habit {
  id: string;
  title: string;
  order_index: number;
  category: string;
}

interface HabitLog {
  habit_id: string;
  log_date: string;
  completed: boolean;
  note: string;
}

interface RangeLog {
  habit_id: string;
  log_date: string;
  completed: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HABIT_CATEGORIES = [
  { value: "health", label: "Health", color: "text-green-500", bg: "bg-green-500/10" },
  { value: "finance", label: "Finance", color: "text-blue-500", bg: "bg-blue-500/10" },
  { value: "work", label: "Work", color: "text-violet-500", bg: "bg-violet-500/10" },
  { value: "personal", label: "Personal", color: "text-orange-500", bg: "bg-orange-500/10" },
  { value: "spirituality", label: "Spirituality", color: "text-yellow-600", bg: "bg-yellow-500/10" },
  { value: "general", label: "General", color: "text-muted-foreground", bg: "bg-muted/50" },
];

const MOODS = ["🔥", "💪", "😊", "😐", "😔", "😴"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function getDayNumber(startDate: string, currentDate: string) {
  const start = new Date(startDate + "T00:00:00");
  const current = new Date(currentDate + "T00:00:00");
  return Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getCategoryMeta(category: string) {
  return HABIT_CATEGORIES.find((c) => c.value === category) ?? HABIT_CATEGORIES[5];
}

// Parse numeric value from strings like "1.4 lakhs", "56 kg", "5,99,688", "₹26,000"
function parseNumeric(val: string): number | null {
  const lower = val.toLowerCase().replace(/[₹,\s]/g, "");
  const lakhMatch = lower.match(/^([\d.]+)\s*lakh/);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;
  const kMatch = lower.match(/^([\d.]+)k$/);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;
  const num = parseFloat(lower.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? null : num;
}

function goalProgress(present: string, target: string): { pct: number; direction: "up" | "down" | null } | null {
  const p = parseNumeric(present);
  const t = parseNumeric(target);
  if (p === null || t === null || t === 0) return null;
  const direction = t >= p ? "up" : "down";
  if (direction === "up") {
    return { pct: Math.min(100, Math.round((p / t) * 100)), direction };
  } else {
    // reduction goal (e.g. weight, debt): 0 is target, p is present, need to go down
    // pct = how much already reduced from some "baseline" — approximate with start as p if no history
    // just show inverse progress toward 0
    const pct = t === 0 ? Math.min(100, Math.round(((1 - p / (p + t)) * 100))) : 100 - Math.min(100, Math.round((p / (p > t ? p : t)) * 100));
    return { pct: Math.max(0, pct), direction };
  }
}

// ─── Streak helpers ────────────────────────────────────────────────────────────

// rangeLogs: date → Set<habit_id> (completed)
function computeHabitStreak(habitId: string, rangeLogs: Map<string, Set<string>>, todayStr: string): number {
  let streak = 0;
  const d = new Date(todayStr + "T00:00:00");
  for (let i = 0; i < 60; i++) {
    const ds = toISODate(d);
    if (!rangeLogs.get(ds)?.has(habitId)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function computeOverallStreak(
  rangeLogs: Map<string, Set<string>>,
  totalHabits: number,
  todayStr: string,
): number {
  if (totalHabits === 0) return 0;
  let streak = 0;
  const d = new Date(todayStr + "T00:00:00");
  for (let i = 0; i < 60; i++) {
    const ds = toISODate(d);
    const completed = rangeLogs.get(ds)?.size ?? 0;
    if (completed / totalHabits < 0.5) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function heatmapColor(pct: number): string {
  if (pct === 0) return "bg-muted";
  if (pct < 40) return "bg-orange-200 dark:bg-orange-900/50";
  if (pct < 70) return "bg-primary/30";
  if (pct < 100) return "bg-primary/60";
  return "bg-primary";
}

// ─── Setup Screen ─────────────────────────────────────────────────────────────

function JourneySetup({ onCreated }: { onCreated: (j: Journey) => void }) {
  const [name, setName] = useState("Building the life I dream of");
  const [startDate, setStartDate] = useState(() => toISODate(new Date()));
  const [totalDays, setTotalDays] = useState(249);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !startDate || !totalDays) return;
    setLoading(true);
    try {
      const res = await fetch("/api/daily-tracker/journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), start_date: startDate, total_days: totalDays }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onCreated(data);
    } catch {
      toast.error("Failed to create journey");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-5xl">✨</div>
            <h1 className="text-2xl font-bold">Start Your Journey</h1>
            <p className="text-muted-foreground text-sm">Define your challenge and begin tracking daily</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Journey Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Building the life I dream of" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Total Days</Label>
                <Input type="number" value={totalDays} onChange={(e) => setTotalDays(Number(e.target.value))} min={1} />
              </div>
            </div>
          </div>
          <Button className="w-full" onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Begin Journey"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
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

  // Start from 34 days ago, align to Monday
  const start = new Date(today);
  start.setDate(start.getDate() - 34);
  // Go back to the nearest Monday
  const dow = start.getDay();
  start.setDate(start.getDate() - ((dow + 6) % 7));

  let week: typeof weeks[0] = [];
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

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {dayLabels.map((l, i) => (
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

// ─── Week Summary Bar ─────────────────────────────────────────────────────────

function WeekSummary({
  rangeLogs,
  totalHabits,
  todayStr,
  currentDate,
  onSelectDate,
}: {
  rangeLogs: Map<string, Set<string>>;
  totalHabits: number;
  todayStr: string;
  currentDate: string;
  onSelectDate: (date: string) => void;
}) {
  const days: { date: string; label: string; pct: number; isToday: boolean; isFuture: boolean; isSelected: boolean }[] = [];
  const today = new Date(todayStr + "T00:00:00");
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const ds = toISODate(d);
    const isFuture = d > today;
    const completed = rangeLogs.get(ds)?.size ?? 0;
    const pct = totalHabits > 0 && !isFuture ? Math.round((completed / totalHabits) * 100) : 0;
    days.push({
      date: ds,
      label: d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2),
      pct,
      isToday: ds === todayStr,
      isFuture,
      isSelected: ds === currentDate,
    });
  }

  const weekTotal = days.filter((d) => !d.isFuture).reduce((s, d) => s + d.pct, 0);
  const weekDays = days.filter((d) => !d.isFuture).length;
  const weekAvg = weekDays > 0 ? Math.round(weekTotal / weekDays) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">This Week</span>
        <span className="text-xs text-muted-foreground">{weekAvg}% avg completion</span>
      </div>
      <div className="flex gap-1.5 justify-between">
        {days.map((d) => (
          <button
            key={d.date}
            onClick={() => !d.isFuture && onSelectDate(d.date)}
            disabled={d.isFuture}
            className="flex flex-col items-center gap-1 flex-1 min-w-0"
          >
            <span className={`text-[10px] ${d.isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>{d.label}</span>
            <div
              className={`
                w-full h-8 rounded flex items-end justify-center pb-0.5 transition-all relative overflow-hidden
                ${d.isFuture ? "bg-muted/30" : d.isSelected ? "ring-2 ring-primary" : "hover:opacity-80 cursor-pointer"}
                ${!d.isFuture ? "bg-muted" : ""}
              `}
            >
              {!d.isFuture && (
                <div
                  className="absolute bottom-0 left-0 right-0 bg-primary/60 transition-all"
                  style={{ height: `${d.pct}%` }}
                />
              )}
              {d.pct === 100 && <Check className="h-3 w-3 text-primary-foreground relative z-10" />}
            </div>
            <span className={`text-[10px] ${d.isFuture ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
              {d.isFuture ? "—" : `${d.pct}%`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Goal Row with Progress Bar ───────────────────────────────────────────────

function GoalRow({
  goal,
  onEditField,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  goal: LifeGoal;
  onEditField: (goal: LifeGoal, field: "present_value" | "target_value") => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const progress = goalProgress(goal.present_value, goal.target_value);

  return (
    <tr className="border-b last:border-b-0 group hover:bg-muted/20 transition-colors">
      <td className="px-4 py-2.5">
        <div className="space-y-1">
          <span className="text-sm font-medium text-foreground">{goal.title}</span>
          {progress && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progress.direction === "up" ? "bg-primary" : "bg-orange-500"}`}
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{progress.pct}%</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5">
        <button
          onClick={() => onEditField(goal, "present_value")}
          className="text-xs font-medium text-foreground hover:text-primary hover:underline text-left transition-colors"
        >
          {goal.present_value || <span className="text-muted-foreground italic">add</span>}
        </button>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-1">
          {progress && (
            progress.direction === "up"
              ? <TrendingUp className="h-3 w-3 text-green-500 shrink-0" />
              : <TrendingDown className="h-3 w-3 text-orange-500 shrink-0" />
          )}
          <button
            onClick={() => onEditField(goal, "target_value")}
            className="text-xs font-medium text-primary hover:underline text-left"
          >
            {goal.target_value || <span className="text-muted-foreground italic">add</span>}
          </button>
        </div>
      </td>
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onMoveUp(goal.id)} disabled={isFirst}>
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onMoveDown(goal.id)} disabled={isLast}>
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => onDelete(goal.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Inline field editor ──────────────────────────────────────────────────────

function InlineEditor({
  value,
  onSave,
  onCancel,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
  placeholder?: string;
}) {
  const [v, setV] = useState(value);
  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        className="h-6 text-xs px-1.5 w-28"
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(v);
          if (e.key === "Escape") onCancel();
        }}
      />
      <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => onSave(v)}>
        <Check className="h-3 w-3 text-green-600" />
      </Button>
      <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={onCancel}>
        <X className="h-3 w-3 text-muted-foreground" />
      </Button>
    </div>
  );
}

// ─── Note Input ───────────────────────────────────────────────────────────────

function NoteInput({ defaultValue, onSave, onCancel }: { defaultValue: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        className="h-7 text-xs flex-1"
        placeholder="Add a note for today..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(value); if (e.key === "Escape") onCancel(); }}
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

export default function DailyTrackerPage() {
  const todayStr = toISODate(new Date());

  const [journey, setJourney] = useState<Journey | null | undefined>(undefined);
  const [lifeGoals, setLifeGoals] = useState<LifeGoal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Map<string, HabitLog>>(new Map());
  const [rangeLogs, setRangeLogs] = useState<Map<string, Set<string>>>(new Map());
  const [reflectionText, setReflectionText] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [currentDate, setCurrentDate] = useState(todayStr);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [habitDialog, setHabitDialog] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState("general");
  const [goalDialog, setGoalDialog] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalPresent, setNewGoalPresent] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [journeyDialog, setJourneyDialog] = useState(false);
  const [editJourneyName, setEditJourneyName] = useState("");
  const [editJourneyDays, setEditJourneyDays] = useState(249);

  // Inline goal editing
  const [editingGoal, setEditingGoal] = useState<{ id: string; field: "present_value" | "target_value" } | null>(null);

  // Habit notes
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const reflectionTimer = useRef<NodeJS.Timeout | null>(null);

  // ─── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchJourney();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchJourney() {
    try {
      const res = await fetch("/api/daily-tracker/journey");
      const data = await res.json();
      setJourney(data ?? null);
      if (data) {
        await Promise.all([fetchLifeGoals(data.id), fetchHabits(), fetchRangeLogs()]);
      }
    } catch {
      setJourney(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRangeLogs() {
    const to = todayStr;
    const from = toISODate(new Date(new Date(todayStr + "T00:00:00").getTime() - 41 * 86400000));
    const res = await fetch(`/api/daily-tracker/logs/range?from=${from}&to=${to}`);
    const data: RangeLog[] = await res.json();
    const map = new Map<string, Set<string>>();
    for (const log of data ?? []) {
      if (!log.completed) continue;
      if (!map.has(log.log_date)) map.set(log.log_date, new Set());
      map.get(log.log_date)!.add(log.habit_id);
    }
    setRangeLogs(map);
  }

  const fetchLogsAndReflection = useCallback(async (date: string) => {
    const [logsRes, reflRes] = await Promise.all([
      fetch(`/api/daily-tracker/logs?date=${date}`),
      fetch(`/api/daily-tracker/reflections?date=${date}`),
    ]);
    const logsData: HabitLog[] = await logsRes.json();
    const reflData = await reflRes.json();
    const map = new Map<string, HabitLog>();
    for (const log of logsData ?? []) map.set(log.habit_id, log);
    setLogs(map);
    setReflectionText(reflData?.note ?? "");
    setSelectedMood(reflData?.mood ?? "");
  }, []);

  useEffect(() => {
    if (journey) fetchLogsAndReflection(currentDate);
  }, [currentDate, journey, fetchLogsAndReflection]);

  async function fetchLifeGoals(journeyId: string) {
    const res = await fetch(`/api/daily-tracker/life-goals?journey_id=${journeyId}`);
    setLifeGoals((await res.json()) ?? []);
  }

  async function fetchHabits() {
    const res = await fetch("/api/daily-tracker/habits");
    setHabits((await res.json()) ?? []);
  }

  // ─── Date navigation ───────────────────────────────────────────────────────

  function changeDate(delta: number) {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setCurrentDate(toISODate(d));
  }

  // ─── Habits ────────────────────────────────────────────────────────────────

  async function toggleHabit(habit: Habit) {
    const existing = logs.get(habit.id);
    const newCompleted = !existing?.completed;
    const newLog: HabitLog = { habit_id: habit.id, log_date: currentDate, completed: newCompleted, note: existing?.note ?? "" };
    setLogs((prev) => new Map(prev).set(habit.id, newLog));

    // Update rangeLogs optimistically
    setRangeLogs((prev) => {
      const next = new Map(prev);
      const day = next.get(currentDate) ?? new Set<string>();
      const updated = new Set(day);
      newCompleted ? updated.add(habit.id) : updated.delete(habit.id);
      next.set(currentDate, updated);
      return next;
    });

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
    const newLog: HabitLog = { habit_id: habitId, log_date: currentDate, completed: existing?.completed ?? false, note };
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
        body: JSON.stringify({ title: newHabitTitle.trim(), category: newHabitCategory, order_index: habits.length }),
      });
      const data = await res.json();
      setHabits((prev) => [...prev, data]);
      setNewHabitTitle(""); setNewHabitCategory("general");
      setHabitDialog(false);
      toast.success("Task added");
    } catch {
      toast.error("Failed to add task");
    }
  }

  async function deleteHabit(id: string) {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    await fetch(`/api/daily-tracker/habits/${id}`, { method: "DELETE" });
  }

  async function moveHabit(id: string, dir: "up" | "down") {
    const idx = habits.findIndex((h) => h.id === id);
    if ((dir === "up" && idx === 0) || (dir === "down" && idx === habits.length - 1)) return;
    const next = [...habits];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    // Reassign order_index
    const updated = next.map((h, i) => ({ ...h, order_index: i }));
    setHabits(updated);
    await Promise.all([
      fetch(`/api/daily-tracker/habits/${updated[idx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_index: updated[idx].order_index }) }),
      fetch(`/api/daily-tracker/habits/${updated[swapIdx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_index: updated[swapIdx].order_index }) }),
    ]);
  }

  // ─── Life Goals ────────────────────────────────────────────────────────────

  async function addGoal() {
    if (!newGoalTitle.trim() || !journey) return;
    try {
      const res = await fetch("/api/daily-tracker/life-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journey_id: journey.id, title: newGoalTitle.trim(), present_value: newGoalPresent, target_value: newGoalTarget, order_index: lifeGoals.length, category: "general" }),
      });
      const newGoal = await res.json();
      setLifeGoals((prev) => [...prev, newGoal]);
      setNewGoalTitle(""); setNewGoalPresent(""); setNewGoalTarget("");
      setGoalDialog(false);
      toast.success("Goal added");
    } catch {
      toast.error("Failed to add goal");
    }
  }

  async function deleteGoal(id: string) {
    setLifeGoals((prev) => prev.filter((g) => g.id !== id));
    await fetch(`/api/daily-tracker/life-goals/${id}`, { method: "DELETE" });
  }

  async function moveGoal(id: string, dir: "up" | "down") {
    const idx = lifeGoals.findIndex((g) => g.id === id);
    if ((dir === "up" && idx === 0) || (dir === "down" && idx === lifeGoals.length - 1)) return;
    const next = [...lifeGoals];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const updated = next.map((g, i) => ({ ...g, order_index: i }));
    setLifeGoals(updated);
    await Promise.all([
      fetch(`/api/daily-tracker/life-goals/${updated[idx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_index: updated[idx].order_index }) }),
      fetch(`/api/daily-tracker/life-goals/${updated[swapIdx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_index: updated[swapIdx].order_index }) }),
    ]);
  }

  async function saveGoalField(goal: LifeGoal, field: "present_value" | "target_value", value: string) {
    setLifeGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, [field]: value } : g));
    setEditingGoal(null);
    await fetch(`/api/daily-tracker/life-goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  // ─── Reflection ────────────────────────────────────────────────────────────

  function handleReflectionChange(text: string) {
    setReflectionText(text);
    if (reflectionTimer.current) clearTimeout(reflectionTimer.current);
    reflectionTimer.current = setTimeout(() => saveReflection(text, selectedMood), 1200);
  }

  async function handleMoodSelect(mood: string) {
    const next = selectedMood === mood ? "" : mood;
    setSelectedMood(next);
    await saveReflection(reflectionText, next);
  }

  async function saveReflection(note: string, mood: string) {
    await fetch("/api/daily-tracker/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reflection_date: currentDate, note, mood }),
    });
  }

  // ─── Journey edit ──────────────────────────────────────────────────────────

  async function saveJourney() {
    if (!journey) return;
    const res = await fetch(`/api/daily-tracker/journey/${journey.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editJourneyName, total_days: editJourneyDays }),
    });
    setJourney(await res.json());
    setJourneyDialog(false);
    toast.success("Journey updated");
  }

  // ─── Derived state ─────────────────────────────────────────────────────────

  const completedCount = habits.filter((h) => logs.get(h.id)?.completed).length;
  const totalHabits = habits.length;
  const completionPct = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;
  const overallStreak = journey ? computeOverallStreak(rangeLogs, totalHabits, todayStr) : 0;
  const isToday = currentDate === todayStr;

  const habitsByCategory = HABIT_CATEGORIES.map((cat) => ({
    ...cat,
    habits: habits.filter((h) => (h.category ?? "general") === cat.value),
  })).filter((g) => g.habits.length > 0);

  // ─── Loading / Setup ───────────────────────────────────────────────────────

  if (loading || journey === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (journey === null) {
    return <JourneySetup onCreated={(j) => { setJourney(j); fetchHabits(); fetchRangeLogs(); }} />;
  }

  const dayNumber = getDayNumber(journey.start_date, currentDate);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-10">
      <Toaster richColors />

      {/* ── Day Banner ── */}
      <Card className="overflow-hidden border-0 shadow-md bg-linear-to-br from-primary/10 via-background to-primary/5">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
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
                onClick={() => { setEditJourneyName(journey.name); setEditJourneyDays(journey.total_days); setJourneyDialog(true); }}
                className="text-xl font-bold text-foreground hover:text-primary transition-colors text-left block"
              >
                {journey.name}
              </button>
              <p className="text-xs text-muted-foreground">{formatDate(new Date(currentDate + "T00:00:00"))}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {!isToday && (
                <Button variant="outline" size="sm" className="h-8 text-xs px-2" onClick={() => setCurrentDate(todayStr)}>
                  Today
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeDate(1)} disabled={isToday}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          {totalHabits > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{completedCount}/{totalHabits} tasks</span>
                <span className={`font-bold ${completionPct === 100 ? "text-green-500" : "text-primary"}`}>{completionPct}%</span>
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
            <WeekSummary
              rangeLogs={rangeLogs}
              totalHabits={totalHabits}
              todayStr={todayStr}
              currentDate={currentDate}
              onSelectDate={setCurrentDate}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Heatmap ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Activity — Last 6 Weeks</h2>
            <span className="text-xs text-muted-foreground">Click a day to jump to it</span>
          </div>
          <Heatmap
            rangeLogs={rangeLogs}
            totalHabits={totalHabits}
            todayStr={todayStr}
            onSelectDate={setCurrentDate}
          />
        </CardContent>
      </Card>

      {/* ── Life Goals ── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <h2 className="font-semibold text-sm">Life Goals</h2>
            </div>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setGoalDialog(true)}>
              <Plus className="h-3.5 w-3.5" />Add
            </Button>
          </div>

          {lifeGoals.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No goals yet.</p>
              <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => setGoalDialog(true)}>
                <Plus className="h-3.5 w-3.5" />Add your first goal
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Goal</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">Present</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs">By Year End</th>
                    <th className="px-2 py-2 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {lifeGoals.map((goal, i) => {
                    const isEditingPresent = editingGoal?.id === goal.id && editingGoal.field === "present_value";
                    const isEditingTarget = editingGoal?.id === goal.id && editingGoal.field === "target_value";
                    const progress = goalProgress(goal.present_value, goal.target_value);

                    return (
                      <tr key={goal.id} className="border-b last:border-b-0 group hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="space-y-1">
                            <span className="text-sm font-medium">{goal.title}</span>
                            {progress && (
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${progress.direction === "up" ? "bg-primary" : "bg-orange-500"}`}
                                    style={{ width: `${progress.pct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0">{progress.pct}%</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditingPresent ? (
                            <InlineEditor
                              value={goal.present_value}
                              onSave={(v) => saveGoalField(goal, "present_value", v)}
                              onCancel={() => setEditingGoal(null)}
                            />
                          ) : (
                            <button
                              onClick={() => setEditingGoal({ id: goal.id, field: "present_value" })}
                              className="text-xs font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {goal.present_value || <span className="text-muted-foreground italic">—</span>}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {isEditingTarget ? (
                            <InlineEditor
                              value={goal.target_value}
                              onSave={(v) => saveGoalField(goal, "target_value", v)}
                              onCancel={() => setEditingGoal(null)}
                            />
                          ) : (
                            <div className="flex items-center gap-1">
                              {progress && (
                                progress.direction === "up"
                                  ? <TrendingUp className="h-3 w-3 text-green-500 shrink-0" />
                                  : <TrendingDown className="h-3 w-3 text-orange-500 shrink-0" />
                              )}
                              <button
                                onClick={() => setEditingGoal({ id: goal.id, field: "target_value" })}
                                className="text-xs font-medium text-primary hover:underline"
                              >
                                {goal.target_value || <span className="text-muted-foreground italic">—</span>}
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveGoal(goal.id, "up")} disabled={i === 0}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveGoal(goal.id, "down")} disabled={i === lifeGoals.length - 1}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => deleteGoal(goal.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Daily Tasks ── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <h2 className="font-semibold text-sm">Daily Tasks</h2>
            </div>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setHabitDialog(true)}>
              <Plus className="h-3.5 w-3.5" />Add
            </Button>
          </div>

          {habits.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
              <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => setHabitDialog(true)}>
                <Plus className="h-3.5 w-3.5" />Add your first task
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {habitsByCategory.map((catGroup) => (
                <div key={catGroup.value}>
                  {/* Category header (only shown if there's more than one category in use) */}
                  {habitsByCategory.length > 1 && (
                    <div className={`flex items-center gap-1.5 px-4 py-1.5 ${catGroup.bg}`}>
                      <span className={`text-[10px] font-semibold uppercase tracking-wider ${catGroup.color}`}>{catGroup.label}</span>
                    </div>
                  )}
                  {catGroup.habits.map((habit, idx) => {
                    const log = logs.get(habit.id);
                    const completed = log?.completed ?? false;
                    const note = log?.note ?? "";
                    const streak = computeHabitStreak(habit.id, rangeLogs, todayStr);
                    const isExpanded = expandedNote === habit.id;
                    const allHabitIdx = habits.findIndex((h) => h.id === habit.id);

                    return (
                      <div key={habit.id} className="group border-b last:border-b-0">
                        <div className="flex items-center gap-3 px-4 py-3">
                          {/* Checkbox */}
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

                          {/* Title */}
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm font-medium transition-colors ${completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {habit.title}
                            </span>
                            {note && !isExpanded && (
                              <p className="text-xs text-muted-foreground italic truncate mt-0.5">{note}</p>
                            )}
                          </div>

                          {/* Streak badge */}
                          {streak > 1 && (
                            <span className="flex items-center gap-0.5 text-xs font-semibold text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-full shrink-0">
                              <Flame className="h-3 w-3" />{streak}
                            </span>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={() => setExpandedNote(isExpanded ? null : habit.id)}>
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveHabit(habit.id, "up")} disabled={allHabitIdx === 0}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveHabit(habit.id, "down")} disabled={allHabitIdx === habits.length - 1}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => deleteHabit(habit.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Inline note editor */}
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

      {/* ── Daily Reflection ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h2 className="font-semibold text-sm">Today&apos;s Reflection</h2>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Mood:</span>
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => handleMoodSelect(m)}
                className={`text-xl leading-none rounded-lg p-1.5 transition-all ${selectedMood === m ? "bg-primary/10 scale-110 ring-2 ring-primary/30" : "hover:bg-muted opacity-60 hover:opacity-100"}`}
              >
                {m}
              </button>
            ))}
          </div>

          <textarea
            className="w-full min-h-20 text-sm bg-muted/30 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            placeholder="What did you accomplish today? What are you grateful for? What could be better tomorrow?"
            value={reflectionText}
            onChange={(e) => handleReflectionChange(e.target.value)}
          />

          <div className="grid grid-cols-3 gap-2">
            {["Small steps everyday lead to big changes ♡", "I am proud of myself today", "Tomorrow I will do better"].map((quote) => (
              <button
                key={quote}
                onClick={() => handleReflectionChange(reflectionText ? reflectionText + "\n" + quote : quote)}
                className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-2 text-center hover:border-primary hover:text-primary transition-colors"
              >
                {quote}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Day", value: String(dayNumber), sub: `of ${journey.total_days}` },
          { label: "Done", value: String(completedCount), sub: `of ${totalHabits}` },
          { label: "Streak", value: String(overallStreak), sub: overallStreak === 1 ? "day" : "days" },
          { label: "Left", value: String(Math.max(0, journey.total_days - dayNumber)), sub: "days to go" },
        ].map(({ label, value, sub }) => (
          <Card key={label}>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold text-primary leading-tight">{value}</p>
              <p className="text-[10px] text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Add Habit Dialog ── */}
      <Dialog open={habitDialog} onOpenChange={setHabitDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Daily Task</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Task Name</Label>
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
              <Button variant="outline" className="flex-1" onClick={() => setHabitDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addHabit}>Add Task</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Goal Dialog ── */}
      <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Life Goal</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Goal</Label>
              <Input placeholder="e.g. Salary, Weight, Stocks" value={newGoalTitle} onChange={(e) => setNewGoalTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Present Value</Label>
                <Input placeholder="e.g. 1.4 lakhs" value={newGoalPresent} onChange={(e) => setNewGoalPresent(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">By Year End</Label>
                <Input placeholder="e.g. 2 lakhs" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Tip: Use formats like "56 kg", "1.4 lakhs", "₹26,000" to get automatic progress bars.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setGoalDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addGoal}>Add Goal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Journey Dialog ── */}
      <Dialog open={journeyDialog} onOpenChange={setJourneyDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Journey</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Journey Name</Label>
              <Input value={editJourneyName} onChange={(e) => setEditJourneyName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Total Days</Label>
              <Input type="number" value={editJourneyDays} onChange={(e) => setEditJourneyDays(Number(e.target.value))} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setJourneyDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={saveJourney}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
