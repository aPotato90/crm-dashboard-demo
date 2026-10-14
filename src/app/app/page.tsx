import type { Metadata } from "next";

import { PageHeader } from "@/components/app/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title="Dashboard" description="Your sales at a glance." />
    </div>
  );
}
