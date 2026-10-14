import type { Metadata } from "next";

import { TasksPage } from "@/components/tasks/tasks-page";

// Rendered only in the browser behind the auth gate (see ../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Tasks" };

export default function Page() {
  return <TasksPage />;
}
