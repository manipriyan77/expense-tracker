import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("debt_payments")
      .select("*")
      .eq("liability_id", id)
      .eq("user_id", user.id)
      .order("payment_date", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Add payment
    const { data: payment, error: paymentError } = await supabase
      .from("debt_payments")
      .insert([{ ...body, liability_id: id, user_id: user.id }])
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Update debt balance
    const { data: debt } = await supabase
      .from("liabilities")
      .select("balance")
      .eq("id", id)
      .single();

    if (debt) {
      const newBalance = Math.max(0, debt.balance - body.amount);
      await supabase
        .from("liabilities")
        .update({ balance: newBalance })
        .eq("id", id)
        .eq("user_id", user.id);
    }

    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
