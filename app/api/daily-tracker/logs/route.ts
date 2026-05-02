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
      .from("daily_habit_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", date);

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
    const { habit_id, log_date, completed, note } = body;
    if (!habit_id || !log_date) return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

    const { data, error } = await supabase
      .from("daily_habit_logs")
      .upsert({ habit_id, log_date, completed: completed ?? false, note: note ?? "", user_id: user.id }, { onConflict: "user_id,habit_id,log_date" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
