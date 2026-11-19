"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { AREA_LABEL } from "@/lib/data/types";
import type { Flag } from "@/lib/flags";
import { LEVEL_COLOR, LEVEL_LABEL, type Readiness } from "@/lib/readiness";
import { SeverityDot } from "./ui";

export function PropertyExplorer({ rows, top }: { rows: Readiness[]; top: Record<number, Flag[]> }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef(new Map<number, HTMLButtonElement>());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = rows.find((r) => r.property.id === selectedId) ?? null;

  useEffect(() => {
    if (!container.current) return;
    // The worker is copied into /public at build time (see package.json).
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
    const m = new maplibregl.Map({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/fiord",
      bounds: [[-99.4, 28.9], [-96.1, 33.4]],
      fitBoundsOptions: { padding: 40 },
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.current = m;
    const created = markers.current;
    for (const r of rows) {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", `${r.property.name}, ${LEVEL_LABEL[r.level]}, readiness ${r.score}`);
      el.className = "keyturn-pin";
      el.style.background = LEVEL_COLOR[r.level];
      el.textContent = String(r.score);
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
    // The map is built once. Scores refresh through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    for (const r of rows) {
      const el = markers.current.get(r.property.id);
      if (!el) continue;
      el.style.background = LEVEL_COLOR[r.level];
      el.textContent = String(r.score);
      el.dataset.selected = String(r.property.id === selectedId);
    }
    if (selected) {
      map.current?.flyTo({ center: [selected.property.lng, selected.property.lat], zoom: 9.5, duration: 700 });
    }
  }, [rows, selectedId, selected]);

  return (
    <div className="flex h-[calc(100dvh-45px-3.25rem)] flex-col md:h-[calc(100dvh-45px)] lg:flex-row">
      <div className="relative min-h-[38dvh] flex-1">
        <div className="absolute inset-0">
          <div ref={container} className="h-full w-full" />
        </div>
        <p className="pointer-events-none absolute left-2 top-2 max-w-[70%] rounded bg-background/80 px-2 py-1 text-xs text-muted">
          Pin locations are invented points within each city. The data pack has no addresses.
        </p>
      </div>
      <aside className="w-full overflow-y-auto border-t border-line lg:w-[26rem] lg:border-l lg:border-t-0">
        {selected ? (
          <Panel r={selected} flags={top[selected.property.id] ?? []} onClose={() => setSelectedId(null)} />
        ) : (
          <ul>
            <li className="px-4 py-3 text-sm text-muted">
              Day-one readiness for the nine incoming properties. Select a pin or a row.
            </li>
            {[...rows].sort((a, b) => a.score - b.score).map((r) => (
              <li key={r.property.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(r.property.id)}
                  className="flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left hover:bg-panel"
                >
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-background"
                    style={{ background: LEVEL_COLOR[r.level] }}
                  >
                    {r.score}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm">{r.property.name}</span>
                    <span className="block text-xs text-muted">
                      {r.property.market} · {r.open} open · {r.critical} critical
                    </span>
                  </span>
                  <span className="text-xs text-muted">{LEVEL_LABEL[r.level]}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

function Panel({ r, flags, onClose }: { r: Readiness; flags: Flag[]; onClose: () => void }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <button type="button" onClick={onClose} className="self-start text-sm text-muted hover:text-foreground">
        ← All properties
      </button>
      <div className="flex items-center gap-3">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-full text-xl font-semibold text-background"
          style={{ background: LEVEL_COLOR[r.level] }}
        >
          {r.score}
        </span>
        <div>
          <h2 className="text-lg font-semibold leading-tight">{r.property.name}</h2>
          <p className="text-sm text-muted">
            {r.property.market} · {LEVEL_LABEL[r.level]}
          </p>
        </div>
      </div>
      <ReadinessBreakdown r={r} />
      {flags.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Top open exceptions</h3>
          <ul className="mt-1.5 space-y-1.5">
            {flags.map((f) => (
              <li key={f.id} className="flex gap-2 text-sm">
                <SeverityDot severity={f.severity} />
                {f.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Link className="btn btn-primary" href={`/properties/${r.property.id}`}>
          Open property
        </Link>
        <Link className="btn" href={`/?property=${r.property.id}`}>
          Its exceptions
        </Link>
      </div>
    </div>
  );
}

export function ReadinessBreakdown({ r }: { r: Readiness }) {
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted">How the score is built</h3>
      <p className="mt-1 text-sm text-muted">
        Starts at 100. Each open exception costs points by severity (Critical 10, High 5, Medium 2, Low 0.5), capped per area.
      </p>
      <ul className="mt-2 space-y-1.5 text-sm">
        {r.components.map((c) => (
          <li key={c.area}>
            <span className="flex justify-between">
              <span>
                {AREA_LABEL[c.area]} <span className="text-muted">({c.count} open)</span>
              </span>
              <span className="tabular-nums">
                −{c.points} <span className="text-muted">of {c.cap}</span>
              </span>
            </span>
            <span className="mt-1 block h-1.5 rounded-full bg-line">
              <span className="block h-full rounded-full bg-sev2" style={{ width: `${(c.points / c.cap) * 100}%` }} />
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-sm">
        Critical-path tasks complete: {r.criticalDone} of {r.criticalTotal}
      </p>
    </div>
  );
}
