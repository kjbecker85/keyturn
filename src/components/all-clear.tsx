/** The key turns when there is nothing left to do. */
export function KeyTurn({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="30" fill="var(--ok)" className="unlock-glow" />
      <circle cx="48" cy="48" r="34" fill="var(--ok-soft)" />
      <circle cx="48" cy="48" r="34" fill="none" stroke="var(--ok)" strokeWidth="2.5" />
      <g className="key-turn" fill="none" stroke="var(--ok-ink)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="48" cy="36" r="9" />
        <path d="M48 45 V66 M48 58 H56 M48 65 H54" />
      </g>
    </svg>
  );
}

export function AllClear({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rise flex flex-col items-center gap-3 px-6 py-12 text-center">
      <KeyTurn />
      <p className="display text-xl font-semibold">{title}</p>
      {children && <p className="max-w-sm text-sm text-muted">{children}</p>}
    </div>
  );
}
