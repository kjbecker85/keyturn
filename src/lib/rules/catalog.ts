import type { Area } from "../data/types";

export type RuleInfo = {
  key: string;
  area: Area;
  /** Short name, used in lists. */
  label: string;
  /** What the rule checks, in plain words. */
  plain: string;
  /** Why it matters on a takeover. */
  why: string;
  /** How severe it is, and when that changes. */
  severity: string;
};

/** Every rule, in plain language. The code for each lives in ./index.ts between "// rule:" markers. */
export const RULES: RuleInfo[] = [
  {
    key: "rr.no_resident", area: "rent_roll", label: "Occupied or on notice with no resident name",
    plain: "A unit is marked occupied or on notice, but the resident name is blank.",
    why: "Either someone lives there and we don't know who, or the unit is empty and mislabeled. Both break the ledger load.",
    severity: "High",
  },
  {
    key: "rr.zero_rent", area: "rent_roll", label: "Occupied or on notice at $0 lease rent",
    plain: "A unit is marked occupied or on notice, and its lease rent is $0.",
    why: "It's a vacated unit still marked occupied, an undocumented concession, or a missing charge. Each one costs the owner money.",
    severity: "High",
  },
  {
    key: "rr.dates_reversed", area: "rent_roll", label: "Lease ends before it starts",
    plain: "The lease end date is earlier than the lease start date.",
    why: "The dates were swapped or a year was mistyped. Loading it would set the wrong renewal date.",
    severity: "High",
  },
  {
    key: "rr.duplicate_unit", area: "rent_roll", label: "Same unit number listed more than once",
    plain: "After cleaning formats (\"Apt 3203\", \"#3203\" and \"3203\" are the same), one unit appears on two or more rows.",
    why: "Only one row can be loaded. Someone has to decide which resident and lease are current.",
    severity: "High",
  },
  {
    key: "rr.zero_sqft", area: "rent_roll", label: "Unit listed at 0 square feet",
    plain: "A unit's square footage is 0.",
    why: "A data-entry error. It matters for pricing and reporting, not for Day One.",
    severity: "Low",
  },
  {
    key: "rr.below_market", area: "rent_roll", label: "Lease rent more than 20% below market",
    plain: "An occupied unit pays rent, but more than 20% less than its market rent.",
    why: "It may be a staff unit, an affordable set-aside or a typo. If none of those, it's revenue the owner is losing.",
    severity: "Medium",
  },
  {
    key: "rr.zero_deposit", area: "rent_roll", label: "Occupied by a named resident with $0 deposit",
    plain: "An occupied unit with a named resident shows a $0 security deposit.",
    why: "Deposit liability moves to the new manager. A missing deposit has to be explained before takeover.",
    severity: "Medium",
  },
  {
    key: "rr.month_to_month", area: "rent_roll", label: "Occupied units past lease end (one per property)",
    plain: "Occupied units whose lease end date is before today. One item per property counts them.",
    why: "These residents are month-to-month. That's renewal revenue at risk, or a sign the prior manager stopped recording renewals.",
    severity: "Medium",
  },
  {
    key: "rr.delinquency", area: "rent_roll", label: "Resident balances owed (one per property)",
    plain: "Residents with a balance owed. One item per property totals them and lists the largest.",
    why: "Debt transfers with the property. Without an aging report nobody knows how old it is or how much is collectible.",
    severity: "Medium",
  },
  {
    key: "rr.missing", area: "rent_roll", label: "No rent roll received for the property",
    plain: "A property has no rent roll rows at all.",
    why: "Occupancy, deposits and delinquency can't be checked until the prior manager sends it. Uploading one clears this.",
    severity: "High",
  },
  {
    key: "task.blocked", area: "checklist", label: "Task is blocked",
    plain: "A checklist task's status is Blocked.",
    why: "Something outside the team is holding up the work. The note says what.",
    severity: "Critical if the task is on the critical path, otherwise High",
  },
  {
    key: "task.unassigned", area: "checklist", label: "Task has no assignee",
    plain: "An open checklist task has no owner.",
    why: "Work nobody owns doesn't get done.",
    severity: "High if on the critical path, otherwise Medium",
  },
  {
    key: "task.overdue", area: "checklist", label: "Task is past its due date",
    plain: "An open task's due date is before today.",
    why: "It's late. On this data none are yet, so this rule raises nothing today.",
    severity: "Critical if on the critical path, otherwise High",
  },
  {
    key: "task.stale", area: "checklist", label: "Open task with no update in more than 7 days",
    plain: "An open task that isn't blocked hasn't been updated in more than 7 days.",
    why: "The status may no longer be true. Someone should confirm it's moving.",
    severity: "Medium if on the critical path and due within 21 days, otherwise Low",
  },
  {
    key: "task.non_business_due", area: "checklist", label: "Due date falls on a weekend or holiday (one per task type)",
    plain: "An open task is due on a Saturday, Sunday or federal holiday. The Friday after Thanksgiving counts as closed too.",
    why: "Banks, carriers and the prior manager won't be working that day, so the real deadline is the business day before.",
    severity: "High if on the critical path and on a holiday or Thanksgiving weekend, otherwise Medium",
  },
  {
    key: "vendor.notice_missed", area: "vendors", label: "Auto-renewing contract whose notice window has passed",
    plain: "A contract renews on its own, and the last day to give notice (term end minus notice days) has already passed.",
    why: "It will renew whether the owner wants it or not, unless the vendor agrees to let it go.",
    severity: "Critical",
  },
  {
    key: "vendor.notice_upcoming", area: "vendors", label: "Auto-renewing contract with a notice deadline before Dec 31",
    plain: "A contract renews on its own, and its notice deadline is between today and December 31.",
    why: "There's still time to keep, cancel or renegotiate it, but only until that date.",
    severity: "High",
  },
  {
    key: "vendor.lapses", area: "vendors", label: "Contract ends before takeover and does not auto-renew",
    plain: "A contract ends before December 1 and won't renew on its own.",
    why: "The service stops before Day One unless it's extended or replaced.",
    severity: "Critical for fire, elevator and gate contracts, otherwise High",
  },
  {
    key: "vendor.coi_expired", area: "vendors", label: "Certificate of insurance has expired",
    plain: "The vendor's certificate of insurance (COI) on file has an expiration date before today.",
    why: "A COI is the vendor's proof that it carries its own liability insurance. If its coverage really lapsed, the owner could pay for an accident on site.",
    severity: "High",
  },
  {
    key: "vendor.not_assignable", area: "vendors", label: "Contracts that can't transfer to a new manager (one per property)",
    plain: "Contracts that run past December 1 but can't be assigned to a new manager. One item per property lists them.",
    why: "Each needs the vendor's consent or a new agreement before Day One.",
    severity: "Medium",
  },
  {
    key: "vendor.duplicate_service", area: "vendors", label: "Two contracts for the same service at one property",
    plain: "One property has two or more contracts for the same service.",
    why: "The owner may be paying twice, or an old contract was replaced and never closed.",
    severity: "High",
  },
  {
    key: "cross.contracts_exist", area: "cross_sheet", label: "Checklist says contracts weren't received, vendor sheet lists them",
    plain: "The checklist's vendor review note says the prior manager hasn't sent contracts, but the vendor sheet lists contracts for that property.",
    why: "One of the two sheets is wrong. Either the review can start, or the vendor list came from somewhere else.",
    severity: "High",
  },
  {
    key: "cross.review_complete_with_issues", area: "cross_sheet", label: "Vendor review marked complete with contract problems open",
    plain: "The checklist says vendor review is Complete, but that property still has a missed notice date, an expired COI or a contract lapsing before takeover.",
    why: "The review may have been a box-tick.",
    severity: "High",
  },
  {
    key: "cross.coi_task_complete", area: "cross_sheet", label: "COI collection marked complete with an expired certificate",
    plain: "The checklist's insurance task, which includes collecting COIs, is Complete, but a vendor at that property has an expired COI.",
    why: "The task was closed without the certificates it promised.",
    severity: "High",
  },
  {
    key: "cross.rent_roll_marked_received", area: "cross_sheet", label: "Rent roll marked received but absent from the data",
    plain: "The checklist says the final rent roll was received, but there are no rent roll rows for that property.",
    why: "The file exists somewhere and needs to be found. On this data it raises nothing.",
    severity: "High",
  },
  {
    key: "cross.loading_before_clean", area: "cross_sheet", label: "Yardi setup or ledger migration under way without a clean rent roll",
    plain: "Yardi setup or ledger migration is in progress or complete, while the property has no rent roll or one with missing residents, reversed dates or 0 sq ft.",
    why: "Systems are being built from data nobody has checked. Errors will be loaded into Yardi.",
    severity: "High",
  },
  {
    key: "cross.access_handover", area: "cross_sheet", label: "Gate vendor contract won't carry over to the access handover",
    plain: "The keys and gate-code handover task is open, while the gate contract ends before takeover or can't transfer.",
    why: "On Day One nobody would be under contract to reissue gate codes or fix an access failure.",
    severity: "High",
  },
];
