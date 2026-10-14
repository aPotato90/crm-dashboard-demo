"use client";

import { format } from "date-fns";
import { LogOutIcon, RotateCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  activitiesRepo,
  companiesRepo,
  contactsRepo,
  dealsRepo,
  tasksRepo,
} from "@/lib/crm/repo";
import { useAuth } from "@/lib/firebase/auth-provider";
import { describeFirebaseError } from "@/lib/firebase/errors";

import { useSandbox } from "./sandbox-provider";

const COUNTED = [
  { label: "Companies", repo: companiesRepo },
  { label: "Contacts", repo: contactsRepo },
  { label: "Deals", repo: dealsRepo },
  { label: "Activities", repo: activitiesRepo },
  { label: "Tasks", repo: tasksRepo },
] as const;

type Counts = { version: number; values: number[] } | { error: unknown };

/** Sandbox id, contents and the reset / sign-out controls. */
export function SandboxOverview() {
  const { uid, status, seededAt, dataVersion, reset } = useSandbox();
  const { signOut } = useAuth();
  const [counts, setCounts] = useState<Counts | null>(null);
  const resetting = status === "resetting";

  useEffect(() => {
    if (resetting) return;
    let cancelled = false;
    Promise.all(COUNTED.map(({ repo }) => repo.count(uid))).then(
      (values) => !cancelled && setCounts({ version: dataVersion, values }),
      (error: unknown) => !cancelled && setCounts({ error }),
    );
    return () => {
      cancelled = true;
    };
  }, [uid, dataVersion, resetting]);

  const countsReady =
    counts !== null &&
    "values" in counts &&
    counts.version === dataVersion &&
    !resetting;

  function handleReset() {
    toast.promise(reset(), {
      loading: "Resetting demo data…",
      success: "Demo data restored",
      error: (error: unknown) => ({
        message: "Reset failed",
        description: describeFirebaseError(error),
      }),
    });
  }

  async function handleSignOut() {
    try {
      await signOut();
    } catch (error) {
      toast.error("Could not sign out", {
        description: describeFirebaseError(error),
      });
    }
  }

  return (
    <Card className="mt-8 max-w-2xl">
      <CardHeader>
        <CardTitle>Your sandbox</CardTitle>
        <CardDescription>
          Private to this browser session. Nobody else can see or change it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Sandbox ID</dt>
            <dd className="mt-1 font-mono text-lg font-semibold">
              {uid.slice(0, 6)}
              <span className="sr-only"> (first 6 characters)</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Seeded</dt>
            <dd className="mt-1 text-sm font-medium">
              {seededAt && !resetting ? (
                <time dateTime={seededAt.toISOString()}>
                  {format(seededAt, "MMM d, yyyy 'at' h:mm a")}
                </time>
              ) : (
                <Skeleton className="h-5 w-40" />
              )}
            </dd>
          </div>
        </dl>

        <h2 className="mt-6 text-sm font-medium">Contents</h2>
        {counts !== null && "error" in counts ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            Could not count records: {describeFirebaseError(counts.error)}
          </p>
        ) : (
          <dl
            aria-busy={!countsReady}
            className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5"
          >
            {COUNTED.map(({ label }, i) => (
              <div key={label} className="rounded-lg border px-3 py-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  {countsReady ? (
                    counts.values[i]
                  ) : (
                    <Skeleton className="my-1 h-5 w-8" />
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={resetting}>
              <RotateCcwIcon
                aria-hidden
                className={resetting ? "animate-spin" : undefined}
              />
              {resetting ? "Resetting…" : "Reset demo data"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes everything in your sandbox, including any changes
                you made, and restores the original demo data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>
                Reset data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" disabled={resetting}>
              <LogOutIcon aria-hidden />
              Sign out
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of the demo?</AlertDialogTitle>
              <AlertDialogDescription>
                You are using an anonymous session. After signing out you cannot
                get back to this sandbox; exploring the demo again creates a new
                one.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignOut}>
                Sign out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
