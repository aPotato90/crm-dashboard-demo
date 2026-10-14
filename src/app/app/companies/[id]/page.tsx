import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/app/app-skeleton";
import { CompanyDetail } from "@/components/companies/company-detail";

// Rendered only in the browser behind the auth gate (see ../../layout.tsx).
export const instant = false;

// Replaced in the browser with the company's name once it has loaded.
export const metadata: Metadata = { title: "Company" };

export default function Page() {
  // The id comes from the URL (useParams needs Suspense on dynamic routes).
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <CompanyDetail />
    </Suspense>
  );
}
