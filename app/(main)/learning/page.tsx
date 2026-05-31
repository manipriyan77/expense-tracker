"use client";

import { useMemo, useState } from "react";
import { useLearning } from "./learning-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  BookOpen,
  Flame,
  TrendingUp,
  Calendar,
  Plus,
  ChevronRight,
  Clock,
  Trash2,
  Library,
} from "lucide-react";
import Link from "next/link";
import type { LearningSession } from "./learning-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function formatDuration(mins: number | null) {
  if (!mins) return null;
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ""}`.trim();
}

function getThisWeekCount(sessions: LearningSession[]) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return sessions.filter((s) => new Date(s.date + "T00:00:00") >= monday).length;
}

function getStreak(sessions: LearningSession[]) {
  if (!sessions.length) return 0;
  const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
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

// ─── Heatmap ──────────────────────────────────────────────────────────────────

function CalendarHeatmap({ sessions }: { sessions: LearningSession[] }) {
  const { cells, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const countMap: Record<string, number> = {};
    for (const s of sessions) {
      countMap[s.date] = (countMap[s.date] ?? 0) + 1;
    }

    const end = new Date(today);
    const endDow = end.getDay();
    end.setDate(end.getDate() + (6 - endDow));

    const start = new Date(end);
    start.setDate(end.getDate() - 52 * 7 + 1);

    const cells: { date: string; count: number }[][] = [];
    let week: { date: string; count: number }[] = [];
    const cursor = new Date(start);
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    let col = 0;

    while (cursor <= end) {
      const dateStr = cursor.toISOString().split("T")[0];
      const dayOfWeek = cursor.getDay();

      if (dayOfWeek === 0 && week.length > 0) {
        cells.push(week);
        week = [];
        col++;
      }

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
  }, [sessions]);

  function getCellColor(count: number) {
    if (count === 0) return "bg-muted";
    if (count === 1) return "bg-indigo-300 dark:bg-indigo-800";
    if (count === 2) return "bg-indigo-400 dark:bg-indigo-700";
    return "bg-indigo-500 dark:bg-indigo-500";
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
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
        <div className="flex" style={{ gap: "2px" }}>
          {cells.map((week, colIdx) => (
            <div key={colIdx} className="flex flex-col" style={{ gap: "2px" }}>
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={`${cell.date}: ${cell.count} session${cell.count !== 1 ? "s" : ""}`}
                  className={`rounded-[2px] ${getCellColor(cell.count)} ${cell.date === today ? "ring-1 ring-indigo-400" : ""}`}
                  style={{ width: 11, height: 11 }}
                />
              ))}
              {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                <div key={`pad-${i}`} style={{ width: 11, height: 11 }} />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1 mt-2 justify-end">
          <span className="text-[9px] text-muted-foreground">Less</span>
          {["bg-muted", "bg-indigo-300 dark:bg-indigo-800", "bg-indigo-400 dark:bg-indigo-700", "bg-indigo-500"].map((cls, i) => (
            <div key={i} className={`rounded-[2px] ${cls}`} style={{ width: 11, height: 11 }} />
          ))}
          <span className="text-[9px] text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  );
}

// ─── Log Session Dialog ───────────────────────────────────────────────────────

function LogSessionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { topics, addSession } = useLearning();
  const [topicId, setTopicId] = useState<string>("");
  const [customTopic, setCustomTopic] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [resource, setResource] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const resolvedTopicName = topicId
      ? topics.find((t) => t.id === topicId)?.name ?? customTopic
      : customTopic;
    if (!resolvedTopicName.trim()) return;

    setSaving(true);
    await addSession({
      topic_id: topicId || null,
      topic_name: resolvedTopicName.trim(),
      date,
      duration_minutes: duration ? parseInt(duration) : null,
      notes: notes.trim() || null,
      resource: resource.trim() || null,
    });
    setSaving(false);
    setTopicId("");
    setCustomTopic("");
    setDate(new Date().toISOString().split("T")[0]);
    setDuration("");
    setNotes("");
    setResource("");
    onClose();
  }

  const useCustom = topicId === "__custom__";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Learning Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Topic</Label>
            <Select value={topicId} onValueChange={setTopicId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a topic…" />
              </SelectTrigger>
              <SelectContent>
                {topics.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
                <SelectItem value="__custom__">+ One-off topic</SelectItem>
              </SelectContent>
            </Select>
            {useCustom && (
              <Input
                placeholder="Topic name"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                className="mt-1.5"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input type="number" min={1} placeholder="e.g. 45" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Resource</Label>
            <Input placeholder="Book, course, URL…" value={resource} onChange={(e) => setResource(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Key takeaways / Notes</Label>
            <Textarea
              placeholder="What did you learn?"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              disabled={saving || (!topicId && !customTopic.trim()) || (useCustom && !customTopic.trim())}
              onClick={handleSave}
            >
              {saving ? "Saving…" : "Save Session"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LearningOverviewPage() {
  const { sessions, topics, loadingSessions, deleteSession } = useLearning();
  const [logOpen, setLogOpen] = useState(false);

  const recentSessions = sessions.slice(0, 6);
  const streak = getStreak(sessions);
  const thisWeek = getThisWeekCount(sessions);
  const totalSessions = sessions.length;

  const topTopics = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) {
      counts[s.topic_name] = (counts[s.topic_name] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [sessions]);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Learning Tracker</h1>
          <p className="text-sm text-muted-foreground">Track what you learn every day</p>
        </div>
        <Button className="gap-2" onClick={() => setLogOpen(true)}>
          <Plus className="h-4 w-4" /> Log Session
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{streak}</p>
            <p className="text-xs text-muted-foreground">Day streak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-indigo-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{thisWeek}</p>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-5 w-5 text-violet-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{totalSessions}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick link to Topics */}
      <Button variant="outline" className="w-full gap-2" asChild>
        <Link href="/learning/topics">
          <Library className="h-4 w-4" />
          Manage Topics
          <Badge variant="secondary" className="ml-auto">{topics.length}</Badge>
        </Link>
      </Button>

      {/* Heatmap */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Learning Activity
          </CardTitle>
          <span className="text-xs text-muted-foreground">{totalSessions} total</span>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <CalendarHeatmap sessions={sessions} />
          )}
        </CardContent>
      </Card>

      {/* Top topics */}
      {topTopics.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Most Studied</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {topTopics.map(([name, count]) => {
                const topic = topics.find((t) => t.name === name);
                return (
                  <div key={name} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {topic && (
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: topic.color }} />
                      )}
                      <span className="text-sm font-medium">{name}</span>
                    </div>
                    <Badge variant="secondary">{count} session{count !== 1 ? "s" : ""}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingSessions ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading…</div>
          ) : recentSessions.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <BookOpen className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
              <p className="text-muted-foreground text-sm">No sessions yet. Start learning!</p>
              <Button size="sm" onClick={() => setLogOpen(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Log your first session
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {recentSessions.map((s) => {
                const topic = topics.find((t) => t.id === s.topic_id);
                return (
                  <div key={s.id} className="flex items-start justify-between px-4 py-3 gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {topic && (
                        <div className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0" style={{ background: topic.color }} />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{s.topic_name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatDate(s.date)}</span>
                          {s.duration_minutes && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> {formatDuration(s.duration_minutes)}
                            </span>
                          )}
                          {s.resource && (
                            <span className="text-xs text-muted-foreground truncate max-w-[140px]">{s.resource}</span>
                          )}
                        </div>
                        {s.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.notes}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteSession(s.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5 p-1"
                      aria-label="Delete session"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <LogSessionDialog open={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}
