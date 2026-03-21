import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTHER_INVESTMENT_TYPES = [
  "ppf",
  "epf",
  "nps",
  "postal",
  "lic",
  "fd",
  "rd",
  "other",
] as const;

function rowToInvestment(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    investedAmount: Number(row.invested_amount),
    currentValue: Number(row.current_value),
    startDate: (row.start_date as string)?.toString().split("T")[0] ?? "",
    maturityDate:
      row.maturity_date
        ? (row.maturity_date as string).toString().split("T")[0]
        : undefined,
    interestRate:
      row.interest_rate != null ? Number(row.interest_rate) : undefined,
    notes: (row.notes as string) ?? undefined,
    premiumAmount:
      row.premium_amount != null ? Number(row.premium_amount) : undefined,
    premiumFrequency: (row.premium_frequency as string) ?? undefined,
    sumAssured:
      row.sum_assured != null ? Number(row.sum_assured) : undefined,
  };
}

export async function GET(
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

    const { data, error } = await supabase
      .from("other_investments")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Investment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(rowToInvestment(data));
  } catch {
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
      investedAmount,
      currentValue,
      startDate,
      maturityDate,
      interestRate,
      notes,
      premiumAmount,
      premiumFrequency,
      sumAssured,
    } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = String(name).trim();
    if (type !== undefined) {
      if (!OTHER_INVESTMENT_TYPES.includes(type)) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }
      updates.type = type;
    }
    if (investedAmount !== undefined)
      updates.invested_amount = parseFloat(String(investedAmount));
    if (currentValue !== undefined)
      updates.current_value = parseFloat(String(currentValue));
    if (startDate !== undefined)
      updates.start_date = String(startDate).split("T")[0];
    if (maturityDate !== undefined)
      updates.maturity_date = maturityDate
        ? String(maturityDate).split("T")[0]
        : null;
    if (interestRate !== undefined)
      updates.interest_rate =
        interestRate != null ? parseFloat(String(interestRate)) : null;
    if (notes !== undefined)
      updates.notes = notes ? String(notes).trim() : null;
    if (premiumAmount !== undefined)
      updates.premium_amount =
        premiumAmount != null ? parseFloat(String(premiumAmount)) : null;
    if (premiumFrequency !== undefined)
      updates.premium_frequency = premiumFrequency ?? null;
    if (sumAssured !== undefined)
      updates.sum_assured =
        sumAssured != null ? parseFloat(String(sumAssured)) : null;

    const { data, error } = await supabase
      .from("other_investments")
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
        { error: "Investment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(rowToInvestment(data));
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

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

    const { error } = await supabase
      .from("other_investments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
