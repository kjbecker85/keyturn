import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildSeed } from "../data/datapack";
import type { Dataset, ExceptionRow } from "../data/types";
import { runRules } from "../rules";
import { buildTools, type Citations } from "./ask";

function fixture() {
  const seed = buildSeed();
  const data: Dataset = {
    properties: seed.properties,
    units: seed.units.map((u, i) => ({ ...u, id: i + 1, review_status: "unreviewed", review_note: null })),
    tasks: seed.tasks.map((t, i) => ({ ...t, id: i + 1 })),
    contracts: seed.contracts.map((c, i) => ({ ...c, id: i + 1, decision: null, decision_reason: null })),
  };
  const exceptions = runRules(data).map((e, i) => ({
    ...e,
    id: i + 1,
    status: "open",
    assignee: e.assignee ?? null,
    resolution_note: null,
    notes: [],
    created_at: "",
    updated_at: "",
  })) as ExceptionRow[];
  const citations: Citations = {};
  return { ...buildTools(data, exceptions, citations), citations };
}

type Rows<K extends string> = Record<K, Record<string, unknown>[]> & { total_matching: number };

describe("assistant query tools", () => {
  it("defines a handler for every tool", () => {
    const { tools, handlers } = fixture();
    expect(tools.map((t) => t.name).sort()).toEqual(Object.keys(handlers).sort());
  });

  it("finds a property by part of its name and records a citation for each row", () => {
    const { handlers, citations } = fixture();
    const result = handlers.list_exceptions({ property: "trinity", max_severity: 1 }) as Rows<"exceptions">;
    expect(result.total_matching).toBeGreaterThan(0);
    for (const row of result.exceptions) {
      expect(row.property).toBe("Trinity Bluffs");
      expect(citations[String(row.ref)]).toMatch(/^\/\?status=all&focus=\d+$/);
    }
  });

  it("returns the six contracts whose notice window has already passed", () => {
    const { handlers } = fixture();
    const result = handlers.list_contracts({
      auto_renew_only: true,
      notice_deadline_on_or_before: "2026-10-15",
      term_ends_on_or_before: "2026-12-31",
    }) as Rows<"contracts">;
    expect(result.contracts.map((c) => c.ref).sort()).toEqual(
      ["VC-5002", "VC-5011", "VC-5013", "VC-5023", "VC-5026", "VC-5032"],
    );
  });

  it("says so when a property has no rent roll", () => {
    const { handlers } = fixture();
    expect(handlers.rent_roll({ property: "Trinity" })).toEqual({
      error: "No rent roll has been received for this property.",
    });
  });

  it("lists blocked tasks with their notes", () => {
    const { handlers } = fixture();
    const result = handlers.list_tasks({ status: "Blocked" }) as Rows<"tasks">;
    expect(result.total_matching).toBe(4);
    expect(result.tasks.every((t) => t.notes)).toBe(true);
  });
});
