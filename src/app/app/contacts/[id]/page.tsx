import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/app/app-skeleton";
import { ContactDetail } from "@/components/contacts/contact-detail";

// Rendered only in the browser behind the auth gate (see ../../layout.tsx).
export const instant = false;

// Replaced in the browser with the contact's name once it has loaded.
export const metadata: Metadata = { title: "Contact" };

export default function Page() {
  // The id and the active tab come from the URL, which needs Suspense.
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <ContactDetail />
    </Suspense>
  );
}
