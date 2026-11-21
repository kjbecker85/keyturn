import { describe, expect, it } from "vitest";
import { buildSeed } from "./data/datapack";
import type { Dataset } from "./data/types";
import { caseFacts, computeCase, DEFAULT_INPUTS, irr } from "./business-case";

function dataset(): Dataset {
  const seed = buildSeed();
  return {
    properties: seed.properties,
    units: seed.units.map((u, i) => ({ ...u, id: i + 1, review_status: "unreviewed", review_note: null })),
    tasks: seed.tasks.map((t, i) => ({ ...t, id: i + 1 })),
    contracts: seed.contracts.map((c, i) => ({ ...c, id: i + 1, decision: null, decision_reason: null })),
  };
}

describe("business case", () => {
  const facts = caseFacts(dataset());

  it("reads the data pack facts", () => {
    expect(facts.lockedIn).toEqual({ monthly: 10178, count: 6, revenueShare: 2 });
    // The dashboard's $13,872 gap splits into paying leases and $0-rent units.
    expect(facts.rentGap.monthly + facts.zeroRent.monthly).toBe(13872);
    expect(facts.rentGap.count + facts.zeroRent.count).toBe(11);
    expect(facts.balances).toEqual({ total: 73207, count: 61 });
    expect(facts.duplicates.count).toBe(2);
    expect(facts.rentRollsReceived).toBe(3);
  });

  it("matches a hand calculation", () => {
    const c = computeCase(facts, DEFAULT_INPUTS);
    const contractMonthly = facts.openNotice.monthly * 0.15 + facts.duplicates.monthly;
    expect(c.owner.contracts).toBeCloseTo(contractMonthly * 12);
    expect(c.owner.rent).toBeCloseTo(facts.rentGap.monthly * 0.5 * 6);
    expect(c.owner.collections).toBeCloseTo(73207 * 0.2);
    expect(c.asset.labor).toBe(20 * 12 * 65);
    expect(c.runCost).toBe(9600);
    expect(c.roi.ratio).toBeCloseTo((c.owner.total + c.asset.labor + c.asset.retention - 39600) / 39600);
    // NPV at the break-even volume is zero.
    const atBreakEven = computeCase(facts, { ...DEFAULT_INPUTS, transitionsPerYear: c.finance.breakEven! });
    expect(atBreakEven.finance.npv).toBeCloseTo(0, 6);
  });

  it("finds an IRR", () => {
    expect(irr([-100, 110])).toBeCloseTo(0.1, 6);
    expect(irr([100, 100])).toBeNull();
  });
});
