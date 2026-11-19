import Link from "next/link";
import { notFound } from "next/navigation";
import { AllClear } from "@/components/all-clear";
import { FUNCTION_ICON } from "@/components/icons";
import { OwnerReportButton } from "@/components/owner-report-button";
import { ReadinessBreakdown } from "@/components/property-explorer";
import { PropertyPass } from "@/components/property-pass";
import { Section, SeverityMark, StatusTag } from "@/components/ui";
import { nextUp, shortTitle } from "@/lib/dashboard";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import { formatShort, TODAY } from "@/lib/dates";
import { readiness } from "@/lib/readiness";
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
  const { next, blocker } = nextUp(id, data, exceptions);

  const stats = [
    ["Units", String(units.length)],
    ["Occupied or on notice", `${occupied.length} (${units.length ? Math.round((occupied.length / units.length) * 100) : 0}%)`],
    ["Monthly lease rent", usd(rent)],
    ["Resident balances", usd(units.reduce((sum, u) => sum + (u.balance ?? 0), 0))],
    ["Past lease end", String(occupied.filter((u) => u.lease_end && u.lease_end < TODAY).length)],
    ["Rows reviewed", String(units.filter((u) => u.review_status !== "unreviewed").length)],
  ];

  return (
    <div className="mx-auto flex max-w-[92rem] flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/properties" className="btn btn-quiet">
          ← All properties
        </Link>
        <div className="flex flex-wrap gap-2">
          <OwnerReportButton propertyId={id} />
          <Link className="btn" href={`/inbox?property=${id}`}>
            Exceptions
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <PropertyPass r={r} next={next} blocker={blocker} critical={tasks.filter((t) => t.critical_path)} />
          <Section title="Day-one readiness" hint={`Prior manager code ${r.property.pm_code ?? "unknown"}`}>
            <ReadinessBreakdown r={r} />
          </Section>
        </div>

        <Section title={`Open exceptions (${open.length})`} hint="Most severe first.">
          {open.length === 0 ? (
            <AllClear title="All clear">Nothing is open at this property. It is ready for Day One.</AllClear>
          ) : (
            <ul className="flex flex-col">
              {open.slice(0, 14).map((e) => (
                <li key={e.id}>
                  <Link href={`/inbox?focus=${e.id}`} className="flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition hover:bg-panel2">
                    <SeverityMark severity={e.severity} className="mt-0.5 size-5" />
                    <span>{shortTitle(e.title, r.property.name)}</span>
                  </Link>
                </li>
              ))}
              {open.length > 14 && <li className="px-3 py-2 text-sm text-muted">and {open.length - 14} more in the inbox</li>}
            </ul>
          )}
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section
          title="Rent roll"
          action={
            <Link className="btn btn-quiet" href="/rent-roll">
              Open intake
            </Link>
          }
        >
          {units.length === 0 ? (
            <p className="rounded-xl bg-sev2-soft px-4 py-3 text-sm text-sev2-ink">No rent roll received from the prior manager.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stats.map(([label, value]) => (
                <div key={label} className="rounded-xl bg-panel2 px-3.5 py-3">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="display mt-1 text-lg font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Section>

        <Section title={`Vendor contracts (${contracts.length})`}>
          <ul className="flex flex-col">
            {contracts.map((c) => (
              <li key={c.id}>
                <Link href={`/vendors?focus=${c.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-panel2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{c.service}</span> <span className="text-muted">· {c.vendor}</span>
                  </span>
                  <span className="text-xs whitespace-nowrap text-muted">
                    ends {formatShort(c.term_end)}
                    {c.auto_renew ? `, notice by ${formatShort(noticeDeadline(c))}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title={`Checklist (${tasks.filter((t) => t.status === "Complete").length} of ${tasks.length} complete)`}>
        <ul className="grid gap-x-6 sm:grid-cols-2">
          {tasks.map((t) => {
            const Icon = FUNCTION_ICON[t.function];
            return (
              <li key={t.id}>
                <Link href={`/tasks?focus=${t.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-panel2">
                  {Icon && <Icon weight="duotone" className="size-5 shrink-0 text-indigo" />}
                  <span className="min-w-0 flex-1 truncate">{t.task}</span>
                  <span className="text-xs whitespace-nowrap text-muted">{formatShort(t.due_date)}</span>
                  <StatusTag status={t.status} />
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>
    </div>
  );
}
