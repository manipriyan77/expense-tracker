import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SILVER_TYPES = ["physical", "etf", "other"] as const;

function rowToHolding(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    quantityGrams: Number(row.quantity_grams),
    purity: Number(row.purity),
    purchasePricePerGram: Number(row.purchase_price_per_gram),
    currentPricePerGram: Number(row.current_price_per_gram),
    purchaseDate: (row.purchase_date as string)?.toString().split("T")[0] ?? "",
    notes: (row.notes as string) ?? undefined,
  };
}

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
      .from("silver_holdings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const holdings = (data ?? []).map(rowToHolding);
    return NextResponse.json(holdings);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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
    const {
      name,
      type,
      quantityGrams,
      purity,
      purchasePricePerGram,
      currentPricePerGram,
      purchaseDate,
      notes,
    } = body;

    if (!name || type == null || quantityGrams == null || purity == null) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, quantityGrams, purity" },
        { status: 400 },
      );
    }
    if (
      purchasePricePerGram == null ||
      currentPricePerGram == null ||
      !purchaseDate
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: purchasePricePerGram, currentPricePerGram, purchaseDate",
        },
        { status: 400 },
      );
    }
    if (!SILVER_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be physical, etf, or other" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("silver_holdings")
      .insert({
        user_id: user.id,
        name: String(name).trim(),
        type,
        quantity_grams: parseFloat(String(quantityGrams)),
        purity: parseFloat(String(purity)),
        purchase_price_per_gram: parseFloat(String(purchasePricePerGram)),
        current_price_per_gram: parseFloat(String(currentPricePerGram)),
        purchase_date: String(purchaseDate).split("T")[0],
        notes: notes ? String(notes).trim() : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(rowToHolding(data), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
