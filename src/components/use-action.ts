"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

type Result = { ok: true } | { ok: false; error: string };

/** Runs a server action and keeps the last error for display. */
export function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (action: () => Promise<Result>) =>
    start(async () => {
      const result = await action();
      setError(result.ok ? null : result.error);
    });
  return { pending, error, run };
}

/** Scrolls to and highlights the row named by ?focus=<id>. */
export function useFocusRow(): number | null {
  const focus = Number(useSearchParams().get("focus")) || null;
  useEffect(() => {
    if (focus) document.getElementById(`row-${focus}`)?.scrollIntoView({ block: "center" });
  }, [focus]);
  return focus;
}
