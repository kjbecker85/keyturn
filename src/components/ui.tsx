import Link from "next/link";
import { AREA_LABEL, SEVERITY_LABEL, type Area, type SourceRef } from "@/lib/data/types";
import { AREA_ICON, ArrowRight, SEVERITY_ICON, STATUS_ICON } from "./icons";

const SEV_TAG: Record<number, string> = {
  1: "bg-sev1-soft text-sev1-ink",
  2: "bg-sev2-soft text-sev2-ink",
  3: "bg-sev3-soft text-sev3-ink",
  4: "bg-sev4-soft text-sev4-ink",
};
const SEV_INK: Record<number, string> = {
  1: "text-sev1",
  2: "text-sev2",
  3: "text-sev3",
  4: "text-sev4",
};

/** Severity as an icon plus a word, never color alone. */
export function SeverityBadge({ severity }: { severity: number }) {
  const Icon = SEVERITY_ICON[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${SEV_TAG[severity]}`}>
      <Icon weight="fill" className="size-3.5" />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

export function SeverityMark({ severity, className = "size-5" }: { severity: number; className?: string }) {
  const Icon = SEVERITY_ICON[severity];
  return (
    <span className={`shrink-0 ${SEV_INK[severity]}`} title={SEVERITY_LABEL[severity]}>
      <Icon weight="duotone" className={className} aria-label={SEVERITY_LABEL[severity]} />
    </span>
  );
}

export function AreaTag({ area }: { area: Area }) {
  const Icon = AREA_ICON[area];
  return (
    <span className="chip">
      <Icon weight="duotone" className="size-4 text-indigo" />
      {AREA_LABEL[area]}
    </span>
  );
}

const STATUS_TONE: Record<string, string> = {
  open: "text-muted",
  resolved: "text-ok-ink",
  dismissed: "text-faint",
  "Not Started": "text-muted",
  "In Progress": "text-indigo",
  Blocked: "text-sev1-ink",
  Complete: "text-ok-ink",
};

export function StatusTag({ status, label }: { status: string; label?: string }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap capitalize ${STATUS_TONE[status] ?? "text-muted"}`}>
      {Icon && <Icon weight="duotone" className="size-4.5" />}
      {label ?? status}
    </span>
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
      className="group flex items-center gap-3 rounded-xl border border-line bg-panel px-3.5 py-2.5 text-sm transition hover:border-accent"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{source.label}</span>
        <span className="block truncate text-xs text-muted">
          {source.sheet}, row {source.row}
        </span>
      </span>
      <ArrowRight weight="bold" className="size-4 shrink-0 text-faint transition group-hover:text-accent" />
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
    <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-7 pb-5 md:px-8">
      <div className="max-w-3xl">
        <h1 className="display text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-muted md:text-base">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Section({
  title,
  hint,
  action,
  children,
  className = "",
  style,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section className={`card rise flex min-w-0 flex-col p-5 md:p-6 ${className}`} style={style}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
