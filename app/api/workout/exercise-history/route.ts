import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Returns last N sessions for a given exercise_id (for "previous performance" hint + charts)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const exerciseId = searchParams.get("exercise_id");
    const limit = parseInt(searchParams.get("limit") ?? "10");

    if (!exerciseId) return NextResponse.json({ error: "exercise_id required" }, { status: 400 });

    const { data, error } = await supabase
      .from("workout_log_exercises")
      .select(`
        id, exercise_name,
        workout_log_sets (set_number, weight, reps, completed),
        workout_logs!inner (id, date, name, user_id)
      `)
      .eq("exercise_id", exerciseId)
      .eq("workout_logs.user_id", user.id)
      .order("workout_logs(date)", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Enrich with volume and e1rm
    const enriched = (data ?? []).map((row) => {
      const sets = row.workout_log_sets.filter((s: { completed: boolean }) => s.completed);
      const totalVolume = sets.reduce((sum: number, s: { weight: number; reps: number }) => sum + (s.weight ?? 0) * (s.reps ?? 0), 0);
      const best1RM = sets.reduce((best: number, s: { weight: number; reps: number }) => {
        if (s.weight && s.reps && s.reps <= 36) {
          const e1rm = s.weight * 36 / (37 - s.reps);
          return e1rm > best ? e1rm : best;
        }
        return best;
      }, 0);
      return {
        ...row,
        totalVolume: Math.round(totalVolume),
        estimated1RM: Math.round(best1RM * 10) / 10,
      };
    });

    return NextResponse.json(enriched);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
