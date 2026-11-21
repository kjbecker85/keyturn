import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { RULES } from "./catalog";
import { readRuleSource } from "./source";

describe("rule source", () => {
  it("finds the code for every rule in the catalog", () => {
    const { rules, shared } = readRuleSource();
    for (const r of RULES) {
      expect(rules[r.key]?.code, r.key).toContain(`"${r.key}"`);
    }
    expect(shared).toContain("BELOW_MARKET_PCT = 0.2");
    expect(shared).toContain("function noticeDeadline");
  });
});
