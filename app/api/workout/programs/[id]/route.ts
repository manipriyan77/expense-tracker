import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("workout_programs")
      .select(`*, workout_program_days(id, day_of_week, label, order_index, routine_id, workout_routines(id, name, workout_routine_exercises(id)))`)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, description, days } = body;

    const { error: updateError } = await supabase
      .from("workout_programs")
      .update({ name, description: description ?? null, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Replace days
    await supabase.from("workout_program_days").delete().eq("program_id", id);
    if (days && days.length > 0) {
      const dayRows = days.map((d: { day_of_week: number; routine_id: string | null; label: string | null }) => ({
        program_id: id,
        day_of_week: d.day_of_week,
        routine_id: d.routine_id ?? null,
        label: d.label ?? null,
        order_index: d.day_of_week,
      }));
      await supabase.from("workout_program_days").insert(dayRows);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { error } = await supabase.from("workout_programs").delete().eq("id", id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
