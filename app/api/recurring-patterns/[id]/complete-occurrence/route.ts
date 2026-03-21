import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  advanceRecurringDate,
  isOccurrenceInMonth,
  parseLocalDate,
} from "@/lib/utils/recurring-occurrences";
import { resolveExpenseBudgetIdForPattern } from "@/lib/server/recurring-pattern-budget";

function parseYmd(occurrenceDate: string): { y: number; m: number } | null {
  const part = occurrenceDate.split("T")[0];
  const [y, m] = part.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return { y, m: m - 1 };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const occurrenceDate = (body.occurrenceDate as string)?.split("T")[0];
    if (!occurrenceDate) {
      return NextResponse.json(
        { error: "occurrenceDate (YYYY-MM-DD) is required" },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const ymd = parseYmd(occurrenceDate);
    if (!ymd) {
      return NextResponse.json({ error: "Invalid occurrenceDate" }, { status: 400 });
    }

    const patternLike = {
      frequency: pattern.frequency as
        | "daily"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "quarterly"
        | "yearly",
      start_date: pattern.start_date,
      end_date: pattern.end_date,
      day_of_month: pattern.day_of_month,
      is_active: true,
    };

    if (
      !isOccurrenceInMonth(patternLike, occurrenceDate, ymd.y, ymd.m)
    ) {
      return NextResponse.json(
        { error: "This date is not a scheduled occurrence for this pattern" },
        { status: 400 },
      );
    }

    const endDate = pattern.end_date ? new Date(pattern.end_date) : null;
    if (endDate && parseLocalDate(occurrenceDate) > endDate) {
      return NextResponse.json(
        { error: "Occurrence is after pattern end date" },
        { status: 400 },
      );
    }

    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("recurring_pattern_id", id)
      .eq("date", occurrenceDate)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This occurrence is already marked complete" },
        { status: 409 },
      );
    }

    const type = pattern.type as "income" | "expense";
    const category = pattern.category as string;
    const subtype = (pattern.subtype as string) || "";
    const budgetId = await resolveExpenseBudgetIdForPattern(
      supabase,
      user.id,
      {
        type,
        linked_budget_id: pattern.linked_budget_id,
        category,
        subtype,
      },
      occurrenceDate,
    );

    const goalId = pattern.linked_goal_id || null;

    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        type,
        amount: pattern.amount,
        description: pattern.description,
        category,
        subtype,
        date: occurrenceDate,
        budget_id: budgetId,
        goal_id: goalId,
        recurring_pattern_id: id,
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

    if (budgetId && type === "expense") {
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

    const nextDateStr = advanceRecurringDate(occurrenceDate, {
      frequency: patternLike.frequency,
      day_of_month: pattern.day_of_month,
    });

    const updates: Record<string, unknown> = {
      next_date: nextDateStr,
      updated_at: new Date().toISOString(),
    };

    const nextD = new Date(nextDateStr);
    if (endDate && nextD > endDate) {
      updates.is_active = false;
    }

    const { data: updatedPattern, error: updateError } = await supabase
      .from("recurring_patterns")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("complete-occurrence pattern update:", updateError);
    }

    return NextResponse.json({
      transaction,
      pattern: updatedPattern ?? pattern,
      nextDate: nextDateStr,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
