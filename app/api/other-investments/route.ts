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
      .from("other_investments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json((data ?? []).map(rowToInvestment));
  } catch {
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

    if (!name || !type || investedAmount == null || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, investedAmount, startDate" },
        { status: 400 },
      );
    }
    if (!OTHER_INVESTMENT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Invalid type" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("other_investments")
      .insert({
        user_id: user.id,
        name: String(name).trim(),
        type,
        invested_amount: parseFloat(String(investedAmount)),
        current_value: parseFloat(String(currentValue ?? investedAmount)),
        start_date: String(startDate).split("T")[0],
        maturity_date: maturityDate
          ? String(maturityDate).split("T")[0]
          : null,
        interest_rate:
          interestRate != null ? parseFloat(String(interestRate)) : null,
        notes: notes ? String(notes).trim() : null,
        premium_amount:
          premiumAmount != null ? parseFloat(String(premiumAmount)) : null,
        premium_frequency: premiumFrequency ?? null,
        sum_assured:
          sumAssured != null ? parseFloat(String(sumAssured)) : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(rowToInvestment(data), { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
