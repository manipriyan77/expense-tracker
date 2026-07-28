import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALID_PERIODS = new Set([
  "all-time",
  "this-month",
  "last-month",
  "last-3-months",
  "last-6-months",
  "this-year",
]);

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .select("selected_period")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ selectedPeriod: data?.selected_period ?? "all-time" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { selectedPeriod } = await request.json();
    if (!VALID_PERIODS.has(selectedPeriod)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        { user_id: user.id, selected_period: selectedPeriod, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ selectedPeriod });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
