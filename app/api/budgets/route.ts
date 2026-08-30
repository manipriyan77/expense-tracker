import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface BudgetRow {
  id: string;
  category: string;
  subtype: string | null;
  limit_amount: number;
  spent_amount: number;
  period: string;
  rollover_enabled?: boolean;
}

const keyOf = (category: string, subtype: string | null) =>
  `${category}|${subtype ?? ""}`;

/**
 * Adds derived, non-persisted fields to each budget: how much rolled over
 * from last month (only one month back, not compounded further), the
 * resulting effective limit, last month's spend for a trend comparison, and
 * — only when `month`/`year` is the real current month — a pace-based
 * end-of-month forecast.
 */
async function enrichWithRolloverAndTrends(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  month: number,
  year: number,
  budgets: BudgetRow[],
) {
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  const { data: prevBudgets } = await supabase
    .from("budgets")
    .select("category, subtype, limit_amount, spent_amount")
    .eq("user_id", userId)
    .eq("month", prevMonth)
    .eq("year", prevYear);

  const prevMap = new Map<string, { limit_amount: number; spent_amount: number }>();
  for (const b of prevBudgets ?? []) {
    prevMap.set(keyOf(b.category, b.subtype), {
      limit_amount: Number(b.limit_amount),
      spent_amount: Number(b.spent_amount ?? 0),
    });
  }

  const now = new Date();
  const isCurrentPeriod = now.getMonth() + 1 === month && now.getFullYear() === year;
  const daysTotal = new Date(year, month, 0).getDate();
  const daysElapsed = isCurrentPeriod ? now.getDate() : null;

  return budgets.map((b) => {
    const prev = prevMap.get(keyOf(b.category, b.subtype));
    const rolloverAmount =
      b.rollover_enabled && b.period === "monthly" && prev
        ? prev.limit_amount - prev.spent_amount
        : 0;
    const effectiveLimit = Number(b.limit_amount) + rolloverAmount;
    const trendPct =
      prev && prev.spent_amount > 0
        ? ((Number(b.spent_amount) - prev.spent_amount) / prev.spent_amount) * 100
        : null;
    const projectedSpend =
      isCurrentPeriod && daysElapsed && daysElapsed > 0 && b.period === "monthly"
        ? (Number(b.spent_amount) / daysElapsed) * daysTotal
        : null;

    return {
      ...b,
      rollover_amount: rolloverAmount,
      effective_limit: effectiveLimit,
      prev_period_spent: prev?.spent_amount ?? null,
      trend_pct: trendPct,
      projected_spend: projectedSpend,
      days_elapsed: daysElapsed,
      days_total: daysTotal,
    };
  });
}

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

    const budgets = data || [];

    if (budgets.length > 0) {
      // Compute spent_amount from actual transactions to fix any drift
      const budgetIds = budgets.map((b: { id: string }) => b.id);
      const pad = (n: number) => String(n).padStart(2, "0");
      const lastDay = new Date(year, month, 0).getDate();
      const startDate = `${year}-${pad(month)}-01`;
      const endDate = `${year}-${pad(month)}-${pad(lastDay)}`;

      const { data: txRows } = await supabase
        .from("transactions")
        .select("budget_id, amount")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .in("budget_id", budgetIds)
        .gte("date", startDate)
        .lte("date", endDate);

      // Sum per budget
      const spentMap = new Map<string, number>();
      for (const tx of txRows ?? []) {
        if (tx.budget_id) {
          spentMap.set(tx.budget_id, (spentMap.get(tx.budget_id) ?? 0) + parseFloat(tx.amount));
        }
      }

      // Patch DB if any value drifted, and return corrected values
      const corrected = await Promise.all(
        budgets.map(async (b: BudgetRow) => {
          const realSpent = spentMap.get(b.id) ?? 0;
          if (Math.abs(realSpent - (b.spent_amount ?? 0)) > 0.001) {
            await supabase
              .from("budgets")
              .update({ spent_amount: realSpent })
              .eq("id", b.id)
              .eq("user_id", user.id);
          }
          return { ...b, spent_amount: realSpent };
        })
      );

      const enriched = await enrichWithRolloverAndTrends(
        supabase,
        user.id,
        month,
        year,
        corrected,
      );

      return NextResponse.json(enriched);
    }

    return NextResponse.json(budgets);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : new Date().getMonth() + 1;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : new Date().getFullYear();

    // Get all budgets for this month
    const { data: monthBudgets, error: fetchError } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!monthBudgets || monthBudgets.length === 0) {
      return NextResponse.json({ success: true, deletedBudgets: 0, deletedTransactions: 0 });
    }

    const budgetIds = monthBudgets.map((b) => b.id);

    // Delete linked transactions first
    const { data: linkedTransactions, error: txFetchError } = await supabase
      .from("transactions")
      .select("id")
      .in("budget_id", budgetIds)
      .eq("user_id", user.id);

    if (txFetchError) {
      return NextResponse.json({ error: txFetchError.message }, { status: 500 });
    }

    if (linkedTransactions && linkedTransactions.length > 0) {
      const { error: deleteTxError } = await supabase
        .from("transactions")
        .delete()
        .in("budget_id", budgetIds)
        .eq("user_id", user.id);

      if (deleteTxError) {
        return NextResponse.json({ error: deleteTxError.message }, { status: 500 });
      }
    }

    // Delete all budgets for the month
    const { error: deleteBudgetsError } = await supabase
      .from("budgets")
      .delete()
      .in("id", budgetIds)
      .eq("user_id", user.id);

    if (deleteBudgetsError) {
      return NextResponse.json({ error: deleteBudgetsError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deletedBudgets: budgetIds.length,
      deletedTransactions: linkedTransactions?.length || 0,
    });
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
    const { category, subtype, limit_amount, period, month, year, rollover_enabled } = body;

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
        rollover_enabled: !!rollover_enabled,
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

