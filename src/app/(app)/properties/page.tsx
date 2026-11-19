import { PropertyExplorer } from "@/components/property-explorer";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import { readiness } from "@/lib/readiness";
import { createClient } from "@/lib/supabase/server";

export default async function PropertiesPage() {
  const db = await createClient();
  const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
  const rows = readiness(data.properties, data.tasks, exceptions);
  const top = Object.fromEntries(
    rows.map((r) => [
      r.property.id,
      exceptions
        .filter((e) => e.status === "open" && e.property_id === r.property.id)
        .slice(0, 4)
        .map((e) => ({ id: e.id, title: e.title, severity: e.severity })),
    ]),
  );
  return <PropertyExplorer rows={rows} top={top} />;
}
