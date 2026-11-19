import { describe, expect, it } from "vitest";
import { buildSeed } from "./datapack";
import {
  normalizeDate,
  normalizeMoney,
  normalizeStatus,
  normalizeUnit,
} from "./normalize";

describe("unit numbers", () => {
  it.each([
    ["1101", "1101"],
    ["Apt 1101", "1101"],
    ["#1101", "1101"],
    ["apt. 22B", "22B"],
  ])("%s -> %s", (raw, want) => expect(normalizeUnit(raw)).toBe(want));
});

describe("money", () => {
  it.each([
    [1325, 1325],
    ["$1,325.00", 1325],
    ["$0.00", 0],
    ["$56.34", 56.34],
    [762.33, 762.33],
    [null, null],
    ["n/a", null],
  ])("%s -> %s", (raw, want) => expect(normalizeMoney(raw)).toBe(want));
});

describe("dates", () => {
  it.each([
    ["03/14/2025", "2025-03-14"],
    ["2027-07-24", "2027-07-24"],
    [{ excelDate: "2026-03-16" }, "2026-03-16"],
    [null, null],
    ["13/45/2025", null],
    ["soon", null],
  ])("%s -> %s", (raw, want) => expect(normalizeDate(raw)).toBe(want));
});

describe("unit status", () => {
  it.each([
    ["O", "occupied"],
    ["Occ", "occupied"],
    ["Occupied", "occupied"],
    ["Notice", "notice"],
    ["VR", "vacant_ready"],
    ["Vacant-Ready", "vacant_ready"],
    ["VNR", "vacant_not_ready"],
    ["Vacant - Not Ready", "vacant_not_ready"],
    ["Down", "unknown"],
  ])("%s -> %s", (raw, want) => expect(normalizeStatus(raw)).toBe(want));
});

describe("the data pack", () => {
  const seed = buildSeed();

  it("loads every row", () => {
    expect(seed.properties).toHaveLength(9);
    expect(seed.units).toHaveLength(255);
    expect(seed.tasks).toHaveLength(126);
    expect(seed.contracts).toHaveLength(49);
  });

  it("leaves no status, rent or populated date unread", () => {
    expect(seed.units.filter((u) => u.status === "unknown")).toHaveLength(0);
    expect(seed.units.filter((u) => u.market_rent === null || u.lease_rent === null)).toHaveLength(0);
    const unread = seed.units.filter(
      (u) =>
        (u.raw["Lease Start"] !== null && u.lease_start === null) ||
        (u.raw["Lease End"] !== null && u.lease_end === null),
    );
    expect(unread).toHaveLength(0);
  });

  it("keeps the raw cell next to the normalized value", () => {
    const cedar = seed.units.find((u) => String(u.raw["Unit"]).startsWith("Apt"))!;
    expect(cedar.unit).not.toContain("Apt");
    expect(String(cedar.raw["Market Rent"])).toContain("$");
    expect(typeof cedar.market_rent).toBe("number");
  });

  it("marks which properties sent a rent roll", () => {
    expect(seed.properties.filter((p) => p.rent_roll_received)).toHaveLength(3);
  });
});
