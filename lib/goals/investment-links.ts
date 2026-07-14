import type { SupabaseClient } from "@supabase/supabase-js";

export type InvestmentType = "mutual_fund" | "stock" | "gold" | "silver" | "other";

/** Types that carry a weight in grams and can back a grams-tracked goal. */
export const METAL_TYPES: InvestmentType[] = ["gold", "silver"];

export interface Holding {
  type: InvestmentType;
  id: string;
  name: string;
  currentValue: number;
  /** Weight in grams, present only for metal holdings (gold, silver). */
  grams?: number;
}

/**
 * Load every investment holding for a user across mutual funds, stocks, gold,
 * silver and other investments, normalized to { type, id, name, currentValue }.
 * Metal holdings also carry `grams` so goals can be tracked by weight.
 */
export async function loadHoldings(
  supabase: SupabaseClient,
  userId: string,
): Promise<Holding[]> {
  const [funds, stocks, gold, silver, other] = await Promise.all([
    supabase.from("mutual_funds").select("id, name, current_value").eq("user_id", userId),
    supabase.from("stocks").select("id, name, current_value").eq("user_id", userId),
    supabase
      .from("gold_holdings")
      .select("id, name, quantity_grams, current_price_per_gram")
      .eq("user_id", userId),
    supabase
      .from("silver_holdings")
      .select("id, name, quantity_grams, current_price_per_gram")
      .eq("user_id", userId),
    supabase.from("other_investments").select("id, name, current_value").eq("user_id", userId),
  ]);

  const holdings: Holding[] = [];

  for (const r of funds.data ?? []) {
    holdings.push({ type: "mutual_fund", id: r.id, name: r.name, currentValue: Number(r.current_value || 0) });
  }
  for (const r of stocks.data ?? []) {
    holdings.push({ type: "stock", id: r.id, name: r.name, currentValue: Number(r.current_value || 0) });
  }
  for (const r of gold.data ?? []) {
    const grams = Number(r.quantity_grams || 0);
    holdings.push({
      type: "gold",
      id: r.id,
      name: r.name,
      grams,
      currentValue: grams * Number(r.current_price_per_gram || 0),
    });
  }
  for (const r of silver.data ?? []) {
    const grams = Number(r.quantity_grams || 0);
    holdings.push({
      type: "silver",
      id: r.id,
      name: r.name,
      grams,
      currentValue: grams * Number(r.current_price_per_gram || 0),
    });
  }
  for (const r of other.data ?? []) {
    holdings.push({ type: "other", id: r.id, name: r.name, currentValue: Number(r.current_value || 0) });
  }

  return holdings;
}

export function holdingKey(type: string, id: string): string {
  return `${type}:${id}`;
}
