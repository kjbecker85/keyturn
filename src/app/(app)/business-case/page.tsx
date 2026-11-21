import { BusinessCase } from "@/components/business-case";
import { PageHeader } from "@/components/ui";
import { caseFacts } from "@/lib/business-case";
import { loadDataset } from "@/lib/data/store";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Business case" };

export default async function BusinessCasePage() {
  const db = await createClient();
  const data = await loadDataset(db);
  return (
    <>
      <PageHeader
        title="Business case"
        subtitle="What this transition is worth to the owner and to Asset Living, against what the tool costs. Facts come from the data pack. Every assumption is yours to change."
      />
      <BusinessCase facts={caseFacts(data)} />
    </>
  );
}
