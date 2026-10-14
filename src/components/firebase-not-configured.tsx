import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { missingFirebaseEnvVars } from "@/lib/firebase/config";

/** Shown instead of the demo when the NEXT_PUBLIC_FIREBASE_* vars are unset. */
export function FirebaseNotConfigured() {
  return (
    <Alert className="text-left">
      <TriangleAlertIcon aria-hidden />
      <AlertTitle>Firebase is not configured</AlertTitle>
      <AlertDescription>
        <p>
          The live demo needs a Firebase project. Copy{" "}
          <code className="font-mono text-xs">.env.example</code> to{" "}
          <code className="font-mono text-xs">.env.local</code>, fill in your
          web app config and restart the dev server. See the README for setup
          steps.
        </p>
        {missingFirebaseEnvVars.length > 0 && (
          <>
            <p className="mt-2 font-medium text-foreground">Missing values:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 font-mono text-xs">
              {missingFirebaseEnvVars.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}
