"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveBrief(
  recipient: string,
  subject: string,
  body: string,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await getUser();
  const db = await createClient();
  const { data, error } = await db
    .from("drafts")
    .insert({ kind: "morning_brief", recipient, subject, body, generated_by: "rules (no model)" })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}
