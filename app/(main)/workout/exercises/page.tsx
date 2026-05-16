"use client";

import { useState } from "react";
import { useWorkout } from "../workout-context";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ExerciseImage } from "@/components/workout/ExerciseImage";

const MUSCLE_GROUPS = ["All", "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Other"];
const EQUIPMENT_TYPES = ["Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight", "None"];

const MUSCLE_COLORS: Record<string, string> = {
  Chest: "bg-red-500/10 text-red-600 border-red-200",
  Back: "bg-blue-500/10 text-blue-600 border-blue-200",
  Legs: "bg-green-500/10 text-green-600 border-green-200",
  Shoulders: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  Arms: "bg-purple-500/10 text-purple-600 border-purple-200",
  Core: "bg-orange-500/10 text-orange-600 border-orange-200",
  Cardio: "bg-pink-500/10 text-pink-600 border-pink-200",
  Other: "bg-muted text-muted-foreground",
};

export default function ExercisesPage() {
  const { exercises, fetchExercises } = useWorkout();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("All");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState("Other");
  const [newEquipment, setNewEquipment] = useState("None");
  const [saving, setSaving] = useState(false);

  const filtered = exercises.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchMuscle = muscleFilter === "All" || e.muscle_group === muscleFilter;
    return matchSearch && matchMuscle;
  });

  const grouped = MUSCLE_GROUPS.slice(1).reduce<Record<string, typeof exercises>>((acc, mg) => {
    const items = filtered.filter((e) => e.muscle_group === mg);
    if (items.length) acc[mg] = items;
    return acc;
  }, {});

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("Exercise name required"); return; }
    setSaving(true);
    const res = await fetch("/api/workout/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), muscle_group: newMuscle, equipment: newEquipment }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Exercise created");
      setShowCreate(false);
      setNewName("");
      await fetchExercises();
    } else {
      toast.error("Failed to create exercise");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Exercise Library</h1>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Custom
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search exercises…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {MUSCLE_GROUPS.map((mg) => (
          <button key={mg} type="button" onClick={() => setMuscleFilter(mg)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              muscleFilter === mg ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"
            }`}>
            {mg}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {Object.entries(grouped).map(([mg, items]) => (
          <div key={mg}>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{mg}</p>
            <div className="border rounded-lg divide-y overflow-hidden">
              {items.map((ex) => (
                <button key={ex.id} type="button"
                  onClick={() => router.push(`/workout/exercises/${ex.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left">
                  <ExerciseImage name={ex.name} muscleGroup={ex.muscle_group} variant="icon" className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <p className="text-xs text-muted-foreground">{ex.equipment}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[10px] px-2 hidden sm:inline-flex ${MUSCLE_COLORS[ex.muscle_group] ?? MUSCLE_COLORS.Other}`}>
                      {ex.muscle_group}
                    </Badge>
                    {ex.is_custom && <Badge variant="secondary" className="text-[10px] px-1.5">Custom</Badge>}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-10 text-sm">No exercises found</p>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create Custom Exercise</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Exercise Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Banded Pull Apart" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Muscle Group</Label>
              <select value={newMuscle} onChange={(e) => setNewMuscle(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                {MUSCLE_GROUPS.slice(1).map((mg) => <option key={mg} value={mg}>{mg}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Equipment</Label>
              <select value={newEquipment} onChange={(e) => setNewEquipment(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                {EQUIPMENT_TYPES.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleCreate} disabled={saving} className="flex-1">
                {saving ? "Saving…" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
