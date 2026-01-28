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
      .from("mutual_funds")
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
    const { name, symbol, investedAmount, currentValue, units, nav, purchaseNav, purchaseDate, category, subCategory } = body;

    if (!name || !symbol || units === undefined || nav === undefined || purchaseNav === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const navNum = Number(nav);
    const purchaseNavNum = Number(purchaseNav);
    const unitsNum = Number(units);
    const investedAmountNum =
      investedAmount !== undefined ? Number(investedAmount) : undefined;
    const currentValueNum =
      currentValue !== undefined ? Number(currentValue) : unitsNum * navNum;

    if ([navNum, purchaseNavNum, unitsNum].some((n) => Number.isNaN(n) || n <= 0)) {
      return NextResponse.json({ error: "Invalid numeric values" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("mutual_funds")
      .insert({
        name,
        symbol,
        invested_amount:
          investedAmountNum !== undefined ? investedAmountNum : unitsNum * purchaseNavNum,
        current_value: currentValueNum,
        units: unitsNum,
        nav: navNum,
        purchase_nav: purchaseNavNum,
        sub_category: subCategory ?? "other",
        purchase_date: purchaseDate || new Date().toISOString().split("T")[0],
        category: category || "equity",
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
