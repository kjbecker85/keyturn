"use client";

import { ResponsiveSunburst } from "@nivo/sunburst";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AREA_ICON } from "@/components/icons";
import { token, useTheme } from "@/components/prefs";
import type { Dashboard } from "@/lib/dashboard";
import { AREA_LABEL, SEVERITY_LABEL, type Area } from "@/lib/data/types";

type Node = { name: string; color: string; value?: number; href?: string; children?: Node[] };

const AREA_TOKEN: Record<Area, string> = {
  checklist: "--indigo",
  vendors: "--accent",
  rent_roll: "--area-sky",
  cross_sheet: "--area-violet",
};
// Two extra cool hues so the four areas read apart without borrowing severity colors.
const FIXED: Record<string, string> = { "--area-sky": "#2f9bd8", "--area-violet": "#9a6cf0" };
const color = (name: string) => FIXED[name] ?? token(name);

/** Open exceptions by area (inner ring) and severity (outer ring). Click a slice to open it in the inbox. */
export function ExceptionMix({ mix, open }: Pick<Dashboard, "mix" | "open">) {
  const router = useRouter();
  const theme = useTheme();
  // Colors are read from the page's CSS, so the chart draws on the client only.
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const data: Node = {
    name: "open",
    color: "transparent",
    children: ready
      ? mix
          .filter((m) => m.severities.some(Boolean))
          .map((m) => ({
            name: AREA_LABEL[m.area],
            color: color(AREA_TOKEN[m.area]),
            href: `/inbox?area=${m.area}`,
            children: m.severities
              .map((count, i) => ({
                name: `${AREA_LABEL[m.area]} · ${SEVERITY_LABEL[i + 1]}`,
                color: token(`--sev${i + 1}`),
                value: count,
                href: `/inbox?area=${m.area}&severity=${i + 1}`,
              }))
              .filter((n) => n.value > 0),
          }))
      : [],
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative mx-auto aspect-square w-full max-w-64">
        {ready && (
          <ResponsiveSunburst<Node>
            key={theme}
            data={data}
            id="name"
            value="value"
            cornerRadius={6}
            borderWidth={3}
            borderColor={token("--panel")}
            colors={(node) => node.data.color}
            inheritColorFromParent={false}
            enableArcLabels
            arcLabel={(node) => String(node.value)}
            arcLabelsSkipAngle={20}
            arcLabelsTextColor="#ffffff"
            theme={{ labels: { text: { fontSize: 12, fontWeight: 600 } } }}
            onClick={(node) => node.data.href && router.push(node.data.href)}
            tooltip={(node) => (
              <div className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium whitespace-nowrap text-background shadow-pop">
                {node.id}: {node.value}
              </div>
            )}
            motionConfig="gentle"
          />
        )}
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="display text-4xl leading-none font-semibold">{open}</p>
            <p className="mt-1 text-xs text-muted">open</p>
          </div>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-1.5">
        {mix.map((m) => {
          const Icon = AREA_ICON[m.area];
          const total = m.severities.reduce((a, b) => a + b, 0);
          return (
            <li key={m.area}>
              <Link
                href={`/inbox?area=${m.area}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition hover:bg-panel2"
              >
                <span
                  className="grid size-8 place-items-center rounded-lg text-white"
                  style={{ background: FIXED[AREA_TOKEN[m.area]] ?? `var(${AREA_TOKEN[m.area]})` }}
                >
                  <Icon weight="duotone" className="size-4.5" />
                </span>
                <span className="flex-1 font-medium">{AREA_LABEL[m.area]}</span>
                <span className="display font-semibold">{total}</span>
              </Link>
            </li>
          );
        })}
        <li className="col-span-2 mt-1 flex flex-wrap gap-x-3 gap-y-1 px-3 text-xs text-muted">
          {[1, 2, 3, 4].map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: `var(--sev${s})` }} />
              {SEVERITY_LABEL[s]}
            </span>
          ))}
        </li>
      </ul>
    </div>
  );
}
