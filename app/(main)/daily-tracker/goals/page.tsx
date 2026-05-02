"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Star,
  Target,
  Trophy,
  Pencil,
  RefreshCw,
  ChevronRight,
  History,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { useDailyTracker, HABIT_CATEGORIES, type LifeGoal } from "../daily-tracker-context";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNumeric(val: string): number | null {
  const lower = val.toLowerCase().replace(/[₹,\s]/g, "");
  const lakhMatch = lower.match(/^([\d.]+)\s*lakh/);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;
  const kMatch = lower.match(/^([\d.]+)k$/);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;
  const num = parseFloat(lower.replace(/[^0-9.]/g, ""));
  return isNaN(num) ? null : num;
}

function goalProgress(
  present: string,
  target: string,
  start?: string,
): { pct: number; direction: "up" | "down" } | null {
  const p = parseNumeric(present);
  const t = parseNumeric(target);
  if (p === null || t === null) return null;

  if (t >= p) {
    // Growth goal (e.g. savings: 1.4L → 2L)
    if (t === 0) return null;
    return { pct: Math.min(100, Math.round((p / t) * 100)), direction: "up" };
  } else {
    // Reduction goal (e.g. debt: 27L → 18L)
    // Need the original starting point to calculate how far we've come
    const s = start ? parseNumeric(start) : null;
    if (s === null || s <= t) {
      // No valid start_value — show 100% if already at/below target, else 0%
      return { pct: p <= t ? 100 : 0, direction: "down" };
    }
    // pct = (start - current) / (start - target)
    const pct = Math.min(100, Math.max(0, Math.round(((s - p) / (s - t)) * 100)));
    return { pct, direction: "down" };
  }
}

function goalStatus(pct: number | null): { label: string; color: string; bg: string } {
  if (pct === null) return { label: "No data", color: "text-muted-foreground", bg: "bg-muted/50" };
  if (pct >= 100) return { label: "Completed", color: "text-green-600", bg: "bg-green-500/10" };
  if (pct >= 75) return { label: "Almost there", color: "text-blue-600", bg: "bg-blue-500/10" };
  if (pct >= 50) return { label: "On Track", color: "text-primary", bg: "bg-primary/10" };
  if (pct > 0) return { label: "In Progress", color: "text-orange-600", bg: "bg-orange-500/10" };
  return { label: "Not Started", color: "text-muted-foreground", bg: "bg-muted/50" };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProgressEntry {
  id: string;
  value: string;
  note: string;
  recorded_at: string;
}

// ─── Progress History Dialog ──────────────────────────────────────────────────

function ProgressHistoryDialog({
  goal,
  open,
  onClose,
}: {
  goal: LifeGoal;
  open: boolean;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    async function load() {
      setLoading(true);
      try {
        const r = await fetch(`/api/daily-tracker/life-goals/${goal.id}/progress`);
        const d = await r.json();
        setHistory(Array.isArray(d) ? d : []);
      } catch {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [open, goal.id]);

  // Group entries by month
  const byMonth = history.reduce<Record<string, ProgressEntry[]>>((acc, entry) => {
    const key = new Date(entry.recorded_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  // Chart: normalize values for bar heights
  const chartEntries = history.filter((e) => parseNumeric(e.value) !== null);

  function barHeight(val: number): number {
    // For "up" goals higher is better → taller bar
    // For "down" goals lower is better → taller bar when value is lower
    const progress = goalProgress(String(val), goal.target_value, goal.start_value);
    return progress ? Math.max(8, progress.pct) : 8;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  function getDelta(entry: ProgressEntry, idx: number): string | null {
    if (idx === 0) return null;
    const prev = parseNumeric(history[idx - 1].value);
    const curr = parseNumeric(entry.value);
    if (prev === null || curr === null) return null;
    const diff = curr - prev;
    if (diff === 0) return null;
    const sign = diff > 0 ? "+" : "";
    // Format nicely
    const abs = Math.abs(diff);
    if (abs >= 100000) return `${sign}${(diff / 100000).toFixed(1)}L`;
    if (abs >= 1000) return `${sign}${(diff / 1000).toFixed(1)}k`;
    return `${sign}${diff.toFixed(1)}`;
  }

  const isGrowthGoal = (goalProgress(goal.present_value, goal.target_value, goal.start_value)?.direction ?? "up") === "up";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Progress History
          </DialogTitle>
          <DialogDescription className="font-medium text-foreground">{goal.title}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        ) : history.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No history yet. Update your progress to start tracking.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-5 pr-1">

            {/* Mini chart */}
            {chartEntries.length >= 2 && (
              <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
                <div className="flex items-end justify-between gap-1 h-20">
                  {chartEntries.map((entry, i) => {
                    const h = barHeight(parseNumeric(entry.value) as number);
                    const isLast = i === chartEntries.length - 1;
                    const prog = goalProgress(entry.value, goal.target_value, goal.start_value);
                    const color = prog?.pct === 100
                      ? "bg-green-500"
                      : isGrowthGoal ? "bg-primary" : "bg-orange-500";
                    return (
                      <div key={entry.id} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                        <div
                          className={`w-full rounded-t-sm transition-all ${color} ${isLast ? "opacity-100" : "opacity-60"}`}
                          style={{ height: `${h}%` }}
                          title={`${entry.value} — ${formatDate(entry.recorded_at)}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{formatDate(chartEntries[0].recorded_at)}</span>
                  <span>{chartEntries[0].value} → {chartEntries[chartEntries.length - 1].value}</span>
                  <span>{formatDate(chartEntries[chartEntries.length - 1].recorded_at)}</span>
                </div>
              </div>
            )}

            {/* Month-wise groups */}
            {Object.entries(byMonth).reverse().map(([month, entries]) => (
              <div key={month} className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{month}</span>
                </div>
                <div className="space-y-1.5 ml-5">
                  {[...entries].reverse().map((entry) => {
                    // Find global index for delta calculation
                    const globalIdx = history.findIndex((h) => h.id === entry.id);
                    const delta = getDelta(entry, globalIdx);
                    const prog = goalProgress(entry.value, goal.target_value, goal.start_value);
                    const isCompleted = (prog?.pct ?? 0) >= 100;
                    const deltaPositive = delta && !delta.startsWith("-");

                    return (
                      <div key={entry.id} className="flex items-start gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
                        {/* Timeline dot */}
                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${isCompleted ? "bg-green-500" : "bg-primary"}`} />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-foreground">{entry.value}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {delta && (
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  isGrowthGoal
                                    ? (deltaPositive ? "text-green-600 bg-green-500/10" : "text-red-500 bg-red-500/10")
                                    : (deltaPositive ? "text-red-500 bg-red-500/10" : "text-green-600 bg-green-500/10")
                                }`}>
                                  {delta}
                                </span>
                              )}
                              {prog && (
                                <span className="text-[10px] text-muted-foreground">{prog.pct}%</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(entry.recorded_at)} · {formatTime(entry.recorded_at)}
                            </span>
                            {isCompleted && <span className="text-[10px] text-green-600 font-medium">🎉 Goal reached</span>}
                          </div>
                          {entry.note && (
                            <p className="text-xs text-muted-foreground italic">{entry.note}</p>
                          )}
                          {/* Mini progress bar */}
                          {prog && (
                            <div className="h-1 bg-muted rounded-full overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full ${isCompleted ? "bg-green-500" : isGrowthGoal ? "bg-primary" : "bg-orange-500"}`}
                                style={{ width: `${prog.pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Update Progress Dialog ────────────────────────────────────────────────────

function UpdateProgressDialog({
  goal,
  open,
  onClose,
  onSave,
}: {
  goal: LifeGoal;
  open: boolean;
  onClose: () => void;
  onSave: (newValue: string) => Promise<void>;
}) {
  const [newValue, setNewValue] = useState(goal.present_value);
  const [saving, setSaving] = useState(false);

  const currentProgress = goalProgress(goal.present_value, goal.target_value, goal.start_value);
  const previewProgress = goalProgress(newValue, goal.target_value, goal.start_value);

  const progressBarColor = (dir: "up" | "down") =>
    dir === "up" ? "bg-primary" : "bg-orange-500";

  async function handleSave() {
    if (!newValue.trim()) return;
    setSaving(true);
    await onSave(newValue.trim());
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            Update Progress
          </DialogTitle>
          <DialogDescription>{goal.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Current → Target */}
          <div className="flex items-center justify-between gap-2 text-sm p-3 rounded-lg bg-muted/40">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Current</p>
              <p className="font-semibold">{goal.present_value || "—"}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Target</p>
              <p className="font-semibold text-primary">{goal.target_value || "—"}</p>
            </div>
          </div>

          {/* New value input */}
          <div className="space-y-1.5">
            <Label className="text-xs">New Current Value</Label>
            <Input
              autoFocus
              placeholder={`e.g. ${goal.target_value || "56 kg"}`}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
            />
            <p className="text-[10px] text-muted-foreground">
              Use the same format as your target — e.g. &quot;1.4 lakhs&quot;, &quot;56 kg&quot;, &quot;₹26,000&quot;
            </p>
          </div>

          {/* Progress preview */}
          {(currentProgress || previewProgress) && (
            <div className="space-y-2 p-3 rounded-lg border">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Progress Preview</p>

              {currentProgress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Before</span>
                    <span>{currentProgress.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${progressBarColor(currentProgress.direction)} opacity-40`}
                      style={{ width: `${currentProgress.pct}%` }}
                    />
                  </div>
                </div>
              )}

              {previewProgress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>After</span>
                    <span className="font-semibold text-foreground">{previewProgress.pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressBarColor(previewProgress.direction)}`}
                      style={{ width: `${previewProgress.pct}%` }}
                    />
                  </div>
                  {previewProgress.pct >= 100 && (
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <Trophy className="h-3 w-3" /> Goal achieved! 🎉
                    </p>
                  )}
                  {currentProgress && previewProgress.pct > currentProgress.pct && (
                    <p className="text-xs text-primary font-medium">
                      +{previewProgress.pct - currentProgress.pct}% improvement
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !newValue.trim()}>
              {saving ? "Saving…" : "Update Progress"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Goal Dialog ─────────────────────────────────────────────────────────

function EditGoalDialog({
  goal,
  open,
  onClose,
  onSave,
}: {
  goal: LifeGoal;
  open: boolean;
  onClose: () => void;
  onSave: (fields: Partial<LifeGoal>) => Promise<void>;
}) {
  const [title, setTitle] = useState(goal.title);
  const [present, setPresent] = useState(goal.present_value);
  const [target, setTarget] = useState(goal.target_value);
  const [category, setCategory] = useState(goal.category ?? "general");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), present_value: present, target_value: target, category });
    setSaving(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Edit Goal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Goal Name</Label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Salary, Weight, Savings"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Value</Label>
              <Input
                value={present}
                onChange={(e) => setPresent(e.target.value)}
                placeholder="e.g. 56 kg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Value</Label>
              <Input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. 70 kg"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
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
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving || !title.trim()}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  isFirst,
  isLast,
  onUpdateProgress,
  onEdit,
  onDelete,
  onMove,
  onViewHistory,
}: {
  goal: LifeGoal;
  isFirst: boolean;
  isLast: boolean;
  onUpdateProgress: (goal: LifeGoal) => void;
  onEdit: (goal: LifeGoal) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onViewHistory: (goal: LifeGoal) => void;
}) {
  const progress = goalProgress(goal.present_value, goal.target_value, goal.start_value);
  const catMeta = HABIT_CATEGORIES.find((c) => c.value === (goal.category ?? "general")) ?? HABIT_CATEGORIES[5];
  const status = goalStatus(progress?.pct ?? null);
  const isCompleted = (progress?.pct ?? 0) >= 100;

  return (
    <div className={`group relative flex flex-col p-4 rounded-xl border bg-card space-y-3 transition-all
      ${isCompleted ? "border-green-500/40 bg-green-500/5" : "hover:border-primary/30"}
    `}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground leading-snug">{goal.title}</p>
            {isCompleted && <Trophy className="h-3.5 w-3.5 text-green-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${catMeta.bg} ${catMeta.color}`}>
              {catMeta.label}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Reorder + delete (hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(goal.id, "up")} disabled={isFirst}>
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(goal.id, "down")} disabled={isLast}>
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(goal.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Values */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Current</p>
          <p className="text-lg font-bold text-foreground leading-tight">
            {goal.present_value || <span className="text-sm text-muted-foreground font-normal italic">not set</span>}
          </p>
        </div>
        {progress && (
          <div className="flex items-center gap-1">
            {progress.direction === "up"
              ? <TrendingUp className="h-4 w-4 text-green-500" />
              : <TrendingDown className="h-4 w-4 text-orange-500" />
            }
          </div>
        )}
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Target</p>
          <p className="text-lg font-bold text-primary leading-tight">
            {goal.target_value || <span className="text-sm text-muted-foreground font-normal italic">not set</span>}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          {progress ? (
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isCompleted ? "bg-green-500" : progress.direction === "up" ? "bg-primary" : "bg-orange-500"
              }`}
              style={{ width: `${progress.pct}%` }}
            />
          ) : (
            <div className="h-full w-0" />
          )}
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{progress ? `${progress.pct}%` : "Set values to track progress"}</span>
          {isCompleted && <span className="text-green-600 font-medium">Goal reached! 🎉</span>}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 pt-0.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={() => onUpdateProgress(goal)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Update
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={() => onViewHistory(goal)}
        >
          <History className="h-3.5 w-3.5" />
          History
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={() => onEdit(goal)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const { journey } = useDailyTracker();
  const [goals, setGoals] = useState<LifeGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [addDialog, setAddDialog] = useState(false);
  const [updateGoal, setUpdateGoal] = useState<LifeGoal | null>(null);
  const [editGoal, setEditGoal] = useState<LifeGoal | null>(null);
  const [historyGoal, setHistoryGoal] = useState<LifeGoal | null>(null);

  // Add form
  const [newTitle, setNewTitle] = useState("");
  const [newPresent, setNewPresent] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  useEffect(() => {
    if (!journey) return;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/daily-tracker/life-goals?journey_id=${journey!.id}`);
        setGoals((await res.json()) ?? []);
      } catch {
        toast.error("Failed to load goals");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [journey]);

  async function addGoal() {
    if (!newTitle.trim() || !journey) return;
    try {
      const res = await fetch("/api/daily-tracker/life-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          journey_id: journey.id,
          title: newTitle.trim(),
          present_value: newPresent,
          target_value: newTarget,
          order_index: goals.length,
          category: newCategory,
        }),
      });
      if (!res.ok) throw new Error();
      const newGoal = await res.json();
      setGoals((prev) => [...prev, newGoal]);
      setNewTitle(""); setNewPresent(""); setNewTarget(""); setNewCategory("general");
      setAddDialog(false);
      toast.success("Goal added");
    } catch {
      toast.error("Failed to add goal");
    }
  }

  async function patchGoal(id: string, fields: Partial<LifeGoal>) {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, ...fields } : g));
    await fetch(`/api/daily-tracker/life-goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
  }

  async function updateProgress(newValue: string) {
    if (!updateGoal) return;
    await patchGoal(updateGoal.id, { present_value: newValue });
    // Record in history
    await fetch(`/api/daily-tracker/life-goals/${updateGoal.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newValue }),
    });
    toast.success("Progress updated");
  }

  async function editGoalSave(fields: Partial<LifeGoal>) {
    if (!editGoal) return;
    await patchGoal(editGoal.id, fields);
    toast.success("Goal updated");
  }

  async function deleteGoal(id: string) {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    try {
      await fetch(`/api/daily-tracker/life-goals/${id}`, { method: "DELETE" });
      toast.success("Goal deleted");
    } catch {
      toast.error("Failed to delete goal");
    }
  }

  async function moveGoal(id: string, dir: "up" | "down") {
    const idx = goals.findIndex((g) => g.id === id);
    if ((dir === "up" && idx === 0) || (dir === "down" && idx === goals.length - 1)) return;
    const next = [...goals];
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    const updated = next.map((g, i) => ({ ...g, order_index: i }));
    setGoals(updated);
    await Promise.all([
      fetch(`/api/daily-tracker/life-goals/${updated[idx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_index: updated[idx].order_index }) }),
      fetch(`/api/daily-tracker/life-goals/${updated[swapIdx].id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_index: updated[swapIdx].order_index }) }),
    ]);
  }

  // Summary stats
  const total = goals.length;
  const onTrack = goals.filter((g) => { const p = goalProgress(g.present_value, g.target_value, g.start_value); return p && p.pct >= 50 && p.pct < 100; }).length;
  const completed = goals.filter((g) => { const p = goalProgress(g.present_value, g.target_value, g.start_value); return p && p.pct >= 100; }).length;
  const overallPct = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => { const p = goalProgress(g.present_value, g.target_value, g.start_value); return sum + (p?.pct ?? 0); }, 0) / goals.length)
    : 0;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 pb-10">

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: total, icon: Star, color: "text-amber-500" },
          { label: "In Progress", value: onTrack, icon: Target, color: "text-blue-500" },
          { label: "Completed", value: completed, icon: Trophy, color: "text-green-500" },
          { label: "Avg Progress", value: `${overallPct}%`, icon: TrendingUp, color: "text-primary" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-3 text-center space-y-1">
              <Icon className={`h-4 w-4 mx-auto ${color}`} />
              <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── How to use tip ── */}
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
        <RefreshCw className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <span>
          Tap <span className="font-medium text-foreground">Update Progress</span> on any goal to record your latest value and watch the progress bar advance.
          Use formats like <span className="font-medium text-foreground">&quot;56 kg&quot;</span>, <span className="font-medium text-foreground">&quot;1.4 lakhs&quot;</span>, <span className="font-medium text-foreground">&quot;₹26,000&quot;</span>.
        </span>
      </div>

      {/* ── Goals List ── */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              <h2 className="font-semibold text-sm">Life Goals</h2>
              {total > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{total}</Badge>}
            </div>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setAddDialog(true)}>
              <Plus className="h-3.5 w-3.5" />Add Goal
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : goals.length === 0 ? (
            <div className="px-4 py-12 text-center space-y-3">
              <Star className="h-10 w-10 text-muted-foreground/20 mx-auto" />
              <div>
                <p className="text-sm font-medium text-foreground">No goals yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add a life goal with a current and target value to track your progress</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setAddDialog(true)}>
                <Plus className="h-3.5 w-3.5" />Add your first goal
              </Button>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {goals.map((goal, i) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isFirst={i === 0}
                  isLast={i === goals.length - 1}
                  onUpdateProgress={setUpdateGoal}
                  onEdit={setEditGoal}
                  onDelete={deleteGoal}
                  onMove={moveGoal}
                  onViewHistory={setHistoryGoal}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add Goal Dialog ── */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Add Life Goal
            </DialogTitle>
            <DialogDescription>
              Set a goal with your current value and where you want to be.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Goal Name</Label>
              <Input
                autoFocus
                placeholder="e.g. Salary, Weight, Savings, Steps/day"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGoal()}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Current Value</Label>
                <Input placeholder="e.g. 1.4 lakhs" value={newPresent} onChange={(e) => setNewPresent(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Target Value</Label>
                <Input placeholder="e.g. 2 lakhs" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HABIT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Tip: Use numeric formats like &quot;56 kg&quot;, &quot;1.4 lakhs&quot;, &quot;₹26,000&quot; for automatic progress calculation.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addGoal} disabled={!newTitle.trim()}>Add Goal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Update Progress Dialog ── */}
      {updateGoal && (
        <UpdateProgressDialog
          key={updateGoal.id}
          goal={updateGoal}
          open={!!updateGoal}
          onClose={() => setUpdateGoal(null)}
          onSave={updateProgress}
        />
      )}

      {/* ── Edit Goal Dialog ── */}
      {editGoal && (
        <EditGoalDialog
          key={editGoal.id}
          goal={editGoal}
          open={!!editGoal}
          onClose={() => setEditGoal(null)}
          onSave={editGoalSave}
        />
      )}

      {/* ── Progress History Dialog ── */}
      {historyGoal && (
        <ProgressHistoryDialog
          key={historyGoal.id}
          goal={historyGoal}
          open={!!historyGoal}
          onClose={() => setHistoryGoal(null)}
        />
      )}
    </div>
  );
}
