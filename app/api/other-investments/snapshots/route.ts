import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET /api/other-investments/snapshots
// Returns every monthly value snapshot for the user, ordered by month.
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
      .from("other_investment_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("snapshot_month", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST /api/other-investments/snapshots
// Body: { investmentId, month: "YYYY-MM" | "YYYY-MM-DD", value: number }
// Upserts the month's value and syncs the parent's current_value to the latest
// recorded month so cards/totals stay in step with the history.
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
    const investmentId: string | undefined = body.investmentId;
    const rawMonth: string | undefined = body.month;
    const value = Number(body.value);

    if (!investmentId || !rawMonth || !Number.isFinite(value)) {
      return NextResponse.json(
        { error: "investmentId, month and value are required" },
        { status: 400 },
      );
    }

    // Normalize to the first of the month.
    const monthDate = new Date(rawMonth);
    if (Number.isNaN(monthDate.getTime())) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }
    const snapshotMonth = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-01`;

    // Ensure the investment belongs to this user.
    const { data: investment, error: invErr } = await supabase
      .from("other_investments")
      .select("id")
      .eq("id", investmentId)
      .eq("user_id", user.id)
      .single();
    if (invErr || !investment) {
      return NextResponse.json({ error: "Investment not found" }, { status: 404 });
    }

    const { data: snapshot, error: upsertErr } = await supabase
      .from("other_investment_snapshots")
      .upsert(
        {
          user_id: user.id,
          investment_id: investmentId,
          snapshot_month: snapshotMonth,
          current_value: value,
        },
        { onConflict: "investment_id,snapshot_month" },
      )
      .select()
      .single();
    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    // Sync the parent's current_value to the latest month on record.
    const { data: latest } = await supabase
      .from("other_investment_snapshots")
      .select("current_value, snapshot_month")
      .eq("investment_id", investmentId)
      .eq("user_id", user.id)
      .order("snapshot_month", { ascending: false })
      .limit(1)
      .single();

    if (latest) {
      await supabase
        .from("other_investments")
        .update({ current_value: latest.current_value })
        .eq("id", investmentId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      snapshot,
      latestValue: latest?.current_value ?? value,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
