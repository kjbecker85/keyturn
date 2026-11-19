"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBrief } from "@/app/(app)/brief/actions";

export function SaveBriefButton({ recipient, subject, body }: { recipient: string; subject: string; body: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await saveBrief(recipient, subject, body);
          if (result.ok) router.push(`/drafts?focus=${result.id}`);
          else window.alert(result.error);
        })
      }
    >
      {pending ? "Saving…" : "Save to drafts"}
    </button>
  );
}
