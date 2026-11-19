// Day-one readiness per property. Plain arithmetic, no model:
// start at 100 and subtract points for each open exception, by severity,
// with a cap per area so one messy sheet can't hide everything else.
import type { Area, ExceptionRow, Property, Task } from "./data/types";

export const SEVERITY_POINTS: Record<number, number> = { 1: 10, 2: 5, 3: 2, 4: 0.5 };
export const AREA_CAP: Record<Area, number> = {
  checklist: 35,
  vendors: 25,
  rent_roll: 25,
  cross_sheet: 15,
};

export type Readiness = {
  property: Property;
  score: number;
  level: "on_track" | "at_risk" | "off_track";
  criticalDone: number;
  criticalTotal: number;
  open: number;
  critical: number;
  components: { area: Area; points: number; cap: number; count: number }[];
};

export const LEVEL_LABEL = { on_track: "On track", at_risk: "At risk", off_track: "Off track" };
// CSS color tokens, so the same level looks right in light and dark.
export const LEVEL_COLOR = { on_track: "var(--ok)", at_risk: "var(--sev3)", off_track: "var(--sev1)" };
export const LEVEL_INK = { on_track: "var(--ok-ink)", at_risk: "var(--sev3-ink)", off_track: "var(--sev1-ink)" };
export const LEVEL_SOFT = { on_track: "var(--ok-soft)", at_risk: "var(--sev3-soft)", off_track: "var(--sev1-soft)" };

export function readiness(properties: Property[], tasks: Task[], exceptions: ExceptionRow[]): Readiness[] {
  return properties.map((property) => {
    const open = exceptions.filter((e) => e.status === "open" && e.property_id === property.id);
    const components = (Object.keys(AREA_CAP) as Area[]).map((area) => {
      const mine = open.filter((e) => e.area === area);
      const raw = mine.reduce((sum, e) => sum + SEVERITY_POINTS[e.severity], 0);
      return { area, points: Math.min(raw, AREA_CAP[area]), cap: AREA_CAP[area], count: mine.length };
    });
    const score = Math.round(100 - components.reduce((sum, c) => sum + c.points, 0));
    const critical = tasks.filter((t) => t.property_id === property.id && t.critical_path);
    return {
      property,
      score,
      level: score >= 75 ? "on_track" : score >= 50 ? "at_risk" : "off_track",
      criticalDone: critical.filter((t) => t.status === "Complete").length,
      criticalTotal: critical.length,
      open: open.length,
      critical: open.filter((e) => e.severity === 1).length,
      components,
    };
  });
}
