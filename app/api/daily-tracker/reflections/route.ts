import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const date = request.nextUrl.searchParams.get("date");
    if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });

    const { data, error } = await supabase
      .from("daily_reflections")
      .select("*")
      .eq("user_id", user.id)
      .eq("reflection_date", date)
      .maybeSingle();

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
    const { reflection_date, note, mood } = body;
    if (!reflection_date) return NextResponse.json({ error: "Missing reflection_date" }, { status: 400 });

    const { data, error } = await supabase
      .from("daily_reflections")
      .upsert({ reflection_date, note: note ?? "", mood: mood ?? "", user_id: user.id }, { onConflict: "user_id,reflection_date" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
