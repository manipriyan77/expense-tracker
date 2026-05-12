import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Returns all unique tags the user has ever used, for autocomplete
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("daily_reflections")
      .select("tags")
      .eq("user_id", user.id)
      .not("tags", "is", null)
      .neq("tags", "");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const tagSet = new Set<string>();
    for (const row of data ?? []) {
      if (row.tags) {
        row.tags.split(",").forEach((t: string) => {
          const cleaned = t.trim();
          if (cleaned) tagSet.add(cleaned);
        });
      }
    }

    return NextResponse.json(Array.from(tagSet).sort());
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
