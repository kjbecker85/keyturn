import "server-only";
import fs from "node:fs";
import path from "node:path";

// Reads the rules engine's own source, so the Rules screen shows the exact code that runs.
// Each rule sits between "// rule: <key>" and "// end rule" comments in ./index.ts.

export type RuleSource = { code: string; line: number };

const dedent = (lines: string[]) => {
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  return lines.map((l) => l.slice(indent)).join("\n");
};

export function readRuleSource(): { rules: Record<string, RuleSource>; shared: string; file: string } {
  const file = "src/lib/rules/index.ts";
  const lines = fs.readFileSync(path.join(process.cwd(), file), "utf8").split("\n");
  const rules: Record<string, RuleSource> = {};
  const shared: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const rule = /^\s*\/\/ rule: (.+)$/.exec(lines[i]);
    if (rule) {
      const end = lines.findIndex((l, j) => j > i && /^\s*\/\/ end rule$/.test(l));
      const block = { code: dedent(lines.slice(i + 1, end)), line: i + 2 };
      for (const key of rule[1].trim().split(/\s+/)) rules[key] = block;
      i = end;
    } else if (/^\s*\/\/ shared$/.test(lines[i])) {
      const end = lines.findIndex((l, j) => j > i && /^\s*\/\/ end shared$/.test(l));
      shared.push(dedent(lines.slice(i + 1, end)));
      i = end;
    }
  }
  return { rules, shared: shared.join("\n\n"), file };
}
