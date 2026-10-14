import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Dashed placeholder for "nothing here yet" and "no results" states. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
  headingLevel = 2,
}: {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon aria-hidden className="size-6 text-muted-foreground" />
      </span>
      <Heading className="mt-4 font-semibold">{title}</Heading>
      {children && (
        <div className="mt-1 max-w-sm text-sm text-muted-foreground">
          {children}
        </div>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
