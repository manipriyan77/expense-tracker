import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface ImportRow {
  date: string;
  amount: number;
  description: string;
  type: "income" | "expense";
  category?: string;
  subtype?: string;
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
    const rows: ImportRow[] = body.transactions ?? [];

    const valid = rows.filter(
      (r) =>
        r.date &&
        typeof r.amount === "number" &&
        r.amount > 0 &&
        r.description &&
        (r.type === "income" || r.type === "expense"),
    );

    const skipped = rows.length - valid.length;

    if (valid.length === 0) {
      return NextResponse.json(
        { error: "No valid rows to import" },
        { status: 400 },
      );
    }

    const records = valid.map((r) => ({
      user_id: user.id,
      amount: r.amount,
      description: r.description,
      category: r.category || "Other",
      subtype: r.subtype || "Other",
      type: r.type,
      date: r.date,
    }));

    const { error } = await supabase.from("transactions").insert(records);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ imported: valid.length, skipped });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
