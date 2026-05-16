import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("workout_programs")
      .select(`
        *,
        workout_program_days (
          id, day_of_week, label, order_index,
          routine_id,
          workout_routines (id, name, workout_routine_exercises(id))
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
    const { name, description, days } = body;
    if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });

    const { data: program, error: programError } = await supabase
      .from("workout_programs")
      .insert({ name, description: description ?? null, user_id: user.id })
      .select()
      .single();

    if (programError) return NextResponse.json({ error: programError.message }, { status: 500 });

    if (days && days.length > 0) {
      const dayRows = days.map((d: { day_of_week: number; routine_id: string | null; label: string | null }) => ({
        program_id: program.id,
        day_of_week: d.day_of_week,
        routine_id: d.routine_id ?? null,
        label: d.label ?? null,
        order_index: d.day_of_week,
      }));
      const { error: daysError } = await supabase.from("workout_program_days").insert(dayRows);
      if (daysError) return NextResponse.json({ error: daysError.message }, { status: 500 });
    }

    return NextResponse.json(program, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
