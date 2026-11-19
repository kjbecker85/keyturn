import Link from "next/link";
import { shortTitle } from "@/lib/dashboard";
import { daysBetween, formatShort, TAKEOVER, TODAY } from "@/lib/dates";
import type { ExceptionRow, Task } from "@/lib/data/types";
import { LEVEL_COLOR, LEVEL_INK, LEVEL_LABEL, LEVEL_SOFT, type Readiness } from "@/lib/readiness";
import { KeyTurn } from "./all-clear";
import { ReadinessRing } from "./readiness-ring";

/**
 * A property's boarding pass for day one: where it stands, the next deadline
 * and what is in the way. The barcode is real: one bar per critical-path
 * task, dark when that task is done.
 */
export function PropertyPass({
  r,
  next,
  blocker,
  critical,
  index = 0,
}: {
  r: Readiness;
  next: Task | null;
  blocker: ExceptionRow | null;
  critical: Task[];
  index?: number;
}) {
  const cleared = r.open === 0;
  return (
    <Link
      href={`/properties/${r.property.id}`}
      className="card rise group relative flex overflow-hidden transition hover:-translate-y-0.5 hover:shadow-pop"
      style={{ "--i": index } as React.CSSProperties}
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: LEVEL_COLOR[r.level] }} />
      <div className="min-w-0 flex-1 py-4 pr-4 pl-6">
        <p className="eyebrow flex items-center gap-1.5">
          {r.property.market}
          <span aria-hidden="true">→</span>
          Day One
        </p>
        <h3 className="display mt-1 text-lg leading-tight font-semibold group-hover:text-accent-strong">{r.property.name}</h3>
        <span
          className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: LEVEL_SOFT[r.level], color: LEVEL_INK[r.level] }}
        >
          {LEVEL_LABEL[r.level]}
        </span>
        <dl className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2 text-sm">
          <div className="min-w-0">
            <dt className="text-xs text-faint">Next deadline</dt>
            <dd className="truncate">
              {next ? (
                <>
                  <span className="font-semibold">{formatShort(next.due_date)}</span> {next.task}
                </>
              ) : (
                "Checklist complete"
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-faint">In the way</dt>
            <dd className="truncate">{blocker ? shortTitle(blocker.title, r.property.name) : "Nothing open"}</dd>
          </div>
        </dl>
      </div>

      <div className="relative flex w-28 shrink-0 flex-col items-center justify-center gap-2.5 border-l-2 border-dashed border-line py-4">
        <span className="absolute -top-2.5 -left-[11px] size-5 rounded-full bg-background" />
        <span className="absolute -bottom-2.5 -left-[11px] size-5 rounded-full bg-background" />
        {cleared ? <KeyTurn size={60} /> : <ReadinessRing score={r.score} level={r.level} size={60} />}
        <p className="display text-center text-sm leading-tight font-semibold">
          DEC 01
          <span className="block text-[0.7rem] font-medium text-muted">T−{daysBetween(TODAY, TAKEOVER)} days</span>
        </p>
        <div className="flex h-6 items-end gap-[3px]" title={`${r.criticalDone} of ${r.criticalTotal} critical-path tasks done`}>
          {critical.map((t, i) => (
            <span
              key={t.id}
              className="w-[3px] rounded-sm"
              style={{
                height: `${60 + ((i * 37) % 40)}%`,
                background: t.status === "Complete" ? "var(--foreground)" : "var(--line)",
              }}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}
