import type { SupabaseClient } from "@supabase/supabase-js";

export function transactionMonthYear(isoDate: string): { month: number; year: number } {
  const part = isoDate.split("T")[0];
  const [y, m] = part.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) {
    const d = new Date();
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  }
  return { month: m, year: y };
}

async function findBudgetInMonth(
  supabase: SupabaseClient,
  userId: string,
  category: string,
  subtype: string | null,
  month: number,
  year: number,
): Promise<string | null> {
  if (subtype && subtype.trim() !== "") {
    const { data } = await supabase
      .from("budgets")
      .select("id")
      .eq("user_id", userId)
      .eq("category", category)
      .eq("subtype", subtype.trim())
      .eq("month", month)
      .eq("year", year)
      .maybeSingle();
    if (data?.id) return data.id;
  }
  const { data: catOnly } = await supabase
    .from("budgets")
    .select("id")
    .eq("user_id", userId)
    .eq("category", category)
    .is("subtype", null)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();
  return catOnly?.id ?? null;
}

async function ensureBudgetsForMonth(
  supabase: SupabaseClient,
  userId: string,
  month: number,
  year: number,
): Promise<void> {
  await supabase.rpc("create_next_month_budgets", {
    p_user_id: userId,
    p_target_month: month,
    p_target_year: year,
  });
}

async function cloneBudgetToMonth(
  supabase: SupabaseClient,
  userId: string,
  sourceBudgetId: string,
  month: number,
  year: number,
): Promise<string | null> {
  const { data: src, error: srcErr } = await supabase
    .from("budgets")
    .select("category, subtype, limit_amount, period")
    .eq("id", sourceBudgetId)
    .eq("user_id", userId)
    .single();
  if (srcErr || !src) return null;

  const { data: created, error: insErr } = await supabase
    .from("budgets")
    .insert({
      user_id: userId,
      category: src.category,
      subtype: src.subtype,
      limit_amount: src.limit_amount,
      period: src.period ?? "monthly",
      month,
      year,
      spent_amount: 0,
    })
    .select("id")
    .single();

  if (!insErr && created?.id) return created.id;

  return findBudgetInMonth(
    supabase,
    userId,
    src.category,
    src.subtype,
    month,
    year,
  );
}

export type ResolveBudgetForDateInput = {
  type: string;
  category: string;
  subtype?: string | null;
  /** YYYY-MM-DD */
  date: string;
  /**
   * A budget row the user selected (often current month in the UI).
   * Resolved to the row with the same category/subtype for `date`'s calendar month.
   */
  templateBudgetId: string | null;
  /** When true and templateBudgetId is null, return null (no auto category match). */
  disableAutoMatch?: boolean;
};

/**
 * Picks the correct budgets.id row for this transaction date.
 * UI budget pickers usually reference the current month; this maps to the transaction month/year.
 */
export async function resolveBudgetIdForTransactionDate(
  supabase: SupabaseClient,
  userId: string,
  input: ResolveBudgetForDateInput,
): Promise<string | null> {
  if (input.type !== "expense") return null;

  const { month, year } = transactionMonthYear(input.date);
  const category = input.category;
  const subtypeRaw = input.subtype;
  const subtype =
    subtypeRaw != null && String(subtypeRaw).trim() !== ""
      ? String(subtypeRaw).trim()
      : null;

  if (input.disableAutoMatch && !input.templateBudgetId?.trim()) {
    return null;
  }

  if (input.templateBudgetId?.trim()) {
    const templateId = input.templateBudgetId.trim();
    const { data: picked } = await supabase
      .from("budgets")
      .select("category, subtype")
      .eq("id", templateId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!picked) return null;

    const cat = picked.category as string;
    const sub: string | null =
      picked.subtype != null && String(picked.subtype).trim() !== ""
        ? String(picked.subtype).trim()
        : null;

    let id = await findBudgetInMonth(supabase, userId, cat, sub, month, year);
    if (!id) {
      await ensureBudgetsForMonth(supabase, userId, month, year);
      id = await findBudgetInMonth(supabase, userId, cat, sub, month, year);
    }
    if (!id) {
      id = await cloneBudgetToMonth(supabase, userId, templateId, month, year);
    }
    return id;
  }

  let id = await findBudgetInMonth(supabase, userId, category, subtype, month, year);
  if (!id) {
    await ensureBudgetsForMonth(supabase, userId, month, year);
    id = await findBudgetInMonth(supabase, userId, category, subtype, month, year);
  }
  return id;
}
