"use client";

import { useEffect } from "react";

/**
 * Sets a data-dependent document title (e.g. a contact's name) using the same
 * "%s · PipelineHQ (Demo)" pattern as the static page metadata.
 */
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (title) document.title = `${title} · PipelineHQ (Demo)`;
  }, [title]);
}
