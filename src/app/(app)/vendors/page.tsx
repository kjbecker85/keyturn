import { VendorsTable } from "@/components/vendors-table";
import { PageHeader } from "@/components/ui";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import { flagsFor } from "@/lib/flags";
import { usd } from "@/lib/rules";
import { createClient } from "@/lib/supabase/server";

export default async function VendorsPage() {
  const db = await createClient();
  const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
  const monthly = data.contracts.reduce((sum, c) => sum + c.monthly_cost, 0);
  return (
    <>
      <PageHeader
        title="Vendor contracts"
        subtitle={`${data.contracts.length} contracts, ${usd(monthly)} a month. Record a decision on each one and draft the notice from here.`}
      />
      <VendorsTable
        contracts={data.contracts}
        properties={data.properties}
        flags={flagsFor(exceptions, "vendor_contracts")}
      />
    </>
  );
}
