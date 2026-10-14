"use client";

import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Error boundary for app pages: the shell and navigation stay usable, and
 * "Try again" re-renders the page.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div
        role="alert"
        className="rounded-xl border border-destructive/40 bg-card p-6"
      >
        <div className="flex items-start gap-3">
          <TriangleAlertIcon
            aria-hidden
            className="mt-0.5 size-5 shrink-0 text-destructive"
          />
          <div>
            <h1 className="font-semibold">This page ran into a problem</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Something went wrong while showing this page. Your sandbox data is
              safe. Try again, or use the navigation to go somewhere else.
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Reference: {error.digest}
              </p>
            )}
            <Button className="mt-4" onClick={() => retry()}>
              <RotateCwIcon aria-hidden />
              Try again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
