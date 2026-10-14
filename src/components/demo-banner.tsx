import { FlaskConicalIcon } from "lucide-react";

/**
 * Site-wide "Demo" indicator, rendered on every page by the root layout.
 * On large screens it stays pinned at the top (exactly 2rem tall, which the
 * app sidebar offsets against).
 */
export function DemoBanner() {
  return (
    <aside
      aria-label="Demo notice"
      className="z-40 border-b border-amber-300/60 bg-amber-50 text-amber-950 lg:sticky lg:top-0 lg:flex lg:h-8 lg:items-center dark:border-amber-400/20 dark:bg-amber-950 dark:text-amber-100"
    >
      <p className="mx-auto flex w-full max-w-6xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium sm:text-sm">
        <FlaskConicalIcon aria-hidden className="size-3.5 shrink-0" />
        <span>
          <strong className="font-semibold">Demo</strong> · Portfolio project
          with fake data only. Not a real product.
        </span>
      </p>
    </aside>
  );
}
