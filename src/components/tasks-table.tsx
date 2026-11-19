"use client";

import { Fragment, useMemo, useState } from "react";
import { updateTask } from "@/app/(app)/actions";
import { formatShort, isBusinessDay } from "@/lib/dates";
import type { Flag } from "@/lib/flags";
import type { Property, Task } from "@/lib/data/types";
import { FlagBadges } from "./flag-badges";
import { useAction, useFocusRow } from "./use-action";

const STATUSES = ["Not Started", "In Progress", "Blocked", "Complete"];
const STATUS_COLOR: Record<string, string> = {
  "Not Started": "text-muted",
  "In Progress": "text-sev3",
  Blocked: "text-sev1",
  Complete: "text-ok",
};

export function TasksTable({
  tasks,
  properties,
  flags,
}: {
  tasks: Task[];
  properties: Property[];
  flags: Record<number, Flag[]>;
}) {
  const { pending, error, run } = useAction();
  const focus = useFocusRow();
  const [property, setProperty] = useState("");
  const [fn, setFn] = useState("");
  const [status, setStatus] = useState("");
  const [assignee, setAssignee] = useState("");
  const [open, setOpen] = useState<number | null>(focus);

  const name = useMemo(() => new Map(properties.map((p) => [p.id, p.name])), [properties]);
  const functions = [...new Set(tasks.map((t) => t.function))].sort();
  const assignees = [...new Set(tasks.map((t) => t.assignee).filter(Boolean))].sort() as string[];
  const rows = tasks.filter(
    (t) =>
      (!property || t.property_id === Number(property)) &&
      (!fn || t.function === fn) &&
      (!status || t.status === status) &&
      (!assignee || (assignee === "none" ? !t.assignee : t.assignee === assignee)),
  );

  return (
    <div className="px-4 pb-8">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select className="field" aria-label="Property" value={property} onChange={(e) => setProperty(e.target.value)}>
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select className="field" aria-label="Function" value={fn} onChange={(e) => setFn(e.target.value)}>
          <option value="">All functions</option>
          {functions.map((f) => <option key={f}>{f}</option>)}
        </select>
        <select className="field" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="field" aria-label="Assignee" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">Anyone</option>
          <option value="none">Unassigned</option>
          {assignees.map((a) => <option key={a}>{a}</option>)}
        </select>
      </div>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <p className="mb-2 text-xs text-muted">{rows.length} tasks</p>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-2 font-medium">Task</th>
              <th className="px-3 py-2 font-medium">Property</th>
              <th className="px-3 py-2 font-medium">Due</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Assignee</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <Fragment key={t.id}>
                <tr
                  id={`row-${t.id}`}
                  className={`border-b border-line ${focus === t.id ? "bg-accent/10" : ""}`}
                >
                  <td className="px-3 py-2">
                    <button type="button" className="text-left hover:text-accent" onClick={() => setOpen(open === t.id ? null : t.id)}>
                      {t.task}
                    </button>
                    <span className="block text-xs text-muted">
                      {t.function}
                      {t.critical_path ? " · critical path" : ""}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted">{name.get(t.property_id)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatShort(t.due_date)}
                    {!isBusinessDay(t.due_date) && <span className="block text-xs text-sev3">non-business day</span>}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className={`field min-w-28 ${STATUS_COLOR[t.status]}`}
                      aria-label="Status"
                      value={t.status}
                      disabled={pending}
                      onChange={(e) => run(() => updateTask(t.id, { status: e.target.value }))}
                    >
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="field min-w-28"
                      aria-label="Assignee"
                      value={t.assignee ?? ""}
                      disabled={pending}
                      onChange={(e) => run(() => updateTask(t.id, { assignee: e.target.value || null }))}
                    >
                      <option value="">Unassigned</option>
                      {assignees.map((a) => <option key={a}>{a}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2"><FlagBadges flags={flags[t.id]} /></td>
                </tr>
                {open === t.id && (
                  <tr className="border-b border-line bg-background/60">
                    <td colSpan={6} className="px-3 py-3">
                      <TaskEditor task={t} flags={flags[t.id]} pending={pending} run={run} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskEditor({
  task,
  flags,
  pending,
  run,
}: {
  task: Task;
  flags?: Flag[];
  pending: boolean;
  run: ReturnType<typeof useAction>["run"];
}) {
  const [due, setDue] = useState(task.due_date);
  const [notes, setNotes] = useState(task.notes ?? "");
  return (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
      <label className="text-xs text-muted">
        Due date
        <input type="date" className="field mt-1" value={due} onChange={(e) => setDue(e.target.value)} />
      </label>
      <label className="text-xs text-muted">
        Notes
        <input className="field mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What is the status, and what is it waiting on?" />
      </label>
      <button
        type="button"
        className="btn btn-primary"
        disabled={pending}
        onClick={() => run(() => updateTask(task.id, { due_date: due, notes: notes || null }))}
      >
        Save
      </button>
      <p className="text-xs text-muted sm:col-span-3">
        Source: A2 Transition Checklist, row {task.source_row}. Last updated {formatShort(task.last_updated)}.
        {flags?.length ? ` Open flags: ${flags.map((f) => f.title).join(" | ")}` : ""}
      </p>
    </div>
  );
}
