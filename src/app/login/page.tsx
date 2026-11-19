import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Keyturn</h1>
        <p className="mt-1 text-sm text-muted">
          Transition command center. Pick a demo role to sign in.
        </p>
      </div>
      <LoginForm />
      <p className="text-xs text-muted">
        Demo build. All data is synthetic.
      </p>
    </main>
  );
}
