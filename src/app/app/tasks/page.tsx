import type { Metadata } from "next";

import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return (
    <ComingSoon
      title="Tasks"
      description="Follow-ups, calls and to-dos for your team."
    />
  );
}
