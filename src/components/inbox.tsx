"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  addExceptionNote,
  deleteView,
  saveView,
  updateException,
  type Result,
} from "@/app/(app)/actions";
import { formatShort } from "@/lib/dates";
import { AREA_LABEL, SEVERITY_LABEL, type Area, type AuditRow, type ExceptionRow } from "@/lib/data/types";
import { DraftButton } from "./draft-button";
import { SeverityBadge, SeverityDot, SourceLink } from "./ui";

type Props = {
  exceptions: ExceptionRow[];
  properties: { id: number; name: string }[];
  assignees: string[];
  views: { id: number; name: string; query: string }[];
  audit: AuditRow[];
  actors: Record<string, string>;
  me: string;
};

export function Inbox({ exceptions, properties, assignees, views, audit, actors, me }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const focus = Number(params.get("focus")) || null;
  const [selectedId, setSelectedId] = useState<number | null>(focus);
  const [showDetail, setShowDetail] = useState(Boolean(focus));
  const assignRef = useRef<HTMLSelectElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filter = {
    status: params.get("status") ?? "open",
    severity: params.get("severity") ?? "",
    area: params.get("area") ?? "",
    property: params.get("property") ?? "",
    assignee: params.get("assignee") ?? "",
    q: params.get("q") ?? "",
  };
  const propertyName = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const visible = useMemo(() => {
    const q = filter.q.toLowerCase();
    return exceptions.filter(
      (e) =>
        (filter.status === "all" || e.status === filter.status) &&
        (!filter.severity || e.severity === Number(filter.severity)) &&
        (!filter.area || e.area === filter.area) &&
        (!filter.property || e.property_id === Number(filter.property)) &&
        (!filter.assignee ||
          (filter.assignee === "none" ? !e.assignee : e.assignee === filter.assignee)) &&
        (!q || `${e.title} ${e.detail}`.toLowerCase().includes(q)),
    );
  }, [exceptions, filter.status, filter.severity, filter.area, filter.property, filter.assignee, filter.q]);

  const selected = visible.find((e) => e.id === selectedId) ?? visible[0] ?? null;
  const open = exceptions.filter((e) => e.status === "open");

  const run = (action: () => Promise<Result>) =>
    start(async () => {
      const result = await action();
      setError(result.ok ? null : result.error);
    });

  // Keyboard: j/k move, e resolve, a assign, / search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || e.metaKey || e.ctrlKey) return;
      const index = selected ? visible.findIndex((x) => x.id === selected.id) : -1;
      if (e.key === "j" && index < visible.length - 1) setSelectedId(visible[index + 1].id);
      else if (e.key === "k" && index > 0) setSelectedId(visible[index - 1].id);
      else if (e.key === "e" && selected?.status === "open") {
        run(() => updateException(selected.id, { status: "resolved", resolution_note: `Resolved by ${me}.` }));
      } else if (e.key === "a") {
        e.preventDefault();
        assignRef.current?.focus();
      } else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    document.querySelector(`[data-exception="${selected?.id}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selected?.id]);

  return (
    <div className="flex h-[calc(100dvh-45px)] flex-col">
      <div className="border-b border-line px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-2 text-lg font-semibold tracking-tight">Exceptions inbox</h1>
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter("severity", filter.severity === String(s) ? "" : String(s))}
              className={`chip ${filter.severity === String(s) ? "border-accent text-foreground" : ""}`}
            >
              {SEVERITY_LABEL[s]} {open.filter((e) => e.severity === s).length}
            </button>
          ))}
          <span className="ml-auto hidden text-xs text-muted lg:inline">
            j/k move · e resolve · a assign · / search
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <input
            ref={searchRef}
            className="field col-span-2 sm:col-span-1"
            placeholder="Search"
            defaultValue={filter.q}
            onChange={(e) => setFilter("q", e.target.value)}
          />
          <Select value={filter.status} onChange={(v) => setFilter("status", v === "open" ? "" : v)} label="Status">
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
            <option value="all">All statuses</option>
          </Select>
          <Select value={filter.area} onChange={(v) => setFilter("area", v)} label="Area">
            <option value="">All areas</option>
            {(Object.keys(AREA_LABEL) as Area[]).map((a) => (
              <option key={a} value={a}>
                {AREA_LABEL[a]}
              </option>
            ))}
          </Select>
          <Select value={filter.property} onChange={(v) => setFilter("property", v)} label="Property">
            <option value="">All properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select value={filter.assignee} onChange={(v) => setFilter("assignee", v)} label="Assignee">
            <option value="">Anyone</option>
            <option value="none">Unassigned</option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const name = window.prompt("Name this view");
              if (name) run(() => saveView(name, params.toString()));
            }}
          >
            Save view
          </button>
        </div>
        {views.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {views.map((v) => (
              <span key={v.id} className="chip">
                <button type="button" className="hover:text-foreground" onClick={() => router.replace(`/?${v.query}`)}>
                  {v.name}
                </button>
                <button type="button" aria-label={`Delete view ${v.name}`} onClick={() => run(() => deleteView(v.id))}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>

      <div className="flex min-h-0 flex-1">
        <ul className={`min-w-0 flex-1 overflow-y-auto ${showDetail ? "hidden md:block" : ""}`}>
          {visible.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted">Nothing matches these filters.</li>
          )}
          {visible.map((e) => (
            <li key={e.id} data-exception={e.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(e.id);
                  setShowDetail(true);
                }}
                className={`flex w-full gap-2.5 border-b border-line px-4 py-2.5 text-left transition hover:bg-panel ${
                  selected?.id === e.id ? "bg-panel md:border-l-2 md:border-l-accent" : ""
                } ${e.status !== "open" ? "opacity-60" : ""}`}
              >
                <SeverityDot severity={e.severity} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{e.title}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                    <span>{AREA_LABEL[e.area]}</span>
                    {e.due_date && <span>Due {formatShort(e.due_date)}</span>}
                    <span>{e.assignee ?? "Unassigned"}</span>
                    {e.status !== "open" && <span className="capitalize">{e.status}</span>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <section
          className={`w-full overflow-y-auto border-line md:block md:w-[44%] md:max-w-xl md:border-l ${
            showDetail ? "block" : "hidden"
          }`}
        >
          {selected ? (
            <Detail
              key={selected.id}
              e={selected}
              property={selected.property_id ? propertyName.get(selected.property_id) : undefined}
              assignees={assignees}
              assignRef={assignRef}
              audit={audit.filter((a) => a.entity_id === String(selected.id))}
              actors={actors}
              me={me}
              pending={pending}
              run={run}
              onBack={() => setShowDetail(false)}
            />
          ) : (
            <p className="p-6 text-sm text-muted">Select an exception to see why it was flagged.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <select className="field" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  );
}

function Detail({
  e,
  property,
  assignees,
  assignRef,
  audit,
  actors,
  me,
  pending,
  run,
  onBack,
}: {
  e: ExceptionRow;
  property?: string;
  assignees: string[];
  assignRef: React.RefObject<HTMLSelectElement | null>;
  audit: AuditRow[];
  actors: Record<string, string>;
  me: string;
  pending: boolean;
  run: (action: () => Promise<Result>) => void;
  onBack: () => void;
}) {
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [dismissing, setDismissing] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-4">
      <button type="button" onClick={onBack} className="self-start text-sm text-muted md:hidden">
        ← Back to list
      </button>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={e.severity} />
          <span className="chip">{AREA_LABEL[e.area]}</span>
          {property && <span className="chip">{property}</span>}
          {e.function && <span className="chip">{e.function}</span>}
          {e.due_date && <span className="chip">Due {formatShort(e.due_date)}</span>}
        </div>
        <h2 className="mt-2.5 text-base font-semibold leading-snug">{e.title}</h2>
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Why this was flagged</h3>
        <p className="mt-1 text-sm leading-relaxed">{e.detail}</p>
        <p className="mt-1 text-xs text-muted">Rule: {e.rule_key}</p>
      </div>

      {e.sources.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Source rows</h3>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {e.sources.map((s) => (
              <SourceLink key={`${s.table}-${s.id}`} source={s} />
            ))}
          </div>
        </div>
      )}

      <div className="card flex flex-col gap-3 p-3">
        <label className="text-xs text-muted">
          Assignee
          <select
            ref={assignRef}
            className="field mt-1"
            value={e.assignee ?? ""}
            disabled={pending}
            onChange={(ev) => run(() => updateException(e.id, { assignee: ev.target.value || null }))}
          >
            <option value="">Unassigned</option>
            {assignees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        {e.status === "open" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending}
              onClick={() =>
                run(() => updateException(e.id, { status: "resolved", resolution_note: `Resolved by ${me}.` }))
              }
            >
              Resolve
            </button>
            <button type="button" className="btn" disabled={pending} onClick={() => setDismissing((v) => !v)}>
              Dismiss
            </button>
            <DraftButton exceptionId={e.id} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="capitalize text-muted">
              {e.status}
              {e.resolution_note ? `: ${e.resolution_note}` : ""}
            </span>
            <button
              type="button"
              className="btn"
              disabled={pending}
              onClick={() => run(() => updateException(e.id, { status: "open" }))}
            >
              Reopen
            </button>
          </div>
        )}

        {dismissing && e.status === "open" && (
          <div className="flex gap-2">
            <input
              className="field"
              placeholder="Reason for dismissing (required)"
              value={reason}
              onChange={(ev) => setReason(ev.target.value)}
            />
            <button
              type="button"
              className="btn"
              disabled={pending}
              onClick={() => run(() => updateException(e.id, { status: "dismissed", resolution_note: reason }))}
            >
              Confirm
            </button>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted">Notes</h3>
        {e.notes.map((n, i) => (
          <p key={i} className="mt-1.5 text-sm">
            {n.text}
            <span className="block text-xs text-muted">
              {n.by}, {new Date(n.at).toLocaleString()}
            </span>
          </p>
        ))}
        <div className="mt-2 flex gap-2">
          <input
            className="field"
            placeholder="Add a note"
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
          />
          <button
            type="button"
            className="btn"
            disabled={pending || !note.trim()}
            onClick={() => {
              run(() => addExceptionNote(e.id, note));
              setNote("");
            }}
          >
            Add
          </button>
        </div>
      </div>

      {audit.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted">History</h3>
          <ul className="mt-1.5 space-y-1 text-xs text-muted">
            {audit.map((a) => (
              <li key={a.id}>
                {new Date(a.created_at).toLocaleString()} · {actors[a.actor_id ?? ""] ?? "System"} changed{" "}
                {Object.keys(a.after ?? {}).join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
