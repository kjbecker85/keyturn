import Link from "next/link";
import { PageHeader, SeverityBadge, StatusTag } from "@/components/ui";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import { formatShort } from "@/lib/dates";
import { STATUS_LABEL } from "@/lib/data/normalize";
import { SHEETS, type Dataset, type SourceRef } from "@/lib/data/types";
import { noticeDeadline, usd } from "@/lib/rules";
import { RULES } from "@/lib/rules/catalog";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Contradictions" };

const SHEET_ORDER = [SHEETS.checklist, SHEETS.vendors, SHEETS.rentRoll];
const SHEET_NAME: Record<string, string> = {
  [SHEETS.checklist]: "The checklist says",
  [SHEETS.vendors]: "The vendor sheet says",
  [SHEETS.rentRoll]: "The rent roll says",
};
const HREF: Record<SourceRef["table"], string> = { tasks: "/tasks", vendor_contracts: "/vendors", rent_roll_units: "/rent-roll" };

/** One source row, with the fields that matter for a contradiction. */
function Row({ source, data }: { source: SourceRef; data: Dataset }) {
  let lines: React.ReactNode = null;
  if (source.table === "tasks") {
    const t = data.tasks.find((x) => x.id === source.id);
    if (t)
      lines = (
        <>
          <span className="block font-medium">{t.task}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <StatusTag status={t.status} />
            <span>Due {formatShort(t.due_date)}</span>
            {t.assignee && <span>{t.assignee}</span>}
          </span>
          {t.notes && <span className="mt-1 block text-xs">Note: &quot;{t.notes}&quot;</span>}
        </>
      );
  } else if (source.table === "vendor_contracts") {
    const c = data.contracts.find((x) => x.id === source.id);
    if (c)
      lines = (
        <>
          <span className="block font-medium">
            {c.contract_id} {c.vendor}
          </span>
          <span className="mt-1 block text-xs text-muted">
            {c.service}, {c.monthly_cost ? `${usd(c.monthly_cost)}/mo` : "revenue share"}. Ends {formatShort(c.term_end)}
            {c.auto_renew ? `, auto-renews (notice by ${formatShort(noticeDeadline(c))})` : ", no auto-renew"}.
            {c.assignable ? "" : " Not assignable."} COI expires {formatShort(c.coi_expiration)}.
          </span>
        </>
      );
  } else {
    const u = data.units.find((x) => x.id === source.id);
    if (u)
      lines = (
        <>
          <span className="block font-medium">Unit {u.unit}</span>
          <span className="mt-1 block text-xs text-muted">
            {STATUS_LABEL[u.status]}, {u.resident_name ?? "no resident"}, {u.sqft ?? "?"} sq ft, lease {u.lease_start ?? "?"} to {u.lease_end ?? "?"}
          </span>
        </>
      );
  }
  return (
    <Link href={`${HREF[source.table]}?focus=${source.id}`} className="block rounded-xl border border-line bg-panel px-3.5 py-2.5 text-sm transition hover:border-accent">
      {lines ?? <span className="font-medium">{source.label}</span>}
      <span className="mt-1 block text-[11px] text-faint">Row {source.row}</span>
    </Link>
  );
}

export default async function ContradictionsPage() {
  const db = await createClient();
  const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
  const all = exceptions.filter((e) => e.area === "cross_sheet");
  const open = all.filter((e) => e.status === "open");
  const name = new Map(data.properties.map((p) => [p.id, p.name]));

  return (
    <>
      <PageHeader
        title="Contradictions"
        subtitle="Places where two of the prior manager's sheets disagree. No single spreadsheet shows these. Each card puts what one sheet says next to what the other says. Someone has to find out which is true."
      >
        <Link href="/inbox?area=cross_sheet" className="btn">Open in inbox</Link>
      </PageHeader>
      <div className="flex flex-col gap-4 px-4 pb-10 md:px-8">
        <p className="text-sm text-muted">
          {open.length} open{all.length > open.length ? `, ${all.length - open.length} closed` : ""}. Raised by{" "}
          <Link href="/rules#cross_sheet" className="underline">6 rules</Link>.
        </p>
        {open.map((e) => {
          const bySheet = new Map<string, SourceRef[]>();
          for (const s of e.sources) bySheet.set(s.sheet, [...(bySheet.get(s.sheet) ?? []), s]);
          // A rule about a missing rent roll has no rent roll rows to show, so say so.
          const missingRoll =
            e.property_id !== null &&
            !bySheet.has(SHEETS.rentRoll) &&
            !data.units.some((u) => u.property_id === e.property_id) &&
            (e.rule_key === "cross.loading_before_clean" || e.rule_key === "cross.rent_roll_marked_received");
          const sheets = SHEET_ORDER.filter((s) => bySheet.has(s) || (s === SHEETS.rentRoll && missingRoll));
          return (
            <article key={e.id} className="card p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={e.severity} />
                <span className="chip">{e.property_id === null ? "Portfolio" : name.get(e.property_id)}</span>
                <span className="text-xs text-muted">{RULES.find((r) => r.key === e.rule_key)?.label}</span>
              </div>
              <h2 className="mt-3 text-base font-semibold">{e.title}</h2>
              <p className="mt-1 text-sm text-muted">{e.detail}</p>
              <div className={`mt-4 grid grid-cols-1 gap-4 ${sheets.length > 1 ? "lg:grid-cols-2" : ""}`}>
                {sheets.map((sheet) => {
                  const rows = bySheet.get(sheet) ?? [];
                  return (
                    <div key={sheet} className="min-w-0 rounded-2xl bg-panel2 p-3">
                      <p className="px-1 text-sm font-semibold">{SHEET_NAME[sheet]}</p>
                      <p className="px-1 text-xs text-muted">{sheet}</p>
                      <div className="mt-2 flex max-h-80 flex-col gap-2 overflow-y-auto">
                        {rows.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-line px-3.5 py-3 text-sm">
                            No rows for {name.get(e.property_id!)}. The prior manager hasn&apos;t sent this rent roll.
                          </p>
                        ) : (
                          rows.map((s) => <Row key={`${s.table}:${s.id}`} source={s} data={data} />)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Link href={`/inbox?focus=${e.id}&status=all`} className="mt-4 inline-block text-sm font-medium text-accent-strong">
                Open this item in the inbox
              </Link>
            </article>
          );
        })}
        {open.length === 0 && <p className="card p-6 text-sm text-muted">No open contradictions.</p>}
      </div>
    </>
  );
}
