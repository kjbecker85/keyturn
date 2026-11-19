// Times a rules re-run against the live database. Run: npx tsx --env-file=.env.local scripts/sync-check.ts
import { createClient } from "@supabase/supabase-js";
import { syncExceptions } from "../src/lib/data/store";

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  await db.auth.signInWithPassword({ email: "director@keyturn.example", password: process.env.DEMO_PASSWORD! });
  for (let i = 0; i < 2; i++) {
    const t = Date.now();
    console.log(await syncExceptions(db), `${Date.now() - t}ms`);
  }
}
main();
