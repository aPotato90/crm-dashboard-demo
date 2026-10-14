"use client";

import { LogOutIcon, RotateCcwIcon } from "lucide-react";
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
import { describeFirebaseError } from "@/lib/firebase/errors";
import { cn } from "@/lib/utils";

import { useSandbox } from "./sandbox-provider";

/** Starts a reset with toast feedback (announced via Sonner's live region). */
export function useResetDemoData() {
  const { reset } = useSandbox();
  return () =>
    toast.promise(reset(), {
      loading: "Resetting demo data…",
      success: "Demo data restored",
      error: (error: unknown) => ({
        message: "Reset failed",
        description: describeFirebaseError(error),
      }),
    });
}

/** Sandbox id plus the Reset demo data and Sign out actions. */
export function SandboxActions({ className }: { className?: string }) {
  const { uid, status, busy, signOutAndDelete } = useSandbox();
  const resetDemoData = useResetDemoData();
  const resetting = status === "resetting";

  async function handleSignOut() {
    const id = toast.loading("Deleting your sandbox and signing out…");
    try {
      const deleted = await signOutAndDelete();
      if (deleted)
        toast.success("Signed out. Your sandbox was deleted.", { id });
      else
        toast.warning("Signed out", {
          id,
          description:
            "Your sandbox data could not be deleted. It stays private to your old session.",
        });
    } catch (error) {
      toast.error("Could not sign out", {
        id,
        description: describeFirebaseError(error),
      });
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="px-1 text-xs text-muted-foreground">
        Sandbox{" "}
        <span className="font-mono font-medium text-foreground">
          {uid.slice(0, 6)}
        </span>
        <span className="sr-only">
          {" "}
          (first 6 characters of your sandbox id)
        </span>
      </p>
      <div className="flex flex-col gap-1">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={busy}
            >
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
              <AlertDialogAction onClick={resetDemoData}>
                Reset data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start"
              disabled={busy}
            >
              <LogOutIcon aria-hidden />
              Sign out
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out of the demo?</AlertDialogTitle>
              <AlertDialogDescription>
                Signing out deletes your sandbox data and ends your anonymous
                session. Exploring the demo again starts a fresh sandbox.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleSignOut}>
                Delete data and sign out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
