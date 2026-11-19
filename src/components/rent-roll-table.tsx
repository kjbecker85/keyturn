"use client";

import { Fragment, useState } from "react";
import { updateUnit } from "@/app/(app)/actions";
import { STATUS_LABEL } from "@/lib/data/normalize";
import type { Flag } from "@/lib/flags";
import type { Property, Unit } from "@/lib/data/types";
import { FlagBadges } from "./flag-badges";
import { useAction, useFocusRow } from "./use-action";

const money = (n: number | null) => (n === null ? "—" : `$${n.toLocaleString("en-US")}`);
const REVIEW_COLOR: Record<string, string> = {
  unreviewed: "text-muted",
  approved: "text-ok-ink",
  corrected: "text-sev3-ink",
  rejected: "text-sev1-ink",
};

export function RentRollTable({
  units,
  properties,
  flags,
}: {
  units: Unit[];
  properties: Property[];
  flags: Record<number, Flag[]>;
}) {
  const { pending, error, run } = useAction();
  const focus = useFocusRow();
  const focused = units.find((u) => u.id === focus);
  const [property, setProperty] = useState(focused?.property_id ?? properties[0]?.id ?? 0);
  const [flaggedOnly, setFlaggedOnly] = useState(!focus);
  const [open, setOpen] = useState<number | null>(focus);

  const mine = units.filter((u) => u.property_id === property);
  const rows = mine.filter((u) => !flaggedOnly || flags[u.id]?.length || u.id === focus);
  const flaggedCount = mine.filter((u) => flags[u.id]?.length).length;

  return (
    <div className="px-4 pb-10 md:px-8">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {properties.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setProperty(p.id)}
            className={`btn ${property === p.id ? "border-accent bg-accent-soft text-accent-strong" : ""}`}
          >
            {p.name}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
          Flagged rows only ({flaggedCount} of {mine.length})
        </label>
        <a className="btn" href={`/api/export/rent-roll?property=${property}`}>
          Export for Yardi (CSV)
        </a>
      </div>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="tbl w-full min-w-[860px] text-sm">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Status</th>
              <th>Resident</th>
              <th className="!text-right">Market</th>
              <th className="!text-right">Lease rent</th>
              <th>Lease</th>
              <th className="!text-right">Deposit</th>
              <th className="!text-right">Balance</th>
              <th>Review</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-muted">No flagged rows left at this property.</td></tr>
            )}
            {rows.map((u) => (
              <Fragment key={u.id}>
                <tr id={`row-${u.id}`} className={focus === u.id ? "bg-accent-soft" : ""}>
                  <td>
                    <button type="button" className="hover:text-accent-strong" onClick={() => setOpen(open === u.id ? null : u.id)}>
                      {u.unit}
                    </button>
                    <span className="block text-xs text-muted">{u.floorplan} · {u.sqft} sf</span>
                  </td>
                  <td>{STATUS_LABEL[u.status]}</td>
                  <td>{u.resident_name ?? <span className="text-muted">—</span>}</td>
                  <td className="text-right tabular-nums">{money(u.market_rent)}</td>
                  <td className="text-right tabular-nums">{money(u.lease_rent)}</td>
                  <td className="whitespace-nowrap text-xs">{u.lease_start ?? "—"} to {u.lease_end ?? "—"}</td>
                  <td className="text-right tabular-nums">{money(u.deposit)}</td>
                  <td className="text-right tabular-nums">{money(u.balance)}</td>
                  <td className={`px-3 py-2 capitalize ${REVIEW_COLOR[u.review_status]}`}>{u.review_status}</td>
                  <td><FlagBadges flags={flags[u.id]} /></td>
                </tr>
                {open === u.id && (
                  <tr className="bg-panel2/60">
                    <td colSpan={10} className="!py-4">
                      <UnitReview unit={u} flags={flags[u.id]} pending={pending} run={run} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const FIELDS = [
  { key: "resident_name", label: "Resident", raw: "Resident Name", type: "text" },
  { key: "status", label: "Status", raw: "Unit Status", type: "status" },
  { key: "sqft", label: "Sq ft", raw: "Sq Ft", type: "number" },
  { key: "lease_rent", label: "Lease rent", raw: "Lease Rent", type: "number" },
  { key: "lease_start", label: "Lease start", raw: "Lease Start", type: "date" },
  { key: "lease_end", label: "Lease end", raw: "Lease End", type: "date" },
  { key: "deposit", label: "Deposit", raw: "Security Deposit", type: "number" },
] as const;

function UnitReview({
  unit,
  flags,
  pending,
  run,
}: {
  unit: Unit;
  flags?: Flag[];
  pending: boolean;
  run: ReturnType<typeof useAction>["run"];
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, String(unit[f.key] ?? "")])),
  );
  const [note, setNote] = useState(unit.review_note ?? "");

  const changes = () => {
    const patch: Record<string, string | number | null> = {};
    for (const f of FIELDS) {
      const before = String(unit[f.key] ?? "");
      if (values[f.key] === before) continue;
      patch[f.key] = values[f.key] === "" ? null : f.type === "number" ? Number(values[f.key]) : values[f.key];
    }
    return patch;
  };
  const save = (review_status: string) => {
    const patch = changes();
    const status = Object.keys(patch).length && review_status === "approved" ? "corrected" : review_status;
    run(() => updateUnit(unit.id, { ...patch, review_status: status, review_note: note || null }));
  };

  return (
    <div className="flex flex-col gap-3">
      {flags?.map((f) => (
        <p key={f.id} className="text-sm text-sev2-ink">{f.title}</p>
      ))}
      {unit.notes && (
        <p className="rounded-xl bg-panel px-3.5 py-2.5 text-sm">
          <span className="text-muted">Prior manager&apos;s note: </span>
          <span className="font-medium">{unit.notes}</span>
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map((f) => (
          <label key={f.key} className="text-xs text-muted">
            {f.label}
            {f.type === "status" ? (
              <select className="field mt-1" value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            ) : (
              <input
                type={f.type}
                className="field mt-1"
                value={values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            )}
            <span className="mt-0.5 block">Prior manager&apos;s cell: {String(unit.raw[f.raw] ?? "blank")}</span>
          </label>
        ))}
        <label className="text-xs text-muted sm:col-span-2 lg:col-span-1">
          Review note
          <input className="field mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you checked" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary" disabled={pending} onClick={() => save("approved")}>
          {Object.keys(changes()).length ? "Save correction" : "Approve as is"}
        </button>
        <button type="button" className="btn" disabled={pending} onClick={() => save("rejected")}>
          Reject row
        </button>
        <span className="text-xs text-muted">
          Source: A1 Rent Roll (Prior Mgr), row {unit.source_row}. Raw unit: {String(unit.raw["Unit"])}.
        </span>
      </div>
    </div>
  );
}
