"use client";

import { useEffect } from "react";

/**
 * Sets a data-dependent document title (e.g. a contact's name) using the same
 * "%s · PipelineHQ (Demo)" pattern as the static page metadata. Next.js
 * applies the route's static title after client navigations, so the title is
 * re-applied whenever <head> changes while this page is shown.
 */
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (!title) return;
    const full = `${title} · PipelineHQ (Demo)`;
    const apply = () => {
      if (document.title !== full) document.title = full;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [title]);
}
