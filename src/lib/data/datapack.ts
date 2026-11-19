// Builds insertable rows from the data pack export (data/datapack.json).
import datapack from "../../../data/datapack.json";
import {
  normalizeDate,
  normalizeMoney,
  normalizeStatus,
  normalizeUnit,
  normalizeYesNo,
  text,
  type RawCell,
} from "./normalize";
import type { Contract, Property, Task, TaskStatus, Unit } from "./types";

type Sheet = { headers: string[]; rows: { row: number; cells: RawCell[] }[] };
const pack = datapack as unknown as Record<"rentRoll" | "checklist" | "vendors", Sheet>;

// The data pack has no addresses. These are invented points inside each city.
const COORDS: Record<string, [number, number]> = {
  "Willow Bend Flats": [30.2305, -97.765],
  "Stonegate Commons": [30.392, -97.723],
  "Lakeline Vista": [30.472, -97.796],
  "Cedar Crossing": [29.525, -98.565],
  "Mission Trails": [29.355, -98.47],
  "The Reserve at Pinehurst": [32.905, -96.77],
  "Elm Street Lofts": [32.783, -96.785],
  "Brazos Landing": [31.556, -97.13],
  "Trinity Bluffs": [32.76, -97.32],
};

export type NewUnit = Omit<Unit, "id" | "review_status" | "review_note">;
export type NewTask = Omit<Task, "id">;
export type NewContract = Omit<Contract, "id" | "decision" | "decision_reason">;

export function buildSeed() {
  const properties: Property[] = [];
  const idByName = new Map<string, number>();
  for (const { cells } of pack.checklist.rows) {
    const name = String(cells[0]);
    if (idByName.has(name)) continue;
    const id = properties.length + 1;
    const [lat, lng] = COORDS[name] ?? [31, -97.5];
    idByName.set(name, id);
    properties.push({
      id,
      name,
      market: String(cells[1]),
      pm_code: null,
      lat,
      lng,
      rent_roll_received: false,
    });
  }
  const propertyId = (name: RawCell) => {
    const id = idByName.get(String(name));
    if (!id) throw new Error(`Unknown property: ${String(name)}`);
    return id;
  };

  const units: NewUnit[] = pack.rentRoll.rows.map(({ row, cells }) => {
    const property = properties[propertyId(cells[1]) - 1];
    property.pm_code = text(cells[0]);
    property.rent_roll_received = true;
    return {
      property_id: property.id,
      source_row: row,
      raw: Object.fromEntries(
        pack.rentRoll.headers.map((h, i) => [h, rawValue(cells[i])]),
      ),
      unit: normalizeUnit(cells[2]),
      floorplan: text(cells[3]),
      beds: typeof cells[4] === "number" ? cells[4] : null,
      sqft: typeof cells[5] === "number" ? cells[5] : null,
      status: normalizeStatus(cells[6]),
      resident_name: text(cells[7]),
      market_rent: normalizeMoney(cells[8]),
      lease_rent: normalizeMoney(cells[9]),
      lease_start: normalizeDate(cells[10]),
      lease_end: normalizeDate(cells[11]),
      deposit: normalizeMoney(cells[12]),
      balance: normalizeMoney(cells[13]),
      notes: text(cells[14]),
    };
  });

  const tasks: NewTask[] = pack.checklist.rows.map(({ row, cells }) => ({
    property_id: propertyId(cells[0]),
    source_row: row,
    task: String(cells[2]),
    function: String(cells[3]),
    assignee: text(cells[4]),
    critical_path: normalizeYesNo(cells[5]),
    due_date: normalizeDate(cells[6])!,
    status: String(cells[7]) as TaskStatus,
    last_updated: normalizeDate(cells[8])!,
    notes: text(cells[9]),
  }));

  const contracts: NewContract[] = pack.vendors.rows.map(({ row, cells }) => ({
    contract_id: String(cells[0]),
    property_id: propertyId(cells[1]),
    source_row: row,
    vendor: String(cells[2]),
    service: String(cells[3]),
    monthly_cost: normalizeMoney(cells[4]) ?? 0,
    start_date: normalizeDate(cells[5])!,
    term_end: normalizeDate(cells[6])!,
    auto_renew: normalizeYesNo(cells[7]),
    notice_days: Number(cells[8]),
    coi_expiration: normalizeDate(cells[9])!,
    assignable: normalizeYesNo(cells[10]),
    notes: text(cells[11]),
  }));

  return { properties, units, tasks, contracts };
}

function rawValue(cell: RawCell): string | number | null {
  if (cell !== null && typeof cell === "object") return `${cell.excelDate} (Excel date)`;
  return cell;
}
