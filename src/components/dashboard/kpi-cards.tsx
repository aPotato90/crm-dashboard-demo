import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  CircleAlertIcon,
  MinusIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from "@/lib/crm/format";
import type { Comparison, WinRate } from "@/lib/crm/metrics";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "flat";

/** Signed change with an icon, so direction never relies on colour alone. */
function Delta({
  direction,
  children,
}: {
  direction: Direction;
  children: React.ReactNode;
}) {
  const Icon =
    direction === "up"
      ? ArrowUpRightIcon
      : direction === "down"
        ? ArrowDownRightIcon
        : MinusIcon;
  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        direction === "up" && "text-emerald-700 dark:text-emerald-400",
        direction === "down" && "text-red-700 dark:text-red-400",
        direction === "flat" && "text-muted-foreground",
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

function directionOf(change: number | null): Direction {
  if (change === null || Math.abs(change) < 0.005) return "flat";
  return change > 0 ? "up" : "down";
}

function signedPercent(change: number): string {
  const rounded = Math.round(change * 100);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function KpiCard({
  label,
  value,
  fullValue,
  children,
}: {
  label: string;
  value: string;
  /** Unabbreviated value for screen readers when `value` is compact. */
  fullValue?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          <h2>{label}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tracking-tight">
          {fullValue ? (
            <>
              <span aria-hidden>{value}</span>
              <span className="sr-only">{fullValue}</span>
            </>
          ) : (
            value
          )}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

export function KpiCards({
  pipeline,
  wonThisMonth,
  winRate,
  tasks,
}: {
  pipeline: Comparison;
  wonThisMonth: Comparison;
  winRate: { current: WinRate; changePoints: number | null };
  tasks: { dueThisWeek: number; overdue: number };
}) {
  return (
    <section
      aria-label="Key metrics"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      <KpiCard
        label="Open pipeline"
        value={formatCurrencyCompact(pipeline.current)}
        fullValue={formatCurrency(pipeline.current)}
      >
        {pipeline.change === null ? (
          <Delta direction="flat">No open deals 30 days ago</Delta>
        ) : (
          <Delta direction={directionOf(pipeline.change)}>
            {signedPercent(pipeline.change)} vs 30 days ago
          </Delta>
        )}
      </KpiCard>

      <KpiCard
        label="Won this month"
        value={formatCurrencyCompact(wonThisMonth.current)}
        fullValue={formatCurrency(wonThisMonth.current)}
      >
        {wonThisMonth.change === null ? (
          <Delta direction="flat">
            {wonThisMonth.current === 0
              ? "No wins yet this month"
              : "No wins this time last month"}
          </Delta>
        ) : (
          <Delta direction={directionOf(wonThisMonth.change)}>
            {signedPercent(wonThisMonth.change)} vs same days last month
          </Delta>
        )}
      </KpiCard>

      <KpiCard
        label="Win rate, last 90 days"
        value={
          winRate.current.rate === null
            ? "—"
            : formatPercent(winRate.current.rate)
        }
        fullValue={
          winRate.current.rate === null ? "No closed deals" : undefined
        }
      >
        <p className="text-xs text-muted-foreground">
          {winRate.current.won} won · {winRate.current.lost} lost
        </p>
        {winRate.changePoints !== null && (
          <Delta direction={directionOf(winRate.changePoints / 100)}>
            {winRate.changePoints > 0 ? "+" : ""}
            {winRate.changePoints} pts vs previous 90 days
          </Delta>
        )}
      </KpiCard>

      <KpiCard
        label="Open tasks due this week"
        value={String(tasks.dueThisWeek)}
      >
        {tasks.overdue > 0 ? (
          <p className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
            <CircleAlertIcon aria-hidden className="size-3.5 shrink-0" />
            {tasks.overdue} overdue
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Nothing overdue</p>
        )}
      </KpiCard>
    </section>
  );
}
