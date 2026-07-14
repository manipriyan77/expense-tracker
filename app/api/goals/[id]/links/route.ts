import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { InvestmentType } from "@/lib/goals/investment-links";

const VALID_TYPES: InvestmentType[] = ["mutual_fund", "stock", "gold", "other"];

// PUT /api/goals/[id]/links
// Replaces the full set of investment links for a goal.
// Body: { selections: [{ type: InvestmentType, id: string }] }
// Mapping is exclusive, so selecting a holding already linked to another goal
// reassigns it to this goal.
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: goalId } = await context.params;
    const body = await request.json();
    const rawSelections: Array<{ type: string; id: string }> = Array.isArray(
      body?.selections,
    )
      ? body.selections
      : [];

    // Validate + dedupe selections
    const seen = new Set<string>();
    const selections = rawSelections.filter((s) => {
      if (!s || !VALID_TYPES.includes(s.type as InvestmentType) || !s.id) return false;
      const key = `${s.type}:${s.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Verify the goal belongs to the user
    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .single();
    if (goalError || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Exclusive mapping: reject any selection already linked to a different
    // goal. A holding must be unlinked from its current goal first.
    const { data: otherLinks, error: otherErr } = await supabase
      .from("goal_investment_links")
      .select("investment_type, investment_id")
      .eq("user_id", user.id)
      .neq("goal_id", goalId);
    if (otherErr) {
      return NextResponse.json({ error: otherErr.message }, { status: 500 });
    }
    const takenElsewhere = new Set(
      (otherLinks ?? []).map((l) => `${l.investment_type}:${l.investment_id}`),
    );
    const conflict = selections.find((s) => takenElsewhere.has(`${s.type}:${s.id}`));
    if (conflict) {
      return NextResponse.json(
        {
          error:
            "One or more investments are already linked to another goal. Unlink them there first.",
        },
        { status: 409 },
      );
    }

    // Remove this goal's existing links, then upsert the new set.
    const { error: delError } = await supabase
      .from("goal_investment_links")
      .delete()
      .eq("goal_id", goalId)
      .eq("user_id", user.id);
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    if (selections.length > 0) {
      const rows = selections.map((s) => ({
        user_id: user.id,
        goal_id: goalId,
        investment_type: s.type,
        investment_id: s.id,
      }));
      // onConflict reassigns holdings currently linked to a different goal.
      const { error: upsertError } = await supabase
        .from("goal_investment_links")
        .upsert(rows, { onConflict: "user_id,investment_type,investment_id" });
      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, count: selections.length });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
