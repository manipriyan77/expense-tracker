import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { amount, type, description, category, isRecurring, frequency } = body;

    if (!amount || !type || !description) {
      return NextResponse.json(
        { error: "Missing required fields: amount, type, and description are required" },
        { status: 400 }
      );
    }

    const transactionData: any = {
      amount: Number(amount),
      type,
      description,
      date: new Date().toISOString().split("T")[0],
      user_id: user.id,
    };

    if (category) {
      transactionData.category = category;
    }

    if (isRecurring !== undefined) {
      transactionData.is_recurring = isRecurring;
    }

    if (frequency) {
      transactionData.frequency = frequency;
    }

    const { data: transaction, error } = await supabase
      .from("transactions")
      .insert(transactionData)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Transaction added successfully", transaction },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const isRecurring = searchParams.get("isRecurring");

    let query = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (type) {
      query = query.eq("type", type);
    }

    if (isRecurring) {
      query = query.eq("is_recurring", isRecurring === "true");
    }

    const { data: transactions, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { transactions, count: transactions?.length || 0 },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
