export type UnitStatus =
  | "occupied"
  | "notice"
  | "vacant_ready"
  | "vacant_not_ready"
  | "unknown";

export type Property = {
  id: number;
  name: string;
  market: string;
  pm_code: string | null;
  lat: number;
  lng: number;
  rent_roll_received: boolean;
};

export type Unit = {
  id: number;
  property_id: number;
  source_row: number;
  raw: Record<string, unknown>;
  unit: string;
  floorplan: string | null;
  beds: number | null;
  sqft: number | null;
  status: UnitStatus;
  resident_name: string | null;
  market_rent: number | null;
  lease_rent: number | null;
  lease_start: string | null;
  lease_end: string | null;
  deposit: number | null;
  balance: number | null;
  notes: string | null;
  review_status: "unreviewed" | "approved" | "corrected" | "rejected";
  review_note: string | null;
};

export type TaskStatus = "Not Started" | "In Progress" | "Blocked" | "Complete";

export type Task = {
  id: number;
  property_id: number;
  source_row: number;
  task: string;
  function: string;
  assignee: string | null;
  critical_path: boolean;
  due_date: string;
  status: TaskStatus;
  last_updated: string;
  notes: string | null;
};

export type Decision = "keep" | "terminate" | "renegotiate";

export type Contract = {
  id: number;
  contract_id: string;
  property_id: number;
  source_row: number;
  vendor: string;
  service: string;
  monthly_cost: number;
  start_date: string;
  term_end: string;
  auto_renew: boolean;
  notice_days: number;
  coi_expiration: string;
  assignable: boolean;
  notes: string | null;
  decision: Decision | null;
  decision_reason: string | null;
};

export type Area = "rent_roll" | "checklist" | "vendors" | "cross_sheet";

export type SourceRef = {
  table: "rent_roll_units" | "tasks" | "vendor_contracts";
  id: number;
  sheet: string;
  row: number;
  label: string;
};

export type ExceptionCandidate = {
  fingerprint: string;
  rule_key: string;
  area: Area;
  severity: 1 | 2 | 3 | 4;
  property_id: number | null;
  function: string | null;
  title: string;
  detail: string;
  due_date: string | null;
  sources: SourceRef[];
};

export type ExceptionRow = ExceptionCandidate & {
  id: number;
  status: "open" | "resolved" | "dismissed";
  assignee: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
};

export type Dataset = {
  properties: Property[];
  units: Unit[];
  tasks: Task[];
  contracts: Contract[];
};

export const SHEETS = {
  rentRoll: "A1 Rent Roll (Prior Mgr)",
  checklist: "A2 Transition Checklist",
  vendors: "A3 Vendor Contracts",
} as const;

export const SEVERITY_LABEL: Record<number, string> = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
};

export const AREA_LABEL: Record<Area, string> = {
  rent_roll: "Rent roll",
  checklist: "Checklist",
  vendors: "Vendors",
  cross_sheet: "Cross-sheet",
};
