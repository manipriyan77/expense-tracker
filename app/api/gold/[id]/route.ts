import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const GOLD_TYPES = ["physical", "etf", "sov", "other"] as const;

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

export async function GET(
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

    const { id } = await context.params;

    const { data, error } = await supabase
      .from("gold_holdings")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Gold holding not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(rowToHolding(data));
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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

    const { id } = await context.params;
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

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (type !== undefined) {
      if (!GOLD_TYPES.includes(type)) {
        return NextResponse.json(
          { error: "Invalid type. Must be physical, etf, sov, or other" },
          { status: 400 },
        );
      }
      updates.type = type;
    }
    if (quantityGrams !== undefined)
      updates.quantity_grams = parseFloat(String(quantityGrams));
    if (purity !== undefined) updates.purity = parseFloat(String(purity));
    if (purchasePricePerGram !== undefined)
      updates.purchase_price_per_gram = parseFloat(String(purchasePricePerGram));
    if (currentPricePerGram !== undefined)
      updates.current_price_per_gram = parseFloat(
        String(currentPricePerGram),
      );
    if (purchaseDate !== undefined)
      updates.purchase_date = String(purchaseDate).split("T")[0];
    if (notes !== undefined)
      updates.notes = notes ? String(notes).trim() : null;

    const { data, error } = await supabase
      .from("gold_holdings")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json(
        { error: "Gold holding not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(rowToHolding(data));
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    const { id } = await context.params;

    const { error } = await supabase
      .from("gold_holdings")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
