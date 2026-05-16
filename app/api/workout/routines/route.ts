import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("workout_routines")
      .select(`
        *,
        workout_routine_exercises (
          id, exercise_id, exercise_name, default_sets, default_reps, default_weight, order_index
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

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
    const { name, description, exercises } = body;
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

    const { data: routine, error: routineError } = await supabase
      .from("workout_routines")
      .insert({ name, description: description ?? null, user_id: user.id })
      .select()
      .single();

    if (routineError) return NextResponse.json({ error: routineError.message }, { status: 500 });

    if (exercises && exercises.length > 0) {
      const exerciseRows = exercises.map((e: { exercise_id: string; exercise_name: string; default_sets: number; default_reps: number; default_weight?: number; order_index: number }) => ({
        routine_id: routine.id,
        exercise_id: e.exercise_id,
        exercise_name: e.exercise_name,
        default_sets: e.default_sets ?? 3,
        default_reps: e.default_reps ?? 10,
        default_weight: e.default_weight ?? null,
        order_index: e.order_index ?? 0,
      }));

      const { error: exError } = await supabase.from("workout_routine_exercises").insert(exerciseRows);
      if (exError) return NextResponse.json({ error: exError.message }, { status: 500 });
    }

    return NextResponse.json(routine, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
