"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { updateException } from "@/app/(app)/actions";
import { draftEscalation } from "@/app/(app)/drafts/actions";
import { formatShort } from "@/lib/dates";
import type { ExceptionRow } from "@/lib/data/types";
import { AllClear } from "./all-clear";
import { ArrowRight, Buildings, CalendarBlank, CheckCircle, Sparkle, UserCirclePlus } from "./icons";
import { AreaTag, SeverityBadge, SourceLink } from "./ui";

type Tally = { resolved: number; assigned: number; escalated: number; skipped: number };
const SWIPE = 110;

/**
 * Triage: one exception at a time, most urgent first. Decide and move on.
 * Keys on a keyboard, swipes on a phone.
 */
export function Triage({
  exceptions,
  properties,
  me,
}: {
  exceptions: ExceptionRow[];
  properties: { id: number; name: string }[];
  me: string;
}) {
  // The queue is fixed when the session starts, so live updates don't reshuffle it.
  const [queue] = useState(() => exceptions.map((e) => e.id));
  const byId = useMemo(() => new Map(exceptions.map((e) => [e.id, e])), [exceptions]);
  const [snapshot] = useState(() => new Map(exceptions.map((e) => [e.id, e])));
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState<Tally>({ resolved: 0, assigned: 0, escalated: 0, skipped: 0 });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touch = useRef<number | null>(null);
  const propertyName = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);

  const current = index < queue.length ? (byId.get(queue[index]) ?? snapshot.get(queue[index])!) : null;

  const act = useCallback(
    (kind: keyof Tally) => {
      if (!current || pending) return;
      const id = current.id;
      const advance = () => {
        setTally((t) => ({ ...t, [kind]: t[kind] + 1 }));
        setIndex((i) => i + 1);
        setDrag(0);
        setError(null);
      };
      if (kind === "skipped") return advance();
      start(async () => {
        const result =
          kind === "resolved"
            ? await updateException(id, { status: "resolved", resolution_note: `Resolved by ${me} in triage.` })
            : kind === "assigned"
              ? await updateException(id, { assignee: me })
              : await draftEscalation(id);
        if (result.ok) advance();
        else setError(result.error);
      });
    },
    [current, pending, me],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;
      const key = e.key.toLowerCase();
      if (key === "r") act("resolved");
      else if (key === "a") act("assigned");
      else if (key === "e") act("escalated");
      else if (key === "s" || key === "arrowright") act("skipped");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act]);

  const done = index;
  const total = queue.length;

  if (!current) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <AllClear title={total === 0 ? "Nothing to triage" : "Triage complete"}>
          {total === 0
            ? "There are no open exceptions."
            : `You went through ${total} exceptions: ${tally.resolved} resolved, ${tally.assigned} taken, ${tally.escalated} escalated, ${tally.skipped} skipped.`}
        </AllClear>
        <div className="flex justify-center gap-2">
          <Link href="/" className="btn btn-primary">
            Back to overview
          </Link>
          {tally.escalated > 0 && (
            <Link href="/drafts" className="btn">
              Review {tally.escalated} drafts
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--header-h))] max-w-2xl flex-col px-4 py-6 md:py-10">
      <div className="mb-5 flex items-center gap-3">
        <Link href="/inbox" className="btn btn-quiet">
          ← Inbox
        </Link>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <span className="display text-sm font-semibold tabular-nums">
          {done + 1} / {total}
        </span>
      </div>

      <article
        key={current.id}
        className="card rise relative flex flex-col gap-5 p-6 md:p-8"
        style={{
          transform: `translateX(${drag}px) rotate(${drag / 40}deg)`,
          transition: dragging ? "none" : "transform 0.2s ease",
          touchAction: "pan-y",
        }}
        onTouchStart={(e) => {
          touch.current = e.touches[0].clientX;
          setDragging(true);
        }}
        onTouchMove={(e) => touch.current !== null && setDrag(e.touches[0].clientX - touch.current)}
        onTouchEnd={() => {
          touch.current = null;
          setDragging(false);
          if (drag > SWIPE) act("resolved");
          else if (drag < -SWIPE) act("skipped");
          else setDrag(0);
        }}
      >
        {Math.abs(drag) > 30 && (
          <span
            className={`absolute top-5 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase ${
              drag > 0 ? "left-5 bg-ok-soft text-ok-ink" : "right-5 bg-panel2 text-muted"
            }`}
          >
            {drag > 0 ? "Resolve" : "Skip"}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={current.severity} />
          <AreaTag area={current.area} />
          {current.property_id && (
            <span className="chip">
              <Buildings weight="duotone" className="size-4 text-indigo" />
              {propertyName.get(current.property_id)}
            </span>
          )}
          {current.due_date && (
            <span className="chip">
              <CalendarBlank weight="duotone" className="size-4 text-indigo" />
              Due {formatShort(current.due_date)}
            </span>
          )}
        </div>
        <h1 className="display text-xl leading-snug font-semibold md:text-2xl">{current.title}</h1>
        <p className="text-base leading-relaxed text-muted">{current.detail}</p>
        {current.sources.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {current.sources.slice(0, 4).map((s) => (
              <SourceLink key={`${s.table}-${s.id}`} source={s} />
            ))}
          </div>
        )}
        <p className="text-xs text-faint">
          {current.assignee ? `Assigned to ${current.assignee}` : "Unassigned"}
          {current.sources.length > 4 ? ` · ${current.sources.length - 4} more source rows in the inbox` : ""}
        </p>
      </article>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="sticky bottom-[4.4rem] z-10 -mx-4 mt-5 grid grid-cols-4 gap-2 bg-background/90 px-4 py-2.5 backdrop-blur md:static md:mx-0 md:gap-2.5 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Action hint="R" label="Resolve" primary disabled={pending} onClick={() => act("resolved")}>
          <CheckCircle weight="fill" className="size-5" />
        </Action>
        <Action hint="A" label="Take it" disabled={pending} onClick={() => act("assigned")}>
          <UserCirclePlus weight="duotone" className="size-5" />
        </Action>
        <Action hint="E" label={pending ? "Working…" : "Escalate"} disabled={pending} onClick={() => act("escalated")}>
          <Sparkle weight="duotone" className="size-5" />
        </Action>
        <Action hint="S" label="Skip" disabled={pending} onClick={() => act("skipped")}>
          <ArrowRight weight="bold" className="size-5" />
        </Action>
      </div>
      <p className="mt-3 text-center text-xs text-faint">
        <span className="hidden sm:inline">Use the keys shown, or </span>swipe right to resolve and left to skip. Escalate drafts an
        email and files it under Drafts.
      </p>
    </div>
  );
}

function Action({
  hint,
  label,
  primary,
  disabled,
  onClick,
  children,
}: {
  hint: string;
  label: string;
  primary?: boolean;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`btn flex-col gap-1.5 rounded-2xl px-2 py-3 md:py-3.5 ${primary ? "btn-primary" : ""}`}
    >
      {children}
      <span>{label}</span>
      <kbd className={`kbd hidden sm:block ${primary ? "border-white/30 bg-white/15 text-on-accent" : ""}`}>{hint}</kbd>
    </button>
  );
}
