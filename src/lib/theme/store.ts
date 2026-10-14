"use client";

import { THEME_STORAGE_KEY, type Theme } from "./script";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/** The saved choice, or "system" if none (or storage is unavailable). */
export function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

/** Applies a choice to <html>: `.dark`, `color-scheme` and `data-theme`. */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia(DARK_QUERY).matches);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  root.setAttribute("data-theme", theme);
}

/** Current choice as applied to the document (set by the inline script). */
export function getThemeSnapshot(): Theme {
  const value = document.documentElement.getAttribute("data-theme");
  return isTheme(value) ? value : "system";
}

export function getServerThemeSnapshot(): Theme {
  return "system";
}

export function subscribeToTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Saves (best effort) and applies a new choice, then notifies subscribers. */
export function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode, policies): the choice lasts this visit.
  }
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

/** Keeps "system" in sync when the OS colour scheme changes. */
export function watchSystemTheme() {
  const media = window.matchMedia(DARK_QUERY);
  const onChange = () => {
    if (getThemeSnapshot() === "system") applyTheme("system");
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
