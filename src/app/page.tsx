import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TAKEOVER_LABEL, TODAY_LABEL } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";

export default function Home() {
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <span className="font-semibold tracking-tight">Keyturn</span>
        <span className="text-sm text-muted">
          Today: {TODAY_LABEL} · Takeover: {TAKEOVER_LABEL}
        </span>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <Session />
        </Suspense>
      </main>
    </>
  );
}

async function Session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, title")
    .eq("id", data.claims.sub)
    .single();

  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <p className="text-sm text-muted">Signed in as</p>
      <h1 className="mt-1 text-xl font-semibold">
        {profile?.full_name ?? "Unknown user"}
      </h1>
      <p className="text-muted">{profile?.title}</p>
      <p className="mt-4 text-sm text-muted">
        The scaffold is live. The exceptions inbox arrives in a later phase.
      </p>
      <form action={signOut} className="mt-5">
        <button
          type="submit"
          className="rounded-md border border-line px-3 py-1.5 text-sm transition hover:border-accent"
        >
          Sign out
        </button>
      </form>
    </section>
  );
}
