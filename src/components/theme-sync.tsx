"use client";

import { useLayoutEffect } from "react";

import {
  applyTheme,
  readStoredTheme,
  watchSystemTheme,
} from "@/lib/theme/store";

/**
 * Mounted once in the root layout. Re-applies the saved theme (React's dev
 * Strict Mode remount resets <html> attributes the inline script set) and
 * follows OS changes while the choice is "system".
 */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme(readStoredTheme());
    return watchSystemTheme();
  }, []);
  return null;
}
