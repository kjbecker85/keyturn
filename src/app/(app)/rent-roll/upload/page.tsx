import { redirect } from "next/navigation";
import { RentRollUpload } from "@/components/rent-roll-upload";
import { PageHeader } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { loadDataset } from "@/lib/data/store";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Upload a rent roll" };

export default async function RentRollUploadPage() {
  const user = await getUser();
  if (user.role !== "director") redirect("/rent-roll");
  const db = await createClient();
  const data = await loadDataset(db);
  const unitCounts: Record<number, number> = {};
  for (const u of data.units) unitCounts[u.property_id] = (unitCounts[u.property_id] ?? 0) + 1;
  return (
    <>
      <PageHeader
        title="Upload a rent roll"
        subtitle="Load a property's rent roll from the prior manager's CSV or Excel export. It is cleaned the same way as the data pack, and every row keeps its original cells."
      />
      <RentRollUpload properties={data.properties} tasks={data.tasks} contracts={data.contracts} unitCounts={unitCounts} />
    </>
  );
}
