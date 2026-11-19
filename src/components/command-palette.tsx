"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "./icons";
import { NAV } from "./nav";

const VIEWS = [
  { label: "Critical exceptions", href: "/inbox?severity=1" },
  { label: "Vendor deadlines", href: "/inbox?area=vendors" },
  { label: "Rent roll flags", href: "/inbox?area=rent_roll" },
  { label: "Cross-sheet contradictions", href: "/inbox?area=cross_sheet" },
  { label: "Unassigned exceptions", href: "/inbox?assignee=none" },
];

export function CommandPalette({ properties }: { properties: { id: number; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search and jump to a screen, property or view"
        className="flex h-10 w-10 items-center justify-center gap-2.5 rounded-full border border-line bg-panel text-sm text-faint transition hover:border-accent sm:w-full sm:max-w-sm sm:justify-start sm:px-3.5"
      >
        <MagnifyingGlass weight="bold" className="size-4.5 shrink-0 text-muted" />
        <span className="hidden flex-1 text-left sm:block">Search or jump to…</span>
        <kbd className="kbd hidden sm:block">⌘K</kbd>
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        className="fixed top-24 left-1/2 z-50 w-[min(92vw,36rem)] -translate-x-1/2 overflow-hidden rounded-2xl bg-panel shadow-pop"
        overlayClassName="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm"
      >
        <Command.Input
          placeholder="Jump to a screen, property or view…"
          className="w-full border-b border-line bg-transparent px-5 py-4 text-base outline-none placeholder:text-faint"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2 text-sm">
          <Command.Empty className="px-3 py-4 text-muted">Nothing matches.</Command.Empty>
          <Group heading="Screens">
            {NAV.map((n) => (
              <Item key={n.href} onSelect={() => go(n.href)}>
                {n.label}
              </Item>
            ))}
          </Group>
          <Group heading="Views">
            {VIEWS.map((v) => (
              <Item key={v.href} onSelect={() => go(v.href)}>
                {v.label}
              </Item>
            ))}
          </Group>
          <Group heading="Properties">
            {properties.map((p) => (
              <Item key={p.id} onSelect={() => go(`/properties/${p.id}`)}>
                {p.name}
              </Item>
            ))}
          </Group>
        </Command.List>
      </Command.Dialog>
    </>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted"
    >
      {children}
    </Command.Group>
  );
}

function Item({ onSelect, children }: { onSelect: () => void; children: React.ReactNode }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="cursor-pointer rounded-lg px-3 py-2.5 data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-strong"
    >
      {children}
    </Command.Item>
  );
}
