// Drafts emails and reports from the records behind an exception.
// With a Claude key the wording comes from the model, grounded in the facts
// passed in. Without one, a plain template is used and labeled as such.
import "server-only";
import { formatDate, TAKEOVER, TODAY } from "../dates";
import { noticeDeadline } from "../rules";
import type { Contract, ExceptionRow, SourceRef } from "../data/types";
import type { Readiness } from "../readiness";
import { LEVEL_LABEL } from "../readiness";
import { AiUnavailable, complete, DEEP_MODEL, FAST_MODEL } from "./client";

export type Draft = {
  recipient: string;
  subject: string;
  body: string;
  generated_by: string;
  sources: SourceRef[];
};

const HOUSE_STYLE = `You draft operational emails for Asset Living's property transitions team.
Asset Living is taking over management of a nine-property Texas portfolio on ${formatDate(TAKEOVER)}. Today is ${formatDate(TODAY)}.
Rules:
- Use only the facts provided. Never invent names, amounts, dates, phone numbers or commitments. If a fact you need is missing, say what is missing.
- Plain, direct, courteous business English. Short paragraphs. No bullet walls, no filler, no exclamation marks.
- State the problem, why it matters for the takeover date, and one specific ask with a date.
- Sign off as "[Your name], Asset Living Transitions".
Return exactly this format:
Subject: <one line>

<email body>`;

function parse(text: string, fallbackSubject: string) {
  const match = /^Subject:\s*(.+)\n+([\s\S]+)$/i.exec(text.trim());
  return match
    ? { subject: match[1].trim(), body: match[2].trim() }
    : { subject: fallbackSubject, body: text.trim() };
}

async function write(
  model: string,
  system: string,
  facts: unknown,
  instruction: string,
  template: { subject: string; body: string },
) {
  try {
    const text = await complete({
      model,
      system,
      prompt: `${instruction}\n\nFacts (JSON):\n${JSON.stringify(facts, null, 2)}`,
    });
    return { ...parse(text, template.subject), generated_by: model };
  } catch (error) {
    if (!(error instanceof AiUnavailable)) throw error;
    return { ...template, generated_by: "template (no Claude key configured)" };
  }
}

/** Who an escalation should go to, from the rule that raised it. */
export function recipientFor(e: ExceptionRow, vendor?: string): string {
  if (/owner signatory/i.test(e.detail)) return "Property owner contact";
  if (e.rule_key.startsWith("vendor.") && vendor) return `${vendor} (account manager)`;
  if (e.rule_key === "task.unassigned") return "Function lead, Asset Living";
  if (e.rule_key === "task.stale" || e.rule_key === "task.overdue") return e.assignee ?? "Task assignee";
  if (e.rule_key === "task.non_business_due") return "Transition team, Asset Living";
  return "Prior manager (transition contact)";
}

export async function draftEscalationEmail(
  e: ExceptionRow,
  property: string | null,
  records: unknown[],
  vendor?: string,
): Promise<Draft> {
  const recipient = recipientFor(e, vendor);
  const facts = {
    recipient,
    property,
    issue: e.title,
    why_flagged: e.detail,
    deadline: e.due_date,
    source_records: records,
  };
  const template = {
    subject: `Action needed before ${formatDate(TAKEOVER)}: ${e.title}`,
    body: [
      `Hello,`,
      `We are preparing for the ${formatDate(TAKEOVER)} management takeover${property ? ` of ${property}` : ""} and need your help with the following.`,
      e.detail,
      e.due_date ? `We need this resolved by ${formatDate(e.due_date)}.` : `Please reply with a date we can plan around.`,
      `Source: ${e.sources.map((s) => `${s.sheet} row ${s.row} (${s.label})`).join("; ") || "transition tracker"}.`,
      `Thank you,\n[Your name], Asset Living Transitions`,
    ].join("\n\n"),
  };
  const written = await write(
    FAST_MODEL,
    HOUSE_STYLE,
    facts,
    `Write an escalation email to: ${recipient}.`,
    template,
  );
  return { recipient, ...written, sources: e.sources };
}

export async function draftTerminationNotice(c: Contract, property: string, reason: string): Promise<Draft> {
  const deadline = noticeDeadline(c);
  const late = deadline < TODAY;
  const recipient = `${c.vendor} (contracts)`;
  const facts = {
    contract_id: c.contract_id,
    vendor: c.vendor,
    service: c.service,
    property,
    current_term_end: c.term_end,
    auto_renews: c.auto_renew,
    notice_days_required: c.notice_days,
    notice_deadline: deadline,
    notice_deadline_already_passed: late,
    assignable_to_new_manager: c.assignable,
    reason_for_termination: reason,
  };
  const template = {
    subject: `Notice of non-renewal: ${c.contract_id} ${c.service} at ${property}`,
    body: [
      `To ${c.vendor},`,
      `This letter is written notice that ${c.contract_id} for ${c.service.toLowerCase()} at ${property} will not be renewed beyond its current term ending ${formatDate(c.term_end)}.`,
      late
        ? `We recognize the ${c.notice_days}-day notice date of ${formatDate(deadline)} has passed. Management of the property changes on ${formatDate(TAKEOVER)}, and we ask that you accept this notice or propose a short-term arrangement.`
        : `This notice is given ahead of the ${c.notice_days}-day deadline of ${formatDate(deadline)}.`,
      `Reason: ${reason}`,
      `Please confirm receipt in writing.`,
      `[Your name], Asset Living Transitions`,
    ].join("\n\n"),
  };
  const written = await write(
    DEEP_MODEL,
    HOUSE_STYLE +
      "\nThis is a formal notice of non-renewal or termination. If the notice deadline has already passed, say so plainly and ask the vendor to accept late notice or agree a short-term arrangement. Do not cite contract clauses, because the contract text is not available.",
    facts,
    `Write the notice to ${c.vendor}.`,
    template,
  );
  return {
    recipient,
    ...written,
    sources: [
      { table: "vendor_contracts", id: c.id, sheet: "A3 Vendor Contracts", row: c.source_row, label: `${c.contract_id} ${c.vendor}` },
    ],
  };
}

export async function draftOwnerReport(rows: Readiness[], exceptions: ExceptionRow[]): Promise<Draft> {
  const scope = rows.length === 1 ? rows[0].property.name : "the nine-property portfolio";
  const facts = rows.map((r) => ({
    property: r.property.name,
    market: r.property.market,
    readiness_score: r.score,
    status: LEVEL_LABEL[r.level],
    critical_path_tasks: `${r.criticalDone} of ${r.criticalTotal} complete`,
    open_issues: exceptions
      .filter((e) => e.status === "open" && e.property_id === r.property.id && e.severity <= 2)
      .slice(0, 6)
      .map((e) => ({ issue: e.title, due: e.due_date })),
  }));
  const template = {
    subject: `Transition status as of ${formatDate(TODAY)}: ${scope}`,
    body: [
      `Status of the ${formatDate(TAKEOVER)} takeover as of ${formatDate(TODAY)}.`,
      ...facts.map(
        (f) =>
          `${f.property} (${f.market}): ${f.status}, readiness ${f.readiness_score}/100, critical-path tasks ${f.critical_path_tasks}.` +
          (f.open_issues.length ? `\nOpen items: ${f.open_issues.map((i) => i.issue).join("; ")}.` : ""),
      ),
      `[Your name], Asset Living Transitions`,
    ].join("\n\n"),
  };
  const written = await write(
    DEEP_MODEL,
    HOUSE_STYLE +
      "\nThis is a status report to the property owner, not an escalation. Lead with whether day one is on track. Be candid about risks and say what Asset Living is doing about each. Group by property. Explain that the readiness score starts at 100 and loses points for each open issue. Keep it under 350 words for one property, 600 for the portfolio.",
    facts,
    `Write the owner's status report for ${scope}.`,
    template,
  );
  return { recipient: "Property owner", ...written, sources: [] };
}
