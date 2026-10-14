"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getSandboxState } from "@/lib/crm/repo";
import { deleteSandbox, resetDemoData, seedDemoData } from "@/lib/crm/seed";
import { useAuth } from "@/lib/firebase/auth-provider";

export type SandboxStatus =
  "checking" | "seeding" | "ready" | "resetting" | "signing-out" | "error";

type SandboxContextValue = {
  uid: string;
  status: SandboxStatus;
  error: unknown;
  seededAt: Date | null;
  /** True while bulk writes (reset, sign-out cleanup) are rewriting data. */
  busy: boolean;
  /** Deletes the sandbox and reseeds it. Rejects if the reset fails. */
  reset: () => Promise<void>;
  /**
   * Deletes the sandbox (best effort), then signs out. Resolves to `false`
   * when the data could not be deleted; the visitor is signed out anyway.
   */
  signOutAndDelete: () => Promise<boolean>;
  retry: () => void;
};

const SandboxContext = createContext<SandboxContextValue | null>(null);

/**
 * Makes sure the visitor's sandbox is seeded before rendering the app.
 * Mount with `key={uid}` so a different user starts from a clean state.
 */
export function SandboxProvider({
  uid,
  children,
}: {
  uid: string;
  children: React.ReactNode;
}) {
  const { signOut } = useAuth();
  const [status, setStatus] = useState<SandboxStatus>("checking");
  const [error, setError] = useState<unknown>(null);
  const [seededAt, setSeededAt] = useState<Date | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let state = await getSandboxState(uid);
        if (!state?.seeded) {
          if (!cancelled) setStatus("seeding");
          await seedDemoData(uid);
          state = await getSandboxState(uid);
        }
        if (cancelled) return;
        setSeededAt(state?.seededAt ?? null);
        setStatus((current) =>
          current === "checking" || current === "seeding" ? "ready" : current,
        );
      } catch (err) {
        if (cancelled) return;
        setError(err);
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  const reset = useCallback(async () => {
    setStatus("resetting");
    try {
      await resetDemoData(uid);
      const state = await getSandboxState(uid);
      setSeededAt(state?.seededAt ?? null);
    } finally {
      setStatus("ready");
    }
  }, [uid]);

  const signOutAndDelete = useCallback(async () => {
    setStatus("signing-out");
    let deleted = true;
    try {
      await deleteSandbox(uid);
    } catch (err) {
      deleted = false;
      console.warn("Could not delete the sandbox before signing out", err);
    }
    try {
      await signOut();
    } catch (err) {
      setStatus("ready");
      throw err;
    }
    return deleted;
  }, [uid, signOut]);

  const retry = useCallback(() => {
    setError(null);
    setStatus("checking");
    setAttempt((a) => a + 1);
  }, []);

  const value = useMemo(
    () => ({
      uid,
      status,
      error,
      seededAt,
      busy: status === "resetting" || status === "signing-out",
      reset,
      signOutAndDelete,
      retry,
    }),
    [uid, status, error, seededAt, reset, signOutAndDelete, retry],
  );

  return <SandboxContext value={value}>{children}</SandboxContext>;
}

export function useSandbox(): SandboxContextValue {
  const value = useContext(SandboxContext);
  if (!value) throw new Error("useSandbox must be used inside the app area.");
  return value;
}
