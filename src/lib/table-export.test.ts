import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { toCsv, toSheet, toXlsx } from "./table-export";

const sheet = toSheet(
  "Test",
  [
    { header: "Name", value: (r: { a: string; b: number | null }) => r.a },
    { header: "Amount", value: (r: { a: string; b: number | null }) => r.b },
  ],
  [
    { a: "=1+1", b: 5 },
    { a: 'x, "y"', b: null },
  ],
);

describe("table export", () => {
  it("quotes commas and blocks formulas in CSV", () => {
    expect(toCsv(sheet)).toBe('Name,Amount\r\n\'=1+1,5\r\n"x, ""y""",');
  });

  it("writes an Excel file that reads back", async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(await toXlsx([sheet]));
    const ws = wb.getWorksheet("Test")!;
    expect(ws.getCell("A1").value).toBe("Name");
    expect(ws.getCell("A2").value).toBe("'=1+1");
    expect(ws.getCell("B2").value).toBe(5);
    expect(ws.getCell("A3").value).toBe('x, "y"');
  });
});
