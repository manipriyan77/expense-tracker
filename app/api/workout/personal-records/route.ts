import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const exerciseId = searchParams.get("exercise_id");

    let query = supabase
      .from("workout_personal_records")
      .select("*")
      .eq("user_id", user.id)
      .order("achieved_at", { ascending: false });

    if (exerciseId) query = query.eq("exercise_id", exerciseId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Called after finishing a workout to detect and store new PRs
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { workout_log_id } = body;
    if (!workout_log_id) return NextResponse.json({ error: "Missing workout_log_id" }, { status: 400 });

    // Fetch the workout with all exercises and sets
    const { data: logData, error: logError } = await supabase
      .from("workout_logs")
      .select(`
        *,
        workout_log_exercises (
          exercise_id, exercise_name,
          workout_log_sets (weight, reps, completed)
        )
      `)
      .eq("id", workout_log_id)
      .eq("user_id", user.id)
      .single();

    if (logError || !logData) return NextResponse.json({ error: "Log not found" }, { status: 404 });

    const newPRs: string[] = [];

    for (const ex of logData.workout_log_exercises) {
      if (!ex.exercise_id) continue;
      const completedSets = ex.workout_log_sets.filter((s: { completed: boolean; weight: number | null; reps: number | null }) => s.completed && s.reps);

      if (completedSets.length === 0) continue;

      // Fetch existing PRs for this exercise
      const { data: existingPRs } = await supabase
        .from("workout_personal_records")
        .select("record_type, value")
        .eq("user_id", user.id)
        .eq("exercise_id", ex.exercise_id);

      const prMap: Record<string, number> = {};
      for (const pr of (existingPRs ?? [])) prMap[pr.record_type] = pr.value;

      // Check heaviest weight
      const heaviestSet = completedSets.reduce((best: { weight: number; reps: number } | null, s: { weight: number; reps: number }) =>
        s.weight && (!best || s.weight > best.weight) ? s : best, null);
      if (heaviestSet?.weight) {
        const current = prMap["heaviest_weight"] ?? 0;
        if (heaviestSet.weight > current) {
          await supabase.from("workout_personal_records").upsert({
            user_id: user.id, exercise_id: ex.exercise_id, exercise_name: ex.exercise_name,
            record_type: "heaviest_weight", value: heaviestSet.weight, reps: heaviestSet.reps,
            workout_log_id, achieved_at: logData.date,
          }, { onConflict: "user_id,exercise_id,record_type" });
          newPRs.push(`${ex.exercise_name}: Heaviest Weight ${heaviestSet.weight}kg`);
        }
      }

      // Check max reps (at any weight)
      const maxRepsSet = completedSets.reduce((best: { reps: number; weight: number } | null, s: { reps: number; weight: number }) =>
        s.reps && (!best || s.reps > best.reps) ? s : best, null);
      if (maxRepsSet?.reps) {
        const current = prMap["max_reps"] ?? 0;
        if (maxRepsSet.reps > current) {
          await supabase.from("workout_personal_records").upsert({
            user_id: user.id, exercise_id: ex.exercise_id, exercise_name: ex.exercise_name,
            record_type: "max_reps", value: maxRepsSet.reps, weight: maxRepsSet.weight ?? null,
            workout_log_id, achieved_at: logData.date,
          }, { onConflict: "user_id,exercise_id,record_type" });
          newPRs.push(`${ex.exercise_name}: Max Reps ${maxRepsSet.reps}`);
        }
      }

      // Check estimated 1RM (Brzycki formula: w × 36 / (37 - reps))
      let best1RM = 0;
      let best1RMSet: { weight: number; reps: number } | null = null;
      for (const s of completedSets) {
        if (s.weight && s.reps && s.reps <= 36) {
          const e1rm = s.weight * 36 / (37 - s.reps);
          if (e1rm > best1RM) { best1RM = e1rm; best1RMSet = s; }
        }
      }
      if (best1RMSet && best1RM > 0) {
        const current = prMap["estimated_1rm"] ?? 0;
        if (best1RM > current) {
          await supabase.from("workout_personal_records").upsert({
            user_id: user.id, exercise_id: ex.exercise_id, exercise_name: ex.exercise_name,
            record_type: "estimated_1rm", value: Math.round(best1RM * 10) / 10,
            reps: best1RMSet.reps, weight: best1RMSet.weight,
            workout_log_id, achieved_at: logData.date,
          }, { onConflict: "user_id,exercise_id,record_type" });
          newPRs.push(`${ex.exercise_name}: E1RM ${Math.round(best1RM)}kg`);
        }
      }

      // Check max volume in a single set (weight × reps)
      const maxVolumeSet = completedSets.reduce((best: { volume: number; weight: number; reps: number } | null, s: { weight: number; reps: number }) => {
        const v = (s.weight ?? 0) * s.reps;
        return !best || v > best.volume ? { volume: v, weight: s.weight, reps: s.reps } : best;
      }, null);
      if (maxVolumeSet && maxVolumeSet.volume > 0) {
        const current = prMap["max_volume_set"] ?? 0;
        if (maxVolumeSet.volume > current) {
          await supabase.from("workout_personal_records").upsert({
            user_id: user.id, exercise_id: ex.exercise_id, exercise_name: ex.exercise_name,
            record_type: "max_volume_set", value: maxVolumeSet.volume,
            weight: maxVolumeSet.weight, reps: maxVolumeSet.reps,
            workout_log_id, achieved_at: logData.date,
          }, { onConflict: "user_id,exercise_id,record_type" });
        }
      }
    }

    return NextResponse.json({ newPRs });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
