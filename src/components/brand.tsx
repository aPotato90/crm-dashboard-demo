import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** The PipelineHQ mark: three stacked bars narrowing like a sales funnel. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn("size-8 shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <rect x="7" y="8" width="18" height="3.5" rx="1.75" fill="white" />
      <rect
        x="9.5"
        y="14.25"
        width="13"
        height="3.5"
        rx="1.75"
        fill="white"
        opacity="0.85"
      />
      <rect
        x="12"
        y="20.5"
        width="8"
        height="3.5"
        rx="1.75"
        fill="white"
        opacity="0.7"
      />
    </svg>
  );
}

/** Product name with the always-visible Demo badge, linking home. */
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <LogoMark />
      <span className="text-base font-semibold tracking-tight">PipelineHQ</span>
      <Badge variant="outline" className="font-semibold">
        Demo
      </Badge>
    </Link>
  );
}
