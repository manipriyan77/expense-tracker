import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get("month") ?? "");
    const year = parseInt(searchParams.get("year") ?? "");

    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
    }

    // Build date range for the month (1-indexed month)
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    // Fetch all transactions for the month
    const { data: transactions, error: fetchError } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    // Aggregate budget deductions (expense transactions only)
    const budgetDeductions = new Map<string, number>();
    for (const t of transactions) {
      if (t.type === "expense" && t.budget_id) {
        budgetDeductions.set(
          t.budget_id,
          (budgetDeductions.get(t.budget_id) ?? 0) + parseFloat(t.amount),
        );
      }
    }

    // Aggregate goal deductions
    const goalDeductions = new Map<string, number>();
    for (const t of transactions) {
      if (t.goal_id) {
        goalDeductions.set(
          t.goal_id,
          (goalDeductions.get(t.goal_id) ?? 0) + parseFloat(t.amount),
        );
      }
    }

    // Delete all transactions for the month
    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Reverse budget spent amounts
    for (const [budgetId, deduction] of budgetDeductions) {
      const { data: budget } = await supabase
        .from("budgets")
        .select("spent_amount")
        .eq("id", budgetId)
        .eq("user_id", user.id)
        .single();

      if (budget) {
        const newSpent = Math.max(0, parseFloat(budget.spent_amount || 0) - deduction);
        await supabase
          .from("budgets")
          .update({ spent_amount: newSpent })
          .eq("id", budgetId)
          .eq("user_id", user.id);
      }
    }

    // Reverse goal current amounts
    for (const [goalId, deduction] of goalDeductions) {
      const { data: goal } = await supabase
        .from("goals")
        .select("current_amount")
        .eq("id", goalId)
        .eq("user_id", user.id)
        .single();

      if (goal) {
        const newAmount = Math.max(0, parseFloat(goal.current_amount || 0) - deduction);
        await supabase
          .from("goals")
          .update({ current_amount: newAmount })
          .eq("id", goalId)
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json({ deleted: transactions.length });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
