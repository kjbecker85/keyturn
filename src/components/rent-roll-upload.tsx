"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UploadSimple } from "@phosphor-icons/react";
import { uploadRentRoll } from "@/app/(app)/actions";
import type { RawCell } from "@/lib/data/normalize";
import { STATUS_LABEL } from "@/lib/data/normalize";
import { FIELD_LABEL, parseCsv, readRentRoll, REQUIRED, type Field } from "@/lib/data/rent-roll-import";
import type { Contract, Property, Task } from "@/lib/data/types";
import { runRules, usd } from "@/lib/rules";
import { RULES } from "@/lib/rules/catalog";

type Parsed = { fileName: string; headers: string[]; rows: RawCell[][] };

/** ExcelJS cell values to the raw cells the normalizers expect. Dates keep their day. */
function toRaw(v: unknown): RawCell {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return { excelDate: v.toISOString().slice(0, 10) };
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "Y" : "N";
  if (typeof v === "object") {
    const o = v as { result?: unknown; richText?: { text: string }[]; text?: string };
    if ("result" in o) return toRaw(o.result);
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (typeof o.text === "string") return o.text;
  }
  return String(v);
}

async function readFile(file: File): Promise<Parsed> {
  if (/\.csv$/i.test(file.name)) {
    const [headers = [], ...rows] = parseCsv(await file.text());
    return { fileName: file.name, headers, rows: rows.map((r) => r.map((c) => (c === "" ? null : c))) };
  }
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  // Use the first sheet whose first row has a unit column.
  const sheet =
    wb.worksheets.find((ws) =>
      (ws.getRow(1).values as unknown[]).some((v) => /^unit\b/i.test(String(toRaw(v) ?? ""))),
    ) ?? wb.worksheets[0];
  if (!sheet) throw new Error("The workbook has no sheets.");
  const width = sheet.columnCount;
  const row = (n: number) => Array.from({ length: width }, (_, i) => toRaw(sheet.getRow(n).getCell(i + 1).value));
  const headers = row(1).map((h) => String(h ?? ""));
  const rows = Array.from({ length: Math.max(0, sheet.rowCount - 1) }, (_, i) => row(i + 2));
  return { fileName: file.name, headers, rows };
}

export function RentRollUpload({
  properties,
  tasks,
  contracts,
  unitCounts,
}: {
  properties: Property[];
  tasks: Task[];
  contracts: Contract[];
  unitCounts: Record<number, number>;
}) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties.find((p) => !p.rent_roll_received)?.id ?? properties[0]?.id);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const property = properties.find((p) => p.id === propertyId)!;

  const read = useMemo(() => (parsed ? readRentRoll(parsed.headers, parsed.rows, property) : null), [parsed, property]);

  // What the rules will raise once these rows load, before anything is saved.
  const preview = useMemo(() => {
    if (!read || read.error) return [];
    const units = read.units.map((u, i) => ({ ...u, id: -(i + 1), review_status: "unreviewed" as const, review_note: null }));
    return runRules({ properties, units, tasks, contracts }).filter(
      (e) => e.property_id === property.id && (e.area === "rent_roll" || e.area === "cross_sheet"),
    );
  }, [read, properties, tasks, contracts, property]);

  const byRule = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of preview) counts.set(e.rule_key, (counts.get(e.rule_key) ?? 0) + 1);
    return [...counts].map(([key, n]) => ({ label: RULES.find((r) => r.key === key)?.label ?? key, n }));
  }, [preview]);

  const existing = unitCounts[property.id] ?? 0;
  const mapped = read ? (Object.keys(read.mapping) as Field[]).filter((f) => read.mapping[f] !== null) : [];

  return (
    <div className="grid grid-cols-1 gap-5 px-4 pb-10 md:px-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section className="card flex flex-col gap-4 p-5 md:p-6">
        <label className="block text-sm">
          <span className="font-medium">Property</span>
          <select className="field mt-1" value={propertyId} onChange={(e) => setPropertyId(Number(e.target.value))}>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.rent_roll_received ? `(${unitCounts[p.id] ?? 0} units loaded)` : "(no rent roll yet)"}
              </option>
            ))}
          </select>
        </label>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line px-4 py-8 text-center text-sm transition hover:border-accent">
          <UploadSimple weight="duotone" className="size-8 text-accent-strong" />
          <span className="font-medium">{parsed ? parsed.fileName : "Choose a CSV or Excel file"}</span>
          <span className="text-xs text-muted">
            One row per unit. Headers are matched by name, so the prior manager&apos;s own layout works.
          </span>
          <input
            type="file"
            accept=".csv,.xlsx"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setError(null);
              setParsed(null);
              if (!file) return;
              try {
                setParsed(await readFile(file));
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not read that file.");
              }
            }}
          />
        </label>
        <p className="text-xs text-muted">
          Needs columns for {REQUIRED.map((f) => FIELD_LABEL[f].toLowerCase()).join(", ")}. Synthetic sample files:{" "}
          Brazos Landing (<a className="underline" href="/samples/brazos-landing-rent-roll.xlsx">Excel</a>,{" "}
          <a className="underline" href="/samples/brazos-landing-rent-roll.csv">CSV</a>, a different column layout) and Trinity Bluffs (
          <a className="underline" href="/samples/trinity-bluffs-rent-roll.xlsx">Excel</a>,{" "}
          <a className="underline" href="/samples/trinity-bluffs-rent-roll.csv">CSV</a>).
        </p>

        {read && (
          <div className="text-sm">
            <p className="eyebrow mb-1.5">Columns found</p>
            <ul className="flex flex-wrap gap-1.5">
              {(Object.keys(FIELD_LABEL) as Field[]).map((f) => (
                <li key={f} className={`chip ${read.mapping[f] === null ? "opacity-50" : ""}`} title={read.mapping[f] === null ? "Not in this file" : `From "${parsed!.headers[read.mapping[f]!]}"`}>
                  {FIELD_LABEL[f]}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">
              {mapped.length} of {Object.keys(FIELD_LABEL).length} columns matched.
              {read.skipped > 0 && ` ${read.skipped} rows for other properties are skipped.`}
            </p>
          </div>
        )}

        {(error || read?.error) && <p className="text-sm text-danger">{error ?? read?.error}</p>}

        {read && !read.error && (
          <div className="mt-auto flex flex-col gap-2">
            {existing > 0 && (
              <p className="rounded-lg bg-sev2-soft px-3 py-2 text-xs text-sev2-ink">
                This replaces the {existing} units already loaded for {property.name}, along with their review status.
              </p>
            )}
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await uploadRentRoll(property.id, parsed!.fileName, parsed!.headers, parsed!.rows);
                  if (!result.ok) setError(result.error);
                  else router.push(`/rent-roll?property=${property.id}`);
                })
              }
            >
              {pending ? "Loading…" : `Load ${read.units.length} units for ${property.name}`}
            </button>
          </div>
        )}
      </section>

      <section className="card min-w-0 p-5 md:p-6">
        <h2 className="text-base font-semibold">Before it loads</h2>
        {!read || read.error ? (
          <p className="mt-1 text-sm text-muted">
            Choose a file to see how each row reads and what the rules will flag. Nothing is saved until you load it.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted">
              {read.units.length} units read. Once loaded, {property.name} will have {preview.length} rent roll and contradiction flag
              {preview.length === 1 ? "" : "s"}, including any already open.
            </p>
            {byRule.length > 0 && (
              <ul className="mt-3 divide-y divide-line text-sm">
                {byRule.map((r) => (
                  <li key={r.label} className="flex justify-between gap-3 py-1.5">
                    <span>{r.label}</span>
                    <span className="tabular-nums font-semibold">{r.n}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 overflow-x-auto">
              <table className="tbl w-full min-w-[640px] text-sm">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Unit</th>
                    <th>Status</th>
                    <th>Resident</th>
                    <th className="!text-right">Market</th>
                    <th className="!text-right">Lease rent</th>
                    <th>Lease</th>
                  </tr>
                </thead>
                <tbody>
                  {read.units.slice(0, 12).map((u) => (
                    <tr key={u.source_row}>
                      <td className="text-muted">{u.source_row}</td>
                      <td>{u.unit}</td>
                      <td>{STATUS_LABEL[u.status]}</td>
                      <td>{u.resident_name ?? <span className="text-faint">none</span>}</td>
                      <td className="text-right">{u.market_rent === null ? "?" : usd(u.market_rent)}</td>
                      <td className="text-right">{u.lease_rent === null ? "?" : usd(u.lease_rent)}</td>
                      <td className="text-xs">{u.lease_start ?? "?"} to {u.lease_end ?? "?"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {read.units.length > 12 && <p className="mt-2 text-xs text-muted">Showing 12 of {read.units.length} rows.</p>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
