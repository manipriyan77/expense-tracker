import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Last 6 periods (this one included) for the same category/subtype, oldest first. */
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
      .select("category, subtype, month, year")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (budgetError || !budgetRow) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    // Walk back 5 months from this budget's period, oldest first.
    const periods: { month: number; year: number }[] = [];
    let m = budgetRow.month as number;
    let y = budgetRow.year as number;
    for (let i = 0; i < 6; i++) {
      periods.unshift({ month: m, year: y });
      m = m === 1 ? 12 : m - 1;
      y = m === 12 ? y - 1 : y;
    }

    let historyQuery = supabase
      .from("budgets")
      .select("month, year, limit_amount, spent_amount")
      .eq("user_id", user.id)
      .eq("category", budgetRow.category)
      .in("year", [...new Set(periods.map((p) => p.year))]);
    historyQuery = budgetRow.subtype
      ? historyQuery.eq("subtype", budgetRow.subtype)
      : historyQuery.is("subtype", null);

    const { data: rows, error } = await historyQuery;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const byKey = new Map(
      (rows ?? []).map((r) => [`${r.year}-${r.month}`, r]),
    );

    const history = periods.map((p) => {
      const row = byKey.get(`${p.year}-${p.month}`);
      return {
        month: p.month,
        year: p.year,
        label: new Date(p.year, p.month - 1, 1).toLocaleDateString("en-IN", {
          month: "short",
        }),
        limit_amount: row ? Number(row.limit_amount) : null,
        spent_amount: row ? Number(row.spent_amount ?? 0) : null,
      };
    });

    return NextResponse.json(history);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
