"use client";

import { useState } from "react";
import { useWorkout, WorkoutProgram } from "../workout-context";
import { useRouter } from "next/navigation";
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
  Plus,
  Trash2,
  Edit2,
  Play,
  Square,
  CalendarDays,
  ChevronRight,
  Dumbbell,
  CheckCircle2,
  Coffee,
} from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

const PRESET_PROGRAMS = [
  {
    name: "Push / Pull / Legs (PPL)",
    description: "Classic 6-day PPL split for muscle hypertrophy",
    template: [
      { day: 1, label: "Push A" },
      { day: 2, label: "Pull A" },
      { day: 3, label: "Legs A" },
      { day: 4, label: "Push B" },
      { day: 5, label: "Pull B" },
      { day: 6, label: "Legs B" },
      { day: 7, label: "Rest" },
    ],
  },
  {
    name: "Upper / Lower Split",
    description: "4-day upper/lower split for strength and hypertrophy",
    template: [
      { day: 1, label: "Upper A" },
      { day: 2, label: "Lower A" },
      { day: 3, label: "Rest" },
      { day: 4, label: "Upper B" },
      { day: 5, label: "Lower B" },
      { day: 6, label: "Rest" },
      { day: 7, label: "Rest" },
    ],
  },
  {
    name: "Full Body 3x",
    description: "3-day full body workouts for beginners",
    template: [
      { day: 1, label: "Full Body A" },
      { day: 2, label: "Rest" },
      { day: 3, label: "Full Body B" },
      { day: 4, label: "Rest" },
      { day: 5, label: "Full Body C" },
      { day: 6, label: "Rest" },
      { day: 7, label: "Rest" },
    ],
  },
  {
    name: "Bro Split (5-day)",
    description: "Classic bodybuilding split — one muscle group per day",
    template: [
      { day: 1, label: "Chest" },
      { day: 2, label: "Back" },
      { day: 3, label: "Shoulders" },
      { day: 4, label: "Arms" },
      { day: 5, label: "Legs" },
      { day: 6, label: "Rest" },
      { day: 7, label: "Rest" },
    ],
  },
];

// ─── Day config row ────────────────────────────────────────────────────────────

interface DayConfig {
  day_of_week: number;
  routine_id: string | null;
  label: string;
  is_rest: boolean;
}

function DayRow({
  config,
  routines,
  onChange,
}: {
  config: DayConfig;
  routines: ReturnType<typeof useWorkout>["routines"];
  onChange: (c: DayConfig) => void;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${config.is_rest ? "bg-muted/30" : "bg-card"}`}>
      <div className="w-8 text-center">
        <span className="text-xs font-bold text-muted-foreground">{DAYS[config.day_of_week - 1]}</span>
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onChange({ ...config, is_rest: !config.is_rest, routine_id: null })}
          className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
            config.is_rest
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          }`}
        >
          {config.is_rest ? <Coffee className="h-3 w-3" /> : <Dumbbell className="h-3 w-3" />}
          {config.is_rest ? "Rest" : "Train"}
        </button>

        {!config.is_rest && (
          <>
            <Input
              value={config.label}
              onChange={(e) => onChange({ ...config, label: e.target.value })}
              placeholder="Label (e.g. Push A)"
              className="h-7 text-xs flex-1"
            />
            <select
              value={config.routine_id ?? ""}
              onChange={(e) => onChange({ ...config, routine_id: e.target.value || null })}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs flex-1 min-w-0"
            >
              <option value="">No routine</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Program Form ──────────────────────────────────────────────────────────────

function ProgramForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: { name: string; description: string; days: DayConfig[] };
  onSave: (name: string, description: string, days: DayConfig[]) => Promise<void>;
  onCancel: () => void;
}) {
  const { routines } = useWorkout();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [days, setDays] = useState<DayConfig[]>(
    initial?.days ?? DAY_NUMBERS.map((d) => ({
      day_of_week: d,
      routine_id: null,
      label: "",
      is_rest: d > 5,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(!initial);

  const applyPreset = (preset: typeof PRESET_PROGRAMS[number]) => {
    setName(preset.name);
    setDescription(preset.description);
    setDays(DAY_NUMBERS.map((d) => {
      const t = preset.template.find((t) => t.day === d);
      return {
        day_of_week: d,
        routine_id: null,
        label: t?.label ?? "",
        is_rest: t?.label === "Rest" || !t,
      };
    }));
    setShowPresets(false);
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Program name required"); return; }
    setSaving(true);
    await onSave(name.trim(), description.trim(), days);
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      {showPresets && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Start from a template:</p>
          <div className="grid grid-cols-1 gap-2">
            {PRESET_PROGRAMS.map((p) => (
              <button key={p.name} type="button" onClick={() => applyPreset(p)}
                className="flex items-start gap-2 p-3 rounded-lg border hover:bg-accent transition-colors text-left">
                <CalendarDays className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowPresets(false)}
            className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center mt-1">
            Start blank
          </button>
        </div>
      )}

      {!showPresets && (
        <>
          <div className="space-y-2">
            <Label>Program Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My PPL Program" autoFocus />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 6-day push pull legs for hypertrophy" />
          </div>

          <div className="space-y-2">
            <Label>Weekly Schedule</Label>
            <p className="text-xs text-muted-foreground">Assign routines to each day. Toggle between Train and Rest.</p>
            <div className="space-y-1.5">
              {days.map((d) => (
                <DayRow
                  key={d.day_of_week}
                  config={d}
                  routines={routines}
                  onChange={(updated) => setDays((prev) => prev.map((x) => x.day_of_week === updated.day_of_week ? updated : x))}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save Program"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Program Card ──────────────────────────────────────────────────────────────

function ProgramCard({
  program,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
}: {
  program: WorkoutProgram;
  onEdit: () => void;
  onDelete: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const router = useRouter();
  const trainDays = program.workout_program_days.filter((d) => d.routine_id || (d.label && d.label !== "Rest"));
  const todayDow = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1=Mon
  const todaySlot = program.workout_program_days.find((d) => d.day_of_week === todayDow);
  const isRestToday = !todaySlot || !todaySlot.routine_id;

  return (
    <Card className={program.is_active ? "border-primary/50 bg-primary/5" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{program.name}</CardTitle>
              {program.is_active && (
                <Badge className="h-4 px-1.5 text-[10px] bg-primary/20 text-primary border-primary/30">Active</Badge>
              )}
            </div>
            {program.description && <p className="text-xs text-muted-foreground mt-0.5">{program.description}</p>}
            <p className="text-xs text-muted-foreground mt-1">{trainDays.length} training days / week</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Weekly schedule mini-view */}
        <div className="flex gap-1">
          {DAY_NUMBERS.map((d) => {
            const slot = program.workout_program_days.find((pd) => pd.day_of_week === d);
            const isToday = d === todayDow;
            const isRest = !slot || (!slot.routine_id && (!slot.label || slot.label.toLowerCase() === "rest"));
            return (
              <div key={d} className={`flex-1 flex flex-col items-center gap-0.5`}>
                <span className="text-[9px] text-muted-foreground font-medium">{DAYS[d - 1]}</span>
                <div className={`h-6 w-full rounded flex items-center justify-center text-[9px] font-bold transition-colors ${
                  isRest
                    ? isToday ? "bg-muted border-2 border-primary/50" : "bg-muted/50 text-muted-foreground"
                    : isToday ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
                }`}>
                  {isRest ? "—" : slot?.label?.slice(0, 3) ?? "W"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Today's workout */}
        {program.is_active && (
          <div className={`flex items-center justify-between p-2.5 rounded-lg ${isRestToday ? "bg-muted/50" : "bg-primary/10"}`}>
            <div className="flex items-center gap-2">
              {isRestToday
                ? <Coffee className="h-4 w-4 text-muted-foreground" />
                : <Dumbbell className="h-4 w-4 text-primary" />
              }
              <div>
                <p className="text-xs font-medium">{isRestToday ? "Rest Day" : (todaySlot?.label ?? "Training Day")}</p>
                {!isRestToday && todaySlot?.workout_routines && (
                  <p className="text-[10px] text-muted-foreground">{todaySlot.workout_routines.name}</p>
                )}
              </div>
            </div>
            {!isRestToday && (
              <Button size="sm" className="h-7 text-xs gap-1" onClick={() => {
                if (todaySlot?.routine_id) router.push(`/workout/log?routine=${todaySlot.routine_id}`);
                else router.push("/workout/log");
              }}>
                <Play className="h-3 w-3" /> Start
              </Button>
            )}
          </div>
        )}

        {/* Activate / deactivate */}
        {program.is_active ? (
          <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-8" onClick={onDeactivate}>
            <Square className="h-3.5 w-3.5" /> Stop Program
          </Button>
        ) : (
          <Button size="sm" className="w-full gap-1.5 text-xs h-8" onClick={onActivate}>
            <Play className="h-3.5 w-3.5" /> Start Program
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProgramsPage() {
  const { programs, fetchPrograms, activateProgram, deactivateProgram, deleteProgram } = useWorkout();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const editingProgram = programs.find((p) => p.id === editId);

  const handleCreate = async (name: string, description: string, days: DayConfig[]) => {
    const res = await fetch("/api/workout/programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, description,
        days: days.filter((d) => !d.is_rest).map((d) => ({
          day_of_week: d.day_of_week,
          routine_id: d.routine_id,
          label: d.label || null,
        })),
      }),
    });
    if (res.ok) {
      toast.success("Program created");
      setShowCreate(false);
      await fetchPrograms();
    } else {
      toast.error("Failed to create program");
    }
  };

  const handleUpdate = async (name: string, description: string, days: DayConfig[]) => {
    if (!editId) return;
    const res = await fetch(`/api/workout/programs/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, description,
        days: days.filter((d) => !d.is_rest).map((d) => ({
          day_of_week: d.day_of_week,
          routine_id: d.routine_id,
          label: d.label || null,
        })),
      }),
    });
    if (res.ok) {
      toast.success("Program updated");
      setEditId(null);
      await fetchPrograms();
    } else {
      toast.error("Failed to update program");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this program?")) return;
    await deleteProgram(id);
    toast.success("Program deleted");
  };

  const handleActivate = async (id: string) => {
    await activateProgram(id);
    toast.success("Program started! Your weekly schedule is now active.");
  };

  const handleDeactivate = async (id: string) => {
    await deactivateProgram(id);
    toast.success("Program stopped");
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Programs</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Weekly training schedules with assigned routines</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Program
        </Button>
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto opacity-30" />
            <div>
              <p className="font-medium">No programs yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create a program to plan your weekly training and get day-by-day guidance.</p>
            </div>
            <Button onClick={() => setShowCreate(true)}>Create Program</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {programs.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              onEdit={() => setEditId(program.id)}
              onDelete={() => handleDelete(program.id)}
              onActivate={() => handleActivate(program.id)}
              onDeactivate={() => handleDeactivate(program.id)}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Program</DialogTitle></DialogHeader>
          <ProgramForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editId} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Program</DialogTitle></DialogHeader>
          {editingProgram && (
            <ProgramForm
              initial={{
                name: editingProgram.name,
                description: editingProgram.description ?? "",
                days: DAY_NUMBERS.map((d) => {
                  const slot = editingProgram.workout_program_days.find((pd) => pd.day_of_week === d);
                  return {
                    day_of_week: d,
                    routine_id: slot?.routine_id ?? null,
                    label: slot?.label ?? "",
                    is_rest: !slot || (!slot.routine_id && (!slot.label || slot.label.toLowerCase() === "rest")),
                  };
                }),
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
