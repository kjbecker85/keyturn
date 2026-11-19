"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const TABLES = ["exceptions", "tasks", "vendor_contracts", "rent_roll_units", "drafts"];

/** Refreshes the current screen when someone else changes the data. */
export function Realtime() {
  const router = useRouter();

  useEffect(() => {
    const db = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };
    const channel = db.channel("keyturn-live");
    for (const table of TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    let cancelled = false;
    // Row level security applies to live updates too, so the socket needs
    // the user's token before it subscribes.
    db.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      await db.realtime.setAuth(data.session?.access_token ?? null);
      channel.subscribe();
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      db.removeChannel(channel);
    };
  }, [router]);

  return null;
}
