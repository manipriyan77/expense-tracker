import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const { id, paymentId } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the payment first to know its amount so we can restore the balance
    const { data: payment, error: fetchError } = await supabase
      .from("debt_payments")
      .select("amount")
      .eq("id", paymentId)
      .eq("liability_id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from("debt_payments")
      .delete()
      .eq("id", paymentId)
      .eq("user_id", user.id);

    if (deleteError) throw deleteError;

    // Restore debt balance
    const { data: debt } = await supabase
      .from("liabilities")
      .select("balance")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (debt) {
      await supabase
        .from("liabilities")
        .update({ balance: debt.balance + payment.amount })
        .eq("id", id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
