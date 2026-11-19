// Loads the data pack into Supabase as the demo director.
// Run with: npm run seed
import { createClient } from "@supabase/supabase-js";
import { resetDemo } from "../src/lib/data/store";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const password = process.env.DEMO_PASSWORD;
  if (!url || !key || !password) throw new Error("Missing Supabase settings in .env.local");

  const db = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await db.auth.signInWithPassword({
    email: "director@keyturn.example",
    password,
  });
  if (error) throw new Error(`Sign-in failed: ${error.message}`);

  console.log(await resetDemo(db));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
