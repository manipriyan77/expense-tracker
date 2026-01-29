import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("recurring_patterns")
      .select("*")
      .eq("user_id", user.id)
      .order("next_date", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, amount, description, category, subtype, frequency, start_date, end_date, next_date, is_active, auto_create, tags, notes } = body;

    if (!name || !type || !amount || !description || !category || !subtype || !frequency || !start_date || !next_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("recurring_patterns")
      .insert({
        user_id: user.id,
        name,
        type,
        amount: parseFloat(amount),
        description,
        category,
        subtype,
        frequency,
        start_date,
        end_date: end_date || null,
        next_date,
        is_active: is_active !== undefined ? is_active : true,
        auto_create: auto_create !== undefined ? auto_create : false,
        tags: tags || [],
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
