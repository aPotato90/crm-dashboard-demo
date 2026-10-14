import { Skeleton } from "@/components/ui/skeleton";

/** Page-content placeholder: header, KPI tiles and a large panel. */
export function ContentSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-8 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-4 h-72 rounded-xl" />
    </div>
  );
}

/**
 * Placeholder with the same layout as the app shell, shown while the session
 * is restored or the sandbox is seeded, so nothing flashes or jumps.
 */
export function AppSkeleton({ message }: { message: string }) {
  return (
    <div className="flex flex-1">
      <div className="hidden w-64 shrink-0 flex-col border-r bg-sidebar lg:sticky lg:top-8 lg:flex lg:h-[calc(100svh-2rem)]">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-2 px-3 py-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-9 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center justify-between border-b px-4 lg:hidden">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="size-8" />
        </div>
        <main
          id="main"
          tabIndex={-1}
          aria-busy="true"
          className="flex-1 outline-none"
        >
          <p role="status" className="sr-only">
            {message}
          </p>
          <p
            aria-hidden
            className="mx-auto max-w-6xl px-4 pt-6 text-sm text-muted-foreground sm:px-6 lg:px-8"
          >
            {message}
          </p>
          <ContentSkeleton />
        </main>
      </div>
    </div>
  );
}
