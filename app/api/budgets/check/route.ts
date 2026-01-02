import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { category, subtype, amount } = body;

    if (!category || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Find matching budget
    const { data: budgets, error: budgetError } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("category", category)
      .eq("period", "monthly"); // Currently only supporting monthly

    if (budgetError) {
      return NextResponse.json({ error: budgetError.message }, { status: 500 });
    }

    // Try to find budget with matching subtype first, then fallback to category-only budget
    let matchingBudget = budgets?.find(b => b.subtype === subtype);
    if (!matchingBudget) {
      matchingBudget = budgets?.find(b => b.subtype === null || b.subtype === '');
    }

    if (!matchingBudget) {
      return NextResponse.json({ 
        hasBudget: false,
        message: "No budget set for this category"
      });
    }

    // Calculate current spending for the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const { data: transactions, error: transError } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .eq("category", category)
      .gte("date", startOfMonth)
      .lte("date", endOfMonth);

    if (transError) {
      return NextResponse.json({ error: transError.message }, { status: 500 });
    }

    // Calculate total spent
    const totalSpent = transactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;
    const newTotal = totalSpent + parseFloat(amount);
    const budgetLimit = parseFloat(matchingBudget.limit_amount);
    const percentage = (newTotal / budgetLimit) * 100;

    return NextResponse.json({
      hasBudget: true,
      budget: matchingBudget,
      totalSpent,
      newTotal,
      budgetLimit,
      percentage,
      isNearLimit: percentage >= 90,
      isOverLimit: percentage >= 100,
      remainingAmount: budgetLimit - newTotal,
    });

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

