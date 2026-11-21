import { NextResponse } from "next/server";
import { contractColumns, exceptionColumns, taskColumns, unitColumns } from "@/lib/export-columns";
import { flagsFor } from "@/lib/flags";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import { toSheet, toXlsx } from "@/lib/table-export";
import { createClient } from "@/lib/supabase/server";

// Everything in one Excel workbook: every exception and every record, with its open flags.
export async function GET() {
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  if (!claims?.claims) return new NextResponse("Sign in first.", { status: 401 });

  const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
  const name = new Map(data.properties.map((p) => [p.id, p.name]));
  const property = (id: number | null) => (id === null ? "Portfolio" : (name.get(id) ?? ""));

  const buf = await toXlsx([
    toSheet("Exceptions", exceptionColumns(property), exceptions),
    toSheet("Rent roll", unitColumns(property, flagsFor(exceptions, "rent_roll_units")), data.units),
    toSheet("Checklist", taskColumns(property, flagsFor(exceptions, "tasks")), data.tasks),
    toSheet("Vendor contracts", contractColumns(property, flagsFor(exceptions, "vendor_contracts")), data.contracts),
    toSheet(
      "Properties",
      [
        { header: "Property", value: (p) => p.name, width: 26 },
        { header: "Market", value: (p) => p.market },
        { header: "Prior manager code", value: (p) => p.pm_code },
        { header: "Rent roll received", value: (p) => (p.rent_roll_received ? "Y" : "N") },
      ],
      data.properties,
    ),
  ]);

  return new NextResponse(buf, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="keyturn-everything.xlsx"',
    },
  });
}
