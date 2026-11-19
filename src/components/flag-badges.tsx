import type { Flag } from "@/lib/flags";
import { SEVERITY_ICON } from "./icons";

const TONE: Record<number, string> = {
  1: "bg-sev1-soft text-sev1-ink",
  2: "bg-sev2-soft text-sev2-ink",
  3: "bg-sev3-soft text-sev3-ink",
  4: "bg-sev4-soft text-sev4-ink",
};

export function FlagBadges({ flags }: { flags?: Flag[] }) {
  if (!flags?.length) return null;
  const worst = Math.min(...flags.map((f) => f.severity));
  const Icon = SEVERITY_ICON[worst];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${TONE[worst]}`}
      title={flags.map((f) => f.title).join("\n")}
    >
      <Icon weight="fill" className="size-3.5" />
      {flags.length} {flags.length === 1 ? "flag" : "flags"}
    </span>
  );
}
