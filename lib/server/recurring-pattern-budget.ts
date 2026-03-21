import type { SupabaseClient } from "@supabase/supabase-js";

type PatternBudgetFields = {
  type: string;
  linked_budget_id?: string | null;
  category: string;
  subtype?: string | null;
};

/**
 * Resolves budget_id for an expense from a recurring pattern: explicit link first, then category/subtype match.
 */
export async function resolveExpenseBudgetIdForPattern(
  supabase: SupabaseClient,
  userId: string,
  pattern: PatternBudgetFields,
): Promise<string | null> {
  if (pattern.type !== "expense") return null;

  const linked = pattern.linked_budget_id?.trim();
  if (linked) {
    const { data } = await supabase
      .from("budgets")
      .select("id")
      .eq("id", linked)
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  const category = pattern.category;
  const subtype = (pattern.subtype || "").trim();
  if (subtype) {
    const { data: exactMatch } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", userId)
      .eq("category", category)
      .eq("subtype", subtype)
      .limit(1)
      .maybeSingle();
    if (exactMatch?.id) return exactMatch.id;
  }

  const { data: categoryMatch } = await supabase
    .from("budgets")
    .select("id")
    .eq("user_id", userId)
    .eq("category", category)
    .is("subtype", null)
    .limit(1)
    .maybeSingle();

  return categoryMatch?.id ?? null;
}

/** Validates that a budget id belongs to the user; returns null if missing or invalid. */
export async function verifyUserBudgetId(
  supabase: SupabaseClient,
  userId: string,
  budgetId: unknown,
): Promise<string | null> {
  if (budgetId == null || budgetId === "" || budgetId === "none") return null;
  if (typeof budgetId !== "string") return null;
  const id = budgetId.trim();
  const { data } = await supabase
    .from("budgets")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}
