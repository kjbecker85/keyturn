import Link from "next/link";
import { CountUp } from "@/components/count-up";
import { formatDate, TAKEOVER, TODAY, daysBetween } from "@/lib/dates";
import type { Dashboard } from "@/lib/dashboard";
import { LEVEL_COLOR, LEVEL_LABEL, type Readiness } from "@/lib/readiness";

const C = 170;
const polar = (r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(rad), C + r * Math.sin(rad)] as const;
};
const arc = (r: number, from: number, to: number) => {
  const [x0, y0] = polar(r, from);
  const [x1, y1] = polar(r, to);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};
const initials = (name: string) =>
  name
    .replace(/^The /, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** The countdown: portfolio readiness in the middle, one outer arc per property. */
export function Hero({ dash }: { dash: Dashboard }) {
  const days = daysBetween(TODAY, TAKEOVER);
  const slice = 360 / dash.rows.length;
  const gap = 6;

  return (
    <section className="card rise relative overflow-hidden p-5 md:p-7">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full opacity-60 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent-soft), transparent 70%)" }}
      />
      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:gap-8 xl:gap-5 2xl:gap-8">
        <svg viewBox="0 0 340 340" className="w-60 shrink-0 xl:w-48 2xl:w-72" role="img" aria-label={`Portfolio readiness ${dash.portfolio} out of 100`}>
          <defs>
            <linearGradient id="hero-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" style={{ stopColor: "var(--accent-bright)" }} />
              <stop offset="100%" style={{ stopColor: "var(--indigo)" }} />
            </linearGradient>
          </defs>
          <circle cx={C} cy={C} r={96} fill="none" stroke="var(--panel2)" strokeWidth={16} />
          <path
            d={arc(96, 0, Math.max(1, (dash.portfolio / 100) * 359.9))}
            fill="none"
            stroke="url(#hero-grad)"
            strokeWidth={16}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            className="sweep"
            style={{ "--from": 100 } as React.CSSProperties}
          />
          {dash.rows.map((r, i) => {
            const from = i * slice + gap / 2;
            const to = (i + 1) * slice - gap / 2;
            const [lx, ly] = polar(156, (from + to) / 2);
            return (
              <Link key={r.property.id} href={`/properties/${r.property.id}`}>
                <title>{`${r.property.name}: ${r.score}, ${LEVEL_LABEL[r.level]}`}</title>
                <path d={arc(132, from, to)} fill="none" stroke="var(--panel2)" strokeWidth={11} strokeLinecap="round" />
                <path
                  d={arc(132, from, from + Math.max(2, ((to - from) * r.score) / 100))}
                  fill="none"
                  stroke={LEVEL_COLOR[r.level]}
                  strokeWidth={11}
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray={100}
                  className="sweep"
                  style={{ "--from": 100, "--i": i } as React.CSSProperties}
                />
                <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" className="fill-faint text-[10px] font-semibold">
                  {initials(r.property.name)}
                </text>
              </Link>
            );
          })}
          <text x={C} y={C - 6} textAnchor="middle" dominantBaseline="central" className="display fill-foreground text-[64px] font-semibold">
            {dash.portfolio}
          </text>
          <text x={C} y={C + 38} textAnchor="middle" className="fill-muted text-[12px] font-medium">
            portfolio readiness
          </text>
        </svg>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="eyebrow">Takeover {formatDate(TAKEOVER)}</p>
          <p className="display mt-1 text-7xl leading-none font-semibold md:text-8xl xl:text-7xl 2xl:text-8xl">
            <CountUp value={days} />
          </p>
          <p className="mt-2 text-lg font-medium whitespace-nowrap xl:text-base 2xl:text-lg">days to Day One</p>
          <p className="mt-1 text-sm text-muted">
            Each outer arc is one of the nine properties.
          </p>
          <ul className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
            {(Object.keys(LEVEL_LABEL) as Readiness["level"][]).map((level) => (
              <li key={level} className="chip">
                <span className="size-2.5 rounded-full" style={{ background: LEVEL_COLOR[level] }} />
                <span className="font-semibold text-foreground">{dash.levels[level]}</span>
                {LEVEL_LABEL[level].toLowerCase()}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
