import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveBudgetIdForTransactionDate } from "@/lib/server/budget-for-transaction-date";
import { normalizeTags } from "@/lib/server/normalize-tags";
import { buildFingerprint } from "@/lib/server/transaction-fingerprint";

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
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
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
      amount,
      description,
      category,
      subtype,
      date,
      type,
      goalId,
      account,
      tags,
      receipt,
      recurringPatternId,
    } = body;

    if (
      amount === undefined ||
      amount === null ||
      description == null ||
      category == null ||
      type == null
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields (amount, description, category, type)",
        },
        { status: 400 },
      );
    }

    const amountNum =
      typeof amount === "number" ? amount : Number.parseFloat(String(amount));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 },
      );
    }

    const uuidOrNull = (v: unknown): string | null => {
      if (v == null || v === "") return null;
      const s = String(v).trim();
      if (s === "none" || s === "a  uto") return null;
      return s;
    };
    const templateBudgetId = uuidOrNull(body.budgetId);
    const goalIdClean = uuidOrNull(goalId);
    const accountClean: string | null = account ? String(account).trim() : null;
    const cleanedTags = Array.isArray(tags) ? normalizeTags(tags) : [];

    let recurringPatternIdClean = uuidOrNull(recurringPatternId);
    if (recurringPatternIdClean) {
      const { data: ownedPattern } = await supabase
        .from("recurring_patterns")
        .select("id")
        .eq("id", recurringPatternIdClean)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!ownedPattern) recurringPatternIdClean = null;
    }

    const txDate = (date || new Date().toISOString().split("T")[0]).split(
      "T",
    )[0];
    const fingerprint = buildFingerprint(
      txDate,
      description,
      amountNum,
      accountClean,
    );

    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: "duplicate",
          message:
            "A transaction with the same date, merchant, amount, and account already exists.",
          duplicate: true,
        },
        { status: 409 },
      );
    }

    const budgetId = await resolveBudgetIdForTransactionDate(
      supabase,
      user.id,
      {
        type,
        category,
        subtype,
        date: txDate,
        templateBudgetId: templateBudgetId,
      },
    );

    // Insert transaction
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        amount: amountNum,
        description,
        category,
        subtype: subtype || "",
        budget_id: budgetId,
        goal_id: goalIdClean,
        date: txDate,
        type,
        user_id: user.id,
        account: accountClean,
        tags: cleanedTags,
        receipt: !!receipt,
        fingerprint,
        source: "manual",
        recurring_pattern_id: recurringPatternIdClean,
      })
      .select()
      .single();

    if (error) {
      // Unique index race: two concurrent requests with the same fingerprint.
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error: "duplicate",
            message:
              "A transaction with the same date, merchant, amount, and account already exists.",
            duplicate: true,
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If linked to a budget and is an expense, update budget's spent_amount
    if (budgetId && type === "expense") {
      const { data: budget, error: budgetFetchError } = await supabase
        .from("budgets")
        .select("spent_amount")
        .eq("id", budgetId)
        .eq("user_id", user.id)
        .single();

      if (!budgetFetchError && budget) {
        const newSpent = parseFloat(budget.spent_amount || 0) + amountNum;

        await supabase
          .from("budgets")
          .update({ spent_amount: newSpent })
          .eq("id", budgetId)
          .eq("user_id", user.id);
      }
    }

    // If linked to a goal, update the goal's current_amount
    if (goalIdClean) {
      const { data: goal, error: goalFetchError } = await supabase
        .from("goals")
        .select("current_amount")
        .eq("id", goalIdClean)
        .eq("user_id", user.id)
        .single();

      if (!goalFetchError && goal) {
        const newAmount = parseFloat(goal.current_amount || 0) + amountNum;

        await supabase
          .from("goals")
          .update({ current_amount: newAmount })
          .eq("id", goalIdClean)
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
