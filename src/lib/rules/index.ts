// The exceptions engine. Plain rules over the three sheets, no model.
// Each rule returns candidates with a stable fingerprint, a reason in plain
// words, and the source rows that triggered it.
import {
  addDays,
  daysBetween,
  formatShort,
  holidayName,
  isBusinessDay,
  priorBusinessDay,
  TAKEOVER,
  TODAY,
  weekday,
} from "../dates";
import {
  SHEETS,
  type Contract,
  type Dataset,
  type ExceptionCandidate,
  type SourceRef,
  type Task,
  type Unit,
} from "../data/types";

export const STALE_DAYS = 7;
export const BELOW_MARKET_PCT = 0.2;
export const NOTICE_HORIZON = "2026-12-31";
const LIFE_SAFETY = ["Fire/Life Safety", "Elevator Maintenance", "Gate/Access Control"];

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Ends a note with a period if its author didn't. */
const sentence = (text: string) => (/[.!?]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);

const isOccupied = (u: Unit) => u.status === "occupied" || u.status === "notice";

const unitRef = (u: Unit): SourceRef => ({
  table: "rent_roll_units",
  id: u.id,
  sheet: SHEETS.rentRoll,
  row: u.source_row,
  label: `Unit ${u.unit}`,
});
const taskRef = (t: Task, label?: string): SourceRef => ({
  table: "tasks",
  id: t.id,
  sheet: SHEETS.checklist,
  row: t.source_row,
  label: label ?? t.task,
});
const contractRef = (c: Contract): SourceRef => ({
  table: "vendor_contracts",
  id: c.id,
  sheet: SHEETS.vendors,
  row: c.source_row,
  label: `${c.contract_id} ${c.vendor}`,
});

/** The last day notice can be given to stop a contract at its term end. */
export function noticeDeadline(c: Contract): string {
  return addDays(c.term_end, -c.notice_days);
}

export function runRules(data: Dataset): ExceptionCandidate[] {
  const name = new Map(data.properties.map((p) => [p.id, p.name]));
  const out: ExceptionCandidate[] = [];
  const add = (c: ExceptionCandidate) => out.push(c);

  rentRollRules(data, name, add);
  checklistRules(data, name, add);
  vendorRules(data, name, add);
  crossSheetRules(data, name, add);

  return out.sort(
    (a, b) =>
      a.severity - b.severity ||
      (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999") ||
      a.fingerprint.localeCompare(b.fingerprint),
  );
}

type Add = (c: ExceptionCandidate) => void;
type Names = Map<number, string>;

function rentRollRules({ properties, units, tasks }: Dataset, name: Names, add: Add) {
  const base = { area: "rent_roll" as const, function: "Accounting", due_date: null };

  for (const u of units) {
    const where = `${name.get(u.property_id)} unit ${u.unit}`;
    const key = `${u.property_id}:${u.source_row}`;

    if (isOccupied(u) && !u.resident_name) {
      add({
        ...base,
        fingerprint: `rr.no_resident:${key}`,
        rule_key: "rr.no_resident",
        severity: 2,
        property_id: u.property_id,
        title: `${where}: ${u.status === "notice" ? "on notice" : "occupied"} with no resident name`,
        detail:
          "The prior manager's rent roll marks this unit as occupied but lists no resident. " +
          "Confirm who lives there, or whether it is already vacant, before the ledger is loaded.",
        sources: [unitRef(u)],
      });
    }
    if (isOccupied(u) && u.lease_rent === 0) {
      add({
        ...base,
        fingerprint: `rr.zero_rent:${key}`,
        rule_key: "rr.zero_rent",
        severity: 2,
        property_id: u.property_id,
        title: `${where}: ${u.status === "notice" ? "on notice" : "occupied"} at $0 rent`,
        detail:
          `Lease rent is $0 against a market rent of ${usd(u.market_rent ?? 0)}. ` +
          "This is either a vacated unit still marked occupied, a concession, or a missing charge.",
        sources: [unitRef(u)],
      });
    }
    if (u.lease_start && u.lease_end && u.lease_end < u.lease_start) {
      add({
        ...base,
        fingerprint: `rr.dates_reversed:${key}`,
        rule_key: "rr.dates_reversed",
        severity: 2,
        property_id: u.property_id,
        title: `${where}: lease ends before it starts`,
        detail:
          `Lease start ${u.lease_start}, lease end ${u.lease_end}. The dates are likely swapped or one year is wrong. ` +
          "Check the signed lease before loading.",
        sources: [unitRef(u)],
      });
    }
    if (u.sqft === 0) {
      add({
        ...base,
        fingerprint: `rr.zero_sqft:${key}`,
        rule_key: "rr.zero_sqft",
        severity: 4,
        property_id: u.property_id,
        title: `${where}: 0 square feet`,
        detail: `Floorplan ${u.floorplan} is listed at 0 sq ft. Other ${u.floorplan} units have a real figure.`,
        sources: [unitRef(u)],
      });
    }
    if (
      isOccupied(u) &&
      u.lease_rent &&
      u.market_rent &&
      (u.market_rent - u.lease_rent) / u.market_rent > BELOW_MARKET_PCT
    ) {
      const pct = Math.round(((u.market_rent - u.lease_rent) / u.market_rent) * 100);
      add({
        ...base,
        fingerprint: `rr.below_market:${key}`,
        rule_key: "rr.below_market",
        severity: 3,
        property_id: u.property_id,
        title: `${where}: rent ${pct}% below market`,
        detail:
          `Lease rent ${usd(u.lease_rent)} against market ${usd(u.market_rent)}.` +
          (u.notes ? ` Prior manager's note: "${u.notes}".` : "") +
          " Could be a staff unit, an affordable set-aside, or a prorated month entered as rent.",
        sources: [unitRef(u)],
      });
    }
    if (u.status === "occupied" && u.resident_name && u.deposit === 0) {
      add({
        ...base,
        fingerprint: `rr.zero_deposit:${key}`,
        rule_key: "rr.zero_deposit",
        severity: 3,
        property_id: u.property_id,
        title: `${where}: occupied with $0 security deposit`,
        detail:
          "No deposit is on record. Confirm whether one was waived or simply not transferred, " +
          "because deposit liability moves to the new manager on takeover.",
        sources: [unitRef(u)],
      });
    }
  }

  // Duplicate unit numbers once "Apt 3203", "#3203" and "3203" are the same thing.
  const byUnit = new Map<string, Unit[]>();
  for (const u of units) {
    const k = `${u.property_id}:${u.unit}`;
    byUnit.set(k, [...(byUnit.get(k) ?? []), u]);
  }
  for (const [k, group] of byUnit) {
    if (group.length < 2) continue;
    const u = group[0];
    add({
      ...base,
      fingerprint: `rr.duplicate_unit:${k}`,
      rule_key: "rr.duplicate_unit",
      severity: 2,
      property_id: u.property_id,
      title: `${name.get(u.property_id)} unit ${u.unit}: listed ${group.length} times`,
      detail:
        `Rows ${group.map((g) => g.source_row).join(" and ")} share a unit number` +
        ` (residents: ${group.map((g) => g.resident_name ?? "none").join(" / ")}). ` +
        "Only one can be loaded. Decide which row is current.",
      sources: group.map(unitRef),
    });
  }

  for (const p of properties) {
    const mine = units.filter((u) => u.property_id === p.id);
    if (mine.length === 0) {
      const due = tasks.find(
        (t) => t.property_id === p.id && t.task.startsWith("Receive final rent roll"),
      );
      add({
        ...base,
        fingerprint: `rr.missing:${p.id}`,
        rule_key: "rr.missing",
        severity: 2,
        property_id: p.id,
        due_date: due?.due_date ?? null,
        title: `${p.name}: no rent roll received`,
        detail:
          "The data pack holds rent rolls for 3 of the 9 properties. Nothing has arrived for this one, " +
          "so occupancy, deposits and delinquency can't be checked yet.",
        sources: due ? [taskRef(due)] : [],
      });
      continue;
    }

    const expired = mine.filter((u) => isOccupied(u) && u.lease_end && u.lease_end < TODAY);
    const occupied = mine.filter(isOccupied);
    if (expired.length) {
      add({
        ...base,
        fingerprint: `rr.month_to_month:${p.id}`,
        rule_key: "rr.month_to_month",
        severity: 3,
        property_id: p.id,
        title: `${p.name}: ${expired.length} of ${occupied.length} occupied units are past lease end`,
        detail:
          `${expired.length} residents are living on expired leases, treated here as month-to-month. ` +
          "That is renewal revenue at risk and a notice-to-vacate exposure in the first 60 days. " +
          "It could also mean the prior manager stopped recording renewals.",
        sources: expired.slice(0, 8).map(unitRef),
      });
    }

    const owing = mine.filter((u) => (u.balance ?? 0) > 0);
    if (owing.length) {
      const total = owing.reduce((sum, u) => sum + (u.balance ?? 0), 0);
      const top = [...owing].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0)).slice(0, 5);
      add({
        ...base,
        fingerprint: `rr.delinquency:${p.id}`,
        rule_key: "rr.delinquency",
        severity: 3,
        property_id: p.id,
        title: `${p.name}: ${usd(total)} owed by ${owing.length} residents`,
        detail:
          `Largest balances: ${top.map((u) => `unit ${u.unit} ${usd(u.balance ?? 0)}`).join(", ")}. ` +
          "The export has balances but no aging, so how old this debt is can't be seen until the aged delinquency report arrives.",
        sources: top.map(unitRef),
      });
    }
  }
}

function checklistRules({ tasks }: Dataset, name: Names, add: Add) {
  const base = { area: "checklist" as const };
  const open = tasks.filter((t) => t.status !== "Complete");

  for (const t of open) {
    const where = `${name.get(t.property_id)}: ${t.task}`;
    const critical = t.critical_path ? " It is on the critical path." : "";

    if (t.status === "Blocked") {
      add({
        ...base,
        fingerprint: `task.blocked:${t.source_row}`,
        rule_key: "task.blocked",
        assignee: t.assignee,
        severity: t.critical_path ? 1 : 2,
        property_id: t.property_id,
        function: t.function,
        due_date: t.due_date,
        title: `Blocked — ${where}`,
        detail: `${sentence(t.notes ?? "No reason recorded")} Due ${formatShort(t.due_date)}, owned by ${t.assignee ?? "nobody"}.${critical}`,
        sources: [taskRef(t)],
      });
    }
    if (!t.assignee) {
      add({
        ...base,
        fingerprint: `task.unassigned:${t.source_row}`,
        rule_key: "task.unassigned",
        severity: t.critical_path ? 2 : 3,
        property_id: t.property_id,
        function: t.function,
        due_date: t.due_date,
        title: `No assignee — ${where}`,
        detail: `Nobody owns this task. Due ${formatShort(t.due_date)}.${critical}`,
        sources: [taskRef(t)],
      });
    }
    if (t.due_date < TODAY) {
      add({
        ...base,
        fingerprint: `task.overdue:${t.source_row}`,
        rule_key: "task.overdue",
        assignee: t.assignee,
        severity: t.critical_path ? 1 : 2,
        property_id: t.property_id,
        function: t.function,
        due_date: t.due_date,
        title: `Overdue — ${where}`,
        detail: `Due ${formatShort(t.due_date)}, ${daysBetween(t.due_date, TODAY)} days ago. Status: ${t.status}.${critical}`,
        sources: [taskRef(t)],
      });
    }
    const idle = daysBetween(t.last_updated, TODAY);
    if (idle > STALE_DAYS && t.status !== "Blocked") {
      add({
        ...base,
        fingerprint: `task.stale:${t.source_row}`,
        rule_key: "task.stale",
        assignee: t.assignee,
        severity: t.critical_path && daysBetween(TODAY, t.due_date) <= 21 ? 3 : 4,
        property_id: t.property_id,
        function: t.function,
        due_date: t.due_date,
        title: `No update in ${idle} days — ${where}`,
        detail: `Last updated ${formatShort(t.last_updated)}, status ${t.status}, due ${formatShort(t.due_date)}.${critical}`,
        sources: [taskRef(t)],
      });
    }
  }

  // Due dates that land on a weekend or holiday. The real deadline is earlier.
  const byTask = new Map<string, Task[]>();
  for (const t of open) {
    if (isBusinessDay(t.due_date)) continue;
    const k = `${t.task}|${t.due_date}`;
    byTask.set(k, [...(byTask.get(k) ?? []), t]);
  }
  for (const group of byTask.values()) {
    const t = group[0];
    const effective = priorBusinessDay(t.due_date);
    const holiday = holidayName(t.due_date);
    const thanksgiving = t.due_date >= "2026-11-26" && t.due_date <= "2026-11-29";
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
      weekday(t.due_date)
    ];
    const why = holiday
      ? `${holiday}`
      : thanksgiving
        ? `the ${dayName} of Thanksgiving weekend`
        : `a ${dayName}`;
    add({
      ...base,
      fingerprint: `task.non_business_due:${t.task}:${t.due_date}`,
      rule_key: "task.non_business_due",
      severity: t.critical_path && (thanksgiving || holiday) ? 2 : 3,
      property_id: null,
      function: t.function,
      due_date: effective,
      title: `"${t.task}" is due on ${why} at ${group.length} properties`,
      detail:
        `The checklist date is ${formatShort(t.due_date)}. Banks, carriers, vendors and the prior manager's office ` +
        `won't be working that day, so the real deadline is ${formatShort(effective)}` +
        `, ${daysBetween(effective, t.due_date)} ${daysBetween(effective, t.due_date) === 1 ? "day" : "days"} earlier than planned.` +
        (t.critical_path ? " It is on the critical path." : ""),
      sources: group.map((g) => taskRef(g, `${name.get(g.property_id)}`)),
    });
  }
}

function vendorRules({ properties, contracts }: Dataset, name: Names, add: Add) {
  const base = { area: "vendors" as const, function: "Procurement" };

  for (const c of contracts) {
    const where = `${name.get(c.property_id)}: ${c.vendor} (${c.service})`;
    const deadline = noticeDeadline(c);
    const cost = c.monthly_cost ? `${usd(c.monthly_cost)} a month` : "revenue share, no monthly cost";

    if (c.auto_renew && deadline < TODAY && c.term_end >= TODAY) {
      add({
        ...base,
        fingerprint: `vendor.notice_missed:${c.contract_id}`,
        rule_key: "vendor.notice_missed",
        severity: 1,
        property_id: c.property_id,
        due_date: c.term_end,
        title: `Notice window missed — ${where}`,
        detail:
          `${c.contract_id} auto-renews on ${formatShort(c.term_end)} and needed ${c.notice_days} days' notice, ` +
          `so the deadline was ${formatShort(deadline)}, ${daysBetween(deadline, TODAY)} days ago. ` +
          `It will renew at ${cost} unless the vendor agrees to a late termination or a short-term extension.` +
          (c.assignable ? "" : " It is also not assignable to a new manager."),
        sources: [contractRef(c)],
      });
    } else if (c.auto_renew && deadline >= TODAY && deadline <= NOTICE_HORIZON) {
      add({
        ...base,
        fingerprint: `vendor.notice_upcoming:${c.contract_id}`,
        rule_key: "vendor.notice_upcoming",
        severity: 2,
        property_id: c.property_id,
        due_date: deadline,
        title: `Decide by ${formatShort(deadline)} — ${where}`,
        detail:
          `${c.contract_id} auto-renews on ${formatShort(c.term_end)} with ${c.notice_days} days' notice. ` +
          `Notice must go out by ${formatShort(deadline)} (${daysBetween(TODAY, deadline)} days from today) to avoid another term at ${cost}.`,
        sources: [contractRef(c)],
      });
    }

    if (!c.auto_renew && c.term_end < TAKEOVER) {
      const lifeSafety = LIFE_SAFETY.includes(c.service);
      add({
        ...base,
        fingerprint: `vendor.lapses:${c.contract_id}`,
        rule_key: "vendor.lapses",
        severity: lifeSafety ? 1 : 2,
        property_id: c.property_id,
        due_date: c.term_end,
        title: `Service lapses before day one — ${where}`,
        detail:
          `${c.contract_id} ends ${formatShort(c.term_end)} and does not auto-renew, so there is no ${c.service.toLowerCase()} ` +
          `coverage on the December 1 takeover unless it is extended or replaced.` +
          (lifeSafety ? " This is a life-safety or access service." : "") +
          (c.assignable ? "" : " The contract is not assignable, so a new agreement is needed either way."),
        sources: [contractRef(c)],
      });
    }

    if (c.coi_expiration < TODAY) {
      add({
        ...base,
        fingerprint: `vendor.coi_expired:${c.contract_id}`,
        rule_key: "vendor.coi_expired",
        severity: 2,
        property_id: c.property_id,
        due_date: null,
        title: `Insurance certificate expired — ${where}`,
        detail:
          `The certificate of insurance on file expired ${formatShort(c.coi_expiration)}, ${daysBetween(c.coi_expiration, TODAY)} days ago. ` +
          "The vendor is working on site without proof of coverage. Request a current COI before takeover.",
        sources: [contractRef(c)],
      });
    }
  }

  for (const p of properties) {
    const mine = contracts.filter((c) => c.property_id === p.id);

    const locked = mine.filter((c) => !c.assignable && c.term_end >= TAKEOVER);
    if (locked.length) {
      add({
        ...base,
        fingerprint: `vendor.not_assignable:${p.id}`,
        rule_key: "vendor.not_assignable",
        severity: 3,
        property_id: p.id,
        due_date: TAKEOVER,
        title: `${p.name}: ${locked.length} ${locked.length === 1 ? "contract" : "contracts"} can't transfer to Asset`,
        detail:
          `${locked.map((c) => `${c.contract_id} ${c.service}`).join(", ")} run past the takeover but are not assignable to a new manager. ` +
          "Each needs the vendor's consent or a new agreement signed before December 1.",
        sources: locked.map(contractRef),
      });
    }

    const byService = new Map<string, Contract[]>();
    for (const c of mine) byService.set(c.service, [...(byService.get(c.service) ?? []), c]);
    for (const [service, group] of byService) {
      if (group.length < 2) continue;
      const total = group.reduce((sum, c) => sum + c.monthly_cost, 0);
      add({
        ...base,
        fingerprint: `vendor.duplicate_service:${p.id}:${service}`,
        rule_key: "vendor.duplicate_service",
        severity: 2,
        property_id: p.id,
        due_date: null,
        title: `${p.name}: ${group.length} ${service.toLowerCase()} contracts at one property`,
        detail:
          `${group.map((c) => `${c.contract_id} ${c.vendor} ${usd(c.monthly_cost)}`).join(" and ")}, ${usd(total)} a month together. ` +
          "Either the owner is paying twice or one contract was replaced and never closed out.",
        sources: group.map(contractRef),
      });
    }
  }
}

// Checks that only show up when the sheets are read against each other.
function crossSheetRules({ properties, units, tasks, contracts }: Dataset, name: Names, add: Add) {
  const base = { area: "cross_sheet" as const };
  const find = (propertyId: number, prefix: string) =>
    tasks.find((t) => t.property_id === propertyId && t.task.startsWith(prefix));

  for (const p of properties) {
    const mine = contracts.filter((c) => c.property_id === p.id);
    const review = find(p.id, "Review & assign/terminate vendor contracts");
    const insurance = find(p.id, "Bind property & liability insurance");
    const rentRoll = find(p.id, "Receive final rent roll");
    const yardi = find(p.id, "Set up property in Yardi");
    const ledgers = find(p.id, "Migrate resident ledgers");
    const keys = find(p.id, "Keys, access control");
    const myUnits = units.filter((u) => u.property_id === p.id);

    if (review?.notes && /hasn.t sent contracts/i.test(review.notes) && mine.length) {
      add({
        ...base,
        fingerprint: `cross.contracts_exist:${p.id}`,
        rule_key: "cross.contracts_exist",
        severity: 2,
        property_id: p.id,
        function: review.function,
        due_date: review.due_date,
        title: `${p.name}: checklist says no contracts received, vendor sheet lists ${mine.length}`,
        detail:
          `The vendor review task is blocked with the note "${review.notes}", yet ${mine.length} contracts for this property are in the vendor sheet. ` +
          "Either the block is stale and the review can start, or the vendor list was built from something other than the contracts. Ask which.",
        sources: [taskRef(review), ...mine.map(contractRef)],
      });
    }

    const vendorIssues = mine.filter(
      (c) =>
        c.coi_expiration < TODAY ||
        (c.auto_renew && noticeDeadline(c) < TODAY && c.term_end >= TODAY) ||
        (!c.auto_renew && c.term_end < TAKEOVER),
    );
    if (review?.status === "Complete" && vendorIssues.length) {
      add({
        ...base,
        fingerprint: `cross.review_complete_with_issues:${p.id}`,
        rule_key: "cross.review_complete_with_issues",
        severity: 2,
        property_id: p.id,
        function: review.function,
        due_date: null,
        title: `${p.name}: vendor review marked complete, ${vendorIssues.length} contract ${vendorIssues.length === 1 ? "problem remains" : "problems remain"}`,
        detail:
          `The checklist shows the vendor contract review as complete, yet a missed notice window, an expired COI or a lapse before takeover is still open on ${vendorIssues.map((c) => c.contract_id).join(", ")}. ` +
          "The review may have been a box-tick.",
        sources: [taskRef(review), ...vendorIssues.map(contractRef)],
      });
    }

    const expiredCoi = mine.filter((c) => c.coi_expiration < TODAY);
    if (insurance?.status === "Complete" && expiredCoi.length) {
      add({
        ...base,
        fingerprint: `cross.coi_task_complete:${p.id}`,
        rule_key: "cross.coi_task_complete",
        severity: 2,
        property_id: p.id,
        function: insurance.function,
        due_date: null,
        title: `${p.name}: "collect COIs" marked complete with an expired certificate on file`,
        detail:
          `The insurance task, which includes collecting COIs, is complete. ${expiredCoi.map((c) => `${c.contract_id} ${c.vendor}`).join(", ")} ` +
          "still shows an expired certificate.",
        sources: [taskRef(insurance), ...expiredCoi.map(contractRef)],
      });
    }

    if (rentRoll?.status === "Complete" && myUnits.length === 0) {
      add({
        ...base,
        fingerprint: `cross.rent_roll_marked_received:${p.id}`,
        rule_key: "cross.rent_roll_marked_received",
        severity: 2,
        property_id: p.id,
        function: rentRoll.function,
        due_date: null,
        title: `${p.name}: rent roll marked received, none in the data`,
        detail:
          "The checklist says the final rent roll arrived, but no rent roll for this property was provided. Find the file.",
        sources: [taskRef(rentRoll)],
      });
    }

    for (const systems of [yardi, ledgers]) {
      if (!systems || systems.status === "Not Started" || systems.status === "Blocked") continue;
      const dirty = myUnits.filter(
        (u) =>
          (isOccupied(u) && !u.resident_name) ||
          (u.lease_start && u.lease_end && u.lease_end < u.lease_start) ||
          u.sqft === 0,
      );
      if (myUnits.length === 0 || dirty.length) {
        add({
          ...base,
          fingerprint: `cross.loading_before_clean:${p.id}:${systems.source_row}`,
          rule_key: "cross.loading_before_clean",
          severity: 2,
          property_id: p.id,
          function: systems.function,
          due_date: systems.due_date,
          title:
            myUnits.length === 0
              ? `${p.name}: "${systems.task}" is ${systems.status.toLowerCase()} with no rent roll received`
              : `${p.name}: "${systems.task}" is ${systems.status.toLowerCase()} on a rent roll that isn't clean`,
          detail:
            myUnits.length === 0
              ? "This system task has moved ahead, but the data pack holds no rent roll for this property. Find out what the units, charges and ledgers were built from."
              : `The system setup is under way while ${dirty.length} rent roll rows still have missing residents, reversed lease dates or 0 sq ft. Those errors are being loaded into Yardi.`,
          sources: [taskRef(systems), ...dirty.slice(0, 6).map((u) => ({
            table: "rent_roll_units" as const,
            id: u.id,
            sheet: SHEETS.rentRoll,
            row: u.source_row,
            label: `Unit ${u.unit}`,
          }))],
        });
      }
    }

    const gate = mine.find(
      (c) => c.service === "Gate/Access Control" && ((!c.auto_renew && c.term_end < TAKEOVER) || !c.assignable),
    );
    if (gate && keys && keys.status !== "Complete") {
      add({
        ...base,
        fingerprint: `cross.access_handover:${p.id}`,
        rule_key: "cross.access_handover",
        severity: 2,
        property_id: p.id,
        function: keys.function,
        due_date: keys.due_date,
        title: `${p.name}: gate vendor contract won't carry over to the keys and access handover`,
        detail:
          `The keys, access control and gate codes handover is due ${formatShort(keys.due_date)}. ` +
          `${gate.contract_id} ${gate.vendor} ${gate.term_end < TAKEOVER ? `ends ${formatShort(gate.term_end)}` : "runs past takeover"}` +
          `${gate.assignable ? "" : " and is not assignable"}. ` +
          "Without a vendor under contract on December 1, nobody can reissue gate codes or fix an access failure.",
        sources: [taskRef(keys), contractRef(gate)],
      });
    }
  }
}
