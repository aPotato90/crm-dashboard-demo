import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder with the same layout as the app area, shown while the session
 * is restored or the sandbox is seeded, so nothing flashes or jumps.
 */
export function AppSkeleton({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>
      <main
        id="main"
        aria-busy="true"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6"
      >
        <p role="status" className="mb-6 text-sm text-muted-foreground">
          {message}
        </p>
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-56 rounded-xl" />
      </main>
    </div>
  );
}
