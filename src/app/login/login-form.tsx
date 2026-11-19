"use client";

import { useActionState } from "react";
import { ArrowRight, Buildings, CheckCircle, Sparkle } from "@/components/icons";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { signInAs, type SignInState } from "./actions";

const ICON = { director: Sparkle, regional_manager: Buildings, assignee: CheckCircle };

export function LoginForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAs, null);

  return (
    <form action={action} className="flex flex-col gap-2.5">
      {DEMO_ACCOUNTS.map((account) => {
        const Icon = ICON[account.role];
        return (
          <button
            key={account.role}
            type="submit"
            name="role"
            value={account.role}
            disabled={pending}
            className="group flex items-center gap-3.5 rounded-xl border border-line bg-panel px-4 py-3.5 text-left transition hover:border-accent hover:bg-accent-soft disabled:opacity-60"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-panel2 text-indigo group-hover:bg-panel">
              <Icon weight="duotone" className="size-5.5" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold">{account.title}</span>
              <span className="block text-sm text-muted">{account.blurb}</span>
            </span>
            <ArrowRight weight="bold" className="size-4 text-faint transition group-hover:text-accent" />
          </button>
        );
      })}
      <p role="alert" className="min-h-5 text-sm text-danger">
        {state?.error}
      </p>
    </form>
  );
}
