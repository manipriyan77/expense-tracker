import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("challenge_contributions")
      .select("*")
      .eq("challenge_id", id)
      .eq("user_id", user.id)
      .order("contribution_date", { ascending: false });

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
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    // Add contribution
    const { data: contribution, error: contributionError } = await supabase
      .from("challenge_contributions")
      .insert([{ ...body, challenge_id: id, user_id: user.id }])
      .select()
      .single();

    if (contributionError) throw contributionError;

    // Update challenge current_amount
    const { data: challenge } = await supabase
      .from("savings_challenges")
      .select("current_amount")
      .eq("id", id)
      .single();

    if (challenge) {
      await supabase
        .from("savings_challenges")
        .update({ current_amount: challenge.current_amount + body.amount })
        .eq("id", id)
        .eq("user_id", user.id);
    }

    return NextResponse.json(contribution);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
