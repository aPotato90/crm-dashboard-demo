/**
 * A static, decorative preview of the dashboard for the landing page.
 * Exposed to assistive tech as a single image with a text description.
 */

const KPIS = [
  { label: "Open pipeline", value: "$1.18M", delta: "+12%" },
  { label: "Won this month", value: "$62K", delta: "+8%" },
  { label: "Win rate (90 days)", value: "67%", delta: "+3 pts" },
] as const;

/** Monthly won revenue, as a share of the tallest bar. */
const BARS = [38, 52, 44, 61, 48, 70, 57, 66, 74, 63, 82, 90] as const;

const COLUMNS = [
  {
    stage: "Qualified",
    deals: [
      { title: "Bluepine — Analytics add-on", value: "$11K" },
      { title: "Willowmere — Renewal", value: "$128K" },
    ],
  },
  {
    stage: "Proposal",
    deals: [
      { title: "Tidewater — Team expansion", value: "$26K" },
      { title: "Orchid Lane — Platform", value: "$50K" },
    ],
  },
  {
    stage: "Negotiation",
    deals: [{ title: "Ironbark — Multi-year", value: "$100K" }],
  },
] as const;

export function ProductPreview() {
  return (
    <figure
      role="img"
      aria-label="Preview of the PipelineHQ dashboard: pipeline totals, a monthly revenue chart and a deal board with fictional deals."
      className="relative"
    >
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/15 via-transparent to-primary/5 blur-2xl"
      />
      <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg">
        <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="size-2.5 rounded-full bg-foreground/15" />
          <span className="ml-3 truncate font-mono text-[11px] text-muted-foreground">
            pipelinehq.demo/app
          </span>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {KPIS.map((kpi) => (
              <div key={kpi.label} className="rounded-lg border p-2.5 sm:p-3">
                <div className="truncate text-[10px] text-muted-foreground sm:text-xs">
                  {kpi.label}
                </div>
                <div className="mt-1 text-sm font-semibold tabular-nums sm:text-lg">
                  {kpi.value}
                </div>
                <div className="text-[10px] font-medium text-emerald-700 sm:text-xs dark:text-emerald-400">
                  {kpi.delta}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-lg border p-3">
            <div className="text-xs font-medium">
              Won revenue, last 12 months
            </div>
            <div className="mt-3 flex h-20 items-end gap-1 sm:h-24 sm:gap-1.5">
              {BARS.map((height, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-primary/80 last:bg-primary"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {COLUMNS.map((column) => (
              <div key={column.stage} className="rounded-lg bg-muted/60 p-2">
                <div className="px-1 text-[10px] font-medium text-muted-foreground sm:text-xs">
                  {column.stage}
                </div>
                <div className="mt-2 space-y-1.5">
                  {column.deals.map((deal) => (
                    <div
                      key={deal.title}
                      className="rounded-md border bg-card p-1.5 shadow-xs sm:p-2"
                    >
                      <div className="truncate text-[10px] font-medium sm:text-xs">
                        {deal.title}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground tabular-nums sm:text-xs">
                        {deal.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
