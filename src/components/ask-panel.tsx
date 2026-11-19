"use client";

import Link from "next/link";
import { Fragment, useState, useTransition } from "react";
import { askQuestion } from "@/app/(app)/ask/actions";
import { Sparkle } from "./icons";

type Message = {
  role: "user" | "assistant";
  text: string;
  citations?: Record<string, string>;
  lookups?: string[];
};

const STARTERS = [
  "What needs my attention today?",
  "What's blocking Trinity Bluffs?",
  "Which contracts lock us in if we do nothing this month?",
  "Which properties are least ready for day one, and why?",
  "What did you find wrong in the Willow Bend rent roll?",
  "Which deadlines fall on Thanksgiving weekend?",
];

/** Turns [EX-12] style references into links to the record. */
function Cited({ text, citations }: { text: string; citations: Record<string, string> }) {
  const parts = text.split(/(\[[A-Z]+-\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const ref = /^\[([A-Z]+-\d+)\]$/.exec(part)?.[1];
        if (!ref) return <Fragment key={i}>{part.replace(/\*\*/g, "")}</Fragment>;
        const href = citations[ref];
        return href ? (
          <Link key={i} href={href} className="mx-0.5 rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[0.7rem] font-medium text-accent-strong hover:bg-accent hover:text-on-accent">
            {ref}
          </Link>
        ) : (
          <span key={i} className="mx-0.5 text-xs text-sev1-ink" title="This reference was not in the data the assistant looked up.">
            {ref}?
          </span>
        );
      })}
    </>
  );
}

export function AskPanel({ enabled }: { enabled: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const send = (question: string) => {
    const q = question.trim();
    if (!q || pending) return;
    const next: Message[] = [...messages, { role: "user", text: q }];
    setMessages(next);
    setInput("");
    start(async () => {
      const result = await askQuestion(next.map(({ role, text }) => ({ role, text })));
      if (result.ok) {
        setError(null);
        setMessages([...next, { role: "assistant", text: result.answer, citations: result.citations, lookups: result.lookups }]);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pb-10 md:px-8">
      {!enabled && (
        <p className="rounded-xl bg-sev3-soft px-4 py-3 text-sm text-sev3-ink">
          The assistant needs a Claude API key, and none is configured on this deployment. Every other screen works without it.
        </p>
      )}
      {messages.length === 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {STARTERS.map((s) => (
            <button key={s} type="button" className="card flex items-start gap-3 px-4 py-3.5 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-pop disabled:opacity-50" disabled={!enabled} onClick={() => send(s)}>
              <Sparkle weight="duotone" className="mt-0.5 size-5 shrink-0 text-accent" />
              {s}
            </button>
          ))}
        </div>
      )}
      {messages.map((m, i) =>
        m.role === "user" ? (
          <p key={i} className="self-end rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-sm text-background">{m.text}</p>
        ) : (
          <div key={i} className="card rise px-5 py-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              <Cited text={m.text} citations={m.citations ?? {}} />
            </p>
            {m.lookups && m.lookups.length > 0 && (
              <details className="mt-3 text-xs text-muted">
                <summary className="cursor-pointer">How this was looked up ({m.lookups.length} queries)</summary>
                <ul className="mt-1 space-y-0.5 font-mono">
                  {m.lookups.map((l, j) => <li key={j}>{l}</li>)}
                </ul>
              </details>
            )}
          </div>
        ),
      )}
      {pending && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Sparkle weight="duotone" className="size-5 animate-pulse text-accent" />
          Looking that up…
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <form
        className="sticky bottom-16 flex gap-2 md:bottom-4"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          className="field rounded-full px-5 py-3 shadow-card"
          placeholder="Ask about properties, tasks, contracts or the rent roll"
          value={input}
          disabled={!enabled}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn btn-primary rounded-full px-5" disabled={!enabled || pending}>
          Ask
        </button>
      </form>
    </div>
  );
}
