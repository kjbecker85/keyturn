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
import Link from "next/link";
import { AllClear } from "./all-clear";
import { ExportButtons } from "./export-buttons";
import { exceptionColumns } from "@/lib/export-columns";
import { toSheet } from "@/lib/table-export";
import { DraftButton } from "./draft-button";
import {
  AREA_ICON,
  Buildings,
  CalendarBlank,
  CheckCircle,
  FUNCTION_ICON,
  Lightning,
  MagnifyingGlass,
  SEVERITY_ICON,
} from "./icons";
import { AreaTag, SeverityBadge, SeverityMark, SourceLink, StatusTag } from "./ui";

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

  const filtered = Boolean(filter.severity || filter.area || filter.property || filter.assignee || filter.q);

  return (
    <div className="flex h-[calc(100dvh-var(--header-h))] flex-col">
      <div className="border-b border-line px-4 pt-5 pb-4 md:px-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="display mr-2 text-2xl font-semibold">Inbox</h1>
          {[1, 2, 3, 4].map((s) => {
            const Icon = SEVERITY_ICON[s];
            const on = filter.severity === String(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter("severity", on ? "" : String(s))}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  on ? "border-foreground bg-foreground text-background" : "border-line bg-panel text-muted hover:border-accent"
                }`}
              >
                <Icon weight="fill" className="size-3.5" style={{ color: on ? undefined : `var(--sev${s})` }} />
                {SEVERITY_LABEL[s]}
                <span className="tabular-nums opacity-70">{open.filter((e) => e.severity === s).length}</span>
              </button>
            );
          })}
          <span className="ml-auto hidden items-center gap-1.5 text-xs text-faint xl:flex">
            <kbd className="kbd">j</kbd>
            <kbd className="kbd">k</kbd> move
            <kbd className="kbd ml-2">e</kbd> resolve
            <kbd className="kbd ml-2">a</kbd> assign
            <kbd className="kbd ml-2">/</kbd> search
          </span>
          <ExportButtons
            className="ml-auto xl:ml-0"
            count={visible.length}
            sheet={() => toSheet("Inbox", exceptionColumns((id) => (id === null ? "Portfolio" : (propertyName.get(id) ?? ""))), visible)}
          />
          <Link href="/inbox/triage" className="btn btn-primary">
            <Lightning weight="fill" className="size-4" />
            Triage
          </Link>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto]">
          <label className="relative col-span-2 sm:col-span-1">
            <MagnifyingGlass weight="bold" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
            <input
              ref={searchRef}
              className="field pl-9"
              placeholder="Search exceptions"
              aria-label="Search exceptions"
              defaultValue={filter.q}
              onChange={(e) => setFilter("q", e.target.value)}
            />
          </label>
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
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {views.map((v) => (
              <span key={v.id} className="chip">
                <button type="button" className="hover:text-foreground" onClick={() => router.replace(`/inbox?${v.query}`)}>
                  {v.name}
                </button>
                <button type="button" aria-label={`Delete view ${v.name}`} className="hover:text-danger" onClick={() => run(() => deleteView(v.id))}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </div>

      <div className="flex min-h-0 flex-1">
        <ul className={`min-w-0 flex-1 overflow-y-auto pb-24 md:pb-4 ${showDetail ? "hidden md:block" : ""}`}>
          {visible.length === 0 && (
            <li>
              {filtered || filter.status !== "open" ? (
                <p className="px-4 py-14 text-center text-sm text-muted">Nothing matches these filters.</p>
              ) : (
                <AllClear title="Inbox zero">Every exception is resolved. The portfolio is clear for Day One.</AllClear>
              )}
            </li>
          )}
          {visible.map((e) => {
            const AreaIcon = AREA_ICON[e.area];
            const isSelected = selected?.id === e.id;
            return (
              <li key={e.id} data-exception={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(e.id);
                    setShowDetail(true);
                  }}
                  className={`flex w-full items-start gap-3.5 border-b border-line py-3.5 pr-4 pl-4 text-left transition md:pl-8 ${
                    isSelected ? "bg-panel shadow-[inset_3px_0_0_var(--accent)]" : "hover:bg-panel/70"
                  } ${e.status !== "open" ? "opacity-60" : ""}`}
                >
                  <SeverityMark severity={e.severity} className="mt-0.5 size-5.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug font-medium">{e.title}</span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <AreaIcon weight="duotone" className="size-4 text-indigo" />
                        {AREA_LABEL[e.area]}
                      </span>
                      {e.due_date && (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarBlank weight="duotone" className="size-4" />
                          {formatShort(e.due_date)}
                        </span>
                      )}
                      <span className={e.assignee ? "" : "text-faint italic"}>{e.assignee ?? "Unassigned"}</span>
                      {e.status !== "open" && <StatusTag status={e.status} />}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <section
          className={`w-full overflow-y-auto border-line bg-panel pb-24 md:block md:w-[46%] md:max-w-2xl md:border-l md:pb-0 ${
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
            <p className="p-8 text-sm text-muted">Select an exception to see why it was flagged.</p>
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

  const FunctionIcon = e.function ? FUNCTION_ICON[e.function] : undefined;

  return (
    <div className="flex flex-col gap-6 p-5 md:p-7">
      <button type="button" onClick={onBack} className="btn btn-quiet self-start md:hidden">
        ← Back to list
      </button>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={e.severity} />
          <AreaTag area={e.area} />
          {property && (
            <span className="chip">
              <Buildings weight="duotone" className="size-4 text-indigo" />
              {property}
            </span>
          )}
          {e.function && (
            <span className="chip">
              {FunctionIcon && <FunctionIcon weight="duotone" className="size-4 text-indigo" />}
              {e.function}
            </span>
          )}
          {e.due_date && (
            <span className="chip">
              <CalendarBlank weight="duotone" className="size-4 text-indigo" />
              Due {formatShort(e.due_date)}
            </span>
          )}
        </div>
        <h2 className="display mt-3.5 text-xl leading-snug font-semibold">{e.title}</h2>
      </div>

      <div className="rounded-2xl bg-panel2 p-4">
        <h3 className="eyebrow">Why this was flagged</h3>
        <p className="mt-2 text-sm leading-relaxed">{e.detail}</p>
        <p className="mt-2.5 font-mono text-xs text-faint">rule: {e.rule_key}</p>
      </div>

      {e.sources.length > 0 && (
        <div>
          <h3 className="eyebrow">Source rows</h3>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {e.sources.map((s) => (
              <SourceLink key={`${s.table}-${s.id}`} source={s} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3.5 rounded-2xl border border-line p-4">
        <label className="text-xs font-medium text-muted">
          Assignee
          <select
            ref={assignRef}
            className="field mt-1.5"
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
              <CheckCircle weight="fill" className="size-4" />
              Resolve
            </button>
            <button type="button" className="btn" disabled={pending} onClick={() => setDismissing((v) => !v)}>
              Dismiss
            </button>
            <DraftButton exceptionId={e.id} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <StatusTag status={e.status} />
            {e.resolution_note && <span className="text-muted">{e.resolution_note}</span>}
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
        <h3 className="eyebrow">Notes</h3>
        {e.notes.map((n, i) => (
          <p key={i} className="mt-2.5 rounded-xl bg-panel2 px-3.5 py-2.5 text-sm">
            {n.text}
            <span className="mt-1 block text-xs text-muted">
              {n.by}, {new Date(n.at).toLocaleString()}
            </span>
          </p>
        ))}
        <div className="mt-2.5 flex gap-2">
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
          <h3 className="eyebrow">History</h3>
          <ul className="mt-2.5 space-y-2 border-l-2 border-line pl-4 text-xs text-muted">
            {audit.map((a) => (
              <li key={a.id}>
                <span className="font-medium text-foreground">{actors[a.actor_id ?? ""] ?? "System"}</span> changed{" "}
                {Object.keys(a.after ?? {}).join(", ")}
                <span className="block text-faint">{new Date(a.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
