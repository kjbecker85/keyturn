// Reads and writes the dataset in Supabase. Works with any signed-in client,
// so the same code serves the app, the reset action and the seed script.
import type { SupabaseClient } from "@supabase/supabase-js";
import { runRules } from "../rules";
import { buildSeed } from "./datapack";
import type { Contract, Dataset, ExceptionRow, Property, Task, Unit } from "./types";

export const AUTO_CLEARED = "Cleared automatically: the data no longer triggers this rule.";

function must<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function loadDataset(db: SupabaseClient): Promise<Dataset> {
  const [properties, units, tasks, contracts] = await Promise.all([
    db.from("properties").select("*").order("id"),
    db.from("rent_roll_units").select("*").order("source_row").limit(2000),
    db.from("tasks").select("*").order("source_row").limit(2000),
    db.from("vendor_contracts").select("*").order("source_row").limit(2000),
  ]);
  return {
    properties: must(properties) as Property[],
    units: (must(units) as Unit[]).map((u) => ({
      ...u,
      market_rent: num(u.market_rent),
      lease_rent: num(u.lease_rent),
      deposit: num(u.deposit),
      balance: num(u.balance),
    })),
    tasks: must(tasks) as Task[],
    contracts: (must(contracts) as Contract[]).map((c) => ({
      ...c,
      monthly_cost: Number(c.monthly_cost),
    })),
  };
}

export async function loadExceptions(db: SupabaseClient): Promise<ExceptionRow[]> {
  return must(
    await db
      .from("exceptions")
      .select("*")
      .order("severity")
      .order("due_date", { nullsFirst: false })
      .order("id")
      .limit(2000),
  ) as ExceptionRow[];
}

/**
 * Re-runs every rule and brings the exceptions table in line:
 * new problems are opened, problems the data no longer shows are cleared,
 * and anything a person resolved or dismissed is left alone.
 */
export async function syncExceptions(db: SupabaseClient) {
  const [data, existing] = await Promise.all([loadDataset(db), loadExceptions(db)]);
  const candidates = runRules(data);
  const byFingerprint = new Map(existing.map((e) => [e.fingerprint, e]));
  const firing = new Set(candidates.map((c) => c.fingerprint));

  const toInsert = candidates.filter((c) => !byFingerprint.has(c.fingerprint));
  if (toInsert.length) must(await db.from("exceptions").insert(toInsert).select("id"));

  let updated = 0;
  for (const c of candidates) {
    const row = byFingerprint.get(c.fingerprint);
    if (!row) continue;
    const reopened = row.status === "resolved" && row.resolution_note === AUTO_CLEARED;
    const changed =
      row.title !== c.title ||
      row.detail !== c.detail ||
      row.severity !== c.severity ||
      row.due_date !== c.due_date ||
      JSON.stringify(row.sources) !== JSON.stringify(c.sources);
    if (!changed && !reopened) continue;
    must(
      await db
        .from("exceptions")
        .update({
          title: c.title,
          detail: c.detail,
          severity: c.severity,
          due_date: c.due_date,
          sources: c.sources,
          ...(reopened ? { status: "open", resolution_note: null } : {}),
        })
        .eq("id", row.id)
        .select("id"),
    );
    updated++;
  }

  const cleared = existing.filter((e) => e.status === "open" && !firing.has(e.fingerprint));
  if (cleared.length) {
    must(
      await db
        .from("exceptions")
        .update({ status: "resolved", resolution_note: AUTO_CLEARED })
        .in("id", cleared.map((e) => e.id))
        .select("id"),
    );
  }
  return { opened: toInsert.length, updated, cleared: cleared.length, firing: candidates.length };
}

/** Wipes everything and reloads the data pack. Director only (enforced by RLS). */
export async function resetDemo(db: SupabaseClient) {
  must(await db.from("drafts").delete().gte("id", 0).select("id"));
  must(await db.from("exceptions").delete().gte("id", 0).select("id"));
  must(await db.from("properties").delete().gte("id", 0).select("id"));
  must(await db.from("audit_log").delete().gte("id", 0).select("id"));

  const seed = buildSeed();
  must(await db.from("properties").insert(seed.properties).select("id"));
  must(await db.from("rent_roll_units").insert(seed.units).select("id"));
  must(await db.from("tasks").insert(seed.tasks).select("id"));
  must(await db.from("vendor_contracts").insert(seed.contracts).select("id"));
  const sync = await syncExceptions(db);
  return {
    properties: seed.properties.length,
    units: seed.units.length,
    tasks: seed.tasks.length,
    contracts: seed.contracts.length,
    exceptions: sync.opened,
  };
}
