import { CommandPalette } from "@/components/command-palette";
import { CalendarBlank } from "@/components/icons";
import { BottomNav, Logo, SideNav } from "@/components/nav";
import { Realtime } from "@/components/realtime";
import { UserMenu } from "@/components/user-menu";
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
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-line bg-panel md:flex">
        <div className="flex h-(--header-h) shrink-0 items-center px-5">
          <Logo />
        </div>
        <SideNav openCount={count ?? 0} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-(--header-h) shrink-0 items-center gap-3 border-b border-line bg-background/85 px-4 backdrop-blur-md md:px-6">
          <div className="md:hidden">
            <Logo />
          </div>
          <div className="flex min-w-0 flex-1 justify-end md:justify-start">
            <CommandPalette properties={properties ?? []} />
          </div>
          <div
            className="hidden items-center gap-2 rounded-full bg-panel px-3.5 py-1.5 text-sm shadow-card lg:flex"
            title={`Today is ${formatDate(TODAY)}. Takeover is ${formatDate(TAKEOVER)}.`}
          >
            <CalendarBlank weight="duotone" className="size-4.5 text-accent" />
            <span className="text-muted">{formatDate(TODAY)}</span>
            <span className="h-4 w-px bg-line" />
            <span className="font-semibold">{daysBetween(TODAY, TAKEOVER)} days to Day One</span>
          </div>
          <span className="hidden h-7 w-px bg-line sm:block" />
          <UserMenu user={user} />
        </header>
        <main className="min-w-0 flex-1 pb-24 md:pb-0">{children}</main>
      </div>

      <BottomNav />
      <Realtime />
    </div>
  );
}
