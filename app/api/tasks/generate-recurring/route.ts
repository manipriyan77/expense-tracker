import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST /api/tasks/generate-recurring
// Called when a recurring task is completed — creates the next occurrence
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { task_id } = await request.json();
    if (!task_id) return NextResponse.json({ error: "Missing task_id" }, { status: 400 });

    // Fetch the completed task (template or instance)
    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", task_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (!task.recurrence_type) return NextResponse.json({ error: "Not a recurring task" }, { status: 400 });

    const nextDueDate = getNextOccurrence(task.due_date, task.recurrence_type, task.recurrence_days);
    if (!nextDueDate) return NextResponse.json({ error: "Could not compute next date" }, { status: 400 });

    // Avoid duplicate: check if a pending instance for this parent already exists on that date
    const parentId = task.recurrence_parent_id ?? task.id;
    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", user.id)
      .eq("recurrence_parent_id", parentId)
      .eq("due_date", nextDueDate)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) return NextResponse.json({ already_exists: true });

    const { data: newTask, error: insertError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: task.title,
        description: task.description,
        due_date: nextDueDate,
        priority: task.priority,
        list_id: task.list_id,
        status: "pending",
        order_index: 0,
        recurrence_type: task.recurrence_type,
        recurrence_days: task.recurrence_days,
        recurrence_parent_id: parentId,
      })
      .select()
      .single();

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json(newTask, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function getNextOccurrence(
  currentDue: string | null,
  recurrenceType: string,
  recurrenceDays: number[] | null,
): string | null {
  const base = currentDue ? new Date(currentDue + "T00:00:00") : new Date();
  const next = new Date(base);
  next.setDate(next.getDate() + 1);

  if (recurrenceType === "daily") {
    return toISO(next);
  }

  if (recurrenceType === "weekdays") {
    while ([0, 6].includes(next.getDay())) next.setDate(next.getDate() + 1);
    return toISO(next);
  }

  if (recurrenceType === "weekly") {
    next.setDate(base.getDate() + 7);
    return toISO(next);
  }

  if (recurrenceType === "monthly") {
    next.setMonth(base.getMonth() + 1);
    return toISO(next);
  }

  if (recurrenceType === "custom" && recurrenceDays?.length) {
    // recurrenceDays: [0=Mon … 6=Sun]
    for (let i = 1; i <= 7; i++) {
      const candidate = new Date(base);
      candidate.setDate(base.getDate() + i);
      const dow = (candidate.getDay() + 6) % 7; // 0=Mon … 6=Sun
      if (recurrenceDays.includes(dow)) return toISO(candidate);
    }
  }

  return null;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
