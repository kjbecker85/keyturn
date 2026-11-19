import type { ExceptionRow, SourceRef } from "./data/types";

// Property-level roll-ups cite a few example rows. Those rows are not
// themselves wrong, so they don't count as row flags.
export const ROLLUP_RULES = ["rr.month_to_month", "rr.delinquency"];

export type Flag = { id: number; title: string; severity: number };

/** Open exceptions grouped by the record they point at. */
export function flagsFor(exceptions: ExceptionRow[], table: SourceRef["table"]): Record<number, Flag[]> {
  const out: Record<number, Flag[]> = {};
  for (const e of exceptions) {
    if (e.status !== "open" || ROLLUP_RULES.includes(e.rule_key)) continue;
    for (const s of e.sources) {
      if (s.table !== table) continue;
      (out[s.id] ??= []).push({ id: e.id, title: e.title, severity: e.severity });
    }
  }
  return out;
}
