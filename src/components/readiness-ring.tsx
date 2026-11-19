import { LEVEL_COLOR, type Readiness } from "@/lib/readiness";

/** A score drawn as a ring that fills clockwise from the top. */
export function ReadinessRing({
  score,
  level,
  size = 56,
  stroke = 6,
  children,
}: {
  score: number;
  level: Readiness["level"];
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--panel2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={LEVEL_COLOR[level]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="sweep"
          style={{ "--from": c } as React.CSSProperties}
        />
      </svg>
      <span className="display absolute font-semibold" style={{ fontSize: size * 0.34 }}>
        {children ?? score}
      </span>
    </span>
  );
}
