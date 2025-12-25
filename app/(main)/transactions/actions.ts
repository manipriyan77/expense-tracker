"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function addTransaction(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase.from("transactions").insert({
    amount: Number(formData.get("amount")),
    type: formData.get("type"),
    description: formData.get("description"),
    date: new Date().toISOString().split("T")[0],
    // 👇 user_id optional if DB default auth.uid() is set
    user_id: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function getAllTransactions() {
  const supabase = await createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }
  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return transactions;
}
