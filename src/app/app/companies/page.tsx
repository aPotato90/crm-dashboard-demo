import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/app/app-skeleton";
import { CompaniesPage } from "@/components/companies/companies-page";

// Rendered only in the browser behind the auth gate (see ../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Companies" };

export default function Page() {
  // Search and industry filter live in the URL (useSearchParams needs Suspense).
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <CompaniesPage />
    </Suspense>
  );
}
