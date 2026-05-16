import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

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
    const { date, body_weight, body_fat_pct, chest_cm, waist_cm, hips_cm, left_arm_cm, right_arm_cm, left_thigh_cm, right_thigh_cm, notes } = body;

    const { data, error } = await supabase
      .from("body_measurements")
      .upsert({
        user_id: user.id,
        date: date ?? new Date().toISOString().split("T")[0],
        body_weight: body_weight ?? null,
        body_fat_pct: body_fat_pct ?? null,
        chest_cm: chest_cm ?? null,
        waist_cm: waist_cm ?? null,
        hips_cm: hips_cm ?? null,
        left_arm_cm: left_arm_cm ?? null,
        right_arm_cm: right_arm_cm ?? null,
        left_thigh_cm: left_thigh_cm ?? null,
        right_thigh_cm: right_thigh_cm ?? null,
        notes: notes ?? null,
      }, { onConflict: "user_id,date" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();
    const { error } = await supabase.from("body_measurements").delete().eq("id", id).eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
