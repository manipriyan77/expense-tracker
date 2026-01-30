import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
      .from("forex_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("month", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, month, amount, handlerSharePercentage, notes } = body;

    if (!type || !month || amount == null) {
      return NextResponse.json(
        { error: "Missing required fields: type, month, amount" },
        { status: 400 },
      );
    }

    if (!["deposit", "withdrawal", "pnl"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be deposit, withdrawal, or pnl" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("forex_entries")
      .insert({
        user_id: user.id,
        type,
        month,
        amount: parseFloat(String(amount)),
        handler_share_percentage:
          type === "withdrawal"
            ? parseFloat(String(handlerSharePercentage ?? 0))
            : 0,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
