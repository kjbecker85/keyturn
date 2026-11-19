"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, daysBetween, formatDate, TAKEOVER, TODAY } from "@/lib/dates";
import { RUNWAY_END, RUNWAY_START, type RunwayEvent } from "@/lib/dashboard";
import { LEVEL_COLOR, type Readiness } from "@/lib/readiness";

const LABEL_W = 168;
const GUTTER_W = 70;
const TOP = 40;
const LANE_H = 46;
const MIN_W = 860;

const TONE: Record<RunwayEvent["tone"], { fill: string; stroke: string; opacity?: number }> = {
  done: { fill: "var(--ok)", stroke: "none", opacity: 0.35 },
  active: { fill: "var(--indigo)", stroke: "none" },
  idle: { fill: "var(--panel)", stroke: "var(--faint)" },
  blocked: { fill: "var(--sev1)", stroke: "none" },
  warn: { fill: "var(--sev2)", stroke: "none" },
  bad: { fill: "var(--sev1)", stroke: "none" },
};

function Glyph({ e, x, y }: { e: RunwayEvent; x: number; y: number }) {
  const tone = TONE[e.tone];
  const hollow = e.missed && e.kind === "notice";
  const common = {
    fill: hollow ? "var(--panel)" : tone.fill,
    stroke: hollow ? "var(--sev1)" : tone.stroke,
    strokeWidth: 1.8,
    opacity: tone.opacity,
  };
  if (e.kind === "task") return <circle cx={x} cy={y} r={4.4} {...common} />;
  if (e.kind === "notice")
    return <rect x={x - 4.2} y={y - 4.2} width={8.4} height={8.4} rx={1} transform={`rotate(45 ${x} ${y})`} {...common} />;
  if (e.kind === "term") return <rect x={x - 4.4} y={y - 4.4} width={8.8} height={8.8} rx={2} {...common} />;
  return <path d={`M ${x} ${y - 5.2} L ${x + 5.2} ${y + 4.2} L ${x - 5.2} ${y + 4.2} Z`} {...common} />;
}

/**
 * The Runway. One lane per property, time running left to right from today to
 * day one. Every due date, notice deadline and contract end is a mark.
 */
export function Runway({ events, lanes }: { events: RunwayEvent[]; lanes: Readiness[] }) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(MIN_W);
  const [active, setActive] = useState<{ e: RunwayEvent; left: number; top: number } | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(MIN_W, entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Place the tooltip under the mark, kept inside the visible part of the chart.
  const show = (e: RunwayEvent, px: number, py: number) => {
    const el = wrap.current;
    const visible = el?.clientWidth ?? width;
    const left = Math.min(Math.max(8, px - (el?.scrollLeft ?? 0) - 128), Math.max(8, visible - 264));
    setActive({ e, left, top: py + 16 });
  };

  const height = TOP + lanes.length * LANE_H + 6;
  const plotX = LABEL_W + GUTTER_W;
  const plotW = width - plotX - 16;
  const span = daysBetween(RUNWAY_START, RUNWAY_END);
  const x = (date: string) => plotX + (daysBetween(RUNWAY_START, date) / span) * plotW;
  const laneY = (lane: number) => TOP + lane * LANE_H + LANE_H / 2;

  const placed = useMemo(() => {
    const groups = new Map<string, RunwayEvent[]>();
    for (const e of events) {
      const k = e.missed ? `m${e.lane}` : `${e.lane}|${e.date}`;
      groups.set(k, [...(groups.get(k) ?? []), e]);
    }
    const out: { e: RunwayEvent; px: number; py: number }[] = [];
    for (const group of groups.values()) {
      group.forEach((e, i) => {
        if (e.missed) {
          out.push({ e, px: LABEL_W + 14 + Math.min(i, 3) * 14, py: laneY(e.lane) });
        } else {
          const step = Math.min(10, (LANE_H - 12) / group.length);
          out.push({ e, px: x(e.date), py: laneY(e.lane) + (i - (group.length - 1) / 2) * step });
        }
      });
    }
    // Draw finished tasks first so open work sits on top.
    return out.sort((a, b) => Number(b.e.tone === "done") - Number(a.e.tone === "done"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, width]);

  const mondays: string[] = [];
  for (let d = RUNWAY_START; d <= RUNWAY_END; d = addDays(d, 7)) mondays.push(d);

  return (
    <div className="relative">
      <div ref={wrap} className="overflow-x-auto">
        <svg width={width} height={height} role="img" aria-label="Timeline of every deadline from today to takeover, by property">
          {lanes.map((r, i) => (
            <g key={r.property.id}>
              {i % 2 === 0 && <rect x={0} y={TOP + i * LANE_H} width={width} height={LANE_H} rx={10} fill="var(--panel2)" opacity={0.55} />}
              <circle cx={12} cy={laneY(i)} r={4.5} fill={LEVEL_COLOR[r.level]} />
              <text x={24} y={laneY(i)} dominantBaseline="central" className="fill-foreground text-[12.5px] font-medium">
                {r.property.name.replace(/^The /, "")}
              </text>
            </g>
          ))}

          <text x={LABEL_W + GUTTER_W / 2 - 4} y={16} textAnchor="middle" className="fill-sev1-ink text-[10px] font-semibold tracking-wide uppercase">
            Missed
          </text>
          <line x1={plotX - 8} x2={plotX - 8} y1={TOP - 6} y2={height} stroke="var(--line)" strokeDasharray="3 4" />

          {mondays.map((d) => (
            <g key={d}>
              <line x1={x(d)} x2={x(d)} y1={TOP - 6} y2={height} stroke="var(--line)" />
              <text
                x={x(d) + 4}
                y={16}
                className="fill-faint text-[10.5px] font-medium"
                opacity={Math.abs(x(d) - x(TAKEOVER)) < 46 || Math.abs(x(d) - x(TODAY)) < 30 ? 0 : 1}
              >
                {new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
              </text>
            </g>
          ))}

          <rect x={x("2026-11-26")} y={TOP - 6} width={x("2026-11-30") - x("2026-11-26")} height={height - TOP + 6} fill="var(--sev3)" opacity={0.16} rx={6} />
          <text x={x("2026-11-26") - 6} y={TOP - 14} textAnchor="end" className="fill-sev3-ink text-[10px] font-semibold">
            Thanksgiving
          </text>

          <line x1={x(TODAY)} x2={x(TODAY)} y1={TOP - 10} y2={height} stroke="var(--accent)" strokeWidth={2} />
          <rect x={x(TODAY) - 21} y={TOP - 27} width={42} height={17} rx={8.5} fill="var(--accent)" />
          <text x={x(TODAY)} y={TOP - 18.5} textAnchor="middle" dominantBaseline="central" className="fill-on-accent text-[10px] font-semibold">
            Today
          </text>

          <line x1={x(TAKEOVER)} x2={x(TAKEOVER)} y1={TOP - 10} y2={height} stroke="var(--foreground)" strokeWidth={2.5} />
          <rect x={x(TAKEOVER) - 28} y={TOP - 27} width={56} height={17} rx={8.5} fill="var(--foreground)" />
          <text x={x(TAKEOVER)} y={TOP - 18.5} textAnchor="middle" dominantBaseline="central" className="fill-background text-[10px] font-semibold">
            Day One
          </text>

          {placed.map(({ e, px, py }) => (
            <a
              key={e.key}
              href={e.href}
              aria-label={`${e.title}, ${formatDate(e.date)}`}
              className="cursor-pointer outline-none"
              onClick={(ev) => {
                ev.preventDefault();
                router.push(e.href);
              }}
              onMouseEnter={() => show(e, px, py)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => show(e, px, py)}
              onBlur={() => setActive(null)}
            >
              {e.tone === "blocked" && <circle cx={px} cy={py} r={4.4} fill="var(--sev1)" className="pulse" />}
              <circle cx={px} cy={py} r={9} fill="transparent" />
              <Glyph e={e} x={px} y={py} />
              {active?.e.key === e.key && <circle cx={px} cy={py} r={9} fill="none" stroke="var(--foreground)" strokeWidth={1.5} />}
            </a>
          ))}
        </svg>
      </div>

      {active && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-64 rounded-xl bg-foreground px-3.5 py-2.5 text-background shadow-pop"
          style={{ left: active.left, top: active.top }}
        >
          <p className="text-sm leading-snug font-semibold">{active.e.title}</p>
          <p className="mt-1 text-xs opacity-75">{formatDate(active.e.date)}</p>
          <p className="mt-0.5 text-xs opacity-75">{active.e.detail}</p>
        </div>
      )}

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <svg width={14} height={14} aria-hidden="true">
              <Glyph e={item.e} x={7} y={7} />
            </svg>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

const sample = (kind: RunwayEvent["kind"], tone: RunwayEvent["tone"], missed = false): RunwayEvent => ({
  key: "",
  lane: 0,
  date: "",
  missed,
  kind,
  tone,
  title: "",
  detail: "",
  href: "",
});

const LEGEND = [
  { label: "Task not started", e: sample("task", "idle") },
  { label: "In progress", e: sample("task", "active") },
  { label: "Blocked", e: sample("task", "blocked") },
  { label: "Complete", e: sample("task", "done") },
  { label: "Notice deadline", e: sample("notice", "warn") },
  { label: "Notice missed", e: sample("notice", "bad", true) },
  { label: "Contract renews", e: sample("term", "warn") },
  { label: "Service lapses", e: sample("term", "bad") },
  { label: "Expired insurance", e: sample("coi", "bad", true) },
];
