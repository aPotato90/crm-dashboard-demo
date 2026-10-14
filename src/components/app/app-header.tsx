"use client";

import { Brand } from "@/components/brand";
import { useSandbox } from "./sandbox-provider";

export function AppHeader() {
  const { uid } = useSandbox();
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand href="/app" />
        <p className="rounded-full border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
          Sandbox{" "}
          <span className="font-mono font-medium text-foreground">
            {uid.slice(0, 6)}
          </span>
        </p>
      </div>
    </header>
  );
}
