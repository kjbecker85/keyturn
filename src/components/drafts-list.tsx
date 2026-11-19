"use client";

import { useState } from "react";
import { updateDraft } from "@/app/(app)/drafts/actions";
import type { SourceRef } from "@/lib/data/types";
import { SourceLink } from "./ui";
import { useAction, useFocusRow } from "./use-action";

type DraftRow = {
  id: number;
  kind: string;
  recipient: string;
  subject: string;
  body: string;
  sources: SourceRef[];
  generated_by: string;
  status: "draft" | "sent";
  created_at: string;
  sent_at: string | null;
};

const KIND: Record<string, string> = {
  escalation: "Escalation",
  termination_notice: "Termination notice",
  owner_report: "Owner report",
  morning_brief: "Morning brief",
};

export function DraftsList({ drafts }: { drafts: DraftRow[] }) {
  const focus = useFocusRow();
  const [openId, setOpenId] = useState<number | null>(focus ?? drafts[0]?.id ?? null);
  if (drafts.length === 0) {
    return <p className="px-4 text-sm text-muted">No drafts yet. Open an exception and choose Draft escalation.</p>;
  }
  return (
    <div className="grid gap-3 px-4 pb-10 md:px-8">
      {drafts.map((d) => (
        <article key={d.id} id={`row-${d.id}`} className="card">
          <button
            type="button"
            className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left"
            onClick={() => setOpenId(openId === d.id ? null : d.id)}
          >
            <span className="chip">{KIND[d.kind] ?? d.kind}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.subject}</span>
            <span className={`text-xs ${d.status === "sent" ? "text-ok-ink" : "text-muted"}`}>
              {d.status === "sent" ? `Sent ${new Date(d.sent_at!).toLocaleString()}` : "Draft"}
            </span>
          </button>
          {openId === d.id && <Editor d={d} />}
        </article>
      ))}
    </div>
  );
}

function Editor({ d }: { d: DraftRow }) {
  const { pending, error, run } = useAction();
  const [recipient, setRecipient] = useState(d.recipient);
  const [subject, setSubject] = useState(d.subject);
  const [body, setBody] = useState(d.body);
  const sent = d.status === "sent";

  return (
    <div className="flex flex-col gap-4 border-t border-line px-5 py-5">
      <label className="text-xs font-medium text-muted">
        To
        <input className="field mt-1.5" value={recipient} disabled={sent} onChange={(e) => setRecipient(e.target.value)} />
      </label>
      <label className="text-xs font-medium text-muted">
        Subject
        <input className="field mt-1.5" value={subject} disabled={sent} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <textarea
        className="field min-h-64 font-sans leading-relaxed"
        aria-label="Body"
        value={body}
        disabled={sent}
        onChange={(e) => setBody(e.target.value)}
      />
      {d.sources.length > 0 && (
        <div>
          <p className="text-xs text-muted">Grounded in these rows</p>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-3">
            {d.sources.map((s) => <SourceLink key={`${s.table}-${s.id}`} source={s} />)}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {!sent && (
          <>
            <button type="button" className="btn" disabled={pending} onClick={() => run(() => updateDraft(d.id, { recipient, subject, body }))}>
              Save edits
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pending}
              onClick={() => run(() => updateDraft(d.id, { recipient, subject, body, status: "sent" }))}
            >
              Mark as sent
            </button>
          </>
        )}
        <button type="button" className="btn" onClick={() => navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)}>
          Copy
        </button>
        <span className="text-xs text-muted">Written by {d.generated_by}</span>
      </div>
    </div>
  );
}
