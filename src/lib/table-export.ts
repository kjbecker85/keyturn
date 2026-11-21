// Turns any list on screen into a CSV or Excel file. Used in the browser for the
// current filtered view, and on the server for the full workbook.

export type Cell = string | number | boolean | null | undefined;
export type Column<T> = { header: string; value: (row: T) => Cell; width?: number };
export type Sheet = { name: string; headers: string[]; rows: Cell[][]; widths?: number[] };

export function toSheet<T>(name: string, columns: Column<T>[], rows: T[]): Sheet {
  return {
    name,
    headers: columns.map((c) => c.header),
    rows: rows.map((r) => columns.map((c) => c.value(r))),
    widths: columns.map((c) => c.width ?? Math.min(48, Math.max(10, c.header.length + 4))),
  };
}

/** Text that a spreadsheet would run as a formula gets a leading quote. */
const safe = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

export function toCsv(sheet: Sheet): string {
  const cell = (v: Cell) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "string" ? safe(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [sheet.headers, ...sheet.rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

export async function toXlsx(sheets: Sheet[]): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Keyturn";
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.addRow(s.headers).font = { bold: true };
    for (const r of s.rows) ws.addRow(r.map((v) => (typeof v === "string" ? safe(v) : (v ?? null))));
    s.widths?.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: s.headers.length } };
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export function fileName(base: string, ext: string) {
  return `keyturn-${base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.${ext}`;
}
