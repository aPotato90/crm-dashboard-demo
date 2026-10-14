import { ConstructionIcon } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { PageHeader } from "./page-header";

/** Placeholder for app sections that are built in the next step. */
export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title={title} description={description} />
      <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <ConstructionIcon
            aria-hidden
            className="size-6 text-muted-foreground"
          />
        </span>
        <h2 className="mt-4 font-semibold">Coming in the next step</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          This screen is part of the demo roadmap. In the meantime, explore the
          dashboard and the deal pipeline.
        </p>
        <Link
          href="/app/pipeline"
          className={buttonVariants({ className: "mt-6" })}
        >
          Open the pipeline
        </Link>
      </div>
    </div>
  );
}
