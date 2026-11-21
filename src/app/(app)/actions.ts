"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { resetDemo, syncExceptions } from "@/lib/data/store";
import type { RawCell } from "@/lib/data/normalize";
import { readRentRoll } from "@/lib/data/rent-roll-import";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true } | { ok: false; error: string };

const fail = (error: string): Result => ({ ok: false, error });

function pick<T extends Record<string, unknown>>(patch: T, allowed: readonly string[]) {
  return Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
}

async function update(
  table: string,
  id: number,
  patch: Record<string, unknown>,
  resync: boolean,
): Promise<Result> {
  if (Object.keys(patch).length === 0) return fail("Nothing to change.");
  const db = await createClient();
  await getUser();
  const { error } = await db.from(table).update(patch).eq("id", id).select("id").single();
  if (error) return fail(error.message);
  // Edits to the underlying records can open or clear exceptions.
  if (resync) await syncExceptions(db);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateException(
  id: number,
  patch: { status?: "open" | "resolved" | "dismissed"; assignee?: string | null; resolution_note?: string | null },
): Promise<Result> {
  if (patch.status === "dismissed" && !patch.resolution_note?.trim()) {
    return fail("A reason is required to dismiss an exception.");
  }
  if (patch.status === "open") patch.resolution_note = null;
  return update("exceptions", id, pick(patch, ["status", "assignee", "resolution_note"]), false);
}

export async function addExceptionNote(id: number, text: string): Promise<Result> {
  const note = text.trim();
  if (!note) return fail("Write a note first.");
  const db = await createClient();
  const user = await getUser();
  const { data, error } = await db.from("exceptions").select("notes").eq("id", id).single();
  if (error) return fail(error.message);
  const notes = [...(data.notes ?? []), { by: user.full_name, at: new Date().toISOString(), text: note }];
  return update("exceptions", id, { notes }, false);
}

export async function updateTask(
  id: number,
  patch: { status?: string; assignee?: string | null; due_date?: string; notes?: string | null },
): Promise<Result> {
  const clean = pick(patch, ["status", "assignee", "due_date", "notes"]);
  // Any edit counts as an update, so the task stops reading as stale.
  return update("tasks", id, { ...clean, last_updated: "2026-10-16" }, true);
}

export async function updateContract(
  id: number,
  patch: { decision?: string | null; decision_reason?: string | null; coi_expiration?: string; notes?: string | null },
): Promise<Result> {
  if ((patch.decision === "terminate" || patch.decision === "renegotiate") && !patch.decision_reason?.trim()) {
    return fail("Give a reason for this decision.");
  }
  return update(
    "vendor_contracts",
    id,
    pick(patch, ["decision", "decision_reason", "coi_expiration", "notes"]),
    true,
  );
}

export async function updateUnit(
  id: number,
  patch: Record<string, string | number | null>,
): Promise<Result> {
  const clean = pick(patch, [
    "unit", "status", "resident_name", "sqft", "market_rent", "lease_rent",
    "lease_start", "lease_end", "deposit", "balance", "review_status", "review_note",
  ]);
  return update("rent_roll_units", id, clean, true);
}

export async function saveView(name: string, filters: string): Promise<Result> {
  if (!name.trim()) return fail("Name the view.");
  const db = await createClient();
  await getUser();
  const { error } = await db.from("saved_views").insert({ name: name.trim(), filters: { query: filters } });
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteView(id: number): Promise<Result> {
  const db = await createClient();
  const { error } = await db.from("saved_views").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetDemoAction(): Promise<Result> {
  const db = await createClient();
  const user = await getUser();
  if (user.role !== "director") return fail("Only the director can reset the demo data.");
  try {
    await resetDemo(db);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Reset failed.");
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Loads a property's rent roll from an uploaded file. The rows are read again here,
 * so nothing the browser previewed is trusted. Replaces that property's units,
 * marks the rent roll received, logs the upload, and runs the rules again.
 */
export async function uploadRentRoll(
  propertyId: number,
  fileName: string,
  headers: string[],
  rows: RawCell[][],
): Promise<Result & { units?: number }> {
  const db = await createClient();
  const user = await getUser();
  if (user.role !== "director") return fail("Only the director can upload a rent roll.");
  const { data: property } = await db.from("properties").select("id, name, pm_code").eq("id", propertyId).single();
  if (!property) return fail("Unknown property.");

  const read = readRentRoll(headers, rows, property);
  if (read.error) return fail(read.error);

  const { count: replaced } = await db
    .from("rent_roll_units")
    .delete({ count: "exact" })
    .eq("property_id", propertyId);
  const { error: insertError } = await db.from("rent_roll_units").insert(read.units).select("id");
  if (insertError) return fail(insertError.message);
  await db
    .from("properties")
    .update({ rent_roll_received: true, pm_code: read.pmCode ?? property.pm_code })
    .eq("id", propertyId)
    .select("id");
  await db.rpc("log_rent_roll_upload", {
    p_property: propertyId,
    p_file: fileName.slice(0, 200),
    p_units: read.units.length,
    p_replaced: replaced ?? 0,
  });
  await syncExceptions(db);
  revalidatePath("/", "layout");
  return { ok: true, units: read.units.length };
}
