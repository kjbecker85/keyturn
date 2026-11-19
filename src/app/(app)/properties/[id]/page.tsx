import Link from "next/link";
import { notFound } from "next/navigation";
import { OwnerReportButton } from "@/components/owner-report-button";
import { ReadinessBreakdown } from "@/components/property-explorer";
import { PageHeader, SeverityDot } from "@/components/ui";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import { formatShort, TODAY } from "@/lib/dates";
import { LEVEL_COLOR, LEVEL_LABEL, readiness } from "@/lib/readiness";
import { noticeDeadline, usd } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";

export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const db = await createClient();
  const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
  const r = readiness(data.properties, data.tasks, exceptions).find((x) => x.property.id === id);
  if (!r) notFound();

  const open = exceptions.filter((e) => e.status === "open" && e.property_id === id);
  const tasks = data.tasks.filter((t) => t.property_id === id);
  const contracts = data.contracts.filter((c) => c.property_id === id);
  const units = data.units.filter((u) => u.property_id === id);
  const occupied = units.filter((u) => u.status === "occupied" || u.status === "notice");
  const rent = occupied.reduce((sum, u) => sum + (u.lease_rent ?? 0), 0);

  return (
    <>
      <PageHeader title={r.property.name} subtitle={`${r.property.market} · prior manager code ${r.property.pm_code ?? "unknown"}`}>
        <div className="flex gap-2">
          <OwnerReportButton propertyId={id} />
          <Link className="btn" href={`/?property=${id}`}>Exceptions</Link>
        </div>
      </PageHeader>
      <div className="grid gap-4 px-4 pb-10 lg:grid-cols-2">
        <section className="card p-4">
          <div className="mb-3 flex items-center gap-3">
            <span
              className="grid size-12 place-items-center rounded-full text-lg font-semibold text-background"
              style={{ background: LEVEL_COLOR[r.level] }}
            >
              {r.score}
            </span>
            <div>
              <p className="font-medium">{LEVEL_LABEL[r.level]}</p>
              <p className="text-sm text-muted">Day-one readiness</p>
            </div>
          </div>
          <ReadinessBreakdown r={r} />
        </section>

        <section className="card p-4">
          <h2 className="font-medium">Open exceptions ({open.length})</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {open.slice(0, 12).map((e) => (
              <li key={e.id} className="flex gap-2">
                <SeverityDot severity={e.severity} />
                <span>{e.title}</span>
              </li>
            ))}
            {open.length === 0 && <li className="text-muted">Nothing open.</li>}
            {open.length > 12 && <li className="text-muted">and {open.length - 12} more in the inbox</li>}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="font-medium">Rent roll</h2>
          {units.length === 0 ? (
            <p className="mt-2 text-sm text-sev2">No rent roll received from the prior manager.</p>
          ) : (
            <dl className="mt-2 grid grid-cols-2 gap-y-1.5 text-sm">
              <dt className="text-muted">Units</dt><dd>{units.length}</dd>
              <dt className="text-muted">Occupied or on notice</dt>
              <dd>{occupied.length} ({Math.round((occupied.length / units.length) * 100)}%)</dd>
              <dt className="text-muted">Monthly lease rent</dt><dd>{usd(rent)}</dd>
              <dt className="text-muted">Resident balances</dt>
              <dd>{usd(units.reduce((sum, u) => sum + (u.balance ?? 0), 0))}</dd>
              <dt className="text-muted">Past lease end</dt>
              <dd>{occupied.filter((u) => u.lease_end && u.lease_end < TODAY).length}</dd>
              <dt className="text-muted">Rows reviewed</dt>
              <dd>{units.filter((u) => u.review_status !== "unreviewed").length}</dd>
            </dl>
          )}
          <Link className="mt-3 inline-block text-sm text-accent" href="/rent-roll">Open rent roll intake</Link>
        </section>

        <section className="card p-4">
          <h2 className="font-medium">Vendor contracts ({contracts.length})</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {contracts.map((c) => (
              <li key={c.id} className="flex justify-between gap-3">
                <Link href={`/vendors?focus=${c.id}`} className="hover:text-accent">
                  {c.service} <span className="text-muted">· {c.vendor}</span>
                </Link>
                <span className="whitespace-nowrap text-xs text-muted">
                  ends {formatShort(c.term_end)}
                  {c.auto_renew ? `, notice by ${formatShort(noticeDeadline(c))}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4 lg:col-span-2">
          <h2 className="font-medium">Checklist ({tasks.filter((t) => t.status === "Complete").length} of {tasks.length} complete)</h2>
          <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex justify-between gap-3">
                <Link href={`/tasks?focus=${t.id}`} className="hover:text-accent">{t.task}</Link>
                <span className={`whitespace-nowrap text-xs ${t.status === "Blocked" ? "text-sev1" : t.status === "Complete" ? "text-ok" : "text-muted"}`}>
                  {t.status} · {formatShort(t.due_date)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
