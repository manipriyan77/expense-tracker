"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWorkout, ActiveWorkoutExercise, Exercise } from "../workout-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Plus, Trash2, X, Search, Timer, Trophy, StickyNote, ChevronDown, ChevronUp } from "lucide-react";
import { ExerciseImage } from "@/components/workout/ExerciseImage";
import { toast } from "sonner";

const MUSCLE_GROUPS = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Other"];

// ─── Rest Timer ───────────────────────────────────────────────────────────────

function RestTimer({ onDismiss }: { onDismiss: () => void }) {
  const [seconds, setSeconds] = useState(90);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    if (seconds <= 0) { setRunning(false); return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, running]);

  const pct = Math.max(0, seconds / 90);
  const color = seconds > 30 ? "text-green-500" : seconds > 10 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 z-50 bg-card border rounded-xl shadow-lg p-4 flex items-center gap-3 min-w-[160px]">
      <div className="relative h-12 w-12 shrink-0">
        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2"
            strokeDasharray={`${pct * 100} 100`} strokeLinecap="round" className={color} />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${color}`}>{seconds}s</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium">Rest Timer</p>
        <div className="flex gap-1 mt-1">
          {[60, 90, 120, 180].map((s) => (
            <button key={s} type="button" onClick={() => { setSeconds(s); setRunning(true); }}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground">
              {s}s
            </button>
          ))}
        </div>
      </div>
      <button type="button" onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── PR Celebration ───────────────────────────────────────────────────────────

function PRCelebration({ prs, onDismiss }: { prs: string[]; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border rounded-2xl p-6 mx-4 max-w-sm w-full space-y-4 text-center">
        <div className="text-5xl">🏆</div>
        <h2 className="text-xl font-bold">New Personal Record{prs.length > 1 ? "s" : ""}!</h2>
        <div className="space-y-2">
          {prs.map((pr, i) => (
            <div key={i} className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2">
              <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
              <span className="text-sm font-medium">{pr}</span>
            </div>
          ))}
        </div>
        <Button onClick={onDismiss} className="w-full">Awesome! 💪</Button>
      </div>
    </div>
  );
}

// ─── Previous Performance Hint ────────────────────────────────────────────────

function PrevPerformance({ exerciseId }: { exerciseId: string | null }) {
  const [prev, setPrev] = useState<{ weight: number | null; reps: number | null; date: string } | null>(null);

  useEffect(() => {
    if (!exerciseId) return;
    fetch(`/api/workout/exercise-history?exercise_id=${exerciseId}&limit=1`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.[0]?.workout_log_sets?.length) {
          const completedSets = data[0].workout_log_sets.filter((s: { completed: boolean }) => s.completed);
          if (completedSets.length > 0) {
            const best = completedSets.reduce((b: { weight: number; reps: number } | null, s: { weight: number; reps: number }) =>
              !b || (s.weight ?? 0) > (b.weight ?? 0) ? s : b, null);
            setPrev({ weight: best?.weight ?? null, reps: best?.reps ?? null, date: data[0].workout_logs?.date ?? "" });
          }
        }
      })
      .catch(() => {});
  }, [exerciseId]);

  if (!prev) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
      <Timer className="h-3 w-3" />
      <span>Last: {prev.weight ? `${prev.weight}kg` : "—"} × {prev.reps ?? "—"} reps
        {prev.date ? ` · ${new Date(prev.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
      </span>
    </div>
  );
}

// ─── Exercise Picker ──────────────────────────────────────────────────────────

function ExercisePicker({ exercises, onSelect, onClose }: { exercises: Exercise[]; onSelect: (ex: Exercise) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("All");

  const filtered = exercises.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = muscleFilter === "All" || e.muscle_group === muscleFilter;
    return matchSearch && matchMuscle;
  });

  const grouped = MUSCLE_GROUPS.slice(1).reduce<Record<string, Exercise[]>>((acc, mg) => {
    const items = filtered.filter((e) => e.muscle_group === mg);
    if (items.length) acc[mg] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search exercises…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" autoFocus />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {MUSCLE_GROUPS.map((mg) => (
          <button key={mg} type="button" onClick={() => setMuscleFilter(mg)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${muscleFilter === mg ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {mg}
          </button>
        ))}
      </div>
      <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
        {Object.entries(grouped).map(([mg, items]) => (
          <div key={mg}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">{mg}</p>
            <div className="space-y-0.5">
              {items.map((ex) => (
                <button key={ex.id} type="button" onClick={() => { onSelect(ex); onClose(); }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent text-sm text-left transition-colors">
                  <ExerciseImage name={ex.name} muscleGroup={ex.muscle_group} variant="icon" className="shrink-0 h-10 w-10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <p className="text-xs text-muted-foreground">{ex.equipment}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No exercises found</p>}
      </div>
    </div>
  );
}

// ─── Set Row ─────────────────────────────────────────────────────────────────

function SetRow({ setNum, weight, reps, completed, onChange, onDelete, onComplete }:
  { setNum: number; weight: string; reps: string; completed: boolean;
    onChange: (field: "weight" | "reps", value: string) => void;
    onDelete: () => void; onComplete: () => void }) {
  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors ${completed ? "bg-green-500/10" : ""}`}>
      <span className="text-xs text-muted-foreground w-5 text-center font-medium">{setNum}</span>
      <Input type="number" placeholder="kg" value={weight}
        onChange={(e) => onChange("weight", e.target.value)}
        className="h-8 text-sm flex-1 text-center" inputMode="decimal" />
      <Input type="number" placeholder="reps" value={reps}
        onChange={(e) => onChange("reps", e.target.value)}
        className="h-8 text-sm flex-1 text-center" inputMode="numeric" />
      <button type="button" onClick={onComplete}
        className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors shrink-0 ${completed ? "bg-green-500 text-white" : "border border-input bg-background text-muted-foreground hover:bg-green-500/20"}`}>
        <Check className="h-4 w-4" />
      </button>
      <button type="button" onClick={onDelete} className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0">
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Exercise Card ────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, index, onChange, onRemove, onRestTimer, personalRecords }:
  { exercise: ActiveWorkoutExercise; index: number;
    onChange: (ex: ActiveWorkoutExercise) => void;
    onRemove: () => void; onRestTimer: () => void;
    personalRecords: { record_type: string; value: number }[] }) {

  const [showNotes, setShowNotes] = useState(false);
  const prHeaviest = personalRecords.find((p) => p.record_type === "heaviest_weight");
  const prE1RM = personalRecords.find((p) => p.record_type === "estimated_1rm");

  const addSet = () => {
    const last = exercise.sets[exercise.sets.length - 1];
    onChange({ ...exercise, sets: [...exercise.sets, { weight: last?.weight ?? "", reps: last?.reps ?? "", completed: false }] });
  };

  const updateSet = (i: number, field: "weight" | "reps", value: string) => {
    const sets = exercise.sets.map((s, si) => si === i ? { ...s, [field]: value } : s);
    onChange({ ...exercise, sets });
  };

  const completeSet = (i: number) => {
    const wasCompleted = exercise.sets[i].completed;
    const sets = exercise.sets.map((s, si) => si === i ? { ...s, completed: !s.completed } : s);
    onChange({ ...exercise, sets });
    if (!wasCompleted) onRestTimer();
  };

  const deleteSet = (i: number) => {
    onChange({ ...exercise, sets: exercise.sets.filter((_, si) => si !== i) });
  };

  const completedCount = exercise.sets.filter((s) => s.completed).length;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{exercise.exercise_name}</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-xs text-muted-foreground">{completedCount}/{exercise.sets.length} sets</p>
              {prHeaviest && <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-yellow-600 border-yellow-400 gap-0.5"><Trophy className="h-2.5 w-2.5" />{prHeaviest.value}kg PR</Badge>}
              {prE1RM && <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-blue-600 border-blue-400">e1RM {prE1RM.value}kg</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => setShowNotes((v) => !v)}
              className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${showNotes || exercise.notes ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <StickyNote className="h-3.5 w-3.5" />
            </button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Previous performance */}
        <PrevPerformance exerciseId={exercise.exercise_id} />

        {/* Notes */}
        {showNotes && (
          <Input
            placeholder="Exercise notes (optional)…"
            value={exercise.notes}
            onChange={(e) => onChange({ ...exercise, notes: e.target.value })}
            className="h-8 text-sm"
          />
        )}

        {/* Sets */}
        {exercise.sets.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-2 mb-1">
              <span className="text-xs text-muted-foreground w-5" />
              <span className="text-xs text-muted-foreground flex-1 text-center">Weight (kg)</span>
              <span className="text-xs text-muted-foreground flex-1 text-center">Reps</span>
              <span className="w-8" /><span className="w-8" />
            </div>
            <div className="space-y-1">
              {exercise.sets.map((s, i) => (
                <SetRow key={i} setNum={i + 1} weight={s.weight} reps={s.reps} completed={s.completed}
                  onChange={(f, v) => updateSet(i, f, v)}
                  onDelete={() => deleteSet(i)}
                  onComplete={() => completeSet(i)} />
              ))}
            </div>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={addSet} className="w-full gap-1 h-8 text-xs">
          <Plus className="h-3.5 w-3.5" /> Add Set
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Start Workout Form ───────────────────────────────────────────────────────

function StartWorkoutForm({ onStart, onCancel }: { onStart: (name: string, routineId: string | null, exs: ActiveWorkoutExercise[]) => void; onCancel: () => void }) {
  const { routines } = useWorkout();
  const searchParams = useSearchParams();
  const defaultRoutineId = searchParams.get("routine");

  const [name, setName] = useState("");
  const [routineId, setRoutineId] = useState<string>(defaultRoutineId ?? "blank");

  const selectedRoutine = routines.find((r) => r.id === routineId);

  // Auto-fill name from routine
  useEffect(() => {
    if (selectedRoutine && !name) setName(selectedRoutine.name);
  }, [selectedRoutine, name]);

  const handleStart = () => {
    if (!name.trim()) { toast.error("Name your workout"); return; }
    let exs: ActiveWorkoutExercise[] = [];
    if (selectedRoutine) {
      exs = [...selectedRoutine.workout_routine_exercises]
        .sort((a, b) => a.order_index - b.order_index)
        .map((re) => ({
          exercise_id: re.exercise_id,
          exercise_name: re.exercise_name,
          notes: "",
          sets: Array.from({ length: re.default_sets }, () => ({
            weight: re.default_weight ? String(re.default_weight) : "",
            reps: String(re.default_reps),
            completed: false,
          })),
        }));
    }
    onStart(name.trim(), selectedRoutine?.id ?? null, exs);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Workout Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push Day, Morning Session" autoFocus />
      </div>
      <div className="space-y-2">
        <Label>Start from routine</Label>
        <select value={routineId} onChange={(e) => { setRoutineId(e.target.value); setName(""); }}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="blank">Blank (empty workout)</option>
          {routines.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.workout_routine_exercises.length} exercises</option>)}
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleStart} className="flex-1">Start Workout</Button>
      </div>
    </div>
  );
}

// ─── Active Workout ───────────────────────────────────────────────────────────

function ActiveWorkoutView() {
  const { activeWorkout, updateActiveExercise, addExerciseToActive, removeExerciseFromActive, finishWorkout, cancelWorkout, exercises, personalRecords, clearNewPRs } = useWorkout();
  const router = useRouter();
  const [showPicker, setShowPicker] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [notes, setNotes] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [celebrationPRs, setCelebrationPRs] = useState<string[]>([]);
  const startRef = useRef(activeWorkout?.startedAt ?? Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}:${String(s % 60).padStart(2, "0")}`;
    return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  };

  const handleFinish = async () => {
    setFinishing(true);
    const newPRs = await finishWorkout(Math.round(elapsed / 60), notes);
    setFinishing(false);
    if (newPRs.length > 0) {
      setCelebrationPRs(newPRs);
    } else {
      toast.success("Workout logged! 💪");
      router.push("/workout/history");
    }
  };

  const handleAddExercise = (ex: Exercise) => {
    addExerciseToActive({ exercise_id: ex.id, exercise_name: ex.name, notes: "", sets: [{ weight: "", reps: "", completed: false }] });
  };

  if (!activeWorkout) return null;

  const totalSets = activeWorkout.exercises.reduce((s, e) => s + e.sets.length, 0);
  const completedSets = activeWorkout.exercises.reduce((s, e) => s + e.sets.filter((st) => st.completed).length, 0);
  const pct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  // Get PRs per exercise for display
  const prsByExercise = (exerciseId: string | null) => {
    if (!exerciseId) return [];
    return personalRecords.filter((p) => p.exercise_id === exerciseId);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-14 md:top-[57px] bg-background/95 backdrop-blur py-2 -mx-4 px-4 md:-mx-6 md:px-6 z-10 border-b">
        <div>
          <h1 className="text-base font-bold leading-tight">{activeWorkout.name}</h1>
          <p className="text-xs text-muted-foreground">{formatElapsed(elapsed)} · {completedSets}/{totalSets} sets · {pct}%</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { if (confirm("Cancel workout? All progress will be lost.")) cancelWorkout(); }}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => setShowFinish(true)} className="h-7 text-xs">Finish</Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      {/* Exercises */}
      {activeWorkout.exercises.map((ex, i) => (
        <ExerciseCard key={i} exercise={ex} index={i}
          onChange={(updated) => updateActiveExercise(i, updated)}
          onRemove={() => removeExerciseFromActive(i)}
          onRestTimer={() => setShowRestTimer(true)}
          personalRecords={prsByExercise(ex.exercise_id)} />
      ))}

      <Button variant="outline" className="w-full gap-2" onClick={() => setShowPicker(true)}>
        <Plus className="h-4 w-4" /> Add Exercise
      </Button>

      {/* Rest Timer */}
      {showRestTimer && <RestTimer onDismiss={() => setShowRestTimer(false)} />}

      {/* Exercise picker */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Exercise</DialogTitle></DialogHeader>
          <ExercisePicker exercises={exercises} onSelect={handleAddExercise} onClose={() => setShowPicker(false)} />
        </DialogContent>
      </Dialog>

      {/* Finish dialog */}
      <Dialog open={showFinish} onOpenChange={setShowFinish}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Finish Workout</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xl font-bold">{formatElapsed(elapsed)}</p>
                <p className="text-xs text-muted-foreground">Duration</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xl font-bold">{completedSets}</p>
                <p className="text-xs text-muted-foreground">Sets done</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xl font-bold">{activeWorkout.exercises.length}</p>
                <p className="text-xs text-muted-foreground">Exercises</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Workout Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it go?" rows={2} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFinish(false)} className="flex-1">Back</Button>
              <Button onClick={handleFinish} disabled={finishing} className="flex-1">
                {finishing ? "Saving…" : "Save Workout 🏁"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* PR Celebration */}
      {celebrationPRs.length > 0 && (
        <PRCelebration prs={celebrationPRs} onDismiss={() => {
          setCelebrationPRs([]);
          clearNewPRs();
          router.push("/workout/history");
        }} />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function WorkoutLogContent() {
  const { activeWorkout, startWorkout } = useWorkout();
  const router = useRouter();

  if (activeWorkout) return <ActiveWorkoutView />;

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-6">Start Workout</h1>
      <Card>
        <CardContent className="p-6">
          <StartWorkoutForm
            onStart={(name, routineId, exs) => startWorkout(name, routineId, exs)}
            onCancel={() => router.push("/workout")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default function WorkoutLogPage() {
  return <Suspense><WorkoutLogContent /></Suspense>;
}
