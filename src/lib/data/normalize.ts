// Turns the prior manager's export into consistent values. Nothing is
// guessed: a value that can't be read becomes null and the raw cell is kept.
import type { UnitStatus } from "./types";

export type RawCell = string | number | null | { excelDate: string };

export function normalizeUnit(raw: RawCell): string {
  return String(raw ?? "")
    .replace(/^\s*(apt\.?|unit|#)\s*/i, "")
    .replace(/^#/, "")
    .trim();
}

export function normalizeMoney(raw: RawCell): number | null {
  if (raw === null || raw === "") return null;
  if (typeof raw === "number") return raw;
  if (typeof raw === "object") return null;
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function normalizeDate(raw: RawCell): string | null {
  if (raw === null || raw === "") return null;
  if (typeof raw === "object") return raw.excelDate;
  if (typeof raw === "number") return null;
  const text = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return valid(iso[1], iso[2], iso[3]);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (us) return valid(us[3], us[1].padStart(2, "0"), us[2].padStart(2, "0"));
  return null;
}

function valid(y: string, m: string, d: string): string | null {
  const iso = `${y}-${m}-${d}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === iso ? iso : null;
}

const STATUS: Record<string, UnitStatus> = {
  o: "occupied",
  occ: "occupied",
  occupied: "occupied",
  notice: "notice",
  vr: "vacant_ready",
  "vacant-ready": "vacant_ready",
  "vacant ready": "vacant_ready",
  vnr: "vacant_not_ready",
  "vacant - not ready": "vacant_not_ready",
  "vacant-not ready": "vacant_not_ready",
};

export function normalizeStatus(raw: RawCell): UnitStatus {
  const key = String(raw ?? "").trim().toLowerCase();
  return STATUS[key] ?? "unknown";
}

export function normalizeYesNo(raw: RawCell): boolean {
  return String(raw ?? "").trim().toUpperCase() === "Y";
}

export function text(raw: RawCell): string | null {
  if (raw === null || typeof raw === "object") return null;
  const value = String(raw).trim();
  return value === "" ? null : value;
}

export const STATUS_LABEL: Record<UnitStatus, string> = {
  occupied: "Occupied",
  notice: "Notice",
  vacant_ready: "Vacant, ready",
  vacant_not_ready: "Vacant, not ready",
  unknown: "Unknown",
};
