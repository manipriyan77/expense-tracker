import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALID_KINDS = new Set(["category", "account", "tag"]);

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const kind = request.nextUrl.searchParams.get("kind");
    let query = supabase.from("lookups").select("*").eq("user_id", user.id);
    if (kind && VALID_KINDS.has(kind)) {
      query = query.eq("kind", kind);
    }
    const { data, error } = await query.order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    const { kind, name } = body;

    if (!kind || !VALID_KINDS.has(kind)) {
      return NextResponse.json({ error: "kind must be one of category, account, tag" }, { status: 400 });
    }
    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("lookups")
      .select("*")
      .eq("user_id", user.id)
      .eq("kind", kind)
      .ilike("name", trimmedName)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(existing);
    }

    const { data, error } = await supabase
      .from("lookups")
      .insert({ user_id: user.id, kind, name: trimmedName })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
