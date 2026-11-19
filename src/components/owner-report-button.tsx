"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { draftReport } from "@/app/(app)/drafts/actions";

export function OwnerReportButton({ propertyId }: { propertyId: number | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await draftReport(propertyId);
          if (result.ok) router.push(`/drafts?focus=${result.id}`);
          else window.alert(result.error);
        })
      }
    >
      {pending ? "Drafting…" : propertyId ? "Draft owner report" : "Draft portfolio owner report"}
    </button>
  );
}
