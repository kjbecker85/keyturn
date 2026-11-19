// Everything the overview screen draws, computed from the same rows as the
// rest of the app. No stored aggregates, so the charts can't drift from the data.
import { addDays, daysBetween, isBusinessDay, TAKEOVER, TODAY } from "./dates";
import type { Area, Dataset, ExceptionRow } from "./data/types";
import { ROLLUP_RULES } from "./flags";
import { readiness, type Readiness } from "./readiness";
import { BELOW_MARKET_PCT, noticeDeadline } from "./rules";

export const RUNWAY_START = "2026-10-12";
export const RUNWAY_END = "2026-12-06";

export type RunwayEvent = {
  key: string;
  lane: number;
  date: string;
  /** Before the chart window. Drawn in the "already missed" gutter. */
  missed: boolean;
  kind: "task" | "notice" | "term" | "coi";
  tone: "done" | "active" | "idle" | "blocked" | "warn" | "bad";
  title: string;
  detail: string;
  href: string;
};

export type Dashboard = {
  rows: Readiness[];
  portfolio: number;
  levels: Record<Readiness["level"], number>;
  open: number;
  bySeverity: number[];
  mix: { area: Area; severities: number[] }[];
  functions: string[];
  heat: { propertyId: number; name: string; cells: { fn: string; done: number; total: number; blocked: number }[] }[];
  runway: RunwayEvent[];
  tasks: { total: number; done: number; critical: number; criticalDone: number; weeks: { label: string; due: number; done: number }[] };
  contracts: { flagged: number; decided: number; total: number };
  rentRoll: { flagged: number; reviewed: number; units: number; received: number };
  money: {
    lockIn: { monthly: number; count: number };
    duplicates: { monthly: number; count: number };
    rentGap: { monthly: number; count: number };
    balances: { total: number; count: number };
  };
  focus: ExceptionRow[];
};

export function buildDashboard(data: Dataset, exceptions: ExceptionRow[]): Dashboard {
  const rows = readiness(data.properties, data.tasks, exceptions);
  const open = exceptions.filter((e) => e.status === "open");
  const lane = new Map(data.properties.map((p, i) => [p.id, i]));
  const areas: Area[] = ["checklist", "vendors", "rent_roll", "cross_sheet"];
  const functions = [...new Set(data.tasks.map((t) => t.function))].sort();

  // --- Runway: every dated thing between now and day one, by property ---
  const runway: RunwayEvent[] = [];
  for (const t of data.tasks) {
    runway.push({
      key: `t${t.id}`,
      lane: lane.get(t.property_id)!,
      date: t.due_date,
      missed: false,
      kind: "task",
      tone: t.status === "Complete" ? "done" : t.status === "Blocked" ? "blocked" : t.status === "In Progress" ? "active" : "idle",
      title: t.task,
      detail: `${t.status} · ${t.assignee ?? "Unassigned"}${t.critical_path ? " · critical path" : ""}${isBusinessDay(t.due_date) ? "" : " · due on a non-business day"}`,
      href: `/tasks?focus=${t.id}`,
    });
  }
  for (const c of data.contracts) {
    const deadline = noticeDeadline(c);
    const href = `/vendors?focus=${c.id}`;
    const label = `${c.vendor} · ${c.service}`;
    if (c.auto_renew && c.term_end >= TODAY && c.term_end <= RUNWAY_END) {
      const missed = deadline < TODAY;
      runway.push({
        key: `n${c.id}`,
        lane: lane.get(c.property_id)!,
        date: deadline,
        missed: deadline < RUNWAY_START,
        kind: "notice",
        tone: missed ? "bad" : "warn",
        title: missed ? `Notice window missed: ${label}` : `Notice deadline: ${label}`,
        detail: `${c.contract_id} needs ${c.notice_days} days' notice before ${c.term_end}`,
        href,
      });
      runway.push({
        key: `r${c.id}`,
        lane: lane.get(c.property_id)!,
        date: c.term_end,
        missed: false,
        kind: "term",
        tone: "warn",
        title: `Auto-renews: ${label}`,
        detail: `${c.contract_id} renews for another term on this date`,
        href,
      });
    } else if (c.auto_renew && deadline >= TODAY && deadline <= RUNWAY_END) {
      runway.push({
        key: `n${c.id}`,
        lane: lane.get(c.property_id)!,
        date: deadline,
        missed: false,
        kind: "notice",
        tone: "warn",
        title: `Notice deadline: ${label}`,
        detail: `${c.contract_id} auto-renews on ${c.term_end} unless notice is given by this date`,
        href,
      });
    }
    if (!c.auto_renew && c.term_end >= TODAY && c.term_end < TAKEOVER) {
      runway.push({
        key: `l${c.id}`,
        lane: lane.get(c.property_id)!,
        date: c.term_end,
        missed: false,
        kind: "term",
        tone: "bad",
        title: `Service lapses: ${label}`,
        detail: `${c.contract_id} ends before takeover with no auto-renew`,
        href,
      });
    }
    if (c.coi_expiration < TODAY) {
      runway.push({
        key: `c${c.id}`,
        lane: lane.get(c.property_id)!,
        date: c.coi_expiration,
        missed: true,
        kind: "coi",
        tone: "bad",
        title: `Insurance certificate expired: ${c.vendor}`,
        detail: `${c.contract_id} certificate expired ${daysBetween(c.coi_expiration, TODAY)} days ago`,
        href,
      });
    }
  }

  // --- Tasks by week ---
  const weeks: Dashboard["tasks"]["weeks"] = [];
  for (let start = "2026-10-26"; start <= "2026-11-30"; start = addDays(start, 7)) {
    const end = addDays(start, 6);
    const due = data.tasks.filter((t) => t.due_date >= start && t.due_date <= end);
    weeks.push({
      label: new Date(`${start}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      due: due.length,
      done: due.filter((t) => t.status === "Complete").length,
    });
  }
  const critical = data.tasks.filter((t) => t.critical_path);

  // --- Decisions and reviews still owed ---
  const flaggedContracts = new Set<number>();
  const flaggedUnits = new Set<number>();
  for (const e of open) {
    if (ROLLUP_RULES.includes(e.rule_key) || e.rule_key === "vendor.not_assignable") continue;
    for (const s of e.sources) {
      if (s.table === "vendor_contracts") flaggedContracts.add(s.id);
      if (s.table === "rent_roll_units") flaggedUnits.add(s.id);
    }
  }

  // --- Money ---
  const lockIn = data.contracts.filter((c) => c.auto_renew && noticeDeadline(c) < TODAY && c.term_end >= TODAY);
  const byService = new Map<string, number[]>();
  for (const c of data.contracts) {
    const k = `${c.property_id}:${c.service}`;
    byService.set(k, [...(byService.get(k) ?? []), c.monthly_cost]);
  }
  const duplicateGroups = [...byService.values()].filter((costs) => costs.length > 1);
  const occupied = data.units.filter((u) => u.status === "occupied" || u.status === "notice");
  const gapUnits = occupied.filter(
    (u) => u.market_rent && u.lease_rent !== null && (u.market_rent - u.lease_rent) / u.market_rent > BELOW_MARKET_PCT,
  );
  const owing = data.units.filter((u) => (u.balance ?? 0) > 0);

  return {
    rows,
    portfolio: Math.round(rows.reduce((sum, r) => sum + r.score, 0) / rows.length),
    levels: {
      on_track: rows.filter((r) => r.level === "on_track").length,
      at_risk: rows.filter((r) => r.level === "at_risk").length,
      off_track: rows.filter((r) => r.level === "off_track").length,
    },
    open: open.length,
    bySeverity: [1, 2, 3, 4].map((s) => open.filter((e) => e.severity === s).length),
    mix: areas.map((area) => ({
      area,
      severities: [1, 2, 3, 4].map((s) => open.filter((e) => e.area === area && e.severity === s).length),
    })),
    functions,
    heat: data.properties.map((p) => ({
      propertyId: p.id,
      name: p.name,
      cells: functions.map((fn) => {
        const mine = data.tasks.filter((t) => t.property_id === p.id && t.function === fn);
        return {
          fn,
          total: mine.length,
          done: mine.filter((t) => t.status === "Complete").length,
          blocked: mine.filter((t) => t.status === "Blocked").length,
        };
      }),
    })),
    runway,
    tasks: {
      total: data.tasks.length,
      done: data.tasks.filter((t) => t.status === "Complete").length,
      critical: critical.length,
      criticalDone: critical.filter((t) => t.status === "Complete").length,
      weeks,
    },
    contracts: {
      flagged: flaggedContracts.size,
      decided: data.contracts.filter((c) => flaggedContracts.has(c.id) && c.decision).length,
      total: data.contracts.length,
    },
    rentRoll: {
      flagged: flaggedUnits.size,
      reviewed: data.units.filter((u) => flaggedUnits.has(u.id) && u.review_status !== "unreviewed").length,
      units: data.units.length,
      received: data.properties.filter((p) => p.rent_roll_received).length,
    },
    money: {
      lockIn: { monthly: lockIn.reduce((s, c) => s + c.monthly_cost, 0), count: lockIn.length },
      duplicates: {
        monthly: duplicateGroups.reduce((s, costs) => s + Math.min(...costs), 0),
        count: duplicateGroups.length,
      },
      rentGap: {
        monthly: Math.round(gapUnits.reduce((s, u) => s + ((u.market_rent ?? 0) - (u.lease_rent ?? 0)), 0)),
        count: gapUnits.length,
      },
      balances: { total: Math.round(owing.reduce((s, u) => s + (u.balance ?? 0), 0)), count: owing.length },
    },
    focus: open.filter((e) => e.severity === 1).slice(0, 6),
  };
}

/** An exception title without its leading property name, since the screen already says which property. */
export function shortTitle(title: string, property: string) {
  const rest = title.replace(`${property}: `, "");
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

/** The next dated thing a property has to get past, and what is blocking it. */
export function nextUp(propertyId: number, data: Dataset, exceptions: ExceptionRow[]) {
  const tasks = data.tasks
    .filter((t) => t.property_id === propertyId && t.status !== "Complete")
    .sort((a, b) => a.due_date.localeCompare(b.due_date));
  const blocker = exceptions.find((e) => e.status === "open" && e.property_id === propertyId);
  return { next: tasks[0] ?? null, blocker: blocker ?? null };
}
