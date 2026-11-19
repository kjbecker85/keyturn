// The morning brief: one person's open work, built by rules.
import { addDays, formatDate, formatShort, isBusinessDay, priorBusinessDay, TODAY } from "./dates";
import type { ExceptionRow, Property, Task } from "./data/types";

export type Brief = {
  assignee: string;
  blocked: Task[];
  dueSoon: Task[];
  shifted: Task[];
  exceptions: ExceptionRow[];
  openTasks: number;
};

export const BRIEF_WINDOW_DAYS = 21;

export function buildBrief(assignee: string, tasks: Task[], exceptions: ExceptionRow[]): Brief {
  const mine = tasks.filter((t) => t.assignee === assignee && t.status !== "Complete");
  const horizon = addDays(TODAY, BRIEF_WINDOW_DAYS);
  return {
    assignee,
    openTasks: mine.length,
    blocked: mine.filter((t) => t.status === "Blocked"),
    dueSoon: mine.filter((t) => t.status !== "Blocked" && t.due_date <= horizon).sort((a, b) => a.due_date.localeCompare(b.due_date)),
    shifted: mine.filter((t) => !isBusinessDay(t.due_date)),
    exceptions: exceptions.filter((e) => e.status === "open" && e.assignee === assignee),
  };
}

export function briefText(brief: Brief, properties: Property[]) {
  const name = new Map(properties.map((p) => [p.id, p.name]));
  const line = (t: Task) => `- ${name.get(t.property_id)}: ${t.task} (due ${formatShort(t.due_date)}, ${t.status})`;
  const sections = [
    `Good morning. Your transition work as of ${formatDate(TODAY)}: ${brief.openTasks} open tasks.`,
    brief.blocked.length
      ? `Blocked:\n${brief.blocked.map((t) => `${line(t)}\n  ${t.notes ?? "No reason recorded."}`).join("\n")}`
      : "",
    brief.dueSoon.length
      ? `Due in the next ${BRIEF_WINDOW_DAYS} days:\n${brief.dueSoon.map(line).join("\n")}`
      : `Nothing due in the next ${BRIEF_WINDOW_DAYS} days.`,
    brief.shifted.length
      ? `Due dates that land on a weekend or holiday, so the real deadline is earlier:\n${brief.shifted
          .map((t) => `- ${name.get(t.property_id)}: ${t.task}, listed ${formatShort(t.due_date)}, finish by ${formatShort(priorBusinessDay(t.due_date))}`)
          .join("\n")}`
      : "",
    brief.exceptions.length
      ? `Exceptions assigned to you:\n${brief.exceptions.map((e) => `- ${e.title}`).join("\n")}`
      : "",
  ];
  return {
    subject: `Your transition brief for ${formatDate(TODAY)}`,
    body: sections.filter(Boolean).join("\n\n"),
  };
}
