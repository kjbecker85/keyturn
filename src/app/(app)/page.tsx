import Link from "next/link";
import { CountUp } from "@/components/count-up";
import { ExceptionMix } from "@/components/dash/exception-mix";
import { HeatGrid } from "@/components/dash/heat-grid";
import { Hero } from "@/components/dash/hero";
import { Money } from "@/components/dash/money";
import { Runway } from "@/components/dash/runway";
import { AREA_ICON, ArrowRight, Lightning, SEVERITY_ICON, type Icon } from "@/components/icons";
import { PropertyPass } from "@/components/property-pass";
import { OwnerReportButton } from "@/components/owner-report-button";
import { Section, SeverityMark } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { buildDashboard, nextUp } from "@/lib/dashboard";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import { formatShort } from "@/lib/dates";
import { SEVERITY_LABEL } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

function Tile({
  icon: IconCmp,
  label,
  href,
  index,
  children,
  footer,
}: {
  icon: Icon;
  label: string;
  href: string;
  index: number;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="card rise group flex flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-pop md:p-5"
      style={{ "--i": index } as React.CSSProperties}
    >
      <span className="flex items-center gap-2.5 text-sm font-medium text-muted">
        <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-strong">
          <IconCmp weight="duotone" className="size-5" />
        </span>
        <span className="flex-1">{label}</span>
        <ArrowRight weight="bold" className="hidden size-4 text-faint transition group-hover:text-accent sm:block" />
      </span>
      <span className="display text-4xl leading-none font-semibold">{children}</span>
      <span className="mt-auto">{footer}</span>
    </Link>
  );
}

function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  return (
    <>
      <span className="block h-2 overflow-hidden rounded-full bg-panel2">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </span>
      <span className="mt-1.5 block text-xs text-muted">{label}</span>
    </>
  );
}

export default async function OverviewPage() {
  const user = await getUser();
  const db = await createClient();
  const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
  const dash = buildDashboard(data, exceptions);
  const name = new Map(data.properties.map((p) => [p.id, p.name]));
  const maxWeek = Math.max(...dash.tasks.weeks.map((w) => w.due), 1);
  const firstName = user.full_name.split(" ")[0];

  return (
    <div className="mx-auto flex max-w-[92rem] flex-col gap-5 px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="display mt-1 text-2xl font-semibold md:text-3xl">Good morning, {firstName}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <OwnerReportButton propertyId={null} />
          <Link href="/inbox/triage" className="btn btn-primary">
            <Lightning weight="fill" className="size-4" />
            Start triage
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <Hero dash={dash} />
        <div className="grid grid-cols-2 gap-4 md:gap-5">
          <Tile
            icon={SEVERITY_ICON[1]}
            label="Open critical"
            href="/inbox?severity=1"
            index={1}
            footer={
              <>
                <span className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                  {dash.bySeverity.map((count, i) => (
                    <span key={i} style={{ flex: count, background: `var(--sev${i + 1})` }} title={`${SEVERITY_LABEL[i + 1]}: ${count}`} />
                  ))}
                </span>
                <span className="mt-1.5 block text-xs text-muted">of {dash.open} open exceptions</span>
              </>
            }
          >
            <CountUp value={dash.bySeverity[0]} />
          </Tile>

          <Tile
            icon={AREA_ICON.checklist}
            label="Critical-path tasks done"
            href="/tasks"
            index={2}
            footer={
              <>
                <span className="flex h-9 items-end gap-1" aria-hidden="true">
                  {dash.tasks.weeks.map((w) => (
                    <span key={w.label} className="relative flex-1 overflow-hidden rounded-sm bg-panel2" style={{ height: `${Math.max(12, (w.due / maxWeek) * 100)}%` }} title={`Week of ${w.label}: ${w.done} of ${w.due} tasks done`}>
                      <span className="absolute inset-x-0 bottom-0 bg-accent" style={{ height: `${w.due ? (w.done / w.due) * 100 : 0}%` }} />
                    </span>
                  ))}
                </span>
                <span className="mt-1.5 block text-xs text-muted">tasks due per week through Nov 30</span>
              </>
            }
          >
            <CountUp value={dash.tasks.criticalDone} />
            <span className="text-xl text-faint"> / {dash.tasks.critical}</span>
          </Tile>

          <Tile
            icon={AREA_ICON.vendors}
            label="Contract decisions made"
            href="/vendors"
            index={3}
            footer={<Progress done={dash.contracts.decided} total={dash.contracts.flagged} label="of the contracts with an open flag" />}
          >
            <CountUp value={dash.contracts.decided} />
            <span className="text-xl text-faint"> / {dash.contracts.flagged}</span>
          </Tile>

          <Tile
            icon={AREA_ICON.rent_roll}
            label="Rent roll rows reviewed"
            href="/rent-roll"
            index={4}
            footer={
              <Progress
                done={dash.rentRoll.reviewed}
                total={dash.rentRoll.flagged}
                label={`of flagged rows. ${dash.rentRoll.received} of 9 rent rolls received.`}
              />
            }
          >
            <CountUp value={dash.rentRoll.reviewed} />
            <span className="text-xl text-faint"> / {dash.rentRoll.flagged}</span>
          </Tile>
        </div>
      </div>

      <Section
        title="The runway to Day One"
        hint="Every due date, notice deadline and contract end from today to takeover. Hover a mark for detail, click to open the record."
        style={{ "--i": 3 } as React.CSSProperties}
      >
        <Runway events={dash.runway} lanes={dash.rows} />
      </Section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Section title="Checklist progress" hint="Tasks done, by property and function. Click a cell to see those tasks." style={{ "--i": 4 } as React.CSSProperties}>
          <HeatGrid heat={dash.heat} functions={dash.functions} />
        </Section>
        <Section title="What's open" hint="Inner ring is the area, outer ring the severity. Click a slice to open it." style={{ "--i": 5 } as React.CSSProperties}>
          <ExceptionMix mix={dash.mix} open={dash.open} />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Section title="Money at stake" hint="Dollars tied to problems that are still open." style={{ "--i": 6 } as React.CSSProperties}>
          <Money money={dash.money} />
        </Section>
        <Section
          title="Needs you first"
          hint="The most urgent critical exceptions."
          action={
            <Link href="/inbox?severity=1" className="btn btn-quiet">
              All critical
              <ArrowRight weight="bold" className="size-4" />
            </Link>
          }
          style={{ "--i": 7 } as React.CSSProperties}
        >
          <ul className="flex flex-col">
            {dash.focus.map((e) => (
              <li key={e.id}>
                <Link href={`/inbox?focus=${e.id}`} className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-panel2">
                  <SeverityMark severity={e.severity} className="mt-0.5 size-5" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{e.title}</span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {e.property_id ? name.get(e.property_id) : "Portfolio"}
                      {e.due_date ? ` · due ${formatShort(e.due_date)}` : ""} · {e.assignee ?? "Unassigned"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold">Day One passes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...dash.rows]
            .sort((a, b) => a.score - b.score)
            .map((r, i) => {
              const { next, blocker } = nextUp(r.property.id, data, exceptions);
              return (
                <PropertyPass
                  key={r.property.id}
                  r={r}
                  next={next}
                  blocker={blocker}
                  critical={data.tasks.filter((t) => t.property_id === r.property.id && t.critical_path)}
                  index={i}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}
