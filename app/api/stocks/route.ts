import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("stocks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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
    const {
      name,
      symbol,
      stockType,
      shares,
      avgPurchasePrice,
      currentPrice,
      investedAmount,
      currentValue,
      purchaseDate,
      sector,
      subSector,
    } = body;

    if (
      !name ||
      !symbol ||
      shares === undefined ||
      avgPurchasePrice === undefined ||
      currentPrice === undefined
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sharesNum = Number(shares);
    const avgNum = Number(avgPurchasePrice);
    const currentNum = Number(currentPrice);

    if ([sharesNum, avgNum, currentNum].some((n) => Number.isNaN(n) || n < 0)) {
      return NextResponse.json({ error: "Invalid numeric values" }, { status: 400 });
    }

    const computedInvested = sharesNum * avgNum;
    const computedCurrent = sharesNum * currentNum;

    const { data, error } = await supabase
      .from("stocks")
      .insert({
        name,
        symbol,
        shares: sharesNum,
        avg_purchase_price: avgNum,
        current_price: currentNum,
        invested_amount:
          investedAmount !== undefined ? Number(investedAmount) : computedInvested,
        current_value:
          currentValue !== undefined ? Number(currentValue) : computedCurrent,
        purchase_date: purchaseDate || new Date().toISOString().split("T")[0],
        sector: sector || "General",
        sub_sector: subSector || "other",
        stock_type: stockType || "other",
        user_id: user.id,
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
