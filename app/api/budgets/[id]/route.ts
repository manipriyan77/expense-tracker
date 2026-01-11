import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const body = await request.json();
    const { category, subtype, limit_amount, period } = body;

    const { data, error } = await supabase
      .from("budgets")
      .update({
        category,
        subtype: subtype || null,
        limit_amount,
        period,
      })
      .eq("id", params.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;

    // Check if there are any transactions linked to this budget
    const { data: linkedTransactions, error: checkError } = await supabase
      .from("transactions")
      .select("id")
      .eq("budget_id", params.id)
      .eq("user_id", user.id);

    if (checkError) {
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    // If there are linked transactions, delete them first (cascade delete)
    if (linkedTransactions && linkedTransactions.length > 0) {
      console.log(`[Budget Delete] Deleting ${linkedTransactions.length} linked transactions for budget ${params.id}`);
      
      const { error: deleteTransactionsError } = await supabase
        .from("transactions")
        .delete()
        .eq("budget_id", params.id)
        .eq("user_id", user.id);

      if (deleteTransactionsError) {
        return NextResponse.json({ 
          error: `Failed to delete linked transactions: ${deleteTransactionsError.message}` 
        }, { status: 500 });
      }

      console.log(`[Budget Delete] Successfully deleted ${linkedTransactions.length} linked transactions`);
    }

    // Now safe to delete the budget
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`[Budget Delete] Successfully deleted budget ${params.id}`);
    return NextResponse.json({ 
      success: true,
      deletedTransactions: linkedTransactions?.length || 0 
    });
  } catch (error) {
    console.error("[Budget Delete] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

