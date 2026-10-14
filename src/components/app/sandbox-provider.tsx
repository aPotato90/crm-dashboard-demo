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
import { resetDemoData, seedDemoData } from "@/lib/crm/seed";

export type SandboxStatus =
  "checking" | "seeding" | "ready" | "resetting" | "error";

type SandboxContextValue = {
  uid: string;
  status: SandboxStatus;
  error: unknown;
  seededAt: Date | null;
  /** Increments after a reset so views can reload their data. */
  dataVersion: number;
  /** Deletes the sandbox and reseeds it. Rejects if the reset fails. */
  reset: () => Promise<void>;
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
  const [status, setStatus] = useState<SandboxStatus>("checking");
  const [error, setError] = useState<unknown>(null);
  const [seededAt, setSeededAt] = useState<Date | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
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
        setStatus("ready");
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
      setDataVersion((v) => v + 1);
    } finally {
      setStatus("ready");
    }
  }, [uid]);

  const retry = useCallback(() => {
    setError(null);
    setStatus("checking");
    setAttempt((a) => a + 1);
  }, []);

  const value = useMemo(
    () => ({ uid, status, error, seededAt, dataVersion, reset, retry }),
    [uid, status, error, seededAt, dataVersion, reset, retry],
  );

  return <SandboxContext value={value}>{children}</SandboxContext>;
}

export function useSandbox(): SandboxContextValue {
  const value = useContext(SandboxContext);
  if (!value) throw new Error("useSandbox must be used inside the app area.");
  return value;
}
