import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface YahooQuote {
  symbol: string;
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
}

async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    // Yahoo Finance v8 quote endpoint — append .NS for NSE, .BO for BSE
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    return meta?.regularMarketPrice ?? meta?.previousClose ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    // Optionally accept { type: "stocks" | "mutual_funds" | "all" }
    const refreshType: "stocks" | "mutual_funds" | "all" = body.type ?? "all";

    const results: { symbol: string; price: number | null; updated: boolean }[] = [];

    // --- Refresh Stocks ---
    if (refreshType === "stocks" || refreshType === "all") {
      const { data: stocks, error } = await supabase
        .from("stocks")
        .select("id, symbol, current_price, shares")
        .eq("user_id", user.id);

      if (!error && stocks) {
        for (const stock of stocks) {
          // Try symbol as-is first, then with .NS suffix for NSE
          let price = await fetchYahooPrice(stock.symbol);
          if (price === null && !stock.symbol.includes(".")) {
            price = await fetchYahooPrice(`${stock.symbol}.NS`);
          }

          if (price !== null) {
            const currentValue = price * stock.shares;
            await supabase
              .from("stocks")
              .update({
                current_price: price,
                current_value: currentValue,
                updated_at: new Date().toISOString(),
              })
              .eq("id", stock.id);
            results.push({ symbol: stock.symbol, price, updated: true });
          } else {
            results.push({ symbol: stock.symbol, price: null, updated: false });
          }
        }
      }
    }

    // --- Refresh Mutual Funds via NAV ---
    if (refreshType === "mutual_funds" || refreshType === "all") {
      const { data: funds, error } = await supabase
        .from("mutual_funds")
        .select("id, symbol, units, nav")
        .eq("user_id", user.id);

      if (!error && funds) {
        for (const fund of funds) {
          if (!fund.symbol) continue;
          // For mutual funds, try Yahoo Finance with symbol
          const price = await fetchYahooPrice(fund.symbol);
          if (price !== null) {
            const currentValue = price * fund.units;
            await supabase
              .from("mutual_funds")
              .update({
                nav: price,
                current_value: currentValue,
                updated_at: new Date().toISOString(),
              })
              .eq("id", fund.id);
            results.push({ symbol: fund.symbol, price, updated: true });
          } else {
            results.push({ symbol: fund.symbol, price: null, updated: false });
          }
        }
      }
    }

    const updatedCount = results.filter((r) => r.updated).length;
    return NextResponse.json({ updated: updatedCount, results });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
