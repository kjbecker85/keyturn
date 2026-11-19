"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
export type Density = "comfortable" | "compact";

function setPref(name: "theme" | "density", value: string) {
  document.documentElement.dataset[name] = value;
  document.cookie = `kt-${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export const setTheme = (theme: Theme) => setPref("theme", theme);
export const setDensity = (density: Density) => setPref("density", density);

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-density"] });
  return () => observer.disconnect();
}

/** The current theme, kept in step with the toggle. Charts drawn in JS use it to pick colors. */
export function useTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );
}

export function useDensity(): Density {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.density === "compact" ? "compact" : "comfortable"),
    () => "comfortable",
  );
}

/** Reads a CSS color token as a hex string, for libraries that can't take var(). */
export function token(name: string): string {
  if (typeof window === "undefined") return "#000000";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
