"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/login/actions";
import type { Profile } from "@/lib/data/types";
import { CaretDown, Moon, Rows, SignOut, Sun } from "./icons";
import { setDensity, setTheme, useDensity, useTheme } from "./prefs";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 2)
    .toUpperCase();

/** Who is signed in, as its own control, with display settings and sign out behind it. */
export function UserMenu({ user }: { user: Profile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const density = useDensity();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full border border-line bg-panel py-1 pr-3 pl-1 transition hover:border-accent"
      >
        <span className="grid size-8 place-items-center rounded-full bg-indigo text-xs font-semibold text-white">
          {initials(user.full_name)}
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-semibold">{user.full_name}</span>
          <span className="block text-xs text-muted">{user.title}</span>
        </span>
        <CaretDown weight="bold" className="size-3.5 text-muted" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 rounded-2xl bg-panel p-2 shadow-pop">
          <div className="px-3 py-2 sm:hidden">
            <p className="text-sm font-semibold">{user.full_name}</p>
            <p className="text-xs text-muted">{user.title}</p>
          </div>
          <p className="eyebrow px-3 pt-2 pb-1.5">Display</p>
          <Segmented
            label="Theme"
            value={theme}
            options={[
              { value: "light", label: "Light", icon: <Sun weight="duotone" className="size-4" /> },
              { value: "dark", label: "Dark", icon: <Moon weight="duotone" className="size-4" /> },
            ]}
            onChange={(v) => setTheme(v as "light" | "dark")}
          />
          <Segmented
            label="Text size"
            value={density}
            options={[
              { value: "comfortable", label: "Comfortable", icon: <Rows weight="duotone" className="size-4" /> },
              { value: "compact", label: "Compact", icon: <Rows weight="regular" className="size-3.5" /> },
            ]}
            onChange={(v) => setDensity(v as "comfortable" | "compact")}
          />
          <form action={signOut} className="mt-2 border-t border-line pt-2">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-panel2 hover:text-foreground"
            >
              <SignOut weight="duotone" className="size-5" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; icon: React.ReactNode }[];
  onChange: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="mx-1 mb-1.5 grid grid-cols-2 gap-1 rounded-xl bg-panel2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
            value === o.value ? "bg-panel text-foreground shadow-card" : "text-muted hover:text-foreground"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
