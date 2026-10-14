import type { Metadata } from "next";

import { Dashboard } from "@/components/dashboard/dashboard";

// Rendered only in the browser behind the auth gate (see ./layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return <Dashboard />;
}
