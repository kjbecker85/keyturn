import type { Metadata } from "next";
import { Key } from "@/components/icons";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-32 size-[34rem] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--accent-soft), transparent 65%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-40 -bottom-48 size-[38rem] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--indigo-soft), transparent 65%)" }}
      />
      <div className="card rise relative w-full max-w-md p-7 md:p-9">
        <span className="grid size-12 place-items-center rounded-2xl bg-foreground text-accent-bright">
          <Key weight="duotone" className="size-7" />
        </span>
        <h1 className="display mt-5 text-3xl font-semibold">Keyturn</h1>
        <p className="mt-2 text-base text-muted">
          The command center for a property takeover. Nine properties, one date, nothing missed.
        </p>
        <p className="eyebrow mt-7 mb-3">Pick a demo role</p>
        <LoginForm />
        <p className="mt-5 text-xs text-faint">Demo build. All data is synthetic.</p>
      </div>
    </main>
  );
}
