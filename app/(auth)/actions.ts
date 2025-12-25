"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SignInFormSchemaTypes } from "./sign-in/signInFormSchema";

export async function login(formData: SignInFormSchemaTypes) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword(formData);
  if (error) {
    console.log("error", error);
    return error;
  }

  redirect("/dashboard");
}

export async function signUp(formData: { email: string; password: string }) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signUp(formData);
  if (error) {
    redirect("/error");
  }
  redirect("/dashboard");
}
