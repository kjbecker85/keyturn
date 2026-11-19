import { RentRollTable } from "@/components/rent-roll-table";
import { PageHeader } from "@/components/ui";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import { flagsFor } from "@/lib/flags";
import { createClient } from "@/lib/supabase/server";

export default async function RentRollPage() {
  const db = await createClient();
  const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
  const missing = data.properties.filter((p) => !p.rent_roll_received);
  return (
    <>
      <PageHeader
        title="Rent roll intake"
        subtitle={`${data.units.length} units from the prior manager, normalized. Each row keeps its raw cells. Review the flagged rows before anything loads into Yardi.`}
      />
      <p className="mx-4 mb-4 rounded-xl bg-sev2-soft px-4 py-3 text-sm text-sev2-ink md:mx-8">
        No rent roll received for {missing.length} of {data.properties.length} properties:{" "}
        {missing.map((p) => p.name).join(", ")}.
      </p>
      <RentRollTable
        units={data.units}
        properties={data.properties.filter((p) => p.rent_roll_received)}
        flags={flagsFor(exceptions, "rent_roll_units")}
      />
    </>
  );
}
