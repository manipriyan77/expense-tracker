import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, description, category, subtype, date, type, goalId } = body;
    let { budgetId } = body;

    if (!amount || !description || !category || !type) {
      return NextResponse.json({ error: "Missing required fields (amount, description, category, type)" }, { status: 400 });
    }

    // Auto-map to matching budget if not provided
    if (!budgetId && type === "expense") {
      // Find matching budget: priority order: exact match (category + subtype) > category-only match
      let matchingBudget = null;
      
      // Try exact match first (category + subtype)
      if (subtype) {
        const { data: exactMatch } = await supabase
          .from("budgets")
          .select("*")
          .eq("user_id", user.id)
          .eq("category", category)
          .eq("subtype", subtype)
          .limit(1)
          .single();
        
        if (exactMatch) {
          matchingBudget = exactMatch;
        }
      }
      
      // If no exact match, try category-only match (with null subtype)
      if (!matchingBudget) {
        const { data: categoryMatch } = await supabase
          .from("budgets")
          .select("*")
          .eq("user_id", user.id)
          .eq("category", category)
          .is("subtype", null)
          .limit(1)
          .single();
        
        if (categoryMatch) {
          matchingBudget = categoryMatch;
        }
      }
      
      if (matchingBudget) {
        budgetId = matchingBudget.id;
      }
    }

    // Insert transaction
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        amount,
        description,
        category,
        subtype: subtype || "",
        budget_id: budgetId || null,
        goal_id: goalId || null,
        date: date || new Date().toISOString().split("T")[0],
        type,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If linked to a budget and is an expense, update budget's spent_amount
    if (budgetId && type === "expense") {
      const { data: budget, error: budgetFetchError } = await supabase
        .from("budgets")
        .select("spent_amount")
        .eq("id", budgetId)
        .eq("user_id", user.id)
        .single();

      if (!budgetFetchError && budget) {
        const newSpent = parseFloat(budget.spent_amount || 0) + parseFloat(amount);
        
        await supabase
          .from("budgets")
          .update({ spent_amount: newSpent })
          .eq("id", budgetId)
          .eq("user_id", user.id);
      }
    }

    // If linked to a goal, update the goal's current_amount
    if (goalId) {
      const { data: goal, error: goalFetchError } = await supabase
        .from("goals")
        .select("current_amount")
        .eq("id", goalId)
        .eq("user_id", user.id)
        .single();

      if (!goalFetchError && goal) {
        const newAmount = parseFloat(goal.current_amount || 0) + parseFloat(amount);
        
        await supabase
          .from("goals")
          .update({ current_amount: newAmount })
          .eq("id", goalId)
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}