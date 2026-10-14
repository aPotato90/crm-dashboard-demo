"use client";

/**
 * "Skip to content" link. Recently visited routes stay in the DOM (hidden)
 * under Cache Components, so there can be more than one <main>; focus the
 * one that is actually visible. Falls back to `#main` without JavaScript.
 */
export function SkipLink() {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    const visibleMain = Array.from(document.querySelectorAll("main")).find(
      (main) => main.getClientRects().length > 0,
    );
    if (!visibleMain) return;
    event.preventDefault();
    if (!visibleMain.hasAttribute("tabindex")) {
      visibleMain.setAttribute("tabindex", "-1");
    }
    visibleMain.focus();
  }

  return (
    <a
      href="#main"
      onClick={handleClick}
      className="sr-only z-50 rounded-md bg-background text-sm font-medium shadow-md focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:px-4 focus:py-2 focus:ring-3 focus:ring-ring"
    >
      Skip to content
    </a>
  );
}
