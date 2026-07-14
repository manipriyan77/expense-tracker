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
    const {
      title,
      targetAmount,
      currentAmount,
      targetDate,
      category,
      status,
      priority,
      monthlyContribution,
      unit,
    } = body;

    const { data, error } = await supabase
      .from("goals")
      .update({
        title,
        target_amount: targetAmount,
        current_amount: currentAmount,
        target_date: targetDate,
        category,
        status,
        ...(priority !== undefined && { priority }),
        ...(monthlyContribution !== undefined && {
          monthly_contribution: monthlyContribution,
        }),
        ...(unit !== undefined && { unit: unit === "grams" ? "grams" : "amount" }),
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
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

    // When ?unlink=true, detach linked transactions (keep them, clear goal_id)
    // instead of blocking the delete.
    const unlink =
      request.nextUrl.searchParams.get("unlink") === "true";

    // Check if there are any transactions linked to this goal
    const { data: linkedTransactions, error: checkError } = await supabase
      .from("transactions")
      .select("id")
      .eq("goal_id", params.id)
      .eq("user_id", user.id)
      .limit(1);

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    // If there are linked transactions and the caller hasn't opted to unlink,
    // prevent deletion so transactions aren't silently detached.
    if (linkedTransactions && linkedTransactions.length > 0 && !unlink) {
      return NextResponse.json(
        {
          error:
            "Cannot delete goal with linked transactions. Please delete the transactions first or they will be unlinked.",
          hasTransactions: true,
        },
        { status: 400 },
      );
    }

    // Opted to unlink: clear goal_id on the goal's transactions first.
    if (linkedTransactions && linkedTransactions.length > 0 && unlink) {
      const { error: unlinkError } = await supabase
        .from("transactions")
        .update({ goal_id: null })
        .eq("goal_id", params.id)
        .eq("user_id", user.id);

      if (unlinkError) {
        return NextResponse.json(
          { error: `Failed to unlink transactions: ${unlinkError.message}` },
          { status: 500 },
        );
      }
    }

    // Safe to delete the goal
    const { error } = await supabase
      .from("goals")
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
