"use client";

import { resetDemoAction } from "@/app/(app)/actions";
import { useAction } from "./use-action";

export function ResetButton() {
  const { pending, error, run } = useAction();
  return (
    <div>
      <button
        type="button"
        className="btn"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Reload the data pack? This discards every edit, draft and audit row.")) run(resetDemoAction);
        }}
      >
        {pending ? "Reloading…" : "Reset demo data"}
      </button>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
