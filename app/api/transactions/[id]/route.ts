import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the old transaction to track budget changes
    const { data: oldTransaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!oldTransaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const body = await request.json();
    const { amount, description, category, subtype, date, type, goalId, budgetId } = body;

    // Update transaction
    const { data, error } = await supabase
      .from("transactions")
      .update({
        amount,
        description,
        category,
        subtype,
        budget_id: budgetId !== undefined ? budgetId : undefined,
        goal_id: goalId !== undefined ? goalId : undefined,
        date,
        type,
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update budget spent amounts
    if (type === "expense") {
      // Subtract old amount from old budget
      if (oldTransaction.budget_id) {
        const { data: oldBudget } = await supabase
          .from("budgets")
          .select("spent_amount")
          .eq("id", oldTransaction.budget_id)
          .eq("user_id", user.id)
          .single();

        if (oldBudget) {
          const newSpent = Math.max(0, parseFloat(oldBudget.spent_amount || 0) - parseFloat(oldTransaction.amount));
          await supabase
            .from("budgets")
            .update({ spent_amount: newSpent })
            .eq("id", oldTransaction.budget_id)
            .eq("user_id", user.id);
        }
      }

      // Add new amount to new budget
      if (budgetId) {
        const { data: newBudget } = await supabase
          .from("budgets")
          .select("spent_amount")
          .eq("id", budgetId)
          .eq("user_id", user.id)
          .single();

        if (newBudget) {
          const newSpent = parseFloat(newBudget.spent_amount || 0) + parseFloat(amount);
          await supabase
            .from("budgets")
            .update({ spent_amount: newSpent })
            .eq("id", budgetId)
            .eq("user_id", user.id);
        }
      }
    }

    // Update goal amounts if changed
    if (oldTransaction.goal_id !== goalId) {
      // Subtract from old goal
      if (oldTransaction.goal_id) {
        const { data: oldGoal } = await supabase
          .from("goals")
          .select("current_amount")
          .eq("id", oldTransaction.goal_id)
          .eq("user_id", user.id)
          .single();

        if (oldGoal) {
          const newAmount = Math.max(0, parseFloat(oldGoal.current_amount || 0) - parseFloat(oldTransaction.amount));
          await supabase
            .from("goals")
            .update({ current_amount: newAmount })
            .eq("id", oldTransaction.goal_id)
            .eq("user_id", user.id);
        }
      }

      // Add to new goal
      if (goalId) {
        const { data: newGoal } = await supabase
          .from("goals")
          .select("current_amount")
          .eq("id", goalId)
          .eq("user_id", user.id)
          .single();

        if (newGoal) {
          const newAmount = parseFloat(newGoal.current_amount || 0) + parseFloat(amount);
          await supabase
            .from("goals")
            .update({ current_amount: newAmount })
            .eq("id", goalId)
            .eq("user_id", user.id);
        }
      }
    } else if (goalId && oldTransaction.amount !== amount) {
      // Same goal but amount changed - update the difference
      const { data: goal } = await supabase
        .from("goals")
        .select("current_amount")
        .eq("id", goalId)
        .eq("user_id", user.id)
        .single();

      if (goal) {
        const difference = parseFloat(amount) - parseFloat(oldTransaction.amount);
        const newAmount = parseFloat(goal.current_amount || 0) + difference;
        await supabase
          .from("goals")
          .update({ current_amount: Math.max(0, newAmount) })
          .eq("id", goalId)
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the transaction first to update budget/goal amounts
    const { data: transaction } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Update budget spent amount if transaction was linked to a budget
    if (transaction.budget_id && transaction.type === "expense") {
      const { data: budget } = await supabase
        .from("budgets")
        .select("spent_amount")
        .eq("id", transaction.budget_id)
        .eq("user_id", user.id)
        .single();

      if (budget) {
        const newSpent = Math.max(0, parseFloat(budget.spent_amount || 0) - parseFloat(transaction.amount));
        await supabase
          .from("budgets")
          .update({ spent_amount: newSpent })
          .eq("id", transaction.budget_id)
          .eq("user_id", user.id);
      }
    }

    // Update goal current amount if transaction was linked to a goal
    if (transaction.goal_id) {
      const { data: goal } = await supabase
        .from("goals")
        .select("current_amount")
        .eq("id", transaction.goal_id)
        .eq("user_id", user.id)
        .single();

      if (goal) {
        const newAmount = Math.max(0, parseFloat(goal.current_amount || 0) - parseFloat(transaction.amount));
        await supabase
          .from("goals")
          .update({ current_amount: newAmount })
          .eq("id", transaction.goal_id)
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
