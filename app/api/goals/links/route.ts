import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadHoldings, holdingKey } from "@/lib/goals/investment-links";

// GET /api/goals/links
// Returns every investment holding for the user, annotated with which goal
// (if any) it is currently linked to. Powers the "Link investments" picker.
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

    const [holdings, linksRes] = await Promise.all([
      loadHoldings(supabase, user.id),
      supabase
        .from("goal_investment_links")
        .select("goal_id, investment_type, investment_id")
        .eq("user_id", user.id),
    ]);

    const linkByHolding = new Map<string, string>();
    for (const l of linksRes.data ?? []) {
      linkByHolding.set(holdingKey(l.investment_type, l.investment_id), l.goal_id);
    }

    const result = holdings.map((h) => ({
      ...h,
      linkedGoalId: linkByHolding.get(holdingKey(h.type, h.id)) ?? null,
    }));

    return NextResponse.json({ holdings: result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
