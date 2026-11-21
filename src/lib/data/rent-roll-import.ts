// Reads an uploaded rent roll (CSV or Excel rows) into units, the same way the data
// pack's rent roll is read. Columns are matched by header name, so another manager's
// layout works as long as its headers are recognizable. Nothing is guessed: a value
// that can't be read becomes null and the raw cell is kept.
import { normalizeDate, normalizeMoney, normalizeStatus, normalizeUnit, text, type RawCell } from "./normalize";
import type { NewUnit } from "./datapack";

export const MAX_ROWS = 2000;

const FIELDS = {
  unit: ["unit", "unit #", "unit number", "unit no", "apt", "apartment"],
  floorplan: ["floorplan", "floor plan", "plan", "unit type"],
  beds: ["beds", "bedrooms", "br", "bed"],
  sqft: ["sq ft", "sqft", "square feet", "sf", "sq. ft."],
  status: ["unit status", "status", "occupancy status"],
  resident: ["resident name", "resident", "tenant", "tenant name", "name"],
  market: ["market rent", "market"],
  lease: ["lease rent", "rent", "actual rent", "current rent", "contract rent"],
  leaseStart: ["lease start", "lease from", "move in", "move-in date", "lease start date"],
  leaseEnd: ["lease end", "lease to", "lease expiration", "lease end date"],
  deposit: ["security deposit", "deposit", "deposit held"],
  balance: ["current balance", "balance", "balance due", "amount owed"],
  notes: ["notes", "comments", "note"],
  pmCode: ["prior mgr property code", "property code", "prop code"],
  property: ["property", "property name"],
} as const;

export type Field = keyof typeof FIELDS;
export const REQUIRED: Field[] = ["unit", "status", "lease"];
export const FIELD_LABEL: Record<Field, string> = {
  unit: "Unit",
  floorplan: "Floorplan",
  beds: "Beds",
  sqft: "Sq ft",
  status: "Unit status",
  resident: "Resident",
  market: "Market rent",
  lease: "Lease rent",
  leaseStart: "Lease start",
  leaseEnd: "Lease end",
  deposit: "Deposit",
  balance: "Balance",
  notes: "Notes",
  pmCode: "Property code",
  property: "Property",
};

const clean = (h: string) => h.toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();

export function mapHeaders(headers: string[]): Record<Field, number | null> {
  const cleaned = headers.map((h) => clean(String(h ?? "")));
  const used = new Set<number>();
  const out = {} as Record<Field, number | null>;
  for (const field of Object.keys(FIELDS) as Field[]) {
    const i = cleaned.findIndex((h, idx) => !used.has(idx) && (FIELDS[field] as readonly string[]).includes(h));
    out[field] = i >= 0 ? i : null;
    if (i >= 0) used.add(i);
  }
  return out;
}

const int = (cell: RawCell) => {
  if (typeof cell === "number") return Math.round(cell);
  if (typeof cell === "string" && /^\s*\d+\s*$/.test(cell)) return Number(cell);
  return null;
};

const rawValue = (cell: RawCell) => (cell !== null && typeof cell === "object" ? `${cell.excelDate} (Excel date)` : cell);

export type ImportResult = {
  units: NewUnit[];
  mapping: Record<Field, number | null>;
  missing: Field[];
  skipped: number;
  pmCode: string | null;
  error: string | null;
};

/** `rows` excludes the header row. Row numbers in the result match the file: the header is row 1. */
export function readRentRoll(
  headers: string[],
  rows: RawCell[][],
  property: { id: number; name: string },
): ImportResult {
  const mapping = mapHeaders(headers);
  const missing = REQUIRED.filter((f) => mapping[f] === null);
  const empty: ImportResult = { units: [], mapping, missing, skipped: 0, pmCode: null, error: null };
  if (missing.length) {
    return { ...empty, error: `The file has no column for ${missing.map((f) => FIELD_LABEL[f].toLowerCase()).join(", ")}.` };
  }
  if (rows.length > MAX_ROWS) return { ...empty, error: `The file has ${rows.length} rows. The limit is ${MAX_ROWS}.` };

  const get = (cells: RawCell[], f: Field): RawCell => (mapping[f] === null ? null : (cells[mapping[f]!] ?? null));
  let skipped = 0;
  let pmCode: string | null = null;
  const units: NewUnit[] = [];

  rows.forEach((cells, i) => {
    if (cells.every((c) => c === null || c === "")) return;
    // A file that holds several properties (like the data pack) loads only the chosen one.
    const prop = text(get(cells, "property"));
    if (mapping.property !== null && prop && prop.toLowerCase() !== property.name.toLowerCase()) {
      skipped++;
      return;
    }
    pmCode ??= text(get(cells, "pmCode"));
    units.push({
      property_id: property.id,
      source_row: i + 2,
      raw: Object.fromEntries(headers.map((h, idx) => [String(h ?? `Column ${idx + 1}`), rawValue(cells[idx] ?? null)])),
      unit: normalizeUnit(get(cells, "unit")),
      floorplan: text(get(cells, "floorplan")),
      beds: int(get(cells, "beds")),
      sqft: int(get(cells, "sqft")),
      status: normalizeStatus(get(cells, "status")),
      resident_name: text(get(cells, "resident")),
      market_rent: normalizeMoney(get(cells, "market")),
      lease_rent: normalizeMoney(get(cells, "lease")),
      lease_start: normalizeDate(get(cells, "leaseStart")),
      lease_end: normalizeDate(get(cells, "leaseEnd")),
      deposit: normalizeMoney(get(cells, "deposit")),
      balance: normalizeMoney(get(cells, "balance")),
      notes: text(get(cells, "notes")),
    });
  });

  const error = units.length === 0 ? `No rows for ${property.name} in this file.` : null;
  return { units, mapping, missing, skipped, pmCode, error };
}

/** A small CSV reader: quoted fields, doubled quotes, commas and line breaks inside quotes. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}
