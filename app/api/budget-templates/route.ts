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
      .from("budget_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
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
    
    // Validate required fields
    if (!body.name || !body.description || !body.categories || !Array.isArray(body.categories)) {
      return NextResponse.json(
        { error: "Missing required fields: name, description, and categories array" },
        { status: 400 }
      );
    }

    // Log for debugging
    console.log("[Budget Templates API] Creating template:", {
      name: body.name,
      categoriesCount: body.categories.length,
      userId: user.id
    });
    
    const { data, error } = await supabase
      .from("budget_templates")
      .insert([{ ...body, user_id: user.id }])
      .select()
      .single();

    if (error) {
      console.error("[Budget Templates API] Error:", error);
      
      // Provide helpful error messages
      if (error.message.includes("relation") && error.message.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Database table 'budget_templates' does not exist. Please run the migration: database/migrations/create-budget-templates-table.sql in your Supabase SQL Editor.",
            hint: "See QUICK_FIX_BUDGET_TEMPLATES.md for instructions"
          },
          { status: 500 }
        );
      }
      
      throw error;
    }

    console.log("[Budget Templates API] Template created successfully:", data.id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Budget Templates API] Unexpected error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
