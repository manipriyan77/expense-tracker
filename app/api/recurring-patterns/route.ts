import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifyUserBudgetId } from "@/lib/server/recurring-pattern-budget";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("recurring_patterns")
      .select("*")
      .eq("user_id", user.id)
      .order("next_date", { ascending: true });

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
    const {
      name,
      type,
      amount,
      description,
      category,
      subtype,
      frequency,
      day_of_month,
      start_date,
      end_date,
      next_date,
      is_active,
      auto_create,
      linked_goal_id,
      linked_budget_id,
      linked_liability_id,
      tags,
      notes,
    } = body;

    if (!name || !type || !amount || !description || !category || !subtype || !frequency || !start_date || !next_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsed = parseInt(String(day_of_month ?? ""), 10);
    const dayOfMonth =
      Number.isNaN(parsed) || parsed < 1 || parsed > 31 ? null : parsed;

    const linkedBudgetId =
      type === "expense"
        ? await verifyUserBudgetId(supabase, user.id, linked_budget_id)
        : null;

    const { data, error } = await supabase
      .from("recurring_patterns")
      .insert({
        user_id: user.id,
        name,
        type,
        amount: parseFloat(amount),
        description,
        category,
        subtype,
        frequency,
        day_of_month: dayOfMonth,
        start_date,
        end_date: end_date || null,
        next_date,
        is_active: is_active !== undefined ? is_active : true,
        auto_create: auto_create !== undefined ? auto_create : false,
        linked_goal_id: linked_goal_id || null,
        linked_budget_id: linkedBudgetId,
        linked_liability_id: linked_liability_id || null,
        tags: tags || [],
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
