// Asks the assistant real questions against the live database and checks
// every citation it writes points at a record it actually looked up.
// Run: npx tsx --env-file=.env.local scripts/ask-check.ts
import { createClient } from "@supabase/supabase-js";
import { ask } from "../src/lib/ai/ask";
import { loadDataset, loadExceptions } from "../src/lib/data/store";

const QUESTIONS = [
  "What's blocking Trinity Bluffs?",
  "Which contracts lock us in if we do nothing this month?",
  "Which properties are least ready for day one, and why?",
  "What did you find wrong in the Willow Bend rent roll?",
  "Which deadlines fall on Thanksgiving weekend?",
  "What is the rent roll for Trinity Bluffs?",
  "Who owns the most open critical-path tasks?",
  "Is there anything at Elm Street Lofts the checklist and vendor sheet disagree on?",
  "How much is owed by residents at Cedar Crossing?",
  "What's the weather going to be on December 1?",
];

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  await db.auth.signInWithPassword({ email: "director@keyturn.example", password: process.env.DEMO_PASSWORD! });
  const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);

  const only = process.argv[2] ? [QUESTIONS[Number(process.argv[2])]] : QUESTIONS;
  await Promise.all(
    only.map(async (q, i) => {
      const t = Date.now();
      const r = await ask([{ role: "user", text: q }], data, exceptions);
      const refs = [...r.answer.matchAll(/\[([A-Z]+-\d+)\]/g)].map((m) => m[1]);
      const unknown = refs.filter((ref) => !r.citations[ref]);
      console.log(
        `\n### Q${i}: ${q}\n(${((Date.now() - t) / 1000).toFixed(1)}s, ${r.lookups.length} lookups, ${refs.length} citations, ${unknown.length} unverified${unknown.length ? `: ${unknown.join(" ")}` : ""})\n${r.lookups.map((l) => `  > ${l}`).join("\n")}\n${r.answer}`,
      );
    }),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
