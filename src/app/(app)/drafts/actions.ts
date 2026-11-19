"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import {
  draftEscalationEmail,
  draftOwnerReport,
  draftTerminationNotice,
  type Draft,
} from "@/lib/ai/draft";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import type { ExceptionRow } from "@/lib/data/types";
import { readiness } from "@/lib/readiness";
import { createClient } from "@/lib/supabase/server";

type Created = { ok: true; id: number } | { ok: false; error: string };

async function save(
  kind: string,
  draft: Draft,
  links: { exception_id?: number; contract_id?: number; property_id?: number | null },
): Promise<Created> {
  const db = await createClient();
  const { data, error } = await db
    .from("drafts")
    .insert({ kind, ...draft, ...links })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

const message = (e: unknown) => (e instanceof Error ? e.message : "Drafting failed.");

export async function draftEscalation(exceptionId: number): Promise<Created> {
  try {
    await getUser();
    const db = await createClient();
    const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
    const e = exceptions.find((x) => x.id === exceptionId) as ExceptionRow | undefined;
    if (!e) return { ok: false, error: "Exception not found." };

    // The records the exception points at are the only facts the draft may use.
    const records = e.sources.map((s) => {
      if (s.table === "tasks") return data.tasks.find((t) => t.id === s.id);
      if (s.table === "vendor_contracts") return data.contracts.find((c) => c.id === s.id);
      const unit = data.units.find((u) => u.id === s.id);
      return unit ? { ...unit, raw: undefined } : undefined;
    });
    const contract = data.contracts.find((c) => e.sources.some((s) => s.table === "vendor_contracts" && s.id === c.id));
    const property = data.properties.find((p) => p.id === e.property_id)?.name ?? null;
    const draft = await draftEscalationEmail(e, property, records.filter(Boolean), contract?.vendor);
    return save("escalation", draft, { exception_id: e.id, property_id: e.property_id });
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function draftTermination(contractId: number): Promise<Created> {
  try {
    await getUser();
    const db = await createClient();
    const data = await loadDataset(db);
    const c = data.contracts.find((x) => x.id === contractId);
    if (!c) return { ok: false, error: "Contract not found." };
    if (c.decision !== "terminate") return { ok: false, error: "Record a terminate decision first." };
    const property = data.properties.find((p) => p.id === c.property_id)!.name;
    const draft = await draftTerminationNotice(c, property, c.decision_reason ?? "Change of management.");
    return save("termination_notice", draft, { contract_id: c.id, property_id: c.property_id });
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function draftReport(propertyId: number | null): Promise<Created> {
  try {
    await getUser();
    const db = await createClient();
    const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
    const rows = readiness(data.properties, data.tasks, exceptions).filter(
      (r) => propertyId === null || r.property.id === propertyId,
    );
    const draft = await draftOwnerReport(rows, exceptions);
    return save("owner_report", draft, { property_id: propertyId });
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function updateDraft(
  id: number,
  patch: { recipient?: string; subject?: string; body?: string; status?: "draft" | "sent" },
): Promise<{ ok: true } | { ok: false; error: string }> {
  await getUser();
  const db = await createClient();
  const clean: Record<string, unknown> = { ...patch };
  if (patch.status === "sent") clean.sent_at = new Date().toISOString();
  const { error } = await db.from("drafts").update(clean).eq("id", id).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
