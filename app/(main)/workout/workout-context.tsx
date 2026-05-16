"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  is_custom: boolean;
  user_id: string | null;
}

export interface RoutineExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  default_sets: number;
  default_reps: number;
  default_weight: number | null;
  order_index: number;
}

export interface Routine {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  workout_routine_exercises: RoutineExercise[];
}

export interface WorkoutSet {
  id?: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

export interface WorkoutLogExercise {
  id?: string;
  exercise_id: string | null;
  exercise_name: string;
  order_index: number;
  workout_log_sets: WorkoutSet[];
}

export interface WorkoutLog {
  id: string;
  name: string;
  date: string;
  routine_id: string | null;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
  workout_log_exercises: WorkoutLogExercise[];
}

// ─── Programs ─────────────────────────────────────────────────────────────────

export interface ProgramDay {
  id: string;
  day_of_week: number; // 1=Mon … 7=Sun
  label: string | null;
  routine_id: string | null;
  order_index: number;
  workout_routines: { id: string; name: string; workout_routine_exercises: { id: string }[] } | null;
}

export interface WorkoutProgram {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  started_at: string | null;
  created_at: string;
  workout_program_days: ProgramDay[];
}

// ─── Personal Records ─────────────────────────────────────────────────────────

export interface PersonalRecord {
  id: string;
  exercise_id: string;
  exercise_name: string;
  record_type: "heaviest_weight" | "max_reps" | "estimated_1rm" | "max_volume_set";
  value: number;
  reps: number | null;
  weight: number | null;
  achieved_at: string;
}

// ─── Body Measurements ────────────────────────────────────────────────────────

export interface BodyMeasurement {
  id: string;
  date: string;
  body_weight: number | null;
  body_fat_pct: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  hips_cm: number | null;
  left_arm_cm: number | null;
  right_arm_cm: number | null;
  left_thigh_cm: number | null;
  right_thigh_cm: number | null;
  notes: string | null;
}

// ─── Active workout state (in-progress session) ───────────────────────────────

export interface ActiveWorkoutExercise {
  exercise_id: string | null;
  exercise_name: string;
  notes: string;
  sets: { weight: string; reps: string; completed: boolean }[];
}

export interface ActiveWorkout {
  name: string;
  routine_id: string | null;
  startedAt: number; // Date.now()
  exercises: ActiveWorkoutExercise[];
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface WorkoutContextValue {
  exercises: Exercise[];
  routines: Routine[];
  logs: WorkoutLog[];
  programs: WorkoutProgram[];
  activeProgram: WorkoutProgram | null;
  personalRecords: PersonalRecord[];
  bodyMeasurements: BodyMeasurement[];
  loadingExercises: boolean;
  loadingRoutines: boolean;
  loadingLogs: boolean;
  activeWorkout: ActiveWorkout | null;
  lastNewPRs: string[];
  fetchExercises: () => Promise<void>;
  fetchRoutines: () => Promise<void>;
  fetchLogs: () => Promise<void>;
  fetchPersonalRecords: () => Promise<void>;
  fetchBodyMeasurements: () => Promise<void>;
  fetchPrograms: () => Promise<void>;
  activateProgram: (id: string) => Promise<void>;
  deactivateProgram: (id: string) => Promise<void>;
  deleteProgram: (id: string) => Promise<void>;
  startWorkout: (name: string, routineId: string | null, exercises: ActiveWorkoutExercise[]) => void;
  updateActiveExercise: (index: number, exercise: ActiveWorkoutExercise) => void;
  addExerciseToActive: (exercise: ActiveWorkoutExercise) => void;
  removeExerciseFromActive: (index: number) => void;
  finishWorkout: (durationMinutes: number, notes: string) => Promise<string[]>;
  cancelWorkout: () => void;
  deleteLog: (id: string) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  addBodyMeasurement: (data: Omit<BodyMeasurement, "id">) => Promise<void>;
  deleteBodyMeasurement: (id: string) => Promise<void>;
  clearNewPRs: () => void;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [programs, setPrograms] = useState<WorkoutProgram[]>([]);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [loadingRoutines, setLoadingRoutines] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
  const [lastNewPRs, setLastNewPRs] = useState<string[]>([]);

  const fetchExercises = useCallback(async () => {
    setLoadingExercises(true);
    try {
      const res = await fetch("/api/workout/exercises");
      if (res.ok) setExercises(await res.json());
    } finally {
      setLoadingExercises(false);
    }
  }, []);

  const fetchRoutines = useCallback(async () => {
    setLoadingRoutines(true);
    try {
      const res = await fetch("/api/workout/routines");
      if (res.ok) setRoutines(await res.json());
    } finally {
      setLoadingRoutines(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/workout/logs");
      if (res.ok) setLogs(await res.json());
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const fetchPrograms = useCallback(async () => {
    const res = await fetch("/api/workout/programs");
    if (res.ok) setPrograms(await res.json());
  }, []);

  const activateProgram = useCallback(async (id: string) => {
    await fetch(`/api/workout/programs/${id}/activate`, { method: "POST" });
    await fetchPrograms();
  }, [fetchPrograms]);

  const deactivateProgram = useCallback(async (id: string) => {
    await fetch(`/api/workout/programs/${id}/activate`, { method: "DELETE" });
    await fetchPrograms();
  }, [fetchPrograms]);

  const deleteProgram = useCallback(async (id: string) => {
    await fetch(`/api/workout/programs/${id}`, { method: "DELETE" });
    setPrograms((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const fetchPersonalRecords = useCallback(async () => {
    const res = await fetch("/api/workout/personal-records");
    if (res.ok) setPersonalRecords(await res.json());
  }, []);

  const fetchBodyMeasurements = useCallback(async () => {
    const res = await fetch("/api/workout/body-measurements");
    if (res.ok) setBodyMeasurements(await res.json());
  }, []);

  useEffect(() => {
    fetchExercises();
    fetchRoutines();
    fetchLogs();
    fetchPersonalRecords();
    fetchBodyMeasurements();
    fetchPrograms();
  }, [fetchExercises, fetchRoutines, fetchLogs, fetchPersonalRecords, fetchBodyMeasurements, fetchPrograms]);

  const startWorkout = useCallback((name: string, routineId: string | null, exs: ActiveWorkoutExercise[]) => {
    setActiveWorkout({ name, routine_id: routineId, startedAt: Date.now(), exercises: exs });
  }, []);

  const updateActiveExercise = useCallback((index: number, exercise: ActiveWorkoutExercise) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      const updated = [...prev.exercises];
      updated[index] = exercise;
      return { ...prev, exercises: updated };
    });
  }, []);

  const addExerciseToActive = useCallback((exercise: ActiveWorkoutExercise) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      return { ...prev, exercises: [...prev.exercises, exercise] };
    });
  }, []);

  const removeExerciseFromActive = useCallback((index: number) => {
    setActiveWorkout((prev) => {
      if (!prev) return prev;
      const updated = prev.exercises.filter((_, i) => i !== index);
      return { ...prev, exercises: updated };
    });
  }, []);

  const finishWorkout = useCallback(async (durationMinutes: number, notes: string): Promise<string[]> => {
    if (!activeWorkout) return [];

    const payload = {
      name: activeWorkout.name,
      date: new Date().toISOString().split("T")[0],
      routine_id: activeWorkout.routine_id,
      duration_minutes: durationMinutes || null,
      notes: notes || null,
      exercises: activeWorkout.exercises.map((ex, i) => ({
        exercise_id: ex.exercise_id,
        exercise_name: ex.exercise_name,
        order_index: i,
        sets: ex.sets.map((s, j) => ({
          set_number: j + 1,
          weight: s.weight ? parseFloat(s.weight) : null,
          reps: s.reps ? parseInt(s.reps) : null,
          completed: s.completed,
        })),
      })),
    };

    const res = await fetch("/api/workout/logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) return [];

    const log = await res.json();
    setActiveWorkout(null);

    // Detect PRs
    const prRes = await fetch("/api/workout/personal-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workout_log_id: log.id }),
    });
    let newPRs: string[] = [];
    if (prRes.ok) {
      const prData = await prRes.json();
      newPRs = prData.newPRs ?? [];
      setLastNewPRs(newPRs);
    }

    await Promise.all([fetchLogs(), fetchPersonalRecords()]);
    return newPRs;
  }, [activeWorkout, fetchLogs, fetchPersonalRecords]);

  const cancelWorkout = useCallback(() => setActiveWorkout(null), []);
  const clearNewPRs = useCallback(() => setLastNewPRs([]), []);

  const deleteLog = useCallback(async (id: string) => {
    await fetch(`/api/workout/logs/${id}`, { method: "DELETE" });
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const deleteRoutine = useCallback(async (id: string) => {
    await fetch(`/api/workout/routines/${id}`, { method: "DELETE" });
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addBodyMeasurement = useCallback(async (data: Omit<BodyMeasurement, "id">) => {
    const res = await fetch("/api/workout/body-measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) await fetchBodyMeasurements();
  }, [fetchBodyMeasurements]);

  const deleteBodyMeasurement = useCallback(async (id: string) => {
    await fetch("/api/workout/body-measurements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBodyMeasurements((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const activeProgram = programs.find((p) => p.is_active) ?? null;

  return (
    <WorkoutContext.Provider value={{
      exercises, routines, logs, personalRecords, bodyMeasurements, programs, activeProgram,
      loadingExercises, loadingRoutines, loadingLogs,
      activeWorkout, lastNewPRs,
      fetchExercises, fetchRoutines, fetchLogs, fetchPersonalRecords, fetchBodyMeasurements, fetchPrograms,
      startWorkout, updateActiveExercise, addExerciseToActive, removeExerciseFromActive,
      finishWorkout, cancelWorkout, deleteLog, deleteRoutine,
      addBodyMeasurement, deleteBodyMeasurement, clearNewPRs,
      activateProgram, deactivateProgram, deleteProgram,
    }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const ctx = useContext(WorkoutContext);
  if (!ctx) throw new Error("useWorkout must be used within WorkoutProvider");
  return ctx;
}
