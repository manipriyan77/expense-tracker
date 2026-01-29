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
      monthlyContribution,
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
        ...(monthlyContribution !== undefined && {
          monthly_contribution: monthlyContribution,
        }),
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

    // If there are linked transactions, prevent deletion
    if (linkedTransactions && linkedTransactions.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete goal with linked transactions. Please delete the transactions first or they will be unlinked.",
          hasTransactions: true,
        },
        { status: 400 },
      );
    }

    // No linked transactions, safe to delete
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
