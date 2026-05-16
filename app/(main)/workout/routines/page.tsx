"use client";

import { useState } from "react";
import { useWorkout, Exercise, RoutineExercise } from "../workout-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Trash2,
  Edit2,
  Dumbbell,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { ExerciseImage } from "@/components/workout/ExerciseImage";

const MUSCLE_GROUPS = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Other"];

// ─── Exercise Picker ──────────────────────────────────────────────────────────

function ExercisePicker({
  exercises,
  onSelect,
  onClose,
}: {
  exercises: Exercise[];
  onSelect: (ex: Exercise) => void;
  onClose: () => void;
}) {
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
        <Input placeholder="Search exercises…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="flex gap-2 flex-wrap">
        {MUSCLE_GROUPS.map((mg) => (
          <button
            key={mg}
            type="button"
            onClick={() => setMuscleFilter(mg)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              muscleFilter === mg ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {mg}
          </button>
        ))}
      </div>
      <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
        {Object.entries(grouped).map(([mg, items]) => (
          <div key={mg}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1">{mg}</p>
            <div className="space-y-0.5">
              {items.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => { onSelect(ex); onClose(); }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent text-sm text-left transition-colors"
                >
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
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No exercises found</p>
        )}
      </div>
    </div>
  );
}

// ─── Routine Form ─────────────────────────────────────────────────────────────

type DraftExercise = Omit<RoutineExercise, "id"> & { _key: string };

function RoutineForm({
  initial,
  exercises,
  onSave,
  onCancel,
}: {
  initial?: { name: string; description: string; exercises: DraftExercise[] };
  exercises: Exercise[];
  onSave: (name: string, description: string, exercises: DraftExercise[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>(initial?.exercises ?? []);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const addExercise = (ex: Exercise) => {
    setDraftExercises((prev) => [
      ...prev,
      {
        _key: `${ex.id}-${Date.now()}`,
        exercise_id: ex.id,
        exercise_name: ex.name,
        default_sets: 3,
        default_reps: 10,
        default_weight: null,
        order_index: prev.length,
      },
    ]);
  };

  const updateExercise = (key: string, field: keyof DraftExercise, value: number | null) => {
    setDraftExercises((prev) =>
      prev.map((e) => (e._key === key ? { ...e, [field]: value } : e))
    );
  };

  const removeExercise = (key: string) => {
    setDraftExercises((prev) => prev.filter((e) => e._key !== key));
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Routine name is required"); return; }
    setSaving(true);
    try {
      await onSave(name.trim(), description.trim(), draftExercises);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Routine Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push Day, Full Body A" />
      </div>
      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Monday / Wednesday / Friday" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Exercises</Label>
          <Button size="sm" variant="outline" onClick={() => setShowPicker(true)} className="gap-1 h-7 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        {draftExercises.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
            No exercises added yet
          </div>
        ) : (
          <div className="space-y-2">
            {draftExercises.map((ex) => (
              <div key={ex._key} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm flex-1">{ex.exercise_name}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeExercise(ex._key)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Sets</Label>
                    <Input
                      type="number"
                      value={ex.default_sets}
                      onChange={(e) => updateExercise(ex._key, "default_sets", parseInt(e.target.value) || 1)}
                      className="h-8 text-sm"
                      min={1}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Reps</Label>
                    <Input
                      type="number"
                      value={ex.default_reps}
                      onChange={(e) => updateExercise(ex._key, "default_reps", parseInt(e.target.value) || 1)}
                      className="h-8 text-sm"
                      min={1}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Weight (kg)</Label>
                    <Input
                      type="number"
                      value={ex.default_weight ?? ""}
                      onChange={(e) => updateExercise(ex._key, "default_weight", e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-8 text-sm"
                      placeholder="—"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? "Saving…" : "Save Routine"}
        </Button>
      </div>

      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Exercise</DialogTitle>
          </DialogHeader>
          <ExercisePicker exercises={exercises} onSelect={addExercise} onClose={() => setShowPicker(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoutinesPage() {
  const { routines, exercises, loadingRoutines, fetchRoutines, deleteRoutine } = useWorkout();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const editingRoutine = routines.find((r) => r.id === editId);

  const handleCreate = async (name: string, description: string, exs: { exercise_id: string; exercise_name: string; default_sets: number; default_reps: number; default_weight: number | null; order_index: number }[]) => {
    const res = await fetch("/api/workout/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, exercises: exs }),
    });
    if (res.ok) {
      toast.success("Routine created");
      setShowCreate(false);
      await fetchRoutines();
    } else {
      toast.error("Failed to create routine");
    }
  };

  const handleUpdate = async (name: string, description: string, exs: { exercise_id: string; exercise_name: string; default_sets: number; default_reps: number; default_weight: number | null; order_index: number }[]) => {
    if (!editId) return;
    const res = await fetch(`/api/workout/routines/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, exercises: exs }),
    });
    if (res.ok) {
      toast.success("Routine updated");
      setEditId(null);
      await fetchRoutines();
    } else {
      toast.error("Failed to update routine");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this routine?")) return;
    await deleteRoutine(id);
    toast.success("Routine deleted");
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Routines</h1>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Routine
        </Button>
      </div>

      {loadingRoutines ? (
        <div className="text-center text-muted-foreground py-10">Loading…</div>
      ) : routines.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
            <p className="text-muted-foreground">No routines yet. Create one to get started!</p>
            <Button onClick={() => setShowCreate(true)} variant="outline">Create Routine</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {routines.map((routine) => {
            const isExpanded = expandedId === routine.id;
            return (
              <Card key={routine.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{routine.name}</CardTitle>
                      {routine.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{routine.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {routine.workout_routine_exercises.length} exercises
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(routine.id)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(routine.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setExpandedId(isExpanded ? null : routine.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && routine.workout_routine_exercises.length > 0 && (
                  <CardContent className="pt-0">
                    <div className="divide-y border rounded-md">
                      {[...routine.workout_routine_exercises]
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((ex) => (
                          <div key={ex.id} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span>{ex.exercise_name}</span>
                            <span className="text-muted-foreground text-xs">
                              {ex.default_sets} × {ex.default_reps}{ex.default_weight ? ` @ ${ex.default_weight}kg` : ""}
                            </span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Routine</DialogTitle>
          </DialogHeader>
          <RoutineForm exercises={exercises} onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Routine</DialogTitle>
          </DialogHeader>
          {editingRoutine && (
            <RoutineForm
              exercises={exercises}
              initial={{
                name: editingRoutine.name,
                description: editingRoutine.description ?? "",
                exercises: editingRoutine.workout_routine_exercises
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((e) => ({ ...e, _key: e.id })),
              }}
              onSave={handleUpdate}
              onCancel={() => setEditId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
