"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { AREA_LABEL } from "@/lib/data/types";
import type { Flag } from "@/lib/flags";
import { LEVEL_COLOR, LEVEL_INK, LEVEL_LABEL, LEVEL_SOFT, type Readiness } from "@/lib/readiness";
import { AREA_ICON, ArrowRight } from "./icons";
import { useTheme } from "./prefs";
import { ReadinessRing } from "./readiness-ring";
import { SeverityMark } from "./ui";

const STYLE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/fiord",
};

/** A map pin drawn as a small readiness ring with the score inside. */
function pinMarkup(r: Readiness) {
  const c = 2 * Math.PI * 16;
  return `<svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
    <circle cx="22" cy="22" r="21" fill="var(--panel)"/>
    <circle cx="22" cy="22" r="16" fill="none" stroke="var(--panel2)" stroke-width="5"/>
    <circle cx="22" cy="22" r="16" fill="none" stroke="${LEVEL_COLOR[r.level]}" stroke-width="5" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - r.score / 100)}" transform="rotate(-90 22 22)"/>
    <text x="22" y="22.5" text-anchor="middle" dominant-baseline="central"
      style="font: 600 13px var(--font-display), sans-serif; fill: var(--foreground)">${r.score}</text>
  </svg>`;
}

export function PropertyExplorer({ rows, top }: { rows: Readiness[]; top: Record<number, Flag[]> }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<number, HTMLButtonElement>());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = rows.find((r) => r.property.id === selectedId) ?? null;
  const theme = useTheme();
  const firstTheme = useRef(theme);

  useEffect(() => {
    if (!container.current) return;
    // The worker is copied into /public at build time (see package.json).
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
    const m = new maplibregl.Map({
      container: container.current,
      style: STYLE[firstTheme.current],
      bounds: [
        [-99.4, 28.9],
        [-96.1, 33.4],
      ],
      fitBoundsOptions: { padding: 56 },
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current = m;
    const created = markers.current;
    for (const r of rows) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "keyturn-pin";
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelectedId(r.property.id);
      });
      created.set(r.property.id, el);
      new maplibregl.Marker({ element: el }).setLngLat([r.property.lng, r.property.lat]).addTo(m);
    }
    return () => {
      created.clear();
      m.remove();
    };
    // The map is built once. Scores and theme refresh through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (theme !== firstTheme.current) {
      firstTheme.current = theme;
      map.current?.setStyle(STYLE[theme]);
    }
  }, [theme]);

  useEffect(() => {
    for (const r of rows) {
      const el = markers.current.get(r.property.id);
      if (!el) continue;
      el.innerHTML = pinMarkup(r);
      el.setAttribute("aria-label", `${r.property.name}, ${LEVEL_LABEL[r.level]}, readiness ${r.score}`);
      el.dataset.selected = String(r.property.id === selectedId);
    }
    if (selected) {
      map.current?.flyTo({ center: [selected.property.lng, selected.property.lat], zoom: 9.5, duration: 900 });
    }
  }, [rows, selectedId, selected]);

  return (
    <div className="flex h-[calc(100dvh-var(--header-h)-4.2rem)] flex-col md:h-[calc(100dvh-var(--header-h))] lg:flex-row">
      <div className="relative min-h-[40dvh] flex-1">
        <div className="absolute inset-0">
          <div ref={container} className="h-full w-full" />
        </div>
        <p className="pointer-events-none absolute top-3 left-3 max-w-[70%] rounded-xl bg-panel/90 px-3 py-1.5 text-xs text-muted shadow-card backdrop-blur">
          Pin locations are invented points within each city. The data pack has no addresses.
        </p>
      </div>
      <aside className="w-full overflow-y-auto border-t border-line bg-panel lg:w-[28rem] lg:border-t-0 lg:border-l">
        {selected ? (
          <Panel r={selected} flags={top[selected.property.id] ?? []} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="p-3">
            <div className="px-3 pt-3 pb-2">
              <h1 className="display text-xl font-semibold">Properties</h1>
              <p className="mt-1 text-sm text-muted">Day-one readiness for the nine incoming properties. Select a pin or a row.</p>
            </div>
            <ul>
              {[...rows]
                .sort((a, b) => a.score - b.score)
                .map((r) => (
                  <li key={r.property.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.property.id)}
                      className="flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-panel2"
                    >
                      <ReadinessRing score={r.score} level={r.level} size={46} stroke={5} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{r.property.name}</span>
                        <span className="block text-xs text-muted">
                          {r.property.market} · {r.open} open · {r.critical} critical
                        </span>
                      </span>
                      <LevelTag level={r.level} />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

export function LevelTag({ level }: { level: Readiness["level"] }) {
  return (
    <span
      className="rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
      style={{ background: LEVEL_SOFT[level], color: LEVEL_INK[level] }}
    >
      {LEVEL_LABEL[level]}
    </span>
  );
}

function Panel({ r, flags, onClose }: { r: Readiness; flags: Flag[]; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-6 p-5 md:p-6">
      <button type="button" onClick={onClose} className="btn btn-quiet self-start">
        ← All properties
      </button>
      <div className="flex items-center gap-4">
        <ReadinessRing score={r.score} level={r.level} size={76} stroke={8} />
        <div>
          <h2 className="display text-xl leading-tight font-semibold">{r.property.name}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            {r.property.market}
            <LevelTag level={r.level} />
          </p>
        </div>
      </div>
      <ReadinessBreakdown r={r} />
      {flags.length > 0 && (
        <div>
          <h3 className="eyebrow">Top open exceptions</h3>
          <ul className="mt-2.5 space-y-2.5">
            {flags.map((f) => (
              <li key={f.id} className="flex gap-2.5 text-sm">
                <SeverityMark severity={f.severity} className="mt-0.5 size-4.5" />
                {f.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-primary" href={`/properties/${r.property.id}`}>
          Open property
          <ArrowRight weight="bold" className="size-4" />
        </Link>
        <Link className="btn" href={`/inbox?property=${r.property.id}`}>
          Its exceptions
        </Link>
      </div>
    </div>
  );
}

export function ReadinessBreakdown({ r }: { r: Readiness }) {
  return (
    <div>
      <h3 className="eyebrow">How the score is built</h3>
      <p className="mt-2 text-sm text-muted">
        Starts at 100. Each open exception costs points by severity (Critical 10, High 5, Medium 2, Low 0.5), capped per area.
      </p>
      <ul className="mt-3.5 space-y-3 text-sm">
        {r.components.map((c) => {
          const Icon = AREA_ICON[c.area];
          return (
            <li key={c.area}>
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 font-medium">
                  <Icon weight="duotone" className="size-4.5 text-indigo" />
                  {AREA_LABEL[c.area]}
                  <span className="font-normal text-muted">{c.count} open</span>
                </span>
                <span className="display font-semibold tabular-nums">
                  −{c.points}
                  <span className="ml-1 text-xs font-normal text-faint">of {c.cap}</span>
                </span>
              </span>
              <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-panel2">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(c.points / c.cap) * 100}%`,
                    background: c.points / c.cap > 0.75 ? "var(--sev1)" : c.points / c.cap > 0.4 ? "var(--sev2)" : "var(--sev3)",
                  }}
                />
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3.5 text-sm">
        Critical-path tasks complete:{" "}
        <span className="font-semibold">
          {r.criticalDone} of {r.criticalTotal}
        </span>
      </p>
    </div>
  );
}
