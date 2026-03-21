import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveExpenseBudgetIdForPattern } from "@/lib/server/recurring-pattern-budget";

function computeNextDate(currentNext: string, frequency: string, dayOfMonth: number | null): string {
  const d = new Date(currentNext);
  switch (frequency) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly": {
      d.setMonth(d.getMonth() + 1);
      if (dayOfMonth != null && dayOfMonth >= 1 && dayOfMonth <= 31) {
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(dayOfMonth, lastDay));
      }
      break;
    }
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split("T")[0];
}

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Fetch all active auto_create patterns that are due
    const { data: patterns, error: fetchError } = await supabase
      .from("recurring_patterns")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .eq("auto_create", true)
      .lte("next_date", today);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!patterns || patterns.length === 0) {
      return NextResponse.json({ created: 0, patterns: [] });
    }

    const created: { id: string; name: string; amount: number; type: string }[] = [];

    for (const pattern of patterns) {
      // Respect end_date
      const endDate = pattern.end_date ? new Date(pattern.end_date) : null;
      const nextDate = new Date(pattern.next_date);

      if (endDate && nextDate > endDate) {
        await supabase
          .from("recurring_patterns")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", pattern.id);
        continue;
      }

      const budgetId = await resolveExpenseBudgetIdForPattern(
        supabase,
        user.id,
        {
          type: pattern.type,
          linked_budget_id: pattern.linked_budget_id,
          category: pattern.category,
          subtype: pattern.subtype,
        },
        String(pattern.next_date).split("T")[0],
      );
      const goalId = pattern.linked_goal_id || null;

      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        type: pattern.type,
        amount: pattern.amount,
        description: pattern.description,
        category: pattern.category,
        subtype: pattern.subtype,
        date: pattern.next_date,
        budget_id: budgetId,
        goal_id: goalId,
        recurring_pattern_id: pattern.id,
        tags: pattern.tags || [],
        notes: pattern.notes || null,
      });

      if (txError) continue;

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

      // If linked to a goal, increment goal's current_amount
      if (pattern.linked_goal_id) {
        const { data: goal } = await supabase
          .from("goals")
          .select("current_amount")
          .eq("id", pattern.linked_goal_id)
          .eq("user_id", user.id)
          .single();

        if (goal) {
          const newAmount = parseFloat(goal.current_amount) + pattern.amount;
          await supabase
            .from("goals")
            .update({ current_amount: newAmount, updated_at: new Date().toISOString() })
            .eq("id", pattern.linked_goal_id);
        }
      }

      // Compute the new next_date
      const newNextDate = computeNextDate(pattern.next_date, pattern.frequency, pattern.day_of_month);
      const newNextDateObj = new Date(newNextDate);
      const updates: Record<string, unknown> = {
        next_date: newNextDate,
        updated_at: new Date().toISOString(),
      };
      if (endDate && newNextDateObj > endDate) {
        updates.is_active = false;
      }

      await supabase.from("recurring_patterns").update(updates).eq("id", pattern.id);

      created.push({ id: pattern.id, name: pattern.name, amount: pattern.amount, type: pattern.type });
    }

    return NextResponse.json({ created: created.length, patterns: created });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
