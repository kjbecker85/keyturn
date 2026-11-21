"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateContract } from "@/app/(app)/actions";
import { draftTermination } from "@/app/(app)/drafts/actions";
import { formatShort, TAKEOVER, TODAY } from "@/lib/dates";
import type { Flag } from "@/lib/flags";
import type { Contract, Property } from "@/lib/data/types";
import { noticeDeadline, usd } from "@/lib/rules";
import { FlagBadges } from "./flag-badges";
import { useAction, useFocusRow } from "./use-action";
import { ExportButtons } from "./export-buttons";
import { toSheet } from "@/lib/table-export";
import { contractColumns } from "@/lib/export-columns";

export function VendorsTable({
  contracts,
  properties,
  flags,
}: {
  contracts: Contract[];
  properties: Property[];
  flags: Record<number, Flag[]>;
}) {
  const { pending, error, run } = useAction();
  const focus = useFocusRow();
  const [property, setProperty] = useState("");
  const [only, setOnly] = useState("");
  const [open, setOpen] = useState<number | null>(focus);
  const name = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);

  const rows = contracts.filter(
    (c) =>
      (!property || c.property_id === Number(property)) &&
      (only === "flagged" ? flags[c.id]?.length : only === "undecided" ? !c.decision : true),
  );

  return (
    <div className="px-4 pb-10 md:px-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="grid w-full grid-cols-2 gap-2 sm:max-w-md">
        <select className="field" aria-label="Property" value={property} onChange={(e) => setProperty(e.target.value)}>
          <option value="">All properties</option>
          {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="field" aria-label="Show" value={only} onChange={(e) => setOnly(e.target.value)}>
          <option value="">All contracts</option>
          <option value="flagged">Flagged only</option>
          <option value="undecided">No decision yet</option>
        </select>
      </div>
        <ExportButtons count={rows.length} sheet={() => toSheet("Vendor contracts", contractColumns((id) => name.get(id) ?? "", flags), rows)} />
      </div>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="tbl w-full min-w-[820px] text-sm">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Property</th>
              <th className="!text-right">Monthly</th>
              <th>Term end</th>
              <th>Notice by</th>
              <th>COI</th>
              <th>Decision</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const deadline = noticeDeadline(c);
              return (
                <Fragment key={c.id}>
                  <tr id={`row-${c.id}`} className={focus === c.id ? "bg-accent-soft" : ""}>
                    <td>
                      <button type="button" className="text-left hover:text-accent-strong" onClick={() => setOpen(open === c.id ? null : c.id)}>
                        {c.vendor}
                      </button>
                      <span className="block text-xs text-muted">
                        {c.contract_id} · {c.service}
                        {c.assignable ? "" : " · not assignable"}
                      </span>
                    </td>
                    <td className="text-muted">{name.get(c.property_id)}</td>
                    <td className="text-right tabular-nums">{c.monthly_cost ? usd(c.monthly_cost) : "Rev share"}</td>
                    <td className={`whitespace-nowrap ${c.term_end < TAKEOVER ? "text-sev2-ink" : ""}`}>
                      {formatShort(c.term_end)}
                      <span className="block text-xs text-muted">{c.auto_renew ? "auto-renews" : "no auto-renew"}</span>
                    </td>
                    <td className={`whitespace-nowrap ${c.auto_renew && deadline < TODAY ? "text-sev1-ink" : ""}`}>
                      {formatShort(deadline)}
                      <span className="block text-xs text-muted">{c.notice_days} days</span>
                    </td>
                    <td className={`whitespace-nowrap ${c.coi_expiration < TODAY ? "text-sev1-ink" : ""}`}>
                      {formatShort(c.coi_expiration)}
                    </td>
                    <td className="capitalize">{c.decision ?? <span className="text-muted">None</span>}</td>
                    <td><FlagBadges flags={flags[c.id]} /></td>
                  </tr>
                  {open === c.id && (
                    <tr className="bg-panel2/60">
                      <td colSpan={8} className="!py-4">
                        <DecisionEditor contract={c} flags={flags[c.id]} pending={pending} run={run} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DecisionEditor({
  contract: c,
  flags,
  pending,
  run,
}: {
  contract: Contract;
  flags?: Flag[];
  pending: boolean;
  run: ReturnType<typeof useAction>["run"];
}) {
  const router = useRouter();
  const [decision, setDecision] = useState(c.decision ?? "");
  const [reason, setReason] = useState(c.decision_reason ?? "");
  const [coi, setCoi] = useState(c.coi_expiration);
  const [drafting, startDraft] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr_10rem_auto] sm:items-end">
        <label className="text-xs font-medium text-muted">
          Decision
          <select className="field mt-1" value={decision} onChange={(e) => setDecision(e.target.value)}>
            <option value="">None</option>
            <option value="keep">Keep</option>
            <option value="terminate">Terminate</option>
            <option value="renegotiate">Renegotiate</option>
          </select>
        </label>
        <label className="text-xs text-muted">
          Reason
          <input className="field mt-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required to terminate or renegotiate" />
        </label>
        <label className="text-xs text-muted">
          COI expiration
          <input type="date" className="field mt-1" value={coi} onChange={(e) => setCoi(e.target.value)} />
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending}
          onClick={() =>
            run(() =>
              updateContract(c.id, { decision: decision || null, decision_reason: reason || null, coi_expiration: coi }),
            )
          }
        >
          Save
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {c.decision === "terminate" && (
          <button
            type="button"
            className="btn"
            disabled={drafting}
            onClick={() =>
              startDraft(async () => {
                const result = await draftTermination(c.id);
                if (result.ok) router.push(`/drafts?focus=${result.id}`);
                else window.alert(result.error);
              })
            }
          >
            {drafting ? "Drafting…" : "Draft termination notice"}
          </button>
        )}
        <p className="text-xs text-muted">
          Source: A3 Vendor Contracts, row {c.source_row}. Started {formatShort(c.start_date)}.
          {flags?.length ? ` Open flags: ${flags.map((f) => f.title).join(" | ")}` : ""}
        </p>
      </div>
    </div>
  );
}
