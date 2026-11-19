import Link from "next/link";
import { signOut } from "@/app/login/actions";
import { CommandPalette } from "@/components/command-palette";
import { BottomNav, SideNav } from "@/components/nav";
import { Realtime } from "@/components/realtime";
import { getUser } from "@/lib/auth";
import { TAKEOVER, TODAY, daysBetween, formatDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const db = await createClient();
  const [{ count }, { data: properties }] = await Promise.all([
    db.from("exceptions").select("id", { count: "exact", head: true }).eq("status", "open"),
    db.from("properties").select("id, name").order("id"),
  ]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-background/95 px-4 py-2.5 backdrop-blur">
        <Link href="/" className="font-semibold tracking-tight">
          Keyturn
        </Link>
        <div className="flex items-center gap-3 text-xs text-muted sm:text-sm">
          <span className="hidden lg:inline">Today is {formatDate(TODAY)}</span>
          <span className="rounded-full border border-line px-2 py-0.5 text-foreground">
            {daysBetween(TODAY, TAKEOVER)} days to takeover
          </span>
          <CommandPalette properties={properties ?? []} />
          <form action={signOut} className="flex items-center gap-2">
            <span className="hidden sm:inline">
              {user.full_name} · {user.title}
            </span>
            <button type="submit" className="underline-offset-2 hover:text-foreground hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="sticky top-[45px] hidden h-[calc(100dvh-45px)] w-48 shrink-0 border-r border-line md:block">
          <SideNav openCount={count ?? 0} />
        </aside>
        <main className="min-w-0 flex-1 pb-20 md:pb-0">{children}</main>
      </div>
      <BottomNav />
      <Realtime />
    </div>
  );
}
