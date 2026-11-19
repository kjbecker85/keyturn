import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Profile } from "./data/types";
import { createClient } from "./supabase/server";

/** The signed-in user's profile. Sends signed-out visitors to /login. */
export const getUser = cache(async (): Promise<Profile> => {
  const db = await createClient();
  const { data } = await db.auth.getClaims();
  if (!data?.claims) redirect("/login");
  const { data: profile } = await db
    .from("profiles")
    .select("id, full_name, title, role")
    .eq("id", data.claims.sub)
    .single();
  if (!profile) redirect("/login");
  return profile as Profile;
});
