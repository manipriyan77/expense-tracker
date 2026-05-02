import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const journeyId = request.nextUrl.searchParams.get("journey_id");
    let query = supabase.from("life_goals").select("*").eq("user_id", user.id);
    if (journeyId) query = query.eq("journey_id", journeyId);

    const { data, error } = await query.order("order_index", { ascending: true });
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
    const { journey_id, title, present_value, target_value, order_index, category } = body;
    if (!journey_id || !title) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const { data, error } = await supabase
      .from("life_goals")
      .insert({ journey_id, title, present_value: present_value ?? "", target_value: target_value ?? "", order_index: order_index ?? 0, category: category ?? "general", user_id: user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
