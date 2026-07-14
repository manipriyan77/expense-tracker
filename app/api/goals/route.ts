import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadHoldings, holdingKey } from "@/lib/goals/investment-links";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute the live linked value per goal from mapped investment holdings.
    const [holdings, linksRes] = await Promise.all([
      loadHoldings(supabase, user.id),
      supabase
        .from("goal_investment_links")
        .select("goal_id, investment_type, investment_id")
        .eq("user_id", user.id),
    ]);

    // Index holdings by key, keeping both rupee value and grams (metals only).
    const holdingByKey = new Map<string, { value: number; grams: number }>();
    for (const h of holdings) {
      holdingByKey.set(holdingKey(h.type, h.id), {
        value: h.currentValue,
        grams: h.grams ?? 0,
      });
    }

    // Group each goal's links, tracking both a rupee total and a grams total.
    const linksByGoal = new Map<string, { amount: number; grams: number; count: number }>();
    for (const l of linksRes.data ?? []) {
      const h = holdingByKey.get(holdingKey(l.investment_type, l.investment_id));
      if (!h) continue; // holding was deleted; skip stale link
      const agg = linksByGoal.get(l.goal_id) ?? { amount: 0, grams: 0, count: 0 };
      agg.amount += h.value;
      agg.grams += h.grams;
      agg.count += 1;
      linksByGoal.set(l.goal_id, agg);
    }

    const enriched = (data ?? []).map((goal: Record<string, unknown>) => {
      const agg = linksByGoal.get(goal.id as string);
      // A grams-tracked goal accumulates the weight of its linked metals;
      // an amount-tracked goal accumulates their rupee value.
      const linkedValue = agg
        ? goal.unit === "grams"
          ? agg.grams
          : agg.amount
        : 0;
      return {
        ...goal,
        linked_value: linkedValue,
        linked_count: agg?.count ?? 0,
      };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      targetAmount,
      currentAmount,
      targetDate,
      category,
      status,
      priority,
      monthlyContribution,
      unit,
    } = body;

    if (!title || !targetAmount || !targetDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("goals")
      .insert({
        title,
        target_amount: targetAmount,
        current_amount: currentAmount || 0,
        target_date: targetDate,
        category: category || "General",
        status: status || "active",
        priority: priority || "medium",
        monthly_contribution: monthlyContribution ?? 0,
        unit: unit === "grams" ? "grams" : "amount",
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
