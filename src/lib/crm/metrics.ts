/**
 * Pure dashboard calculations. Every function takes `now` explicitly so the
 * results are deterministic and easy to unit-test. Calendar boundaries
 * (months, weeks, days) use the runtime's local time zone via date-fns.
 */
import {
  addDays,
  endOfWeek,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";

import type { ActivityData } from "./activity";
import {
  CONTACT_SOURCES,
  type ContactData,
  type ContactSource,
} from "./contact";
import {
  DEAL_STAGES,
  isClosedStage,
  type DealData,
  type DealStage,
} from "./deal";
import { SOURCE_LABELS, STAGE_LABELS } from "./labels";
import type { TaskData } from "./task";

type Deal = Pick<DealData, "value" | "stage" | "createdAt" | "closedAt">;

/** A value compared with the same-length period before it. */
export type Comparison = {
  current: number;
  previous: number;
  /** Relative change (0.12 = +12%), or null when `previous` is 0. */
  change: number | null;
};

export function compare(current: number, previous: number): Comparison {
  return {
    current,
    previous,
    change: previous === 0 ? null : (current - previous) / previous,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** True when `date` is in [start, end) - end-exclusive. */
function inRange(date: Date, start: Date, end: Date): boolean {
  const time = date.getTime();
  return time >= start.getTime() && time < end.getTime();
}

// ---------------------------------------------------------------------------
// Pipeline value
// ---------------------------------------------------------------------------

/** Total value of deals that are open (not won or lost) right now. */
export function openPipelineValue(deals: Deal[]): number {
  return sum(deals.filter((d) => !isClosedStage(d.stage)).map((d) => d.value));
}

/**
 * Value of deals that were open at `date`: created by then and not closed
 * before it. Approximates history from createdAt/closedAt (stage history is
 * not stored).
 */
export function openPipelineValueAt(deals: Deal[], date: Date): number {
  const time = date.getTime();
  return sum(
    deals
      .filter(
        (d) =>
          d.createdAt.getTime() <= time &&
          (d.closedAt === null || d.closedAt.getTime() > time),
      )
      .map((d) => d.value),
  );
}

/** Open pipeline now vs. 30 days ago. */
export function pipelineValueTrend(deals: Deal[], now: Date): Comparison {
  return compare(
    openPipelineValue(deals),
    openPipelineValueAt(deals, subDays(now, 30)),
  );
}

// ---------------------------------------------------------------------------
// Won revenue
// ---------------------------------------------------------------------------

/** Sum of won deals closed in [start, end). */
export function wonRevenueBetween(
  deals: Deal[],
  start: Date,
  end: Date,
): number {
  return sum(
    deals
      .filter(
        (d) =>
          d.stage === "won" &&
          d.closedAt !== null &&
          inRange(d.closedAt, start, end),
      )
      .map((d) => d.value),
  );
}

/**
 * Won revenue this calendar month so far, compared with the same number of
 * days at the start of last month (month-to-date vs. last month-to-date).
 */
export function wonRevenueThisMonth(deals: Deal[], now: Date): Comparison {
  const monthStart = startOfMonth(now);
  const elapsed = now.getTime() - monthStart.getTime();
  const lastMonthStart = subMonths(monthStart, 1);
  const lastMonthCutoff = new Date(
    Math.min(lastMonthStart.getTime() + elapsed, monthStart.getTime()),
  );
  return compare(
    wonRevenueBetween(deals, monthStart, now),
    wonRevenueBetween(deals, lastMonthStart, lastMonthCutoff),
  );
}

// ---------------------------------------------------------------------------
// Win rate
// ---------------------------------------------------------------------------

export type WinRate = {
  /** won / (won + lost), or null when nothing closed in the period. */
  rate: number | null;
  won: number;
  lost: number;
};

/** Win rate over deals closed in [start, end). */
export function winRateBetween(deals: Deal[], start: Date, end: Date): WinRate {
  const closed = deals.filter(
    (d) => d.closedAt !== null && inRange(d.closedAt, start, end),
  );
  const won = closed.filter((d) => d.stage === "won").length;
  const lost = closed.filter((d) => d.stage === "lost").length;
  return { rate: won + lost === 0 ? null : won / (won + lost), won, lost };
}

/** Win rate for the last `days` days and the period before it. */
export function winRateTrend(
  deals: Deal[],
  now: Date,
  days = 90,
): { current: WinRate; previous: WinRate; changePoints: number | null } {
  const periodStart = subDays(now, days);
  const current = winRateBetween(deals, periodStart, now);
  const previous = winRateBetween(
    deals,
    subDays(periodStart, days),
    periodStart,
  );
  return {
    current,
    previous,
    changePoints:
      current.rate === null || previous.rate === null
        ? null
        : Math.round((current.rate - previous.rate) * 100),
  };
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

type Task = Pick<TaskData, "dueDate" | "done">;

/** The current week, Monday to Sunday. */
export function currentWeek(now: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

/** Open tasks due this week (Mon-Sun) and open tasks already past due. */
export function openTasksDueThisWeek(
  tasks: Task[],
  now: Date,
): { dueThisWeek: number; overdue: number } {
  const week = currentWeek(now);
  const open = tasks.filter((t) => !t.done);
  return {
    dueThisWeek: open.filter((t) => isWithinInterval(t.dueDate, week)).length,
    overdue: open.filter((t) => t.dueDate.getTime() < now.getTime()).length,
  };
}

/**
 * Tasks for the "due soon" list: everything due from a week ago up to
 * `horizonDays` ahead (done or not, so ticking one keeps it in place), plus
 * older tasks that are still open. Sorted by due date, earliest first.
 */
export function tasksDueSoon<T extends Task>(
  tasks: T[],
  now: Date,
  { horizonDays = 14, limit = 8 } = {},
): T[] {
  const from = subDays(startOfDay(now), 7);
  const to = addDays(now, horizonDays);
  return tasks
    .filter(
      (t) =>
        (t.dueDate >= from && t.dueDate <= to) || (!t.done && t.dueDate < from),
    )
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
    .slice(0, limit);
}

export function isTaskOverdue(task: Task, now: Date): boolean {
  return !task.done && task.dueDate.getTime() < now.getTime();
}

// ---------------------------------------------------------------------------
// Chart series
// ---------------------------------------------------------------------------

export type MonthlyRevenue = {
  /** "2026-10" */
  key: string;
  /** "Oct" */
  label: string;
  /** "October 2026" */
  fullLabel: string;
  value: number;
};

/** Won revenue per calendar month for the last `months` months (oldest first). */
export function revenueByMonth(
  deals: Deal[],
  now: Date,
  months = 12,
): MonthlyRevenue[] {
  const thisMonth = startOfMonth(now);
  return Array.from({ length: months }, (_, i) => {
    const start = subMonths(thisMonth, months - 1 - i);
    const end = subMonths(thisMonth, months - 2 - i);
    return {
      key: format(start, "yyyy-MM"),
      label: format(start, "MMM"),
      fullLabel: format(start, "MMMM yyyy"),
      value: wonRevenueBetween(deals, start, end),
    };
  });
}

export type StageSummary = {
  stage: DealStage;
  label: string;
  count: number;
  value: number;
};

/** Deal count and total value per stage, in pipeline order. */
export function pipelineByStage(
  deals: Pick<DealData, "stage" | "value">[],
  stages: readonly DealStage[] = DEAL_STAGES,
): StageSummary[] {
  return stages.map((stage) => {
    const inStage = deals.filter((d) => d.stage === stage);
    return {
      stage,
      label: STAGE_LABELS[stage],
      count: inStage.length,
      value: sum(inStage.map((d) => d.value)),
    };
  });
}

export const OPEN_STAGES = DEAL_STAGES.filter((s) => !isClosedStage(s));

export type SourceSummary = {
  source: ContactSource;
  label: string;
  count: number;
  /** Share of all contacts, 0..1. */
  share: number;
};

/**
 * Contacts per acquisition source, always in the fixed CONTACT_SOURCES
 * order (so each source keeps its chart colour).
 */
export function leadsBySource(
  contacts: Pick<ContactData, "source">[],
): SourceSummary[] {
  const total = contacts.length;
  return CONTACT_SOURCES.map((source) => {
    const count = contacts.filter((c) => c.source === source).length;
    return {
      source,
      label: SOURCE_LABELS[source],
      count,
      share: total === 0 ? 0 : count / total,
    };
  });
}

/** The `limit` most recent activities, newest first. */
export function recentActivities<T extends Pick<ActivityData, "createdAt">>(
  activities: T[],
  limit = 8,
): T[] {
  return [...activities]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/** True when nothing at all is in the sandbox. */
export function isSandboxEmpty(collections: {
  companies: unknown[];
  contacts: unknown[];
  deals: unknown[];
  activities: unknown[];
  tasks: unknown[];
}): boolean {
  return Object.values(collections).every((items) => items.length === 0);
}
