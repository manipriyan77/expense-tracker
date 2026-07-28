import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildFingerprint } from "@/lib/server/transaction-fingerprint";

interface ImportRow {
  date: string;
  amount: number;
  description: string;
  type: "income" | "expense";
  category?: string;
  subtype?: string;
  account?: string;
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

    // Fingerprint every row up front, then drop dupes within this same file
    // and dupes already present in the DB — same rule as manual/API entry.
    const withFingerprint = valid.map((r) => ({
      row: r,
      fingerprint: buildFingerprint(r.date, r.description, r.amount, r.account ?? null),
    }));

    const seenInFile = new Set<string>();
    const deduped = withFingerprint.filter(({ fingerprint }) => {
      if (seenInFile.has(fingerprint)) return false;
      seenInFile.add(fingerprint);
      return true;
    });
    const duplicatesInFile = withFingerprint.length - deduped.length;

    const { data: existingRows } = await supabase
      .from("transactions")
      .select("fingerprint")
      .eq("user_id", user.id)
      .in("fingerprint", deduped.map((d) => d.fingerprint));
    const existingFingerprints = new Set((existingRows ?? []).map((r) => r.fingerprint));

    const toInsert = deduped.filter((d) => !existingFingerprints.has(d.fingerprint));
    const duplicatesAlreadySaved = deduped.length - toInsert.length;

    const records = toInsert.map(({ row: r, fingerprint }) => ({
      user_id: user.id,
      amount: r.amount,
      description: r.description,
      category: r.category || "Needs review",
      subtype: r.subtype || "",
      type: r.type,
      date: r.date,
      account: r.account?.trim() || null,
      fingerprint,
      source: "csv",
    }));

    if (records.length > 0) {
      const { error } = await supabase.from("transactions").insert(records);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      imported: records.length,
      duplicates: duplicatesInFile + duplicatesAlreadySaved,
      skipped,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
