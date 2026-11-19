"use client";

import { Command } from "cmdk";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NAV } from "./nav";

const VIEWS = [
  { label: "Critical exceptions", href: "/?severity=1" },
  { label: "Vendor deadlines", href: "/?area=vendors" },
  { label: "Rent roll flags", href: "/?area=rent_roll" },
  { label: "Cross-sheet contradictions", href: "/?area=cross_sheet" },
  { label: "Unassigned exceptions", href: "/?assignee=none" },
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
        className="rounded-md border border-line px-2 py-0.5 text-xs text-muted hover:border-accent hover:text-foreground"
        aria-label="Open command palette"
      >
        <span className="hidden sm:inline">Search </span>⌘K
      </button>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        className="fixed left-1/2 top-24 z-50 w-[min(92vw,34rem)] -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-panel shadow-2xl"
        overlayClassName="fixed inset-0 z-40 bg-black/60"
      >
        <Command.Input
          placeholder="Jump to a screen, property or view…"
          className="w-full border-b border-line bg-transparent px-4 py-3 text-sm outline-none"
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
      className="cursor-pointer rounded-md px-3 py-2 data-[selected=true]:bg-panel2"
    >
      {children}
    </Command.Item>
  );
}
