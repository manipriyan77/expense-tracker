import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("net_worth_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Manual assets (net worth module)
    const { data: assets } = await supabase
      .from("assets")
      .select("value")
      .eq("user_id", user.id);
    const manualAssets =
      assets?.reduce((sum, a) => sum + Number(a.value || 0), 0) || 0;

    // Gold holdings
    const { data: goldRows } = await supabase
      .from("gold_holdings")
      .select("quantity_grams, current_price_per_gram")
      .eq("user_id", user.id);
    const goldValue =
      goldRows?.reduce(
        (sum, r) =>
          sum + Number(r.quantity_grams || 0) * Number(r.current_price_per_gram || 0),
        0,
      ) || 0;

    // Mutual funds
    const { data: mfRows } = await supabase
      .from("mutual_funds")
      .select("current_value")
      .eq("user_id", user.id);
    const mfValue =
      mfRows?.reduce((sum, r) => sum + Number(r.current_value || 0), 0) || 0;

    // Stocks
    const { data: stockRows } = await supabase
      .from("stocks")
      .select("current_value")
      .eq("user_id", user.id);
    const stockValue =
      stockRows?.reduce((sum, r) => sum + Number(r.current_value || 0), 0) || 0;

    // Forex: deposits - withdrawals + pnl
    const { data: forexRows } = await supabase
      .from("forex_entries")
      .select("type, amount")
      .eq("user_id", user.id);
    const forexValue =
      forexRows?.reduce((sum, r) => {
        if (r.type === "deposit") return sum + Number(r.amount || 0);
        if (r.type === "withdrawal") return sum - Number(r.amount || 0);
        if (r.type === "pnl") return sum + Number(r.amount || 0);
        return sum;
      }, 0) || 0;

    // Get all liabilities
    const { data: liabilities } = await supabase
      .from("liabilities")
      .select("balance")
      .eq("user_id", user.id);

    const totalAssets =
      manualAssets + goldValue + mfValue + stockValue + forexValue;
    const totalLiabilities =
      liabilities?.reduce((sum, l) => sum + Number(l.balance || 0), 0) || 0;
    const netWorth = totalAssets - totalLiabilities;

    // Create snapshot
    const { data, error } = await supabase
      .from("net_worth_snapshots")
      .insert([{
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        net_worth: netWorth,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
