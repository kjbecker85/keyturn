// The business case for Keyturn on this one transition, in two views.
//
// Owner view: vendor savings, rent moved toward market and balances collected all
// belong to the property owner. They raise the property's net operating income (NOI).
// Asset Living view: Asset earns a fee on the owner's revenue, saves its own team's
// hours, and is less likely to lose the client. Only these move Asset's EBITDA.
//
// Every fact comes from the data pack. Every assumption is a named input someone
// can change on the Business case screen.
import { TODAY } from "./dates";
import { BELOW_MARKET_PCT, NOTICE_HORIZON, noticeDeadline } from "./rules";
import type { Dataset } from "./data/types";

export type CaseFacts = {
  /** Auto-renewing contracts whose notice date passed before today. Already lost. */
  lockedIn: { monthly: number; count: number; revenueShare: number };
  /** Auto-renewing contracts whose notice date is still ahead (by Dec 31), not counted as duplicates. */
  openNotice: { monthly: number; count: number };
  /** The cheaper contract of each pair that covers the same service at one property. */
  duplicates: { monthly: number; count: number };
  /** Occupied units paying rent, but more than 20% under market: the monthly gap. */
  rentGap: { monthly: number; count: number };
  /** Occupied units at $0 rent. Most look vacated or are data errors, so they are not counted as revenue. */
  zeroRent: { monthly: number; count: number };
  /** Resident balances owed in the rent rolls received. */
  balances: { total: number; count: number };
  /** Monthly lease rent of occupied units in the rent rolls received. The base for Asset's fee. */
  leaseRent: number;
  rentRollsReceived: number;
  properties: number;
};

export type CaseInputs = {
  rebidPct: number;
  countLockedIn: boolean;
  duplicatePct: number;
  rentGapClosedPct: number;
  collectedPct: number;
  capRatePct: number;
  feePct: number;
  hoursPerWeek: number;
  weeks: number;
  hourlyCost: number;
  retentionPts: number;
  transitionsPerYear: number;
  ebitdaMultiple: number;
  buildCost: number;
  hostingAndAi: number;
  upkeep: number;
  discountPct: number;
};

export const DEFAULT_INPUTS: CaseInputs = {
  rebidPct: 15,
  countLockedIn: false,
  duplicatePct: 100,
  rentGapClosedPct: 50,
  collectedPct: 20,
  capRatePct: 5.5,
  feePct: 3,
  hoursPerWeek: 20,
  weeks: 12,
  hourlyCost: 65,
  retentionPts: 2,
  transitionsPerYear: 1,
  ebitdaMultiple: 12,
  buildCost: 30000,
  hostingAndAi: 3600,
  upkeep: 6000,
  discountPct: 10,
};

export const YEARS = 3;

export function caseFacts(data: Dataset): CaseFacts {
  const groups = new Map<string, typeof data.contracts>();
  for (const c of data.contracts) {
    const key = `${c.property_id}:${c.service}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  // In each duplicate pair, the cheaper contract is the one to cancel.
  const dupCancel = [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => g.reduce((a, b) => (b.monthly_cost < a.monthly_cost ? b : a)));
  const dupIds = new Set(dupCancel.map((c) => c.id));

  const lockedIn = data.contracts.filter((c) => c.auto_renew && noticeDeadline(c) < TODAY && c.term_end >= TODAY);
  const openNotice = data.contracts.filter(
    (c) => c.auto_renew && noticeDeadline(c) >= TODAY && noticeDeadline(c) <= NOTICE_HORIZON && !dupIds.has(c.id),
  );
  const occupied = data.units.filter((u) => u.status === "occupied" || u.status === "notice");
  const below = occupied.filter(
    (u) => u.market_rent && u.lease_rent !== null && (u.market_rent - u.lease_rent) / u.market_rent > BELOW_MARKET_PCT,
  );
  const gap = below.filter((u) => (u.lease_rent ?? 0) > 0);
  const zero = below.filter((u) => u.lease_rent === 0);
  const owing = data.units.filter((u) => (u.balance ?? 0) > 0);
  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

  return {
    lockedIn: {
      monthly: sum(lockedIn.map((c) => c.monthly_cost)),
      count: lockedIn.length,
      revenueShare: lockedIn.filter((c) => c.monthly_cost === 0).length,
    },
    openNotice: { monthly: sum(openNotice.map((c) => c.monthly_cost)), count: openNotice.length },
    duplicates: { monthly: sum(dupCancel.map((c) => c.monthly_cost)), count: dupCancel.length },
    rentGap: { monthly: Math.round(sum(gap.map((u) => (u.market_rent ?? 0) - (u.lease_rent ?? 0)))), count: gap.length },
    zeroRent: { monthly: Math.round(sum(zero.map((u) => u.market_rent ?? 0))), count: zero.length },
    balances: { total: Math.round(sum(owing.map((u) => u.balance ?? 0))), count: owing.length },
    leaseRent: Math.round(sum(occupied.map((u) => u.lease_rent ?? 0))),
    rentRollsReceived: data.properties.filter((p) => p.rent_roll_received).length,
    properties: data.properties.length,
  };
}

export type CaseResult = ReturnType<typeof computeCase>;

/** All the math, in one place, so it can be checked by hand and by tests. */
export function computeCase(f: CaseFacts, a: CaseInputs) {
  const pct = (n: number) => n / 100;

  // --- Owner: one transition, first 12 months after takeover ---
  const contractMonthly =
    f.openNotice.monthly * pct(a.rebidPct) +
    f.duplicates.monthly * pct(a.duplicatePct) +
    (a.countLockedIn ? f.lockedIn.monthly * pct(a.rebidPct) : 0);
  const rentMonthly = f.rentGap.monthly * pct(a.rentGapClosedPct);
  const owner = {
    contracts: contractMonthly * 12,
    // Below-market leases reset as they renew, spread across the year: half a year on average.
    rent: rentMonthly * 6,
    collections: f.balances.total * pct(a.collectedPct),
    noiRunRate: (contractMonthly + rentMonthly) * 12,
    total: 0,
    propertyValue: 0,
  };
  owner.total = owner.contracts + owner.rent + owner.collections;
  owner.propertyValue = owner.noiRunRate / pct(a.capRatePct);

  // --- Asset Living: one transition ---
  const annualFees = f.leaseRent * 12 * pct(a.feePct);
  const asset = {
    fee: (owner.rent + owner.collections) * pct(a.feePct),
    labor: a.hoursPerWeek * a.weeks * a.hourlyCost,
    retention: annualFees * pct(a.retentionPts),
    annualFees,
    total: 0,
  };
  asset.total = asset.fee + asset.labor + asset.retention;

  // --- Cash flows for Asset Living over three years ---
  const runCost = a.hostingAndAi + a.upkeep;
  const r = pct(a.discountPct);
  const benefit = asset.total * a.transitionsPerYear;
  const years = Array.from({ length: YEARS + 1 }, (_, t) => {
    const inflow = t === 0 ? 0 : benefit;
    const outflow = t === 0 ? a.buildCost : runCost;
    const net = inflow - outflow;
    const factor = 1 / (1 + r) ** t;
    return { year: t, inflow, outflow, net, factor, pv: net * factor };
  });
  const npv = years.reduce((s, y) => s + y.pv, 0);
  const annuity = years.slice(1).reduce((s, y) => s + y.factor, 0);
  const netAnnual = benefit - runCost;
  const finance = {
    years,
    npv,
    irr: irr(years.map((y) => y.net)),
    // Cash back over three years for each dollar spent building it.
    moic: a.buildCost > 0 ? (netAnnual * YEARS) / a.buildCost : null,
    paybackMonths: netAnnual > 0 ? (a.buildCost / netAnnual) * 12 : null,
    ebitda: netAnnual,
    enterpriseValue: netAnnual * a.ebitdaMultiple,
    // Transitions a year at which the three-year NPV is zero.
    breakEven: asset.total > 0 ? (a.buildCost + runCost * annuity) / (asset.total * annuity) : null,
  };

  // --- ROI = (direct + indirect - cost) / cost, for this one transition's first year ---
  // Direct is money recovered for the owner. Indirect is Asset's hours saved and lower
  // risk of losing the client. Asset's fee is paid out of the owner's gains, so it is
  // not added a second time.
  const direct = owner.total;
  const indirect = asset.labor + asset.retention;
  const cost = a.buildCost + runCost;
  const roi = { direct, indirect, cost, net: direct + indirect - cost, ratio: cost > 0 ? (direct + indirect - cost) / cost : null };

  return { owner, asset, runCost, finance, roi };
}

/** Internal rate of return by bisection. Null when there is no sign change. */
export function irr(flows: number[]): number | null {
  const npvAt = (rate: number) => flows.reduce((s, x, t) => s + x / (1 + rate) ** t, 0);
  let lo = -0.99;
  let hi = 10;
  if (npvAt(lo) * npvAt(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npvAt(lo) * npvAt(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}
