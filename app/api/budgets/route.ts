import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get month and year from query params, default to current month
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : new Date().getMonth() + 1;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();

    // First, try to get budgets for the specified month
    let { data, error } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no budgets exist for this month, try to copy from previous month
    if (!data || data.length === 0) {
      // Call the function to create next month's budgets
      const { error: funcError } = await supabase.rpc("create_next_month_budgets", {
        p_user_id: user.id,
        p_target_month: month,
        p_target_year: year,
      });

      if (funcError) {
        console.error("Error creating next month budgets:", funcError);
      }

      // Try fetching again
      const { data: newData, error: newError } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", month)
        .eq("year", year)
        .order("created_at", { ascending: false });

      if (newError) {
        return NextResponse.json({ error: newError.message }, { status: 500 });
      }

      data = newData;
    }

    return NextResponse.json(data || []);
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
    const { category, subtype, limit_amount, period, month, year } = body;

    if (!category || !limit_amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Default to current month/year if not provided
    const currentDate = new Date();
    const budgetMonth = month || currentDate.getMonth() + 1;
    const budgetYear = year || currentDate.getFullYear();

    const { data, error } = await supabase
      .from("budgets")
      .insert({
        category,
        subtype: subtype || null,
        limit_amount,
        period: period || 'monthly',
        month: budgetMonth,
        year: budgetYear,
        spent_amount: 0,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

