"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Key, NAV_ICON } from "./icons";

export const NAV_GROUPS = [
  {
    label: "Command",
    items: [
      { href: "/", label: "Overview" },
      { href: "/inbox", label: "Inbox" },
      { href: "/inbox/triage", label: "Triage" },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/properties", label: "Properties" },
      { href: "/tasks", label: "Checklist" },
      { href: "/vendors", label: "Vendors" },
      { href: "/rent-roll", label: "Rent roll" },
    ],
  },
  {
    label: "Assist",
    items: [
      { href: "/ask", label: "Ask" },
      { href: "/drafts", label: "Drafts" },
      { href: "/brief", label: "Morning brief" },
    ],
  },
  {
    label: "Trust",
    items: [
      { href: "/activity", label: "Activity" },
      { href: "/about", label: "Assumptions" },
      { href: "/business-case", label: "Business case" },
    ],
  },
] as const;

export const NAV = NAV_GROUPS.flatMap((g) => g.items.map((item) => ({ ...item })));

const BOTTOM = [
  { href: "/", label: "Overview" },
  { href: "/inbox", label: "Inbox" },
  { href: "/properties", label: "Properties" },
  { href: "/ask", label: "Ask" },
  { href: "/more", label: "More" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/inbox") return pathname === "/inbox";
  return pathname.startsWith(href);
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-foreground text-accent-bright">
        <Key weight="duotone" className="size-5" />
      </span>
      <span className="display text-lg font-semibold">Keyturn</span>
    </Link>
  );
}

export function SideNav({ openCount }: { openCount: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="eyebrow mb-1.5 px-3">{group.label}</p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const Icon = NAV_ICON[item.href];
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      active
                        ? "bg-accent-soft font-semibold text-accent-strong"
                        : "text-muted hover:bg-panel2 hover:text-foreground"
                    }`}
                  >
                    <Icon weight={active ? "duotone" : "regular"} className="size-5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/inbox" && openCount > 0 && (
                      <span className="rounded-full bg-foreground px-2 py-0.5 text-xs font-semibold text-background tabular-nums">
                        {openCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] md:hidden">
      {BOTTOM.map((item) => {
        const Icon = NAV_ICON[item.href];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.7rem] font-medium ${
              active ? "text-accent-strong" : "text-muted"
            }`}
          >
            <Icon weight={active ? "duotone" : "regular"} className="size-6" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
