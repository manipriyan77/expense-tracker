import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveBudgetIdForTransactionDate } from "@/lib/server/budget-for-transaction-date";

type PatternBudgetFields = {
  type: string;
  linked_budget_id?: string | null;
  category: string;
  subtype?: string | null;
};

/**
 * Resolves budget_id for an expense from a recurring pattern for a specific occurrence date.
 * Linked budget ids are remapped to the same category/subtype row in that calendar month.
 */
export async function resolveExpenseBudgetIdForPattern(
  supabase: SupabaseClient,
  userId: string,
  pattern: PatternBudgetFields,
  transactionDate: string,
): Promise<string | null> {
  const date = transactionDate.split("T")[0];
  const template = pattern.linked_budget_id?.trim() ?? null;
  return resolveBudgetIdForTransactionDate(supabase, userId, {
    type: pattern.type,
    category: pattern.category,
    subtype: pattern.subtype,
    date,
    templateBudgetId: template,
  });
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
