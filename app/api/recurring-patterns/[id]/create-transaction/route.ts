import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveExpenseBudgetIdForPattern } from "@/lib/server/recurring-pattern-budget";

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

    // Respect end_date: don't create if next_date is past the end date
    const endDate = pattern.end_date ? new Date(pattern.end_date) : null;
    const nextDateForCheck = new Date(pattern.next_date);
    if (endDate && nextDateForCheck > endDate) {
      await supabase
        .from("recurring_patterns")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      return NextResponse.json(
        { error: "Recurrence has ended (past end date)" },
        { status: 400 },
      );
    }

    const budgetId = await resolveExpenseBudgetIdForPattern(supabase, user.id, {
      type: pattern.type,
      linked_budget_id: pattern.linked_budget_id,
      category: pattern.category,
      subtype: pattern.subtype,
    });
    const goalId = pattern.linked_goal_id || null;

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
        budget_id: budgetId,
        goal_id: goalId,
        tags: pattern.tags || [],
        notes: pattern.notes || null,
        recurring_pattern_id: id,
      })
      .select()
      .single();

    if (transactionError) {
      return NextResponse.json(
        { error: transactionError.message },
        { status: 500 },
      );
    }

    if (budgetId && pattern.type === "expense") {
      const { data: budget } = await supabase
        .from("budgets")
        .select("spent_amount")
        .eq("id", budgetId)
        .eq("user_id", user.id)
        .single();
      if (budget) {
        const newSpent =
          parseFloat(String(budget.spent_amount ?? 0)) +
          parseFloat(String(pattern.amount));
        await supabase
          .from("budgets")
          .update({ spent_amount: newSpent })
          .eq("id", budgetId)
          .eq("user_id", user.id);
      }
    }

    if (goalId) {
      const { data: goal } = await supabase
        .from("goals")
        .select("current_amount")
        .eq("id", goalId)
        .eq("user_id", user.id)
        .single();
      if (goal) {
        const newAmount =
          parseFloat(String(goal.current_amount ?? 0)) +
          parseFloat(String(pattern.amount));
        await supabase
          .from("goals")
          .update({ current_amount: newAmount })
          .eq("id", goalId)
          .eq("user_id", user.id);
      }
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
      case "monthly": {
        nextDate.setMonth(nextDate.getMonth() + 1);
        const dayOfMonth = pattern.day_of_month;
        if (dayOfMonth != null && dayOfMonth >= 1 && dayOfMonth <= 31) {
          const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          nextDate.setDate(Math.min(dayOfMonth, lastDay));
        }
        break;
      }
      case "quarterly":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    // If we have an end_date and the new next_date is past it, deactivate the pattern
    const updates: { next_date: string; updated_at: string; is_active?: boolean } = {
      next_date: nextDate.toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    };
    if (endDate && nextDate > endDate) {
      updates.is_active = false;
    }

    const { error: updateError } = await supabase
      .from("recurring_patterns")
      .update(updates)
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
