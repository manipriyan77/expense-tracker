import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET /api/daily-tracker/logs/range?from=2026-01-01&to=2026-05-01
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const from = request.nextUrl.searchParams.get("from");
    const to = request.nextUrl.searchParams.get("to");
    if (!from || !to) return NextResponse.json({ error: "Missing from/to" }, { status: 400 });

    const { data, error } = await supabase
      .from("daily_habit_logs")
      .select("habit_id, log_date, completed, note")
      .eq("user_id", user.id)
      .gte("log_date", from)
      .lte("log_date", to)
      .order("log_date", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
