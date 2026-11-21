import { PageHeader } from "@/components/ui";
import type { AuditRow } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

const ENTITY: Record<string, string> = {
  tasks: "Task",
  vendor_contracts: "Contract",
  rent_roll_units: "Rent roll unit",
  exceptions: "Exception",
  drafts: "Draft",
  properties: "Property",
};

const show = (v: unknown) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.length > 80 ? `${s.slice(0, 80)}…` : s;
};

export default async function ActivityPage() {
  const db = await createClient();
  const [{ data: audit }, { data: profiles }] = await Promise.all([
    db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200),
    db.from("profiles").select("id, full_name"),
  ]);
  const { data: properties } = await db.from("properties").select("id, name");
  const propertyName = Object.fromEntries((properties ?? []).map((p) => [String(p.id), p.name]));
  const actor = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
  const rows = (audit ?? []) as AuditRow[];

  return (
    <>
      <PageHeader
        title="Activity"
        subtitle="Every edit, with who made it and the before and after. The database writes these rows itself, so no change can skip the log."
      />
      <ul className="card mx-4 mb-10 divide-y divide-line overflow-hidden md:mx-8">
        {rows.length === 0 && <li className="px-4 py-6 text-sm text-muted">No edits yet.</li>}
        {rows.map((a) => (
          <li key={a.id} className="px-5 py-3 text-sm">
            <span className="text-muted">{new Date(a.created_at).toLocaleString()}</span>{" "}
            <span className="font-medium">{actor[a.actor_id ?? ""] ?? "System"}</span>{" "}
            {a.action === "upload" ? (
              <>
                uploaded a rent roll for {propertyName[a.entity_id] ?? `property #${a.entity_id}`}: {show(a.after?.file ?? "")},{" "}
                {show(a.after?.units ?? 0)} units{Number(a.after?.replaced ?? 0) > 0 && `, replacing ${show(a.after?.replaced)}`}
              </>
            ) : (
              <>
                {a.action === "create" ? "created" : "changed"} {ENTITY[a.entity] ?? a.entity} #{a.entity_id}
              </>
            )}
            {a.action === "update" && (
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {Object.keys(a.after ?? {}).map((key) => (
                  <li key={key}>
                    {key}: {show(a.before?.[key] ?? null)} → {show(a.after?.[key] ?? null)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
