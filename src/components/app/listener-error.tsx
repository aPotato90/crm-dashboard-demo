"use client";

import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { describeFirebaseError } from "@/lib/firebase/errors";

/** Shown when a real-time listener fails; Retry re-subscribes. */
export function ListenerError({
  error,
  onRetry,
  title = "Could not load your data",
}: {
  error: unknown;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <Alert variant="destructive" className="px-4 py-3">
      <TriangleAlertIcon aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{describeFirebaseError(error)}</p>
        <Button variant="outline" className="mt-3" onClick={onRetry}>
          <RotateCwIcon aria-hidden />
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}
