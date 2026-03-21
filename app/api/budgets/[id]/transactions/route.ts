import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;

    const { data: budgetRow, error: budgetError } = await supabase
      .from("budgets")
      .select("id, month, year")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (budgetError || !budgetRow) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    const now = new Date();
    const y =
      typeof budgetRow.year === "number"
        ? budgetRow.year
        : now.getFullYear();
    const m =
      typeof budgetRow.month === "number"
        ? budgetRow.month
        : now.getMonth() + 1;
    const pad = (n: number) => String(n).padStart(2, "0");
    const lastDay = new Date(y, m, 0).getDate();
    const startDate = `${y}-${pad(m)}-01`;
    const endDate = `${y}-${pad(m)}-${pad(lastDay)}`;

    // Transactions linked to this budget row whose dates fall in that budget's calendar month
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("budget_id", params.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

