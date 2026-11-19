"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV = [
  { href: "/", label: "Inbox", primary: true },
  { href: "/properties", label: "Properties", primary: true },
  { href: "/tasks", label: "Checklist", primary: true },
  { href: "/vendors", label: "Vendors", primary: false },
  { href: "/rent-roll", label: "Rent roll", primary: false },
  { href: "/ask", label: "Ask", primary: true },
  { href: "/drafts", label: "Drafts", primary: false },
  { href: "/brief", label: "Morning brief", primary: false },
  { href: "/activity", label: "Activity", primary: false },
  { href: "/about", label: "Assumptions", primary: false },
] as const;

const active = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export function SideNav({ openCount }: { openCount: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5 p-2">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition ${
            active(pathname, item.href)
              ? "bg-panel2 text-foreground"
              : "text-muted hover:bg-panel hover:text-foreground"
          }`}
        >
          {item.label}
          {item.href === "/" && openCount > 0 && (
            <span className="rounded-full bg-accent px-1.5 text-xs font-medium text-background">
              {openCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const items = [...NAV.filter((n) => n.primary), { href: "/more", label: "More" }];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex-1 py-3 text-center text-xs ${
            active(pathname, item.href) ? "font-medium text-accent" : "text-muted"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
