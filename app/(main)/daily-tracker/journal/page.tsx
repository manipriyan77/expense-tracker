"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, ChevronRight, BookOpen, Sparkles,
  Trophy, Heart, Target, Search, X, Zap, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { useDailyTracker, toISODate, MOODS } from "../daily-tracker-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reflection {
  reflection_date: string;
  note: string;
  mood: string;
  wins: string;
  gratitude: string;
  intentions: string;
  energy_level: number;
  tags: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ENERGY_LEVELS = [
  { level: 1, label: "Drained", color: "text-red-500", bg: "bg-red-500/10", fill: "bg-red-500" },
  { level: 2, label: "Low", color: "text-orange-500", bg: "bg-orange-500/10", fill: "bg-orange-500" },
  { level: 3, label: "Okay", color: "text-yellow-500", bg: "bg-yellow-500/10", fill: "bg-yellow-500" },
  { level: 4, label: "Good", color: "text-blue-500", bg: "bg-blue-500/10", fill: "bg-blue-500" },
  { level: 5, label: "Peak", color: "text-green-500", bg: "bg-green-500/10", fill: "bg-green-500" },
];

const PRESET_TAGS = [
  "productive", "rest day", "workout", "learning", "social", "travel",
  "focused", "creative", "challenging", "breakthrough", "grateful",
];

const MOOD_PROMPTS: Record<string, string> = {
  "🤩": "What made today extraordinary?",
  "😄": "What brought me joy today?",
  "🔥": "What am I fired up about?",
  "💪": "What did I accomplish today?",
  "😌": "What gave me peace today?",
  "🤔": "What insight did I gain today?",
  "😐": "What could have been better?",
  "😤": "What frustrated me and why?",
  "😔": "What's weighing on me?",
  "😰": "What's causing me anxiety?",
  "🥱": "Why am I tired — body or mind?",
  "🤒": "How is my body feeling?",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(iso: string) {
  return new Date(iso + "T00:00:00");
}

function formatDateFull(d: Date) {
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function wordCount(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

const empty: Reflection = {
  reflection_date: "",
  note: "",
  mood: "",
  wins: "",
  gratitude: "",
  intentions: "",
  energy_level: 0,
  tags: "",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function GratitudeInputs({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const lines = value.split("\n");
  const items = [lines[0] ?? "", lines[1] ?? "", lines[2] ?? ""];

  function update(idx: number, val: string) {
    const next = [...items];
    next[idx] = val;
    onChange(next.join("\n"));
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
          <Input
            className="h-8 text-sm"
            placeholder={`I'm grateful for…`}
            value={item}
            onChange={(e) => update(i, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

function TagsInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [input, setInput] = useState("");
  const selected = value ? value.split(",").filter(Boolean) : [];

  function toggle(tag: string) {
    const next = selected.includes(tag)
      ? selected.filter((t) => t !== tag)
      : [...selected, tag];
    onChange(next.join(","));
  }

  function addCustom() {
    const tag = input.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || selected.includes(tag)) { setInput(""); return; }
    onChange([...selected, tag].join(","));
    setInput("");
  }

  return (
    <div className="space-y-2">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <button
              key={tag}
              onClick={() => toggle(tag)}
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium hover:bg-primary/25 transition-colors"
            >
              #{tag}<X className="h-2.5 w-2.5 ml-0.5" />
            </button>
          ))}
        </div>
      )}
      {/* Preset tags */}
      <div className="flex flex-wrap gap-1.5">
        {PRESET_TAGS.filter((t) => !selected.includes(t)).map((tag) => (
          <button
            key={tag}
            onClick={() => toggle(tag)}
            className="text-xs px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            #{tag}
          </button>
        ))}
      </div>
      {/* Custom tag input */}
      <div className="flex gap-1.5">
        <Input
          className="h-7 text-xs flex-1"
          placeholder="Add custom tag…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
        />
        <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={addCustom}>
          Add
        </Button>
      </div>
    </div>
  );
}

// 14-day mood calendar strip
function MoodCalendar({
  pastReflections,
  currentDate,
  todayStr,
  onSelectDate,
}: {
  pastReflections: Reflection[];
  currentDate: string;
  todayStr: string;
  onSelectDate: (d: string) => void;
}) {
  const days: { date: string; reflection: Reflection | null }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(todayStr + "T00:00:00");
    d.setDate(d.getDate() - i);
    const ds = toISODate(d);
    days.push({
      date: ds,
      reflection: pastReflections.find((r) => r.reflection_date === ds) ?? null,
    });
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {days.map(({ date, reflection }) => {
        const isSelected = date === currentDate;
        const moodMeta = MOODS.find((m) => m.emoji === reflection?.mood);
        const hasContent = reflection && (reflection.note || reflection.wins || reflection.gratitude);
        return (
          <button
            key={date}
            onClick={() => onSelectDate(date)}
            className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg min-w-[38px] transition-all shrink-0
              ${isSelected ? "bg-primary/15 ring-2 ring-primary/30" : "hover:bg-muted"}
            `}
          >
            <span className="text-[9px] text-muted-foreground">
              {toDate(date).toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2)}
            </span>
            <span className="text-[10px] font-medium">
              {toDate(date).getDate()}
            </span>
            {reflection?.mood ? (
              <span className={`text-base leading-none rounded-md p-0.5 ${moodMeta?.bg ?? ""}`}>
                {reflection.mood}
              </span>
            ) : hasContent ? (
              <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
              </div>
            ) : (
              <div className="h-4 w-4 rounded-full bg-muted" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JournalPage() {
  const { } = useDailyTracker();
  const todayStr = toISODate(new Date());

  const [currentDate, setCurrentDate] = useState(todayStr);
  const [data, setData] = useState<Reflection>(empty);
  const [allReflections, setAllReflections] = useState<Reflection[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const timers = useRef<Record<string, NodeJS.Timeout>>({});
  const isToday = currentDate === todayStr;
  const activeMood = MOODS.find((m) => m.emoji === data.mood);
  const energy = ENERGY_LEVELS.find((e) => e.level === data.energy_level);

  // ── Fetch ──

  const fetchReflection = useCallback(async (date: string) => {
    try {
      const res = await fetch(`/api/daily-tracker/reflections?date=${date}`);
      const r = await res.json();
      setData(r ? { ...empty, ...r } : { ...empty, reflection_date: date });
    } catch {
      setData({ ...empty, reflection_date: date });
    }
  }, []);

  const fetchAll = useCallback(async () => {
    const from = toISODate(new Date(new Date(todayStr + "T00:00:00").getTime() - 13 * 86400000));
    const promises: Promise<Reflection | null>[] = [];
    const d = new Date(from + "T00:00:00");
    while (toISODate(d) <= todayStr) {
      const ds = toISODate(d);
      promises.push(
        fetch(`/api/daily-tracker/reflections?date=${ds}`)
          .then((r) => r.json())
          .then((r) => r ? { ...empty, ...r } : null)
          .catch(() => null)
      );
      d.setDate(d.getDate() + 1);
    }
    const results = await Promise.all(promises);
    setAllReflections(results.filter((r): r is Reflection => r !== null));
  }, [todayStr]);

  useEffect(() => { fetchReflection(currentDate); }, [currentDate, fetchReflection]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Save (debounced per field) ──

  function save(patch: Partial<Reflection>, delay = 1200) {
    const merged = { ...data, ...patch };
    setData(merged);
    const key = Object.keys(patch).join(",");
    clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => persist(merged), delay);
  }

  async function persist(r: Reflection) {
    setSaving(true);
    try {
      await fetch("/api/daily-tracker/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...r, reflection_date: currentDate }),
      });
      fetchAll();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function saveImmediate(patch: Partial<Reflection>) {
    const merged = { ...data, ...patch };
    setData(merged);
    await persist(merged);
  }

  function changeDate(delta: number) {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    const next = toISODate(d);
    if (next <= todayStr) setCurrentDate(next);
  }

  // Search filter
  const filteredPast = allReflections
    .filter((r) => r.reflection_date !== currentDate)
    .filter((r) => !searchQuery || [r.note, r.wins, r.gratitude, r.intentions, r.tags]
      .join(" ").toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.reflection_date.localeCompare(a.reflection_date));

  const totalWords = wordCount(data.note) + wordCount(data.wins) + wordCount(data.intentions);

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
              <p className="text-sm font-semibold">{formatDateFull(toDate(currentDate))}</p>
              {isToday && <span className="text-xs text-primary font-medium">Today</span>}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => changeDate(1)} disabled={isToday}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {!isToday && (
            <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => setCurrentDate(todayStr)}>
              Back to Today
            </Button>
          )}
          {/* 14-day mood calendar */}
          <MoodCalendar
            pastReflections={allReflections}
            currentDate={currentDate}
            todayStr={todayStr}
            onSelectDate={setCurrentDate}
          />
        </CardContent>
      </Card>

      {/* ── Mood & Energy ── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Mood & Energy</h2>
            <div className="flex items-center gap-2">
              {activeMood && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${activeMood.bg} ${activeMood.color}`}>
                  {activeMood.emoji} {activeMood.label}
                </span>
              )}
              {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving…</span>}
            </div>
          </div>

          {/* Mood grid */}
          <div className="grid grid-cols-6 gap-1.5">
            {MOODS.map((mood) => {
              const isSelected = data.mood === mood.emoji;
              return (
                <button
                  key={mood.emoji}
                  onClick={() => saveImmediate({ mood: data.mood === mood.emoji ? "" : mood.emoji })}
                  title={mood.label}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all
                    ${isSelected
                      ? `${mood.bg} border-transparent ring-2 ${mood.ring} scale-105`
                      : "border-border hover:bg-muted hover:scale-105 opacity-70 hover:opacity-100"
                    }`}
                >
                  <span className="text-xl leading-none">{mood.emoji}</span>
                  <span className={`text-[9px] font-medium leading-tight ${isSelected ? mood.color : "text-muted-foreground"}`}>
                    {mood.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Energy level */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Energy Level</span>
              {energy && <span className={`text-xs font-semibold ${energy.color}`}>{energy.label}</span>}
            </div>
            <div className="flex gap-2">
              {ENERGY_LEVELS.map((e) => (
                <button
                  key={e.level}
                  onClick={() => saveImmediate({ energy_level: data.energy_level === e.level ? 0 : e.level })}
                  className={`flex-1 h-8 rounded-lg border transition-all text-xs font-semibold
                    ${data.energy_level >= e.level
                      ? `${e.bg} ${e.color} border-transparent`
                      : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                >
                  {e.level}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Today's Wins ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold text-sm">Today&apos;s Wins</h2>
            <span className="text-[10px] text-muted-foreground ml-auto">{wordCount(data.wins)} words</span>
          </div>
          {data.mood && MOOD_PROMPTS[data.mood] && (
            <button
              onClick={() => save({ wins: data.wins ? data.wins + "\n" + MOOD_PROMPTS[data.mood] : MOOD_PROMPTS[data.mood] })}
              className={`w-full text-left text-xs px-3 py-2 rounded-lg border border-dashed transition-colors
                ${activeMood ? `${activeMood.bg} ${activeMood.color} border-transparent` : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
            >
              <Sparkles className="h-2.5 w-2.5 inline mr-1.5 opacity-70" />
              {MOOD_PROMPTS[data.mood]}
            </button>
          )}
          <textarea
            className="w-full min-h-24 text-sm bg-muted/30 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            placeholder="What did you accomplish today? Big or small — every win counts."
            value={data.wins}
            onChange={(e) => save({ wins: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* ── Gratitude ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            <h2 className="font-semibold text-sm">Gratitude</h2>
            <span className="text-[10px] text-muted-foreground ml-auto">3 things</span>
          </div>
          <GratitudeInputs
            value={data.gratitude}
            onChange={(v) => save({ gratitude: v })}
          />
        </CardContent>
      </Card>

      {/* ── Free Reflection ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Reflection</h2>
            <span className="text-[10px] text-muted-foreground ml-auto">{wordCount(data.note)} words</span>
          </div>

          <textarea
            className="w-full min-h-32 text-sm bg-muted/30 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            placeholder={activeMood
              ? `You're feeling ${activeMood.label.toLowerCase()}. Write freely about your day…`
              : "How was your day? What's on your mind? Write freely…"}
            value={data.note}
            onChange={(e) => save({ note: e.target.value })}
          />

          {/* Quick phrases */}
          <div className="flex flex-wrap gap-1.5">
            {[
              "Small steps every day lead to big changes ♡",
              "I am proud of myself today",
              "Progress over perfection",
              "I showed up even when it was hard",
            ].map((phrase) => (
              <button
                key={phrase}
                onClick={() => save({ note: data.note ? data.note + "\n" + phrase : phrase })}
                className="text-[11px] px-2.5 py-1 rounded-full border border-dashed text-muted-foreground border-border hover:border-primary hover:text-primary transition-colors"
              >
                {phrase}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Tomorrow's Intentions ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            <h2 className="font-semibold text-sm">Tomorrow&apos;s Intentions</h2>
            <span className="text-[10px] text-muted-foreground ml-auto">{wordCount(data.intentions)} words</span>
          </div>
          <textarea
            className="w-full min-h-20 text-sm bg-muted/30 border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
            placeholder="What do you intend to focus on tomorrow? What are your top 3 priorities?"
            value={data.intentions}
            onChange={(e) => save({ intentions: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* ── Tags ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">Tags</h2>
          </div>
          <TagsInput
            value={data.tags}
            onChange={(v) => save({ tags: v }, 300)}
          />
        </CardContent>
      </Card>

      {/* ── Word Count Summary ── */}
      {totalWords > 0 && (
        <div className="flex items-center justify-center gap-6 py-1">
          <div className="text-center">
            <p className="text-lg font-bold text-primary">{totalWords}</p>
            <p className="text-[10px] text-muted-foreground">words written</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-foreground">
              {data.gratitude.split("\n").filter((l) => l.trim()).length}
            </p>
            <p className="text-[10px] text-muted-foreground">gratitudes</p>
          </div>
          {data.tags && (
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">
                {data.tags.split(",").filter(Boolean).length}
              </p>
              <p className="text-[10px] text-muted-foreground">tags</p>
            </div>
          )}
        </div>
      )}

      {/* ── Past Reflections ── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm flex-1">Past Reflections</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSearch(!showSearch)}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>

          {showSearch && (
            <div className="px-4 py-2 border-b">
              <Input
                autoFocus
                placeholder="Search reflections…"
                className="h-8 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {filteredPast.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {searchQuery ? "No entries match your search." : "No past entries yet."}
            </p>
          ) : (
            <div className="divide-y">
              {filteredPast.map((r) => {
                const moodMeta = MOODS.find((m) => m.emoji === r.mood);
                const energyMeta = ENERGY_LEVELS.find((e) => e.level === r.energy_level);
                const tags = r.tags ? r.tags.split(",").filter(Boolean) : [];
                const wc = wordCount(r.note) + wordCount(r.wins) + wordCount(r.intentions);
                const gratLines = r.gratitude.split("\n").filter((l) => l.trim());

                return (
                  <button
                    key={r.reflection_date}
                    onClick={() => setCurrentDate(r.reflection_date)}
                    className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors"
                  >
                    {/* Date + mood column */}
                    <div className="shrink-0 text-center min-w-[52px] space-y-1">
                      <p className="text-[10px] font-semibold text-muted-foreground">
                        {formatDateShort(toDate(r.reflection_date))}
                      </p>
                      {r.mood && (
                        <span className={`inline-flex items-center justify-center text-lg leading-none rounded-lg p-1 ${moodMeta?.bg ?? ""}`}>
                          {r.mood}
                        </span>
                      )}
                      {r.energy_level > 0 && (
                        <div className="flex justify-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <div key={n} className={`h-1 w-1 rounded-full ${n <= r.energy_level ? energyMeta?.fill ?? "bg-muted" : "bg-muted"}`} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {r.wins && (
                        <p className="text-xs font-medium text-foreground line-clamp-1">
                          🏆 {r.wins.split("\n")[0]}
                        </p>
                      )}
                      {r.note && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.note}</p>
                      )}
                      {gratLines.length > 0 && (
                        <p className="text-xs text-muted-foreground line-clamp-1 italic">
                          🙏 {gratLines[0]}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {wc > 0 && <span className="text-[10px] text-muted-foreground">{wc} words</span>}
                        {moodMeta && <span className={`text-[10px] font-medium ${moodMeta.color}`}>{moodMeta.label}</span>}
                        {tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
