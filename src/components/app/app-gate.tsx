"use client";

import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Brand } from "@/components/brand";
import { FirebaseNotConfigured } from "@/components/firebase-not-configured";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/firebase/auth-provider";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { describeFirebaseError } from "@/lib/firebase/errors";

import { AppHeader } from "./app-header";
import { AppSkeleton } from "./app-skeleton";
import { SandboxProvider, useSandbox } from "./sandbox-provider";

/**
 * Client-side route protection for /app/*: only a signed-in visitor gets in,
 * everyone else is sent to the landing page. A skeleton is shown while the
 * session is restored, so protected content never flashes.
 */
export function AppGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const signedOut = isFirebaseConfigured && !loading && !user;

  useEffect(() => {
    if (signedOut) router.replace("/");
  }, [signedOut, router]);

  if (!isFirebaseConfigured) {
    return (
      <div className="flex flex-1 flex-col">
        <header className="border-b">
          <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
            <Brand />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
          <FirebaseNotConfigured />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <AppSkeleton
        message={signedOut ? "Redirecting…" : "Loading your workspace…"}
      />
    );
  }

  return (
    <SandboxProvider key={user.uid} uid={user.uid}>
      <SandboxGate>{children}</SandboxGate>
    </SandboxProvider>
  );
}

/** Seeds the sandbox on first entry, then renders the app. */
function SandboxGate({ children }: { children: React.ReactNode }) {
  const { status, error, retry } = useSandbox();

  if (status === "checking") {
    return <AppSkeleton message="Loading your workspace…" />;
  }
  if (status === "seeding") {
    return (
      <AppSkeleton message="Setting up your private sandbox with demo data. This takes a few seconds the first time…" />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader />
      {status === "error" ? (
        <main id="main" className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
          <Alert variant="destructive" className="px-4 py-3">
            <TriangleAlertIcon aria-hidden />
            <AlertTitle>Your sandbox could not be loaded</AlertTitle>
            <AlertDescription>
              <p>{describeFirebaseError(error)}</p>
              <Button variant="outline" className="mt-3" onClick={retry}>
                <RotateCwIcon aria-hidden />
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </main>
      ) : (
        children
      )}
    </div>
  );
}
