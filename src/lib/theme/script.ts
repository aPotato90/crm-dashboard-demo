/**
 * Theme handling shared by the inline <head> script and the client store.
 * No React or browser imports here, so the root layout (a Server Component)
 * can inline `THEME_SCRIPT`.
 */

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_STORAGE_KEY = "pipelinehq-theme";

/**
 * Runs synchronously in <head> before first paint: reads the saved choice
 * (inside try/catch, since storage can be blocked) and sets `.dark` and
 * `data-theme` on <html>, so the page never flashes the wrong theme.
 */
export const THEME_SCRIPT = `(function(){var t="system";try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(s==="light"||s==="dark")t=s}catch(e){}var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";r.setAttribute("data-theme",t)})()`;
