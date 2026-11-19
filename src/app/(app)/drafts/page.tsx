import { DraftsList } from "@/components/drafts-list";
import { OwnerReportButton } from "@/components/owner-report-button";
import { PageHeader } from "@/components/ui";
import { aiEnabled } from "@/lib/ai/client";
import { createClient } from "@/lib/supabase/server";

export default async function DraftsPage() {
  const db = await createClient();
  const { data } = await db.from("drafts").select("*").order("created_at", { ascending: false }).limit(200);
  return (
    <>
      <PageHeader
        title="Drafts"
        subtitle="Escalations, termination notices and owner reports. Edit, then mark as sent. Nothing is emailed from this prototype."
      >
        <OwnerReportButton propertyId={null} />
      </PageHeader>
      {!aiEnabled() && (
        <p className="mx-4 mb-4 rounded-xl bg-sev3-soft px-4 py-3 text-sm text-sev3-ink md:mx-8">
          No Claude API key is configured, so drafts use a plain template and say so.
        </p>
      )}
      <DraftsList drafts={data ?? []} />
    </>
  );
}
