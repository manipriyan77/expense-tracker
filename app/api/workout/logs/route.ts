import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const { data, error } = await supabase
      .from("workout_logs")
      .select(`
        *,
        workout_log_exercises (
          id, exercise_id, exercise_name, order_index,
          workout_log_sets (id, set_number, weight, reps, completed)
        )
      `)
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, date, routine_id, duration_minutes, notes, exercises } = body;
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

    const { data: log, error: logError } = await supabase
      .from("workout_logs")
      .insert({
        user_id: user.id,
        name,
        date: date ?? new Date().toISOString().split("T")[0],
        routine_id: routine_id ?? null,
        duration_minutes: duration_minutes ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });

    if (exercises && exercises.length > 0) {
      for (const ex of exercises) {
        const { data: logEx, error: exError } = await supabase
          .from("workout_log_exercises")
          .insert({
            workout_log_id: log.id,
            exercise_id: ex.exercise_id ?? null,
            exercise_name: ex.exercise_name,
            order_index: ex.order_index ?? 0,
          })
          .select()
          .single();

        if (exError) continue;

        if (ex.sets && ex.sets.length > 0) {
          const setRows = ex.sets.map((s: { set_number: number; weight?: number; reps?: number; completed?: boolean }) => ({
            workout_log_exercise_id: logEx.id,
            set_number: s.set_number,
            weight: s.weight ?? null,
            reps: s.reps ?? null,
            completed: s.completed ?? false,
          }));
          await supabase.from("workout_log_sets").insert(setRows);
        }
      }
    }

    return NextResponse.json(log, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
