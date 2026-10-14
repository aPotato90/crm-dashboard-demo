import type { Metadata } from "next";

import { PipelineBoard } from "@/components/pipeline/pipeline-board";

// Rendered only in the browser behind the auth gate (see ../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return <PipelineBoard />;
}
