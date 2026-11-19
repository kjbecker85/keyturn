"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { draftEscalation } from "@/app/(app)/drafts/actions";

export function DraftButton({ exceptionId }: { exceptionId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await draftEscalation(exceptionId);
          if (result.ok) router.push(`/drafts?focus=${result.id}`);
          else window.alert(result.error);
        })
      }
    >
      {pending ? "Drafting…" : "Draft escalation"}
    </button>
  );
}
