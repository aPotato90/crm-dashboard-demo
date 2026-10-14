import type { Metadata } from "next";
import { Suspense } from "react";

import { ContentSkeleton } from "@/components/app/app-skeleton";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";

// Rendered only in the browser behind the auth gate (see ../layout.tsx).
export const instant = false;

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  // `?deal=<id>` deep links read the URL, which needs Suspense.
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <PipelineBoard />
    </Suspense>
  );
}
