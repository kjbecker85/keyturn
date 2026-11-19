import { NextResponse, type NextRequest } from "next/server";
import { loadDataset } from "@/lib/data/store";
import { createClient } from "@/lib/supabase/server";

// A clean, consistently typed rent roll for import. The column layout is a
// placeholder: Yardi's real import template has to be confirmed with Asset's
// Yardi team. Rejected rows are left out.
export async function GET(request: NextRequest) {
  const db = await createClient();
  const { data: claims } = await db.auth.getClaims();
  if (!claims?.claims) return new NextResponse("Sign in first.", { status: 401 });

  const propertyId = Number(request.nextUrl.searchParams.get("property"));
  const data = await loadDataset(db);
  const property = data.properties.find((p) => p.id === propertyId);
  if (!property) return new NextResponse("Unknown property.", { status: 404 });

  const header = [
    "Property", "Unit", "Floorplan", "Beds", "SqFt", "Status", "Resident", "MarketRent",
    "LeaseRent", "LeaseStart", "LeaseEnd", "Deposit", "Balance", "ReviewStatus", "SourceRow",
  ];
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = data.units
    .filter((u) => u.property_id === propertyId && u.review_status !== "rejected")
    .map((u) =>
      [
        property.name, u.unit, u.floorplan, u.beds, u.sqft, u.status, u.resident_name, u.market_rent,
        u.lease_rent, u.lease_start, u.lease_end, u.deposit, u.balance, u.review_status, u.source_row,
      ].map(cell).join(","),
    );

  return new NextResponse([header.join(","), ...lines].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${property.name.replace(/\W+/g, "-").toLowerCase()}-rent-roll.csv"`,
    },
  });
}
