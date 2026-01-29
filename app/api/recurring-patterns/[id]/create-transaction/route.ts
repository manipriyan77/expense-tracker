import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the recurring pattern
    const { data: pattern, error: patternError } = await supabase
      .from("recurring_patterns")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (patternError || !pattern) {
      return NextResponse.json(
        { error: "Recurring pattern not found" },
        { status: 404 },
      );
    }

    if (!pattern.is_active) {
      return NextResponse.json(
        { error: "Recurring pattern is not active" },
        { status: 400 },
      );
    }

    // Create the transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type: pattern.type,
        amount: pattern.amount,
        description: pattern.description,
        category: pattern.category,
        subtype: pattern.subtype,
        date: pattern.next_date,
        tags: pattern.tags || [],
        notes: pattern.notes || null,
      })
      .select()
      .single();

    if (transactionError) {
      return NextResponse.json(
        { error: transactionError.message },
        { status: 500 },
      );
    }

    // Calculate next date based on frequency
    const nextDate = new Date(pattern.next_date);
    switch (pattern.frequency) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "biweekly":
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    // Update the recurring pattern's next_date
    const { error: updateError } = await supabase
      .from("recurring_patterns")
      .update({
        next_date: nextDate.toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating next_date:", updateError);
    }

    return NextResponse.json({
      transaction,
      nextDate: nextDate.toISOString().split("T")[0],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
