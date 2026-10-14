import type { Metadata } from "next";

import { SandboxOverview } from "@/components/app/sandbox-overview";

export const metadata: Metadata = { title: "Dashboard" };

export default function AppHomePage() {
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6"
    >
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Dashboard coming next
      </h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Your private sandbox is ready. The full dashboard with the deal
        pipeline, contacts and revenue charts arrives in the next step. Until
        then you can check the sandbox and try the reset and sign-out flows.
      </p>
      <SandboxOverview />
    </main>
  );
}
