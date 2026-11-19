"use server";

import { redirect } from "next/navigation";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { error: string } | null;

export async function signInAs(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const account = DEMO_ACCOUNTS.find((a) => a.role === formData.get("role"));
  const password = process.env.DEMO_PASSWORD;
  if (!account) return { error: "Unknown role." };
  if (!password) return { error: "Demo sign-in is not configured." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password,
  });
  if (error) return { error: "Sign-in failed. Try again." };

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
