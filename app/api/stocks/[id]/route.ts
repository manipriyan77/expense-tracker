import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
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

    const sharesNum = shares !== undefined ? Number(shares) : undefined;
    const avgNum = avgPurchasePrice !== undefined ? Number(avgPurchasePrice) : undefined;
    const currentNum = currentPrice !== undefined ? Number(currentPrice) : undefined;

    const computedInvested =
      sharesNum !== undefined && avgNum !== undefined ? sharesNum * avgNum : undefined;
    const computedCurrent =
      sharesNum !== undefined && currentNum !== undefined ? sharesNum * currentNum : undefined;

    const { data, error } = await supabase
      .from("stocks")
      .update({
        name,
        symbol,
        shares: sharesNum,
        avg_purchase_price: avgNum,
        current_price: currentNum,
        invested_amount:
          investedAmount !== undefined
            ? Number(investedAmount)
            : computedInvested ?? undefined,
        current_value:
          currentValue !== undefined
            ? Number(currentValue)
            : computedCurrent ?? undefined,
        purchase_date: purchaseDate,
        sector,
        sub_sector: subSector,
        stock_type: stockType,
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Stock not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;

    const { error } = await supabase
      .from("stocks")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
