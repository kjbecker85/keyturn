// The assistant. Claude answers questions by calling fixed, read-only query
// tools over the same data the screens use. It never writes SQL and cannot
// change anything. Every record it is shown carries a reference it must cite.
import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { formatDate, TAKEOVER, TODAY } from "../dates";
import type { Dataset, ExceptionRow } from "../data/types";
import { AREA_LABEL, SEVERITY_LABEL } from "../data/types";
import { ROLLUP_RULES } from "../flags";
import { LEVEL_LABEL, readiness } from "../readiness";
import { noticeDeadline } from "../rules";
import { anthropic, FALLBACK_BETA, FAST_MODEL } from "./client";

type Input = Record<string, unknown>;
export type Citations = Record<string, string>;

const SYSTEM = `You are the assistant inside Keyturn, Asset Living's transition command center.
Asset Living takes over management of a nine-property Texas portfolio on ${formatDate(TAKEOVER)}. Treat today as ${formatDate(TODAY)}.
The people asking are the Director of Transitions, a regional manager, or a task assignee.

How to answer:
- Use the tools to look things up. Answer only from what the tools return. Do not use outside knowledge about these properties, vendors or people.
- Cite the records you relied on with their reference in square brackets, exactly as given: [EX-12], [TASK-34], [VC-5002], [UNIT-88]. Every factual claim about the data needs at least one citation.
- If the data can't answer the question, say so plainly and say what is missing. Rent rolls exist for only three of the nine properties.
- Lead with the answer. Be brief and specific: names, dates, amounts. Use a short list when there are several items.
- You cannot change data. If asked to, say which screen does it.`;

const text = (v: unknown) => (typeof v === "string" ? v.toLowerCase() : "");

export function buildTools(data: Dataset, exceptions: ExceptionRow[], citations: Citations) {
  const propertyName = new Map(data.properties.map((p) => [p.id, p.name]));
  const matchProperty = (query: unknown) => {
    const q = text(query);
    return q ? data.properties.filter((p) => p.name.toLowerCase().includes(q)).map((p) => p.id) : null;
  };
  const cite = (ref: string, href: string) => {
    citations[ref] = href;
    return ref;
  };

  const handlers: Record<string, (input: Input) => unknown> = {
    portfolio_overview: () =>
      readiness(data.properties, data.tasks, exceptions).map((r) => ({
        property: r.property.name,
        market: r.property.market,
        readiness_score: r.score,
        status: LEVEL_LABEL[r.level],
        open_exceptions: r.open,
        critical_exceptions: r.critical,
        critical_path_tasks_complete: `${r.criticalDone} of ${r.criticalTotal}`,
        rent_roll_received: r.property.rent_roll_received,
      })),

    list_exceptions: (input) => {
      const ids = matchProperty(input.property);
      const status = text(input.status) || "open";
      const q = text(input.search);
      const rows = exceptions.filter(
        (e) =>
          (status === "all" || e.status === status) &&
          (!ids || (e.property_id !== null && ids.includes(e.property_id))) &&
          (!input.area || e.area === input.area) &&
          (!input.max_severity || e.severity <= Number(input.max_severity)) &&
          (!input.assignee || text(e.assignee).includes(text(input.assignee))) &&
          (!q || `${e.title} ${e.detail} ${e.rule_key}`.toLowerCase().includes(q)),
      );
      return {
        total_matching: rows.length,
        showing: Math.min(rows.length, 40),
        exceptions: rows.slice(0, 40).map((e) => ({
          ref: cite(`EX-${e.id}`, `/?status=all&focus=${e.id}`),
          severity: SEVERITY_LABEL[e.severity],
          area: AREA_LABEL[e.area],
          property: e.property_id ? propertyName.get(e.property_id) : "Portfolio-wide",
          title: e.title,
          why: e.detail,
          due: e.due_date,
          assignee: e.assignee,
          status: e.status,
        })),
      };
    },

    list_tasks: (input) => {
      const ids = matchProperty(input.property);
      const rows = data.tasks.filter(
        (t) =>
          (!ids || ids.includes(t.property_id)) &&
          (!input.status || text(t.status) === text(input.status)) &&
          (!input.function || text(t.function) === text(input.function)) &&
          (!input.assignee ||
            (text(input.assignee) === "unassigned" ? !t.assignee : text(t.assignee).includes(text(input.assignee)))) &&
          (!input.due_on_or_before || t.due_date <= String(input.due_on_or_before)) &&
          (input.critical_path_only ? t.critical_path : true),
      );
      return {
        total_matching: rows.length,
        showing: Math.min(rows.length, 60),
        tasks: rows.slice(0, 60).map((t) => ({
          ref: cite(`TASK-${t.id}`, `/tasks?focus=${t.id}`),
          property: propertyName.get(t.property_id),
          task: t.task,
          function: t.function,
          assignee: t.assignee,
          critical_path: t.critical_path,
          due: t.due_date,
          status: t.status,
          last_updated: t.last_updated,
          notes: t.notes,
        })),
      };
    },

    list_contracts: (input) => {
      const ids = matchProperty(input.property);
      const rows = data.contracts.filter(
        (c) =>
          (!ids || ids.includes(c.property_id)) &&
          (!input.vendor || text(c.vendor).includes(text(input.vendor))) &&
          (!input.service || text(c.service).includes(text(input.service))) &&
          (input.auto_renew_only ? c.auto_renew : true) &&
          (!input.notice_deadline_on_or_before || noticeDeadline(c) <= String(input.notice_deadline_on_or_before)) &&
          (!input.term_ends_on_or_before || c.term_end <= String(input.term_ends_on_or_before)),
      );
      return {
        total_matching: rows.length,
        contracts: rows.map((c) => ({
          ref: cite(c.contract_id, `/vendors?focus=${c.id}`),
          property: propertyName.get(c.property_id),
          vendor: c.vendor,
          service: c.service,
          monthly_cost: c.monthly_cost,
          term_end: c.term_end,
          auto_renew: c.auto_renew,
          notice_days: c.notice_days,
          notice_deadline: noticeDeadline(c),
          coi_expiration: c.coi_expiration,
          assignable_to_new_manager: c.assignable,
          decision: c.decision,
          decision_reason: c.decision_reason,
        })),
      };
    },

    rent_roll: (input) => {
      const ids = matchProperty(input.property);
      if (!ids?.length) return { error: "Name one property. Rent rolls exist for Willow Bend Flats, Cedar Crossing and The Reserve at Pinehurst." };
      const units = data.units.filter((u) => ids.includes(u.property_id));
      if (!units.length) return { error: "No rent roll has been received for this property." };
      const flagged = new Set(
        exceptions.filter((e) => e.status === "open" && !ROLLUP_RULES.includes(e.rule_key)).flatMap((e) => e.sources.filter((s) => s.table === "rent_roll_units").map((s) => s.id)),
      );
      const occupied = units.filter((u) => u.status === "occupied" || u.status === "notice");
      const rows = units.filter(
        (u) =>
          (input.flagged_only ? flagged.has(u.id) : true) &&
          (!input.status || u.status === input.status) &&
          (!input.unit || u.unit === String(input.unit)) &&
          (input.with_balance_only ? (u.balance ?? 0) > 0 : true),
      );
      return {
        summary: {
          units: units.length,
          occupied_or_notice: occupied.length,
          monthly_lease_rent: occupied.reduce((s, u) => s + (u.lease_rent ?? 0), 0),
          total_resident_balances: units.reduce((s, u) => s + (u.balance ?? 0), 0),
          past_lease_end: occupied.filter((u) => u.lease_end && u.lease_end < TODAY).length,
          flagged_rows: units.filter((u) => flagged.has(u.id)).length,
        },
        total_matching: rows.length,
        showing: Math.min(rows.length, 50),
        units: rows.slice(0, 50).map((u) => ({
          ref: cite(`UNIT-${u.id}`, `/rent-roll?focus=${u.id}`),
          property: propertyName.get(u.property_id),
          unit: u.unit,
          status: u.status,
          resident: u.resident_name,
          market_rent: u.market_rent,
          lease_rent: u.lease_rent,
          lease_start: u.lease_start,
          lease_end: u.lease_end,
          deposit: u.deposit,
          balance: u.balance,
          review_status: u.review_status,
          flagged: flagged.has(u.id),
        })),
      };
    },
  };

  const str = (description: string) => ({ type: "string" as const, description });
  const bool = (description: string) => ({ type: "boolean" as const, description });
  const property = str("Property name or part of it, for example 'Trinity' or 'Elm Street'. Omit for all nine.");

  const tools: Anthropic.Beta.BetaTool[] = [
    {
      name: "portfolio_overview",
      description: "Readiness score, status and open exception counts for all nine properties. Start here for portfolio-level questions.",
      input_schema: { type: "object", properties: {} },
    },
    {
      name: "list_exceptions",
      description: "Problems the rules engine has flagged, most severe first. Each has a plain-language reason. Use for 'what is wrong', 'what is blocking', 'what needs attention'.",
      input_schema: {
        type: "object",
        properties: {
          property,
          area: { type: "string", enum: ["rent_roll", "checklist", "vendors", "cross_sheet"], description: "Limit to one area." },
          max_severity: { type: "integer", description: "1 = critical only, 2 = critical and high, 3 adds medium, 4 = all." },
          status: { type: "string", enum: ["open", "resolved", "dismissed", "all"], description: "Defaults to open." },
          assignee: str("Person the exception is assigned to."),
          search: str("Words to find in the title or reason."),
        },
      },
    },
    {
      name: "list_tasks",
      description: "Transition checklist tasks (14 per property across Accounting, Operations, HR, Systems, Marketing, Risk, Procurement).",
      input_schema: {
        type: "object",
        properties: {
          property,
          status: { type: "string", enum: ["Not Started", "In Progress", "Blocked", "Complete"] },
          function: str("Accounting, Operations, HR, Systems, Marketing, Risk or Procurement."),
          assignee: str("Assignee name, or 'unassigned'."),
          due_on_or_before: str("ISO date, YYYY-MM-DD."),
          critical_path_only: bool("Only critical-path tasks."),
        },
      },
    },
    {
      name: "list_contracts",
      description: "Vendor service contracts with cost, term end, auto-renewal, the computed notice deadline, COI expiration and any keep/terminate decision.",
      input_schema: {
        type: "object",
        properties: {
          property,
          vendor: str("Vendor name or part of it."),
          service: str("Service type, for example 'Landscaping' or 'Elevator'."),
          auto_renew_only: bool("Only auto-renewing contracts."),
          notice_deadline_on_or_before: str("ISO date. Finds contracts whose notice deadline is on or before it."),
          term_ends_on_or_before: str("ISO date."),
        },
      },
    },
    {
      name: "rent_roll",
      description: "Rent roll summary and unit rows for one property. Only three properties have a rent roll.",
      input_schema: {
        type: "object",
        properties: {
          property: str("Property name or part of it. Required."),
          flagged_only: bool("Only rows with an open exception."),
          status: { type: "string", enum: ["occupied", "notice", "vacant_ready", "vacant_not_ready"] },
          unit: str("One unit number."),
          with_balance_only: bool("Only units where the resident owes money."),
        },
        required: ["property"],
      },
    },
  ];

  return { tools, handlers };
}

export type Turn = { role: "user" | "assistant"; text: string };

export async function ask(history: Turn[], data: Dataset, exceptions: ExceptionRow[]) {
  const citations: Citations = {};
  const lookups: string[] = [];
  const { tools, handlers } = buildTools(data, exceptions, citations);
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((t) => ({ role: t.role, content: t.text }));

  for (let step = 0; step < 8; step++) {
    const response = await anthropic().beta.messages.create({
      model: FAST_MODEL,
      max_tokens: 16000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "medium" },
      tools,
      messages,
    });
    if (response.stop_reason === "refusal") {
      return { answer: "The model declined to answer that.", citations, lookups };
    }
    messages.push({ role: "assistant", content: response.content });

    const calls = response.content.filter((b) => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || calls.length === 0) {
      const answer = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { answer, citations, lookups };
    }

    // All results for one assistant turn go back in a single user message.
    messages.push({
      role: "user",
      content: calls.map((call) => {
        const input = (call.input ?? {}) as Input;
        lookups.push(`${call.name}(${Object.entries(input).map(([k, v]) => `${k}: ${String(v)}`).join(", ")})`);
        const handler = handlers[call.name];
        try {
          return {
            type: "tool_result" as const,
            tool_use_id: call.id,
            content: JSON.stringify(handler ? handler(input) : { error: `Unknown tool ${call.name}` }),
          };
        } catch (error) {
          return {
            type: "tool_result" as const,
            tool_use_id: call.id,
            content: error instanceof Error ? error.message : "Lookup failed.",
            is_error: true,
          };
        }
      }),
    });
  }
  return { answer: "I couldn't finish looking that up. Try a narrower question.", citations, lookups };
}
