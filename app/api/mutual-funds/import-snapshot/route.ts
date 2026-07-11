import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeMonth(value: unknown): string | null {
  if (!value) return null;
  const str = String(value);
  const ym = str.match(/^(\d{4})-(\d{2})/);
  if (ym) return `${ym[1]}-${ym[2]}-01`;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

type IncomingFund = {
  name: string;
  symbol?: string;
  category?: string;
  subCategory?: string;
  units?: number;
  nav?: number;
  purchaseNav?: number;
  investedAmount?: number;
  currentValue?: number;
  purchaseDate?: string;
};

/**
 * Bulk snapshot import from a monthly holdings CSV.
 *
 * For each fund row: match an existing fund by name (case-insensitive) so history
 * stays attached to a stable fund id across monthly uploads — update it if found,
 * otherwise insert. Then upsert one snapshot row for (fund_id, month) so re-uploading
 * the same month overwrites rather than duplicates.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const month = normalizeMonth(body?.month);
    const funds: IncomingFund[] = Array.isArray(body?.funds) ? body.funds : [];

    if (!month) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 });
    }
    if (funds.length === 0) {
      return NextResponse.json({ error: "No funds provided" }, { status: 400 });
    }

    // Load existing funds once so we can match by name without a query per row.
    const { data: existingFunds } = await supabase
      .from("mutual_funds")
      .select("id, name")
      .eq("user_id", user.id);

    const byName = new Map<string, string>();
    for (const f of existingFunds || []) {
      byName.set(String(f.name).trim().toLowerCase(), f.id);
    }

    let imported = 0;
    let failed = 0;

    for (const f of funds) {
      try {
        const name = (f.name || "").trim();
        if (!name) {
          failed++;
          continue;
        }
        const units = Number(f.units) || 0;
        const nav = Number(f.nav) || 0;
        const investedAmount = Number(f.investedAmount) || 0;
        const currentValue =
          f.currentValue !== undefined ? Number(f.currentValue) : units * nav;
        const purchaseNav =
          Number(f.purchaseNav) ||
          (units > 0 && investedAmount > 0 ? investedAmount / units : nav);

        const fundPayload = {
          name,
          symbol:
            f.symbol ||
            name
              .split(/\s+/)
              .map((w) => w[0]?.toUpperCase() ?? "")
              .join("")
              .slice(0, 8) ||
            "NA",
          invested_amount: investedAmount || units * purchaseNav,
          current_value: currentValue,
          units,
          nav,
          purchase_nav: purchaseNav,
          sub_category: f.subCategory || "other",
          category: f.category || "equity",
          purchase_date:
            normalizeMonth(f.purchaseDate) ||
            new Date().toISOString().split("T")[0],
        };

        let fundId = byName.get(name.toLowerCase());

        if (fundId) {
          await supabase
            .from("mutual_funds")
            .update(fundPayload)
            .eq("id", fundId)
            .eq("user_id", user.id);
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("mutual_funds")
            .insert({ ...fundPayload, user_id: user.id })
            .select("id")
            .single();
          if (insertError || !inserted) {
            failed++;
            continue;
          }
          fundId = inserted.id as string;
          byName.set(name.toLowerCase(), fundId);
        }

        if (!fundId) {
          failed++;
          continue;
        }

        const { error: snapError } = await supabase
          .from("mutual_fund_snapshots")
          .upsert(
            {
              user_id: user.id,
              fund_id: fundId,
              snapshot_month: month,
              units,
              invested_amount: fundPayload.invested_amount,
              current_value: currentValue,
              nav,
            },
            { onConflict: "fund_id,snapshot_month" }
          );

        if (snapError) {
          failed++;
          continue;
        }
        imported++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({ imported, failed, month });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
