// The columns each export uses, shared by the list screens and the full workbook.
import type { Flag } from "./flags";
import { noticeDeadline } from "./rules";
import type { Column } from "./table-export";
import type { Contract, ExceptionRow, Task, Unit } from "./data/types";
import { AREA_LABEL } from "./data/types";

const SEVERITY = ["", "Critical", "High", "Medium", "Low"];
const flagText = (flags?: Flag[]) => (flags ?? []).map((f) => f.title).join("; ");

export function exceptionColumns(property: (id: number | null) => string): Column<ExceptionRow>[] {
  return [
    { header: "ID", value: (e) => e.id, width: 8 },
    { header: "Severity", value: (e) => SEVERITY[e.severity] },
    { header: "Area", value: (e) => AREA_LABEL[e.area] },
    { header: "Property", value: (e) => property(e.property_id), width: 24 },
    { header: "Title", value: (e) => e.title, width: 60 },
    { header: "Why it was flagged", value: (e) => e.detail, width: 80 },
    { header: "Due", value: (e) => e.due_date },
    { header: "Status", value: (e) => e.status },
    { header: "Assignee", value: (e) => e.assignee, width: 16 },
    { header: "Resolution note", value: (e) => e.resolution_note, width: 40 },
    { header: "Rule", value: (e) => e.rule_key, width: 26 },
    { header: "Source rows", value: (e) => e.sources.map((s) => `${s.sheet} row ${s.row}`).join("; "), width: 40 },
  ];
}

export function unitColumns(property: (id: number) => string, flags: Record<number, Flag[]>): Column<Unit>[] {
  return [
    { header: "Property", value: (u) => property(u.property_id), width: 24 },
    { header: "Unit", value: (u) => u.unit },
    { header: "Floorplan", value: (u) => u.floorplan },
    { header: "Beds", value: (u) => u.beds, width: 8 },
    { header: "Sq Ft", value: (u) => u.sqft, width: 8 },
    { header: "Status", value: (u) => u.status },
    { header: "Resident", value: (u) => u.resident_name, width: 22 },
    { header: "Market rent", value: (u) => u.market_rent },
    { header: "Lease rent", value: (u) => u.lease_rent },
    { header: "Lease start", value: (u) => u.lease_start },
    { header: "Lease end", value: (u) => u.lease_end },
    { header: "Deposit", value: (u) => u.deposit },
    { header: "Balance", value: (u) => u.balance },
    { header: "Notes", value: (u) => u.notes, width: 30 },
    { header: "Review", value: (u) => u.review_status },
    { header: "Open flags", value: (u) => flagText(flags[u.id]), width: 50 },
    { header: "Source row", value: (u) => u.source_row },
  ];
}

export function taskColumns(property: (id: number) => string, flags: Record<number, Flag[]>): Column<Task>[] {
  return [
    { header: "Property", value: (t) => property(t.property_id), width: 24 },
    { header: "Task", value: (t) => t.task, width: 50 },
    { header: "Function", value: (t) => t.function, width: 16 },
    { header: "Owner", value: (t) => t.assignee, width: 16 },
    { header: "Critical path", value: (t) => (t.critical_path ? "Y" : "N") },
    { header: "Due", value: (t) => t.due_date },
    { header: "Status", value: (t) => t.status },
    { header: "Last updated", value: (t) => t.last_updated },
    { header: "Notes", value: (t) => t.notes, width: 40 },
    { header: "Open flags", value: (t) => flagText(flags[t.id]), width: 50 },
    { header: "Source row", value: (t) => t.source_row },
  ];
}

export function contractColumns(property: (id: number) => string, flags: Record<number, Flag[]>): Column<Contract>[] {
  return [
    { header: "Contract", value: (c) => c.contract_id },
    { header: "Property", value: (c) => property(c.property_id), width: 24 },
    { header: "Vendor", value: (c) => c.vendor, width: 26 },
    { header: "Service", value: (c) => c.service, width: 20 },
    { header: "Monthly cost", value: (c) => c.monthly_cost },
    { header: "Start", value: (c) => c.start_date },
    { header: "Term end", value: (c) => c.term_end },
    { header: "Auto-renew", value: (c) => (c.auto_renew ? "Y" : "N") },
    { header: "Notice days", value: (c) => c.notice_days },
    { header: "Notice by", value: (c) => noticeDeadline(c) },
    { header: "COI expires", value: (c) => c.coi_expiration },
    { header: "Assignable", value: (c) => (c.assignable ? "Y" : "N") },
    { header: "Decision", value: (c) => c.decision },
    { header: "Decision reason", value: (c) => c.decision_reason, width: 30 },
    { header: "Notes", value: (c) => c.notes, width: 30 },
    { header: "Open flags", value: (c) => flagText(flags[c.id]), width: 50 },
    { header: "Source row", value: (c) => c.source_row },
  ];
}
