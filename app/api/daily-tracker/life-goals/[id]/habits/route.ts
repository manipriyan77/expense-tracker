import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET  /api/daily-tracker/life-goals/[id]/habits  → list linked habit ids
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { data, error } = await supabase
      .from("goal_habits")
      .select("habit_id")
      .eq("goal_id", id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data ?? []).map((r) => r.habit_id));
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/daily-tracker/life-goals/[id]/habits  body: { habit_id }  → link habit
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { habit_id } = await request.json();
    if (!habit_id) return NextResponse.json({ error: "Missing habit_id" }, { status: 400 });

    const { error } = await supabase
      .from("goal_habits")
      .upsert({ goal_id: id, habit_id, user_id: user.id }, { onConflict: "goal_id,habit_id" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/daily-tracker/life-goals/[id]/habits  body: { habit_id }  → unlink habit
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { habit_id } = await request.json();
    if (!habit_id) return NextResponse.json({ error: "Missing habit_id" }, { status: 400 });

    const { error } = await supabase
      .from("goal_habits")
      .delete()
      .eq("goal_id", id)
      .eq("habit_id", habit_id)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
