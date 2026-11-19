import { describe, expect, it } from "vitest";
import { buildSeed } from "../data/datapack";
import type { Dataset } from "../data/types";
import { noticeDeadline, runRules } from "./index";

function dataset(): Dataset {
  const seed = buildSeed();
  return {
    properties: seed.properties,
    units: seed.units.map((u, i) => ({ ...u, id: i + 1, review_status: "unreviewed", review_note: null })),
    tasks: seed.tasks.map((t, i) => ({ ...t, id: i + 1 })),
    contracts: seed.contracts.map((c, i) => ({ ...c, id: i + 1, decision: null, decision_reason: null })),
  };
}

const count = (data: Dataset) => {
  const counts: Record<string, number> = {};
  for (const e of runRules(data)) counts[e.rule_key] = (counts[e.rule_key] ?? 0) + 1;
  return counts;
};

describe("rules on the data pack", () => {
  const data = dataset();
  const counts = count(data);

  // Counts from the first profiling pass of the workbook, done independently in Python.
  it.each([
    ["rr.no_resident", 10],
    ["rr.zero_rent", 5],
    ["rr.dates_reversed", 4],
    ["rr.duplicate_unit", 3],
    ["rr.zero_sqft", 2],
    ["rr.below_market", 6],
    ["rr.missing", 6],
    ["rr.month_to_month", 3],
    ["task.blocked", 4],
    ["task.unassigned", 4],
    ["vendor.notice_missed", 6],
    ["vendor.coi_expired", 3],
    ["vendor.duplicate_service", 2],
    ["cross.contracts_exist", 1],
  ])("%s fires %i times", (rule, want) => expect(counts[rule]).toBe(want));

  it("counts 24 stale tasks, 4 of which surface as blocked instead", () => {
    expect(counts["task.stale"]).toBe(20);
  });

  it("has no overdue tasks on Oct 16", () => {
    expect(counts["task.overdue"]).toBeUndefined();
  });

  it("gives every exception a unique fingerprint and a source or a property", () => {
    const all = runRules(data);
    expect(new Set(all.map((e) => e.fingerprint)).size).toBe(all.length);
    expect(all.filter((e) => e.sources.length === 0 && e.property_id === null)).toHaveLength(0);
  });

  it("flags the Thanksgiving weekend deadlines with the earlier real date", () => {
    const ledgers = runRules(data).find(
      (e) => e.rule_key === "task.non_business_due" && e.title.includes("Migrate resident ledgers"),
    )!;
    expect(ledgers.due_date).toBe("2026-11-25");
    expect(ledgers.sources).toHaveLength(8); // one property already finished it
  });
});

describe("rules react to edits", () => {
  it("clears a blocked-task exception once the task is unblocked", () => {
    const data = dataset();
    const before = count(data)["task.blocked"];
    data.tasks.find((t) => t.status === "Blocked")!.status = "In Progress";
    expect(count(data)["task.blocked"]).toBe(before - 1);
  });

  it("clears a duplicate-service exception when one contract is removed", () => {
    const data = dataset();
    const dup = runRules(data).find((e) => e.rule_key === "vendor.duplicate_service")!;
    data.contracts = data.contracts.filter((c) => c.id !== dup.sources[0].id);
    expect(count(data)["vendor.duplicate_service"]).toBe(1);
  });

  it("computes the notice deadline from term end and notice days", () => {
    const c = dataset().contracts.find((x) => x.contract_id === "VC-5002")!;
    expect(noticeDeadline(c)).toBe("2026-08-07");
  });
});
