// Prints how many exceptions each rule raises on the data pack.
import { buildSeed } from "../src/lib/data/datapack";
import { runRules } from "../src/lib/rules";
import type { Dataset } from "../src/lib/data/types";

const seed = buildSeed();
const data: Dataset = {
  properties: seed.properties,
  units: seed.units.map((u, i) => ({ ...u, id: i + 1, review_status: "unreviewed", review_note: null })),
  tasks: seed.tasks.map((t, i) => ({ ...t, id: i + 1 })),
  contracts: seed.contracts.map((c, i) => ({ ...c, id: i + 1, decision: null, decision_reason: null })),
};
const all = runRules(data);
const counts: Record<string, number> = {};
for (const e of all) counts[e.rule_key] = (counts[e.rule_key] ?? 0) + 1;
console.log(JSON.stringify(counts, null, 1), all.length);
if (process.argv[2]) for (const e of all.filter((x) => x.rule_key.startsWith(process.argv[2]))) console.log(`[${e.severity}] ${e.title}\n    ${e.detail}`);
