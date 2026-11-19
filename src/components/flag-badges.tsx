import type { Flag } from "@/lib/flags";

const COLOR: Record<number, string> = {
  1: "border-sev1/60 text-sev1",
  2: "border-sev2/60 text-sev2",
  3: "border-sev3/60 text-sev3",
  4: "border-sev4/60 text-sev4",
};

export function FlagBadges({ flags }: { flags?: Flag[] }) {
  if (!flags?.length) return null;
  const worst = Math.min(...flags.map((f) => f.severity));
  return (
    <span
      className={`inline-flex rounded-full border px-1.5 text-xs ${COLOR[worst]}`}
      title={flags.map((f) => f.title).join("\n")}
    >
      {flags.length} {flags.length === 1 ? "flag" : "flags"}
    </span>
  );
}
