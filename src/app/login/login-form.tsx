"use client";

import { useActionState } from "react";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { signInAs, type SignInState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signInAs,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      {DEMO_ACCOUNTS.map((account) => (
        <button
          key={account.role}
          type="submit"
          name="role"
          value={account.role}
          disabled={pending}
          className="rounded-lg border border-line bg-panel px-4 py-3 text-left transition hover:border-accent disabled:opacity-60"
        >
          <span className="block font-medium">{account.title}</span>
          <span className="block text-sm text-muted">{account.blurb}</span>
        </button>
      ))}
      <p role="alert" className="min-h-5 text-sm text-danger">
        {state?.error}
      </p>
    </form>
  );
}
