import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CONFIRMATION = "DELETE ALL TRACKWISE DATA";

// Deleted in FK-safe order: children before parents.
const TABLES_IN_ORDER = [
  "debt_payments",
  "savings_challenge_contributions",
  "savings_challenges",
  "net_worth_snapshots",
  "documents",
  "transactions",
  "ignored_recurring_patterns",
  "recurring_patterns",
  "categorization_rules",
  "lookups",
  "budget_templates",
  "budgets",
  "goals",
  "liabilities",
  "assets",
  "forex_entries",
  "gold_holdings",
  "silver_holdings",
  "stocks",
  "mutual_fund_snapshots",
  "mutual_funds",
  "other_investment_snapshots",
  "other_investments",
  "user_preferences",
];

// Tables that hold debt records — skipped when the caller asks to keep debts.
const DEBT_TABLES = new Set(["debt_payments", "liabilities"]);

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.confirm !== CONFIRMATION) {
      return NextResponse.json({ error: "Confirmation phrase did not match" }, { status: 400 });
    }
    const keepDebts = body.keepDebts === true;

    const errors: string[] = [];
    for (const table of TABLES_IN_ORDER) {
      if (keepDebts && DEBT_TABLES.has(table)) continue;
      const { error } = await supabase.from(table).delete().eq("user_id", user.id);
      if (error) errors.push(`${table}: ${error.message}`);
    }

    // Remove stored receipt/document bytes under this user's storage prefix.
    const { data: objects } = await supabase.storage.from("documents").list(user.id);
    if (objects && objects.length > 0) {
      const paths = objects.map((o) => `${user.id}/${o.name}`);
      await supabase.storage.from("documents").remove(paths);
    }

    // Fresh empty-state preferences.
    await supabase.from("user_preferences").upsert(
      { user_id: user.id, selected_period: "all-time", updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );

    if (errors.length > 0) {
      return NextResponse.json({ success: false, errors }, { status: 207 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
