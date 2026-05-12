import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("daily_habits")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("order_index", { ascending: true });

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
    const { title, order_index } = body;
    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

    const { category, frequency, frequency_days } = body;

    const { data, error } = await supabase
      .from("daily_habits")
      .insert({
        title,
        order_index: order_index ?? 0,
        user_id: user.id,
        is_active: true,
        category: category ?? "general",
        frequency: frequency ?? "daily",
        frequency_days: frequency_days ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
