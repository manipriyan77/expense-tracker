"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Journey {
  id: string;
  name: string;
  start_date: string;
  total_days: number;
}

export interface LifeGoal {
  id: string;
  journey_id: string;
  title: string;
  present_value: string;
  target_value: string;
  start_value: string;
  order_index: number;
  category: string;
  notes: string;
}

export interface Habit {
  id: string;
  title: string;
  order_index: number;
  category: string;
  frequency?: "daily" | "weekdays" | "weekends" | "weekly" | "custom" | string;
  frequency_days?: number[];
}

export interface HabitLog {
  habit_id: string;
  log_date: string;
  completed: boolean;
  note: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const HABIT_CATEGORIES = [
  { value: "health", label: "Health", color: "text-green-500", bg: "bg-green-500/10" },
  { value: "finance", label: "Finance", color: "text-blue-500", bg: "bg-blue-500/10" },
  { value: "work", label: "Work", color: "text-violet-500", bg: "bg-violet-500/10" },
  { value: "personal", label: "Personal", color: "text-orange-500", bg: "bg-orange-500/10" },
  { value: "spirituality", label: "Spirituality", color: "text-yellow-600", bg: "bg-yellow-500/10" },
  { value: "general", label: "General", color: "text-muted-foreground", bg: "bg-muted/50" },
];

export const MOODS = [
  { emoji: "🤩", label: "Amazing", color: "text-yellow-500", bg: "bg-yellow-500/10", ring: "ring-yellow-400/50" },
  { emoji: "😄", label: "Happy", color: "text-green-500", bg: "bg-green-500/10", ring: "ring-green-400/50" },
  { emoji: "🔥", label: "Motivated", color: "text-orange-500", bg: "bg-orange-500/10", ring: "ring-orange-400/50" },
  { emoji: "💪", label: "Productive", color: "text-blue-500", bg: "bg-blue-500/10", ring: "ring-blue-400/50" },
  { emoji: "😌", label: "Calm", color: "text-teal-500", bg: "bg-teal-500/10", ring: "ring-teal-400/50" },
  { emoji: "🤔", label: "Reflective", color: "text-violet-500", bg: "bg-violet-500/10", ring: "ring-violet-400/50" },
  { emoji: "😐", label: "Okay", color: "text-gray-500", bg: "bg-gray-500/10", ring: "ring-gray-400/50" },
  { emoji: "😤", label: "Frustrated", color: "text-red-400", bg: "bg-red-400/10", ring: "ring-red-400/50" },
  { emoji: "😔", label: "Sad", color: "text-indigo-400", bg: "bg-indigo-400/10", ring: "ring-indigo-400/50" },
  { emoji: "😰", label: "Anxious", color: "text-amber-500", bg: "bg-amber-500/10", ring: "ring-amber-400/50" },
  { emoji: "🥱", label: "Tired", color: "text-slate-400", bg: "bg-slate-400/10", ring: "ring-slate-400/50" },
  { emoji: "🤒", label: "Unwell", color: "text-rose-400", bg: "bg-rose-400/10", ring: "ring-rose-400/50" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeHabitStreak(
  habitId: string,
  rangeLogs: Map<string, Set<string>>,
  todayStr: string
): number {
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

export function computeOverallStreak(
  rangeLogs: Map<string, Set<string>>,
  totalHabits: number,
  todayStr: string
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

export function heatmapColor(pct: number): string {
  if (pct === 0) return "bg-muted";
  if (pct < 40) return "bg-orange-200 dark:bg-orange-900/50";
  if (pct < 70) return "bg-primary/30";
  if (pct < 100) return "bg-primary/60";
  return "bg-primary";
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DailyTrackerContextValue {
  journey: Journey | null | undefined;
  habits: Habit[];
  rangeLogs: Map<string, Set<string>>;
  loading: boolean;
  refetchJourney: () => Promise<void>;
  refetchHabits: () => Promise<void>;
  refetchRangeLogs: () => Promise<void>;
  setJourney: (j: Journey) => void;
}

const DailyTrackerContext = createContext<DailyTrackerContextValue | null>(null);

export function useDailyTracker() {
  const ctx = useContext(DailyTrackerContext);
  if (!ctx) throw new Error("useDailyTracker must be used inside DailyTrackerProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DailyTrackerProvider({ children }: { children: ReactNode }) {
  const todayStr = toISODate(new Date());

  const [journey, setJourneyState] = useState<Journey | null | undefined>(undefined);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [rangeLogs, setRangeLogs] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(true);

  const refetchHabits = useCallback(async () => {
    try {
      const res = await fetch("/api/daily-tracker/habits");
      const data = await res.json();
      setHabits(
        (data ?? []).map((h: Habit) => ({ ...h, category: h.category ?? "general" }))
      );
    } catch {
      // silently fail
    }
  }, []);

  const refetchRangeLogs = useCallback(async () => {
    try {
      const to = todayStr;
      const from = toISODate(
        new Date(new Date(todayStr + "T00:00:00").getTime() - 59 * 86400000)
      );
      const res = await fetch(`/api/daily-tracker/logs/range?from=${from}&to=${to}`);
      const data: { habit_id: string; log_date: string; completed: boolean }[] =
        await res.json();
      const map = new Map<string, Set<string>>();
      for (const log of data ?? []) {
        if (!log.completed) continue;
        if (!map.has(log.log_date)) map.set(log.log_date, new Set());
        map.get(log.log_date)!.add(log.habit_id);
      }
      setRangeLogs(map);
    } catch {
      // silently fail
    }
  }, [todayStr]);

  const refetchJourney = useCallback(async () => {
    try {
      const res = await fetch("/api/daily-tracker/journey");
      const data = await res.json();
      setJourneyState(data ?? null);
      return data;
    } catch {
      setJourneyState(null);
      return null;
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const res = await fetch("/api/daily-tracker/journey");
        const data = await res.json();
        setJourneyState(data ?? null);
        if (data) {
          await Promise.all([refetchHabits(), refetchRangeLogs()]);
        }
      } catch {
        setJourneyState(null);
      } finally {
        setLoading(false);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setJourney(j: Journey) {
    setJourneyState(j);
    refetchHabits();
    refetchRangeLogs();
  }

  return (
    <DailyTrackerContext.Provider
      value={{ journey, habits, rangeLogs, loading, refetchJourney, refetchHabits, refetchRangeLogs, setJourney }}
    >
      {children}
    </DailyTrackerContext.Provider>
  );
}
