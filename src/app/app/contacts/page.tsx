import type { Metadata } from "next";

import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Contacts" };

export default function ContactsPage() {
  return (
    <ComingSoon
      title="Contacts"
      description="People at the companies you sell to."
    />
  );
}
