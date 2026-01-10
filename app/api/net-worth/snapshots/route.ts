import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    
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
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all assets
    const { data: assets } = await supabase
      .from("assets")
      .select("value")
      .eq("user_id", user.id);

    // Get all liabilities
    const { data: liabilities } = await supabase
      .from("liabilities")
      .select("balance")
      .eq("user_id", user.id);

    const totalAssets = assets?.reduce((sum, a) => sum + (a.value || 0), 0) || 0;
    const totalLiabilities = liabilities?.reduce((sum, l) => sum + (l.balance || 0), 0) || 0;
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
