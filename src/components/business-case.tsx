"use client";

import { useMemo, useState } from "react";
import { computeCase, DEFAULT_INPUTS, YEARS, type CaseFacts, type CaseInputs } from "@/lib/business-case";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const short = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(abs >= 1e5 ? 0 : 1)}k`;
  return usd(n);
};
const pct = (n: number | null, digits = 0) => (n === null ? "n/a" : `${(n * 100).toFixed(digits)}%`);

type Field = { key: keyof CaseInputs; label: string; unit: string; step: number; hint: string };

const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Owner savings",
    fields: [
      { key: "rebidPct", label: "Saved on a contract caught in time", unit: "%", step: 1, hint: "Most services are still needed. A rebid or renegotiation saves this share." },
      { key: "duplicatePct", label: "Duplicate contracts that are real", unit: "%", step: 5, hint: "Share of the duplicate pairs where one contract can be cancelled." },
      { key: "rentGapClosedPct", label: "Below-market rent gap closed", unit: "%", step: 5, hint: "Some gaps are staff units or concessions. Leases reset as they renew." },
      { key: "collectedPct", label: "Balances collected that would be lost", unit: "%", step: 5, hint: "Share of resident balances recovered because they were reviewed before cutover." },
      { key: "capRatePct", label: "Cap rate", unit: "%", step: 0.25, hint: "Turns a yearly NOI gain into a property value gain." },
    ],
  },
  {
    title: "Asset Living",
    fields: [
      { key: "feePct", label: "Management fee", unit: "% of revenue", step: 0.25, hint: "Asset earns this share of the rent the owner collects." },
      { key: "hoursPerWeek", label: "Team hours saved", unit: "hrs / week", step: 1, hint: "Status chasing, spreadsheet merging and email the tool replaces." },
      { key: "weeks", label: "Weeks of transition work", unit: "weeks", step: 1, hint: "From today, Oct 16, through the first weeks after Day One." },
      { key: "hourlyCost", label: "Loaded cost per hour", unit: "$ / hr", step: 5, hint: "Salary, benefits and overhead for the transition team." },
      { key: "retentionPts", label: "Lower chance of losing the client", unit: "points", step: 0.5, hint: "A clean Day One makes the owner less likely to leave in year one." },
      { key: "transitionsPerYear", label: "Transitions like this per year", unit: "per year", step: 1, hint: "The data pack has one. Used only for the 3-year view." },
      { key: "ebitdaMultiple", label: "EBITDA multiple", unit: "x", step: 0.5, hint: "Turns a yearly EBITDA gain into enterprise value." },
    ],
  },
  {
    title: "Cost of the tool",
    fields: [
      { key: "buildCost", label: "Build it for production", unit: "$ once", step: 1000, hint: "Real sign-in, Yardi import, security review. The prototype took about 8 hours." },
      { key: "hostingAndAi", label: "Hosting and Claude API", unit: "$ / year", step: 600, hint: "Render, Supabase and Claude calls." },
      { key: "upkeep", label: "Upkeep", unit: "$ / year", step: 1000, hint: "A few hours a month from the technology team." },
      { key: "discountPct", label: "Discount rate", unit: "%", step: 0.5, hint: "Used for NPV." },
    ],
  },
];

function Kpi({ label, value, note, tone }: { label: string; value: string; note: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-accent-strong" : tone === "bad" ? "text-[var(--sev1)]" : "";
  return (
    <div className="card p-4 md:p-5">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={`display mt-2 text-3xl leading-none font-semibold md:text-4xl ${color}`}>{value}</p>
      <p className="mt-2 text-xs text-muted">{note}</p>
    </div>
  );
}

function Line({ label, note, value, strong }: { label: string; note?: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2 ${strong ? "border-t border-[var(--line)] font-semibold" : ""}`}>
      <span className="min-w-0">
        <span className="text-sm">{label}</span>
        {note && <span className="block text-xs text-muted">{note}</span>}
      </span>
      <span className="display text-base whitespace-nowrap tabular-nums">{value}</span>
    </div>
  );
}

export function BusinessCase({ facts }: { facts: CaseFacts }) {
  const [inputs, setInputs] = useState<CaseInputs>(DEFAULT_INPUTS);
  const c = useMemo(() => computeCase(facts, inputs), [facts, inputs]);
  const set = (key: keyof CaseInputs, value: number | boolean) => setInputs((prev) => ({ ...prev, [key]: value }));
  const changed = JSON.stringify(inputs) !== JSON.stringify(DEFAULT_INPUTS);

  return (
    <div className="flex flex-col gap-5 px-4 pb-10 md:px-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="First-year ROI, this transition"
          value={c.roi.ratio === null ? "n/a" : `${c.roi.ratio.toFixed(1)}x`}
          note={`(${short(c.roi.direct)} direct + ${short(c.roi.indirect)} indirect - ${short(c.roi.cost)} cost) / ${short(c.roi.cost)}`}
          tone={c.roi.net >= 0 ? "good" : "bad"}
        />
        <Kpi
          label="Owner property value"
          value={short(c.owner.propertyValue)}
          note={`${short(c.owner.noiRunRate)} a year more NOI at a ${inputs.capRatePct}% cap rate`}
        />
        <Kpi
          label={`Asset Living NPV, ${YEARS} years`}
          value={short(c.finance.npv)}
          note={`At ${inputs.transitionsPerYear} transition${inputs.transitionsPerYear === 1 ? "" : "s"} a year and a ${inputs.discountPct}% discount rate`}
          tone={c.finance.npv >= 0 ? "good" : "bad"}
        />
        <Kpi
          label="Break-even volume"
          value={c.finance.breakEven === null ? "n/a" : `${c.finance.breakEven.toFixed(1)} / yr`}
          note="Transitions like this one a year for Asset's NPV to reach zero"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="card p-5 md:p-6">
          <h2 className="text-base font-semibold">The owner&apos;s P&amp;L</h2>
          <p className="mt-0.5 text-sm text-muted">
            Money that belongs to the property owner. It raises the property&apos;s NOI, not Asset&apos;s EBITDA. First 12 months after takeover.
          </p>
          <div className="mt-3 divide-y divide-[var(--line)]">
            <Line
              label="Duplicate contracts cancelled"
              note={`${facts.duplicates.count} pairs, ${usd(facts.duplicates.monthly)} / mo for the cheaper one, ${inputs.duplicatePct}% real`}
              value={usd(facts.duplicates.monthly * (inputs.duplicatePct / 100) * 12)}
            />
            <Line
              label="Contracts caught before the notice date"
              note={`${facts.openNotice.count} contract${facts.openNotice.count === 1 ? "" : "s"} still open, ${usd(facts.openNotice.monthly)} / mo, ${inputs.rebidPct}% saved`}
              value={usd(facts.openNotice.monthly * (inputs.rebidPct / 100) * 12)}
            />
            {inputs.countLockedIn && (
              <Line
                label="Contracts already locked in"
                note={`${facts.lockedIn.count} contracts, ${usd(facts.lockedIn.monthly)} / mo, ${inputs.rebidPct}% saved had they been caught`}
                value={usd(facts.lockedIn.monthly * (inputs.rebidPct / 100) * 12)}
              />
            )}
            <Line
              label="Rent moved toward market"
              note={`${facts.rentGap.count} paying units more than 20% under market, ${usd(facts.rentGap.monthly)} / mo gap, ${inputs.rentGapClosedPct}% closed, half a year on average`}
              value={usd(c.owner.rent)}
            />
            <Line
              label="Units at $0 rent, not counted"
              note={`${facts.zeroRent.count} occupied units at $0 against ${usd(facts.zeroRent.monthly)} / mo market. Most look vacated or mis-keyed, so they are a data fix, not revenue.`}
              value="$0"
            />
            <Line
              label="Resident balances collected"
              note={`${usd(facts.balances.total)} owed by ${facts.balances.count} residents, ${inputs.collectedPct}% recovered. One time.`}
              value={usd(c.owner.collections)}
            />
            <Line label="Owner gain, first year" value={usd(c.owner.total)} strong />
            <Line label="NOI gain, full year run rate" note="Contracts and rent, without the one-time collections" value={usd(c.owner.noiRunRate)} />
            <Line label={`Property value at a ${inputs.capRatePct}% cap rate`} value={usd(c.owner.propertyValue)} strong />
          </div>
        </section>

        <section className="card p-5 md:p-6">
          <h2 className="text-base font-semibold">Asset Living&apos;s P&amp;L</h2>
          <p className="mt-0.5 text-sm text-muted">What moves Asset&apos;s EBITDA: its fee, its own hours and keeping the client. One transition, first year.</p>
          <div className="mt-3 divide-y divide-[var(--line)]">
            <Line
              label="Fee on the owner's added revenue"
              note={`${inputs.feePct}% of the rent gained and balances collected. Vendor savings earn no fee.`}
              value={usd(c.asset.fee)}
            />
            <Line
              label="Team hours saved"
              note={`${inputs.hoursPerWeek} hrs a week for ${inputs.weeks} weeks at ${usd(inputs.hourlyCost)} an hour`}
              value={usd(c.asset.labor)}
            />
            <Line
              label="Lower risk of losing the client"
              note={`${inputs.retentionPts} points of ${usd(c.asset.annualFees)} a year in fees, from the ${facts.rentRollsReceived} rent rolls received`}
              value={usd(c.asset.retention)}
            />
            <Line label="Benefit per transition" value={usd(c.asset.total)} strong />
            <Line label="Running cost a year" note="Hosting, Claude API and upkeep" value={`-${usd(c.runCost)}`} />
            <Line
              label="EBITDA gain a year"
              note={`At ${inputs.transitionsPerYear} transition${inputs.transitionsPerYear === 1 ? "" : "s"} a year`}
              value={usd(c.finance.ebitda)}
              strong
            />
            <Line label={`Enterprise value at ${inputs.ebitdaMultiple}x`} value={usd(c.finance.enterpriseValue)} />
          </div>
        </section>
      </div>

      <section className="card p-5 md:p-6">
        <h2 className="text-base font-semibold">Discounted cash flow, Asset Living</h2>
        <p className="mt-0.5 text-sm text-muted">
          Year 0 is the production build. Each later year is the benefit per transition times transitions a year, less the running cost.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm tabular-nums">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 font-medium">Year</th>
                <th className="py-2 text-right font-medium">Benefit</th>
                <th className="py-2 text-right font-medium">Cost</th>
                <th className="py-2 text-right font-medium">Net cash</th>
                <th className="py-2 text-right font-medium">Discount factor</th>
                <th className="py-2 text-right font-medium">Present value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {c.finance.years.map((y) => (
                <tr key={y.year}>
                  <td className="py-2">{y.year}</td>
                  <td className="py-2 text-right">{usd(y.inflow)}</td>
                  <td className="py-2 text-right">-{usd(y.outflow)}</td>
                  <td className="py-2 text-right">{usd(y.net)}</td>
                  <td className="py-2 text-right">{y.factor.toFixed(3)}</td>
                  <td className="py-2 text-right">{usd(y.pv)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2" colSpan={5}>NPV</td>
                <td className="py-2 text-right">{usd(c.finance.npv)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <p className="chip justify-between">IRR <b>{pct(c.finance.irr, 1)}</b></p>
          <p className="chip justify-between">MOIC <b>{c.finance.moic === null ? "n/a" : `${c.finance.moic.toFixed(2)}x`}</b></p>
          <p className="chip justify-between">
            Payback <b>{c.finance.paybackMonths === null ? "never" : `${Math.round(c.finance.paybackMonths)} mo`}</b>
          </p>
          <p className="chip justify-between">EBITDA / yr <b>{short(c.finance.ebitda)}</b></p>
        </div>
        <p className="mt-3 text-xs text-muted">
          MOIC here is three years of net cash divided by the build cost. Payback is the build cost divided by yearly net cash.
        </p>
      </section>

      <section className="card border-l-4 border-l-[var(--sev1)] p-5 md:p-6">
        <h2 className="text-base font-semibold">Already lost before Keyturn</h2>
        <p className="mt-1 text-sm">
          {facts.lockedIn.count} auto-renewing contracts passed their notice date before today
          {facts.lockedIn.revenueShare > 0 && ` (${facts.lockedIn.revenueShare} are laundry revenue-share deals with no monthly cost)`}. They renew at{" "}
          {usd(facts.lockedIn.monthly)} a month,
          or {usd(facts.lockedIn.monthly * 12)} a year, whether the owner wants them or not. This is not counted above, because the tool can&apos;t get it
          back. It is what the tool prevents on the next transition.
        </p>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={inputs.countLockedIn} onChange={(e) => set("countLockedIn", e.target.checked)} />
          Count them, as if Keyturn had been running when the deal was signed
        </label>
      </section>

      <section className="card p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Assumptions</h2>
            <p className="mt-0.5 text-sm text-muted">
              Facts come from the data pack. These are the judgment calls. Change any of them and every number above updates.
            </p>
          </div>
          <button type="button" className="btn btn-quiet" disabled={!changed} onClick={() => setInputs(DEFAULT_INPUTS)}>
            Reset to defaults
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="eyebrow mb-2">{g.title}</p>
              <div className="flex flex-col gap-3">
                {g.fields.map((f) => (
                  <label key={f.key} className="block" title={f.hint}>
                    <span className="flex items-baseline justify-between gap-2 text-sm">
                      <span>{f.label}</span>
                      <span className="text-xs text-muted">{f.unit}</span>
                    </span>
                    <input
                      type="number"
                      className="field mt-1 tabular-nums"
                      min={0}
                      step={f.step}
                      value={inputs[f.key] as number}
                      onChange={(e) => set(f.key, Math.max(0, Number(e.target.value) || 0))}
                    />
                    <span className="mt-1 block text-xs text-muted">{f.hint}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-muted">
        Facts from the data pack: {facts.rentRollsReceived} of {facts.properties} rent rolls received, so rent, balance and fee figures cover only
        those properties and understate the deal. Contract figures cover all {facts.properties}.
      </p>
    </div>
  );
}
