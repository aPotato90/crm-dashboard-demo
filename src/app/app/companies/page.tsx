import type { Metadata } from "next";

import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Companies" };

export default function CompaniesPage() {
  return (
    <ComingSoon
      title="Companies"
      description="Accounts, industries and team sizes."
    />
  );
}
