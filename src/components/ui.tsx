import Link from "next/link";
import { SEVERITY_LABEL, type SourceRef } from "@/lib/data/types";

const SEV_TEXT: Record<number, string> = {
  1: "text-sev1 border-sev1/50",
  2: "text-sev2 border-sev2/50",
  3: "text-sev3 border-sev3/50",
  4: "text-sev4 border-sev4/50",
};
const SEV_BG: Record<number, string> = { 1: "bg-sev1", 2: "bg-sev2", 3: "bg-sev3", 4: "bg-sev4" };

export function SeverityBadge({ severity }: { severity: number }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${SEV_TEXT[severity]}`}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function SeverityDot({ severity }: { severity: number }) {
  return (
    <span
      className={`mt-1.5 inline-block size-2 shrink-0 rounded-full ${SEV_BG[severity]}`}
      title={SEVERITY_LABEL[severity]}
    />
  );
}

const SOURCE_HREF: Record<SourceRef["table"], string> = {
  tasks: "/tasks",
  vendor_contracts: "/vendors",
  rent_roll_units: "/rent-roll",
};

/** A link back to the exact record and spreadsheet row behind a flag. */
export function SourceLink({ source }: { source: SourceRef }) {
  return (
    <Link
      href={`${SOURCE_HREF[source.table]}?focus=${source.id}`}
      className="block rounded-md border border-line px-2.5 py-1.5 text-sm transition hover:border-accent"
    >
      <span className="block">{source.label}</span>
      <span className="block text-xs text-muted">
        {source.sheet}, row {source.row}
      </span>
    </Link>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 px-4 pb-3 pt-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
