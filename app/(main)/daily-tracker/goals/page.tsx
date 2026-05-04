"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  LayoutGrid,
  List,
  Lightbulb,
  StickyNote,
  ChevronDown,
  ChevronUp,
  Zap,
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
    if (t === 0) return null;
    return { pct: Math.min(100, Math.round((p / t) * 100)), direction: "up" };
  } else {
    const s = start ? parseNumeric(start) : null;
    if (s === null || s <= t) {
      return { pct: p <= t ? 100 : 0, direction: "down" };
    }
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

// ─── Circular Progress Ring ───────────────────────────────────────────────────

function CircularRing({
  pct,
  direction,
  size = 72,
  stroke = 6,
}: {
  pct: number;
  direction: "up" | "down";
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 100 ? "#22c55e" : direction === "up" ? "hsl(var(--primary))" : "#f97316";

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
    </svg>
  );
}

// ─── Milestone Progress Bar ───────────────────────────────────────────────────

function MilestoneBar({ pct, direction }: { pct: number; direction: "up" | "down" }) {
  const isCompleted = pct >= 100;
  const barColor = isCompleted
    ? "bg-green-500"
    : direction === "up" ? "bg-primary" : "bg-orange-500";

  return (
    <div className="relative">
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Milestone markers */}
      {[25, 50, 75].map((m) => (
        <div
          key={m}
          className={`absolute top-0 bottom-0 w-0.5 rounded-full transition-colors ${
            pct >= m ? "bg-background/60" : "bg-muted-foreground/20"
          }`}
          style={{ left: `${m}%`, transform: "translateX(-50%)" }}
        />
      ))}
    </div>
  );
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

  const byMonth = history.reduce<Record<string, ProgressEntry[]>>((acc, entry) => {
    const key = new Date(entry.recorded_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const chartEntries = history.filter((e) => parseNumeric(e.value) !== null);

  function barHeight(val: number): number {
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

            {Object.entries(byMonth).reverse().map(([month, entries]) => (
              <div key={month} className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{month}</span>
                </div>
                <div className="space-y-1.5 ml-5">
                  {[...entries].reverse().map((entry) => {
                    const globalIdx = history.findIndex((h) => h.id === entry.id);
                    const delta = getDelta(entry, globalIdx);
                    const prog = goalProgress(entry.value, goal.target_value, goal.start_value);
                    const isCompleted = (prog?.pct ?? 0) >= 100;
                    const deltaPositive = delta && !delta.startsWith("-");

                    return (
                      <div key={entry.id} className="flex items-start gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/20 transition-colors">
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
                              {prog && <span className="text-[10px] text-muted-foreground">{prog.pct}%</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(entry.recorded_at)} · {formatTime(entry.recorded_at)}
                            </span>
                            {isCompleted && <span className="text-[10px] text-green-600 font-medium">🎉 Goal reached</span>}
                          </div>
                          {entry.note && <p className="text-xs text-muted-foreground italic">{entry.note}</p>}
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
  onSave: (newValue: string, note: string) => Promise<void>;
}) {
  const [newValue, setNewValue] = useState(goal.present_value);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const currentProgress = goalProgress(goal.present_value, goal.target_value, goal.start_value);
  const previewProgress = goalProgress(newValue, goal.target_value, goal.start_value);
  const barColor = (dir: "up" | "down") => dir === "up" ? "bg-primary" : "bg-orange-500";

  async function handleSave() {
    if (!newValue.trim()) return;
    setSaving(true);
    await onSave(newValue.trim(), note.trim());
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

          <div className="space-y-1.5">
            <Label className="text-xs">Note (optional)</Label>
            <Textarea
              placeholder="What helped you make this progress?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-16 resize-none text-xs"
            />
          </div>

          {(currentProgress || previewProgress) && (
            <div className="space-y-2 p-3 rounded-lg border">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Progress Preview</p>
              {currentProgress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Before</span><span>{currentProgress.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor(currentProgress.direction)} opacity-40`}
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
                      className={`h-full rounded-full transition-all duration-500 ${barColor(previewProgress.direction)}`}
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
  const [notes, setNotes] = useState(goal.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave({ title: title.trim(), present_value: present, target_value: target, category, notes });
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
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Salary, Weight, Savings" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Value</Label>
              <Input value={present} onChange={(e) => setPresent(e.target.value)} placeholder="e.g. 56 kg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Target Value</Label>
              <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 70 kg" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HABIT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              placeholder="Add context, milestones, or notes for this goal…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20 resize-none text-xs"
            />
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

// ─── Goal Card (Grid) ─────────────────────────────────────────────────────────

function GoalCardGrid({
  goal,
  isFirst,
  isLast,
  onUpdateProgress,
  onEdit,
  onDelete,
  onMove,
  onViewHistory,
}: GoalCardProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const progress = goalProgress(goal.present_value, goal.target_value, goal.start_value);
  const catMeta = HABIT_CATEGORIES.find((c) => c.value === (goal.category ?? "general")) ?? HABIT_CATEGORIES[5];
  const status = goalStatus(progress?.pct ?? null);
  const isCompleted = (progress?.pct ?? 0) >= 100;
  const pct = progress?.pct ?? 0;

  return (
    <div className={`group relative flex flex-col p-4 rounded-xl border bg-card space-y-3 transition-all
      ${isCompleted ? "border-green-500/40 bg-green-500/5" : "hover:border-primary/30 hover:shadow-sm"}
    `}>
      {/* Reorder/Delete (hover) */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onMove(goal.id, "up")} disabled={isFirst}>
          <ArrowUp className="h-2.5 w-2.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onMove(goal.id, "down")} disabled={isLast}>
          <ArrowDown className="h-2.5 w-2.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => onDelete(goal.id)}>
          <Trash2 className="h-2.5 w-2.5" />
        </Button>
      </div>

      {/* Top: ring + title */}
      <div className="flex items-start gap-3">
        {/* Circular ring */}
        <div className="relative shrink-0">
          {progress ? (
            <>
              <CircularRing pct={pct} direction={progress.direction} size={60} stroke={5} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold leading-none">{pct}%</span>
              </div>
            </>
          ) : (
            <div className="h-[60px] w-[60px] rounded-full border-2 border-muted flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">—</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pt-1 space-y-1 pr-8">
          <p className="text-sm font-semibold text-foreground leading-snug truncate">{goal.title}</p>
          {isCompleted && (
            <p className="text-[10px] text-green-600 font-medium flex items-center gap-1">
              <Trophy className="h-3 w-3" /> Goal reached!
            </p>
          )}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${catMeta.bg} ${catMeta.color}`}>
              {catMeta.label}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${status.bg} ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current</p>
          <p className="text-base font-bold text-foreground leading-tight">
            {goal.present_value || <span className="text-xs text-muted-foreground italic font-normal">not set</span>}
          </p>
        </div>
        <div className="flex items-center">
          {progress?.direction === "up"
            ? <TrendingUp className="h-4 w-4 text-green-500" />
            : progress?.direction === "down"
            ? <TrendingDown className="h-4 w-4 text-orange-500" />
            : null}
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Target</p>
          <p className="text-base font-bold text-primary leading-tight">
            {goal.target_value || <span className="text-xs text-muted-foreground italic font-normal">not set</span>}
          </p>
        </div>
      </div>

      {/* Milestone progress bar */}
      {progress ? (
        <div className="space-y-1.5">
          <MilestoneBar pct={pct} direction={progress.direction} />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
            <span>25%</span><span>50%</span><span>75%</span>
          </div>
        </div>
      ) : (
        <div className="h-2.5 bg-muted rounded-full" />
      )}

      {/* Notes expandable */}
      {goal.notes && (
        <button
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors text-left"
          onClick={() => setNotesOpen((v) => !v)}
        >
          <StickyNote className="h-3 w-3 shrink-0" />
          <span className="truncate flex-1">{notesOpen ? "Hide notes" : goal.notes}</span>
          {notesOpen ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
        </button>
      )}
      {notesOpen && goal.notes && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5 leading-relaxed -mt-1">
          {goal.notes}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-1.5 pt-0.5">
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1.5" onClick={() => onUpdateProgress(goal)}>
          <RefreshCw className="h-3.5 w-3.5" /> Update
        </Button>
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1.5" onClick={() => onViewHistory(goal)}>
          <History className="h-3.5 w-3.5" /> History
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={() => onEdit(goal)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Goal Card (List) ─────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: LifeGoal;
  isFirst: boolean;
  isLast: boolean;
  onUpdateProgress: (goal: LifeGoal) => void;
  onEdit: (goal: LifeGoal) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: "up" | "down") => void;
  onViewHistory: (goal: LifeGoal) => void;
}

function GoalCardList({
  goal,
  isFirst,
  isLast,
  onUpdateProgress,
  onEdit,
  onDelete,
  onMove,
  onViewHistory,
}: GoalCardProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const progress = goalProgress(goal.present_value, goal.target_value, goal.start_value);
  const catMeta = HABIT_CATEGORIES.find((c) => c.value === (goal.category ?? "general")) ?? HABIT_CATEGORIES[5];
  const status = goalStatus(progress?.pct ?? null);
  const isCompleted = (progress?.pct ?? 0) >= 100;
  const pct = progress?.pct ?? 0;

  return (
    <div className={`group flex flex-col gap-2.5 p-3.5 rounded-xl border bg-card transition-all
      ${isCompleted ? "border-green-500/40 bg-green-500/5" : "hover:border-primary/30 hover:shadow-sm"}
    `}>
      <div className="flex items-center gap-3">
        {/* Mini ring */}
        <div className="relative shrink-0">
          {progress ? (
            <>
              <CircularRing pct={pct} direction={progress.direction} size={44} stroke={4} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-bold">{pct}%</span>
              </div>
            </>
          ) : (
            <div className="h-11 w-11 rounded-full border-2 border-muted" />
          )}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground leading-tight">{goal.title}</p>
            {isCompleted && <Trophy className="h-3.5 w-3.5 text-green-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${catMeta.bg} ${catMeta.color}`}>{catMeta.label}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${status.bg} ${status.color}`}>{status.label}</span>
          </div>
        </div>

        {/* Values */}
        <div className="flex items-center gap-3 shrink-0 text-right">
          <div>
            <p className="text-[10px] text-muted-foreground">Current</p>
            <p className="text-sm font-bold">{goal.present_value || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Target</p>
            <p className="text-sm font-bold text-primary">{goal.target_value || "—"}</p>
          </div>
        </div>

        {/* Reorder/Delete (hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(goal.id, "up")} disabled={isFirst}>
            <ArrowUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onMove(goal.id, "down")} disabled={isLast}>
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(goal.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Milestone bar */}
      {progress ? (
        <div className="space-y-1">
          <MilestoneBar pct={pct} direction={progress.direction} />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>25%</span><span>50%</span><span>75%</span><span>100%</span>
          </div>
        </div>
      ) : (
        <div className="h-2.5 bg-muted rounded-full" />
      )}

      {/* Notes + Actions */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 flex-1">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 px-2.5" onClick={() => onUpdateProgress(goal)}>
            <RefreshCw className="h-3 w-3" /> Update
          </Button>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 px-2.5" onClick={() => onViewHistory(goal)}>
            <History className="h-3 w-3" /> History
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(goal)}>
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
        {goal.notes && (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground px-2" onClick={() => setNotesOpen((v) => !v)}>
            <StickyNote className="h-3 w-3" />
            Notes
          </Button>
        )}
      </div>

      {notesOpen && goal.notes && (
        <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5 leading-relaxed">
          {goal.notes}
        </p>
      )}
    </div>
  );
}

// ─── Insights Panel ───────────────────────────────────────────────────────────

function InsightsPanel({ goals }: { goals: LifeGoal[] }) {
  const insights: { icon: React.ReactNode; text: string; color: string }[] = [];

  const completed = goals.filter((g) => (goalProgress(g.present_value, g.target_value, g.start_value)?.pct ?? 0) >= 100);
  const nearlyDone = goals.filter((g) => {
    const p = goalProgress(g.present_value, g.target_value, g.start_value);
    return p && p.pct >= 75 && p.pct < 100;
  });
  const needsAttention = goals.filter((g) => {
    const p = goalProgress(g.present_value, g.target_value, g.start_value);
    return !p || p.pct < 25;
  });
  const onTrack = goals.filter((g) => {
    const p = goalProgress(g.present_value, g.target_value, g.start_value);
    return p && p.pct >= 50 && p.pct < 75;
  });

  if (completed.length > 0)
    insights.push({ icon: <Trophy className="h-3.5 w-3.5" />, text: `${completed.length} goal${completed.length > 1 ? "s" : ""} completed — celebrate! 🎉`, color: "text-green-600 bg-green-500/10" });
  if (nearlyDone.length > 0)
    insights.push({ icon: <Zap className="h-3.5 w-3.5" />, text: `${nearlyDone.length} goal${nearlyDone.length > 1 ? "s are" : " is"} 75%+ done — push through!`, color: "text-blue-600 bg-blue-500/10" });
  if (onTrack.length > 0)
    insights.push({ icon: <TrendingUp className="h-3.5 w-3.5" />, text: `${onTrack.length} goal${onTrack.length > 1 ? "s are" : " is"} on track — keep the momentum`, color: "text-primary bg-primary/10" });
  if (needsAttention.length > 0)
    insights.push({ icon: <Target className="h-3.5 w-3.5" />, text: `${needsAttention.length} goal${needsAttention.length > 1 ? "s need" : " needs"} attention — log an update`, color: "text-orange-600 bg-orange-500/10" });
  if (insights.length === 0)
    insights.push({ icon: <Lightbulb className="h-3.5 w-3.5" />, text: "Add goals and update progress regularly to see insights here.", color: "text-muted-foreground bg-muted/50" });

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold">Insights</h3>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {insights.map((ins, i) => (
          <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${ins.color}`}>
            {ins.icon}
            <span>{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ALL_CATEGORIES = [{ value: "all", label: "All" }, ...HABIT_CATEGORIES];

export default function GoalsPage() {
  const { journey } = useDailyTracker();
  const [goals, setGoals] = useState<LifeGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeCategory, setActiveCategory] = useState("all");
  const noteDebounce = useRef<Record<string, NodeJS.Timeout>>({});

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
  const [newNotes, setNewNotes] = useState("");

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

  const filteredGoals = activeCategory === "all"
    ? goals
    : goals.filter((g) => (g.category ?? "general") === activeCategory);

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
          notes: newNotes,
        }),
      });
      if (!res.ok) throw new Error();
      const newGoal = await res.json();
      setGoals((prev) => [...prev, newGoal]);
      setNewTitle(""); setNewPresent(""); setNewTarget(""); setNewCategory("general"); setNewNotes("");
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

  async function updateProgress(newValue: string, note: string) {
    if (!updateGoal) return;
    await patchGoal(updateGoal.id, { present_value: newValue });
    await fetch(`/api/daily-tracker/life-goals/${updateGoal.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: newValue, note }),
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

  // Inline notes save (debounced)
  function handleNoteChange(id: string, notes: string) {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, notes } : g));
    clearTimeout(noteDebounce.current[id]);
    noteDebounce.current[id] = setTimeout(() => {
      fetch(`/api/daily-tracker/life-goals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    }, 800);
  }
  void handleNoteChange; // available but used through edit dialog

  // Summary stats
  const total = goals.length;
  const completed = goals.filter((g) => (goalProgress(g.present_value, g.target_value, g.start_value)?.pct ?? 0) >= 100).length;
  const onTrack = goals.filter((g) => { const p = goalProgress(g.present_value, g.target_value, g.start_value); return p && p.pct >= 50 && p.pct < 100; }).length;
  const overallPct = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => { const p = goalProgress(g.present_value, g.target_value, g.start_value); return sum + (p?.pct ?? 0); }, 0) / goals.length)
    : 0;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4 pb-10">

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: total, icon: Star, color: "text-amber-500" },
          { label: "On Track", value: onTrack, icon: Target, color: "text-blue-500" },
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

      {/* ── Insights ── */}
      {goals.length > 0 && <InsightsPanel goals={goals} />}

      {/* ── Filter tabs + view toggle ── */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {ALL_CATEGORIES.map((cat) => {
            const count = cat.value === "all" ? goals.length : goals.filter((g) => (g.category ?? "general") === cat.value).length;
            if (cat.value !== "all" && count === 0) return null;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat.label}
                {count > 0 && (
                  <span className={`text-[10px] px-1 rounded-full ${activeCategory === cat.value ? "bg-primary-foreground/20" : "bg-muted-foreground/20"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 shrink-0 rounded-lg border p-0.5">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("list")}
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs shrink-0" onClick={() => setAddDialog(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Goal
        </Button>
      </div>

      {/* ── Goals ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <Star className="h-10 w-10 text-muted-foreground/20 mx-auto" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {activeCategory === "all" ? "No goals yet" : `No ${activeCategory} goals`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCategory === "all"
                ? "Add a life goal with current and target values to track your progress"
                : "Try a different category or add a new goal"}
            </p>
          </div>
          {activeCategory === "all" && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setAddDialog(true)}>
              <Plus className="h-3.5 w-3.5" /> Add your first goal
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredGoals.map((goal, i) => (
            <GoalCardGrid
              key={goal.id}
              goal={goal}
              isFirst={i === 0}
              isLast={i === filteredGoals.length - 1}
              onUpdateProgress={setUpdateGoal}
              onEdit={setEditGoal}
              onDelete={deleteGoal}
              onMove={moveGoal}
              onViewHistory={setHistoryGoal}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGoals.map((goal, i) => (
            <GoalCardList
              key={goal.id}
              goal={goal}
              isFirst={i === 0}
              isLast={i === filteredGoals.length - 1}
              onUpdateProgress={setUpdateGoal}
              onEdit={setEditGoal}
              onDelete={deleteGoal}
              onMove={moveGoal}
              onViewHistory={setHistoryGoal}
            />
          ))}
        </div>
      )}

      {/* ── Add Goal Dialog ── */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Add Life Goal
            </DialogTitle>
            <DialogDescription>Set a goal with your current value and where you want to be.</DialogDescription>
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
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                placeholder="Add context or milestones for this goal…"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="h-16 resize-none text-xs"
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Tip: Use formats like &quot;56 kg&quot;, &quot;1.4 lakhs&quot;, &quot;₹26,000&quot; for automatic progress calculation.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAddDialog(false)}>Cancel</Button>
              <Button className="flex-1" onClick={addGoal} disabled={!newTitle.trim()}>Add Goal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Update Progress ── */}
      {updateGoal && (
        <UpdateProgressDialog
          key={updateGoal.id}
          goal={updateGoal}
          open={!!updateGoal}
          onClose={() => setUpdateGoal(null)}
          onSave={updateProgress}
        />
      )}

      {/* ── Edit Goal ── */}
      {editGoal && (
        <EditGoalDialog
          key={editGoal.id}
          goal={editGoal}
          open={!!editGoal}
          onClose={() => setEditGoal(null)}
          onSave={editGoalSave}
        />
      )}

      {/* ── Progress History ── */}
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
