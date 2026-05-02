"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useDailyTracker, toISODate, MOODS } from "../daily-tracker-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reflection {
  reflection_date: string;
  note: string;
  mood: string;
}

// ─── Prompts per mood ────────────────────────────────────────────────────────

const MOOD_PROMPTS: Record<string, string[]> = {
  "🤩": ["What made today extraordinary?", "What achievement am I most proud of?", "How can I repeat this energy tomorrow?"],
  "😄": ["What brought me joy today?", "Who or what am I grateful for?", "What went really well today?"],
  "🔥": ["What am I fired up about?", "What progress did I make toward my goals?", "What will I crush tomorrow?"],
  "💪": ["What did I get done today?", "What challenged me and how did I handle it?", "What habit did I nail?"],
  "😌": ["What gave me peace today?", "What am I present for right now?", "What am I letting go of?"],
  "🤔": ["What question is on my mind?", "What insight did I gain today?", "What do I want to think more about?"],
  "😐": ["What was neutral about today?", "What could have been better?", "What do I want more of tomorrow?"],
  "😤": ["What frustrated me and why?", "What can I control in this situation?", "How do I want to respond differently?"],
  "😔": ["What's weighing on me?", "What do I need right now?", "One small thing I can do to feel better?"],
  "😰": ["What's causing me anxiety?", "What is within my control?", "What would I tell a friend feeling this way?"],
  "🥱": ["Why am I tired — body or mind?", "What would recharge me?", "What can I let go of to rest better?"],
  "🤒": ["How is my body feeling?", "What do I need to recover?", "What can I do gently for myself today?"],
};

const DEFAULT_PROMPTS = [
  "What did you accomplish today?",
  "What are you grateful for?",
  "What could be better tomorrow?",
];

// ─── Quick phrases ────────────────────────────────────────────────────────────

const QUICK_PHRASES = [
  "Small steps every day lead to big changes ♡",
  "I am proud of myself today",
  "Tomorrow I will do better",
  "Grateful for what I have",
  "Focused and consistent",
  "Progress over perfection",
  "I showed up even when it was hard",
  "One day at a time",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateFull(d: Date) {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const { } = useDailyTracker();
  const todayStr = toISODate(new Date());

  const [currentDate, setCurrentDate] = useState(todayStr);
  const [reflectionText, setReflectionText] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [pastReflections, setPastReflections] = useState<Reflection[]>([]);
  const [saving, setSaving] = useState(false);

  const reflectionTimer = useRef<NodeJS.Timeout | null>(null);
  const isToday = currentDate === todayStr;

  const activeMood = MOODS.find((m) => m.emoji === selectedMood);
  const prompts = selectedMood ? (MOOD_PROMPTS[selectedMood] ?? DEFAULT_PROMPTS) : DEFAULT_PROMPTS;

  const fetchReflection = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/daily-tracker/reflections?date=${date}`);
      const data = await res.json();
      setReflectionText(data?.note ?? "");
      setSelectedMood(data?.mood ?? "");
    } catch {
      setReflectionText("");
      setSelectedMood("");
    }
  }, []);

  const fetchPastReflections = useCallback(async () => {
    try {
      const to = todayStr;
      const from = toISODate(new Date(new Date(todayStr + "T00:00:00").getTime() - 13 * 86400000));
      const promises = [];
      const d = new Date(from + "T00:00:00");
      while (toISODate(d) <= to) {
        const ds = toISODate(d);
        promises.push(
          fetch(`/api/daily-tracker/reflections?date=${ds}`)
            .then((r) => r.json())
            .then((data) =>
              data ? { reflection_date: ds, note: data.note ?? "", mood: data.mood ?? "" } : null
            )
        );
        d.setDate(d.getDate() + 1);
      }
      const results = await Promise.all(promises);
      setPastReflections(
        results.filter((r): r is Reflection => r !== null && (r.note !== "" || r.mood !== ""))
      );
    } catch {
      // silent
    }
  }, [todayStr]);

  useEffect(() => {
    fetchReflection(currentDate);
  }, [currentDate, fetchReflection]);

  useEffect(() => {
    fetchPastReflections();
  }, [fetchPastReflections]);

  function changeDate(delta: number) {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const newDate = toISODate(d);
    if (newDate <= todayStr) setCurrentDate(newDate);
  }

  async function saveReflection(note: string, mood: string) {
    setSaving(true);
    try {
      await fetch("/api/daily-tracker/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reflection_date: currentDate, note, mood }),
      });
      if (isToday) fetchPastReflections();
    } catch {
      toast.error("Failed to save reflection");
    } finally {
      setSaving(false);
    }
  }

  function handleReflectionChange(text: string) {
    setReflectionText(text);
    if (reflectionTimer.current) clearTimeout(reflectionTimer.current);
    reflectionTimer.current = setTimeout(() => saveReflection(text, selectedMood), 1200);
  }

  async function handleMoodSelect(emoji: string) {
    const next = selectedMood === emoji ? "" : emoji;
    setSelectedMood(next);
    await saveReflection(reflectionText, next);
  }

  function insertPhrase(phrase: string) {
    const newText = reflectionText ? reflectionText + "\n" + phrase : phrase;
    handleReflectionChange(newText);
  }

  const pastFiltered = pastReflections
    .filter((r) => r.reflection_date !== currentDate)
    .sort((a, b) => b.reflection_date.localeCompare(a.reflection_date))
    .slice(0, 14);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-10">

      {/* ── Date Navigator ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeDate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <p className="text-sm font-semibold">
                {formatDateFull(new Date(currentDate + "T00:00:00"))}
              </p>
              {isToday && <span className="text-xs text-primary font-medium">Today</span>}
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
              className="w-full h-7 text-xs mt-3"
              onClick={() => setCurrentDate(todayStr)}
            >
              Back to Today
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── Mood Picker ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">How are you feeling?</h2>
            {activeMood && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activeMood.bg} ${activeMood.color}`}>
                {activeMood.emoji} {activeMood.label}
              </span>
            )}
          </div>

          {/* Mood grid */}
          <div className="grid grid-cols-6 gap-2">
            {MOODS.map((mood) => {
              const isSelected = selectedMood === mood.emoji;
              return (
                <button
                  key={mood.emoji}
                  onClick={() => handleMoodSelect(mood.emoji)}
                  title={mood.label}
                  className={`
                    flex flex-col items-center gap-1 p-2 rounded-xl border transition-all
                    ${isSelected
                      ? `${mood.bg} border-transparent ring-2 ${mood.ring} scale-105`
                      : "border-border hover:bg-muted hover:scale-105 opacity-70 hover:opacity-100"
                    }
                  `}
                >
                  <span className="text-2xl leading-none">{mood.emoji}</span>
                  <span className={`text-[9px] font-medium leading-tight ${isSelected ? mood.color : "text-muted-foreground"}`}>
                    {mood.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Reflection ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">
              {isToday ? "Today's Reflection" : "Reflection"}
            </h2>
            {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>}
          </div>

          {/* Contextual prompts based on mood */}
          <div className="flex flex-wrap gap-1.5">
            {prompts.map((p) => (
              <button
                key={p}
                onClick={() => insertPhrase(p)}
                className={`text-[11px] px-2.5 py-1 rounded-full border border-dashed transition-colors
                  ${activeMood
                    ? `${activeMood.bg} ${activeMood.color} border-transparent hover:opacity-80`
                    : "text-muted-foreground border-border hover:border-primary hover:text-primary"
                  }`}
              >
                <Sparkles className="h-2.5 w-2.5 inline mr-1 opacity-70" />
                {p}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            className="w-full min-h-36 text-sm bg-muted/30 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            placeholder={
              activeMood
                ? `You're feeling ${activeMood.label.toLowerCase()}. Write about your day…`
                : "What did you accomplish today? What are you grateful for? What could be better tomorrow?"
            }
            value={reflectionText}
            onChange={(e) => handleReflectionChange(e.target.value)}
          />

          {/* Quick phrases */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Quick insert</span>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_PHRASES.map((phrase) => (
                <button
                  key={phrase}
                  onClick={() => insertPhrase(phrase)}
                  className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-2 text-left hover:border-primary hover:text-primary transition-colors line-clamp-1"
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Past Reflections ── */}
      {pastFiltered.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Past Reflections</h2>
            </div>
            <div className="divide-y">
              {pastFiltered.map((r) => {
                const moodMeta = MOODS.find((m) => m.emoji === r.mood);
                return (
                  <button
                    key={r.reflection_date}
                    onClick={() => setCurrentDate(r.reflection_date)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="shrink-0 text-center min-w-13">
                      <p className="text-[10px] font-semibold text-muted-foreground">
                        {formatDateShort(new Date(r.reflection_date + "T00:00:00"))}
                      </p>
                      {r.mood && (
                        <span
                          className={`inline-flex items-center justify-center text-lg leading-none mt-1 rounded-lg p-1 ${moodMeta?.bg ?? ""}`}
                        >
                          {r.mood}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      {r.note ? (
                        <>
                          <p className="text-xs text-foreground line-clamp-2">{r.note}</p>
                          {moodMeta && (
                            <span className={`text-[10px] font-medium mt-1 inline-block ${moodMeta.color}`}>
                              {moodMeta.label}
                            </span>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No note — mood only</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
