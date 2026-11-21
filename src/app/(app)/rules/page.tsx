import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { AREA_ICON } from "@/components/icons";
import { loadExceptions } from "@/lib/data/store";
import { AREA_LABEL, type Area } from "@/lib/data/types";
import { RULES } from "@/lib/rules/catalog";
import { readRuleSource } from "@/lib/rules/source";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Rules" };

const AREAS: { area: Area; intro: string }[] = [
  { area: "rent_roll", intro: "Read every unit in the prior manager's rent rolls." },
  { area: "checklist", intro: "Read every task in the transition checklist." },
  { area: "vendors", intro: "Read every vendor contract." },
  { area: "cross_sheet", intro: "Read two sheets against each other and flag where they disagree." },
];

export default async function RulesPage() {
  const db = await createClient();
  const exceptions = await loadExceptions(db);
  const { rules: source, shared, file } = readRuleSource();

  return (
    <>
      <PageHeader
        title="Rules"
        subtitle={`${RULES.length} rules raise every item in the inbox. Each one is a plain check written in code. No AI decides what gets flagged. Below is each rule in plain words, then the exact code that runs.`}
      />
      <div className="flex flex-col gap-8 px-4 pb-10 md:px-8">
        <nav className="flex flex-wrap gap-2" aria-label="Rule groups">
          {AREAS.map(({ area }) => {
            const Icon = AREA_ICON[area];
            return (
              <a key={area} href={`#${area}`} className="chip hover:border-accent">
                <Icon weight="duotone" className="size-4 text-indigo" />
                {AREA_LABEL[area]} <span className="text-muted">{RULES.filter((r) => r.area === area).length}</span>
              </a>
            );
          })}
        </nav>

        <details className="card p-5">
          <summary className="cursor-pointer text-sm font-semibold">Shared definitions the rules use</summary>
          <p className="mt-2 text-sm text-muted">
            &quot;Today&quot; is fixed at Oct 16, 2026 and takeover is Dec 1, 2026. A unit counts as occupied when its status is occupied or notice.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-panel2 p-4 text-xs leading-relaxed"><code>{shared}</code></pre>
        </details>

        {AREAS.map(({ area, intro }) => (
          <section key={area} id={area} className="scroll-mt-20">
            <h2 className="display text-xl font-semibold">{AREA_LABEL[area]}</h2>
            <p className="mt-1 text-sm text-muted">{intro}</p>
            <div className="mt-4 grid grid-cols-1 gap-4">
              {RULES.filter((r) => r.area === area).map((r) => {
                const mine = exceptions.filter((e) => e.rule_key === r.key);
                const open = mine.filter((e) => e.status === "open").length;
                const src = source[r.key];
                return (
                  <article key={r.key} id={r.key} className="card scroll-mt-20 p-5 md:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold">{r.label}</h3>
                        <p className="mt-0.5 font-mono text-xs text-muted">{r.key}</p>
                      </div>
                      <Link href={`/inbox?status=all&rule=${r.key}`} className="chip whitespace-nowrap" title="Open and closed items this rule raised">
                        <b className="tabular-nums">{open}</b> open
                        <span className="text-muted">· {mine.length - open} closed</span>
                      </Link>
                    </div>
                    <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-[8rem_minmax(0,1fr)]">
                      <dt className="text-muted">What it checks</dt>
                      <dd>{r.plain}</dd>
                      <dt className="text-muted">Why it matters</dt>
                      <dd>{r.why}</dd>
                      <dt className="text-muted">Severity</dt>
                      <dd>{r.severity}</dd>
                    </dl>
                    {src && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-accent-strong">
                          Show the code ({file}, line {src.line})
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded-xl bg-panel2 p-4 text-xs leading-relaxed"><code>{src.code}</code></pre>
                      </details>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
