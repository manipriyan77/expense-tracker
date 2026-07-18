import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// DELETE /api/other-investments/snapshots/[id]
// Removes a single monthly snapshot, then re-syncs the parent investment's
// current_value to whatever latest month remains (if any).
export async function DELETE(
  _request: NextRequest,
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

    const { id } = await context.params;

    // Look up the row first so we know which investment to re-sync.
    const { data: row } = await supabase
      .from("other_investment_snapshots")
      .select("investment_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    const { error } = await supabase
      .from("other_investment_snapshots")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (row?.investment_id) {
      const { data: latest } = await supabase
        .from("other_investment_snapshots")
        .select("current_value")
        .eq("investment_id", row.investment_id)
        .eq("user_id", user.id)
        .order("snapshot_month", { ascending: false })
        .limit(1)
        .single();
      if (latest) {
        await supabase
          .from("other_investments")
          .update({ current_value: latest.current_value })
          .eq("id", row.investment_id)
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
