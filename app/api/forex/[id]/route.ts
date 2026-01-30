import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const body = await request.json();
    const { type, month, amount, handlerSharePercentage, notes } = body;

    const updates: Record<string, unknown> = {};
    if (type !== undefined) updates.type = type;
    if (month !== undefined) updates.month = month;
    if (amount !== undefined) updates.amount = parseFloat(String(amount));
    if (handlerSharePercentage !== undefined)
      updates.handler_share_percentage = parseFloat(
        String(handlerSharePercentage),
      );
    if (notes !== undefined) updates.notes = notes || null;

    if (type && !["deposit", "withdrawal", "pnl"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be deposit, withdrawal, or pnl" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("forex_entries")
      .update(updates)
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: "Forex entry not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;

    const { error } = await supabase
      .from("forex_entries")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
