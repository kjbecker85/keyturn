import { ResetButton } from "@/components/reset-button";
import { PageHeader } from "@/components/ui";
import { aiEnabled } from "@/lib/ai/client";
import { getUser } from "@/lib/auth";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import { formatDate, TAKEOVER, TODAY } from "@/lib/dates";
import { AREA_LABEL } from "@/lib/data/types";
import { RULES } from "@/lib/rules/catalog";
import { createClient } from "@/lib/supabase/server";

const ASSUMPTIONS = [
  `"Today" is fixed at ${formatDate(TODAY)}, the data pack's as-of date. The takeover is ${formatDate(TAKEOVER)}.`,
  "All data is synthetic. Messy values are flagged for a person to review and are never silently fixed. Each row keeps its original cells.",
  "The rent roll covers 3 of the 9 properties. The other 6 are shown as not received, which is itself a flag.",
  "Unit statuses O, Occ and Occupied are treated as occupied. Notice is occupied with a move-out pending. VR and VNR are the two vacant statuses.",
  "An occupied unit whose lease ended before today is treated as month-to-month.",
  "A contract's notice deadline is its current term end minus its termination notice days.",
  "The Friday after Thanksgiving is treated as a closed day. Federal holidays come from the Nager.Date public holiday list.",
  "Pin locations on the map are invented points inside each property's city. The data pack has no addresses.",
  "The demo people Dana Whitfield and Luis Ortega are invented. T. Nguyen and the other assignees come from the checklist.",
  "Emails are drafted and logged as sent. Nothing is actually emailed.",
  "The Yardi export is a clean CSV in a placeholder layout. Yardi's real import template has to be confirmed with Asset's Yardi team.",
];

const NOT_BUILT = [
  "Machine-learning forecasts. Readiness is arithmetic you can check, because one snapshot of 126 tasks is not enough to train on.",
  "Uploading checklist or vendor files. Rent rolls can be uploaded, but the checklist and contracts come from the data pack only.",
  "Sending email, and any live Yardi connection.",
  "Weather, Census and flood overlays. Dec 1 is outside any forecast window on Oct 16, so a weather panel would have been decoration.",
  "Real sign-in. The demo roles need no password, which is wrong for anything but synthetic data.",
];

export default async function AboutPage() {
  const user = await getUser();
  const db = await createClient();
  const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
  const raw = (key: string) => data.units.map((u) => String(u.raw[key] ?? ""));
  const formats = {
    unit: new Set(raw("Unit").map((v) => (v.startsWith("Apt") ? "Apt 1101" : v.startsWith("#") ? "#1101" : "1101"))),
    status: new Set(raw("Unit Status")),
    money: new Set(raw("Market Rent").map((v) => (v.startsWith("$") ? "$1,325.00 text" : "plain number"))),
    date: new Set(
      raw("Lease Start").filter(Boolean).map((v) => (v.includes("Excel") ? "Excel date" : v.includes("/") ? "MM/DD/YYYY text" : "YYYY-MM-DD text")),
    ),
  };

  return (
    <>
      <PageHeader title="Assumptions and limits" subtitle="What this prototype assumes, what it found, and what it deliberately leaves out." />
      <div className="grid grid-cols-1 gap-5 px-4 pb-10 md:px-8 lg:grid-cols-2">
        <section className="card p-5 md:p-6">
          <h2 className="text-base font-semibold">Assumptions</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
            {ASSUMPTIONS.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </section>

        <section className="card p-5 md:p-6">
          <h2 className="text-base font-semibold">Deliberately not built</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
            {NOT_BUILT.map((a) => <li key={a}>{a}</li>)}
          </ul>
          <h2 className="mt-6 text-base font-semibold">What the prior manager&apos;s export looked like</h2>
          <dl className="mt-2 space-y-1.5 text-sm">
            <div><dt className="inline text-muted">Unit numbers: </dt><dd className="inline">{[...formats.unit].join(", ")}</dd></div>
            <div><dt className="inline text-muted">Status spellings ({formats.status.size}): </dt><dd className="inline">{[...formats.status].join(", ")}</dd></div>
            <div><dt className="inline text-muted">Money: </dt><dd className="inline">{[...formats.money].join(", ")}</dd></div>
            <div><dt className="inline text-muted">Dates: </dt><dd className="inline">{[...formats.date].join(", ")}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-muted">
            AI features: {aiEnabled() ? "Claude is connected. The assistant and drafts cite the rows they used." : "no Claude key on this deployment, so the assistant is off and drafts use a labeled template."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="btn" href="/api/export/workbook">Download everything (Excel)</a>
            {user.role === "director" && <ResetButton />}
          </div>
        </section>

        <section className="card p-5 md:p-6 lg:col-span-2">
          <h2 className="text-base font-semibold">Rules and what they caught</h2>
          <p className="mt-1 text-sm text-muted">
            {RULES.length} rules, no model. Counts are live and change as records are edited.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr className="border-b border-line">
                  <th className="py-1.5 pr-3 font-medium">Area</th>
                  <th className="py-1.5 pr-3 font-medium">Rule</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Open</th>
                  <th className="py-1.5 text-right font-medium">Closed</th>
                </tr>
              </thead>
              <tbody>
                {RULES.map((r) => {
                  const mine = exceptions.filter((e) => e.rule_key === r.key);
                  const open = mine.filter((e) => e.status === "open").length;
                  return (
                    <tr key={r.key} className="border-b border-line/60">
                      <td className="py-1.5 pr-3 text-muted">{AREA_LABEL[r.area]}</td>
                      <td className="py-1.5 pr-3">{r.label}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{open}</td>
                      <td className="py-1.5 text-right tabular-nums text-muted">{mine.length - open}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
