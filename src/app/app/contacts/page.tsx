import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/app/app-skeleton";
import { ContactsPage } from "@/components/contacts/contacts-page";

// Rendered only in the browser behind the auth gate (see ../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Contacts" };

export default function Page() {
  // The table reads its filters from the URL (useSearchParams needs Suspense).
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <ContactsPage />
    </Suspense>
  );
}
