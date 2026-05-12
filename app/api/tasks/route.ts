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
    const sortBy = searchParams.get("sort_by") ?? "order"; // order | due_date | priority | created_at
    const parentId = searchParams.get("parent_task_id"); // when set, fetch subtasks of this parent

    let query = supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id);

    // If fetching subtasks, filter by parent; otherwise show only top-level tasks
    if (parentId) {
      query = query.eq("parent_task_id", parentId);
    } else {
      query = query.is("parent_task_id", null);
    }

    const today = new Date().toISOString().split("T")[0];
    const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    if (view === "today") {
      query = query.lte("due_date", today).eq("status", "pending");
    } else if (view === "upcoming") {
      query = query.gt("due_date", today).lte("due_date", sevenDaysLater).eq("status", "pending");
    } else if (view === "completed") {
      query = query.eq("status", "completed");
    } else {
      query = query.eq("status", "pending");
    }

    if (listId) query = query.eq("list_id", listId);

    // Apply sort
    if (sortBy === "due_date") {
      query = query.order("due_date", { ascending: true, nullsFirst: false });
    } else if (sortBy === "priority") {
      // Map priority to sort weight via DB: high=1, medium=2, low=3, none=4
      query = query.order("created_at", { ascending: false });
    } else if (sortBy === "created_at") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("order_index", { ascending: true }).order("created_at", { ascending: false });
    }

    const { data, error } = await query;

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
    const {
      title, description, due_date, priority, list_id, order_index,
      parent_task_id, recurrence_type, recurrence_days, recurrence_parent_id,
    } = body;
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
        parent_task_id: parent_task_id ?? null,
        recurrence_type: recurrence_type ?? null,
        recurrence_days: recurrence_days ?? null,
        recurrence_parent_id: recurrence_parent_id ?? null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
