import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mapHeaders, parseCsv, readRentRoll } from "./rent-roll-import";

const sample = fs.readFileSync(path.resolve("public/samples/trinity-bluffs-rent-roll.csv"), "utf8");

describe("rent roll import", () => {
  it("parses quoted CSV", () => {
    expect(parseCsv('a,b\r\n"1,000","say ""hi"""\n')).toEqual([["a", "b"], ["1,000", 'say "hi"']]);
  });

  it("matches headers by name, not position", () => {
    const m = mapHeaders(["Tenant", "Rent", "Status", "Unit #"]);
    expect(m.unit).toBe(3);
    expect(m.resident).toBe(0);
    expect(m.lease).toBe(1);
    expect(m.market).toBeNull();
  });

  it("reads the Trinity Bluffs sample", () => {
    const [headers, ...rows] = parseCsv(sample);
    const r = readRentRoll(headers, rows, { id: 9, name: "Trinity Bluffs" });
    expect(r.error).toBeNull();
    expect(r.units).toHaveLength(41);
    expect(r.pmCode).toBe("PM-0488");
    expect(r.units[0]).toMatchObject({ unit: "3101", status: "occupied", market_rent: 1240, lease_rent: 1220, source_row: 2 });
  });

  it("skips other properties and refuses a file with no unit column", () => {
    const [headers, ...rows] = parseCsv(sample);
    expect(readRentRoll(headers, rows, { id: 1, name: "Willow Bend Flats" }).error).toMatch(/No rows/);
    expect(readRentRoll(["Name"], [["x"]], { id: 9, name: "Trinity Bluffs" }).error).toMatch(/unit/);
  });
});
