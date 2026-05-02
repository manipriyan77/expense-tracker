import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = request.nextUrl;
    const view = searchParams.get("view"); // today | upcoming | all | completed
    const listId = searchParams.get("list_id");

    let query = supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id);

    const today = new Date().toISOString().split("T")[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    if (view === "today") {
      query = query.lte("due_date", today).eq("status", "pending");
    } else if (view === "upcoming") {
      query = query.gt("due_date", today).lte("due_date", sevenDaysLater).eq("status", "pending");
    } else if (view === "completed") {
      query = query.eq("status", "completed");
    } else {
      // all pending
      query = query.eq("status", "pending");
    }

    if (listId) query = query.eq("list_id", listId);

    const { data, error } = await query.order("order_index", { ascending: true }).order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { title, description, due_date, priority, list_id, order_index } = body;
    if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title,
        description: description ?? "",
        due_date: due_date ?? null,
        priority: priority ?? "none",
        list_id: list_id ?? null,
        order_index: order_index ?? 0,
        status: "pending",
        user_id: user.id,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
