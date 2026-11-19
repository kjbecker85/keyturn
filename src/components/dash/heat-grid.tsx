import Link from "next/link";
import { FUNCTION_ICON } from "@/components/icons";
import type { Dashboard } from "@/lib/dashboard";

const SHORT: Record<string, string> = {
  Accounting: "Acct",
  Marketing: "Mktg",
  Operations: "Ops",
  Procurement: "Procure",
};

/** Checklist progress, property by function. Darker means more of that function's tasks are done. */
export function HeatGrid({ heat, functions }: Pick<Dashboard, "heat" | "functions">) {
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[36rem] items-center gap-1.5 text-sm"
        style={{ gridTemplateColumns: `minmax(8.5rem, 1.4fr) repeat(${functions.length}, minmax(3rem, 1fr)) 3.2rem` }}
      >
        <span />
        {functions.map((fn) => {
          const Icon = FUNCTION_ICON[fn];
          return (
            <span key={fn} className="flex flex-col items-center gap-1 pb-1 text-[0.7rem] font-medium text-muted" title={fn}>
              {Icon && <Icon weight="duotone" className="size-5 text-indigo" />}
              <span>{SHORT[fn] ?? fn}</span>
            </span>
          );
        })}
        <span className="pb-1 text-right text-[0.7rem] font-medium text-muted">Done</span>

        {heat.map((row) => {
          const done = row.cells.reduce((s, c) => s + c.done, 0);
          const total = row.cells.reduce((s, c) => s + c.total, 0);
          return (
            <div key={row.propertyId} className="contents">
              <Link href={`/properties/${row.propertyId}`} className="truncate pr-2 font-medium hover:text-accent-strong">
                {row.name.replace(/^The /, "")}
              </Link>
              {row.cells.map((cell) => {
                const pct = cell.total ? cell.done / cell.total : 0;
                return (
                  <Link
                    key={cell.fn}
                    href={`/tasks?property=${row.propertyId}&fn=${encodeURIComponent(cell.fn)}`}
                    title={`${row.name}, ${cell.fn}: ${cell.done} of ${cell.total} done${cell.blocked ? `, ${cell.blocked} blocked` : ""}`}
                    className={`relative grid h-10 place-items-center rounded-lg text-xs font-semibold tabular-nums transition hover:scale-105 ${
                      cell.blocked ? "ring-2 ring-sev1" : ""
                    }`}
                    style={{
                      background: `color-mix(in srgb, var(--accent) ${Math.round(pct * 100)}%, var(--panel2))`,
                      color: pct > 0.5 ? "var(--on-accent)" : "var(--muted)",
                    }}
                  >
                    {cell.done}/{cell.total}
                  </Link>
                );
              })}
              <span className="display text-right font-semibold tabular-nums">{Math.round((done / total) * 100)}%</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-12 rounded" style={{ background: "linear-gradient(90deg, var(--panel2), var(--accent))" }} />
          none done to all done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded ring-2 ring-sev1" />
          has a blocked task
        </span>
      </p>
    </div>
  );
}
