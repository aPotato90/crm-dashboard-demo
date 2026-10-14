"use client";

import { format } from "date-fns";
import {
  DatabaseIcon,
  KanbanSquareIcon,
  TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { ContentSkeleton } from "@/components/app/app-skeleton";
import { PageHeader } from "@/components/app/page-header";
import { useResetDemoData } from "@/components/app/sandbox-actions";
import { useSandbox } from "@/components/app/sandbox-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import {
  useActivities,
  useCompanies,
  useContacts,
  useDeals,
  useTasks,
} from "@/lib/crm/hooks";
import {
  isSandboxEmpty,
  leadsBySource,
  OPEN_STAGES,
  openTasksDueThisWeek,
  pipelineByStage,
  pipelineValueTrend,
  recentActivities,
  revenueByMonth,
  tasksDueSoon,
  winRateTrend,
  wonRevenueThisMonth,
} from "@/lib/crm/metrics";
import { describeFirebaseError } from "@/lib/firebase/errors";

import { RevenueChart, SourceChart, StageChart } from "./charts";
import { KpiCards } from "./kpi-cards";
import { RecentActivity } from "./recent-activity";
import { TasksDueSoon } from "./tasks-due-soon";

export function Dashboard() {
  const { busy } = useSandbox();
  const now = useNow();
  const companies = useCompanies();
  const contacts = useContacts();
  const deals = useDeals();
  const activities = useActivities({ limit: 8 });
  const tasks = useTasks();

  const sources = [companies, contacts, deals, activities, tasks];
  const loading = sources.some((s) => s.loading);
  const error = sources.find((s) => s.error)?.error ?? null;

  const contactNames = useMemo(
    () =>
      new Map(contacts.data.map((c) => [c.id, `${c.firstName} ${c.lastName}`])),
    [contacts.data],
  );

  const metrics = useMemo(
    () => ({
      pipeline: pipelineValueTrend(deals.data, now),
      wonThisMonth: wonRevenueThisMonth(deals.data, now),
      winRate: winRateTrend(deals.data, now),
      tasks: openTasksDueThisWeek(tasks.data, now),
      revenue: revenueByMonth(deals.data, now),
      stages: pipelineByStage(deals.data, OPEN_STAGES),
      sources: leadsBySource(contacts.data),
      recent: recentActivities(activities.data, 8),
      dueSoon: tasksDueSoon(tasks.data, now),
    }),
    [deals.data, tasks.data, contacts.data, activities.data, now],
  );

  const header = (
    <PageHeader
      title="Dashboard"
      description={`Your sales at a glance · ${format(now, "EEEE, d MMMM yyyy")}`}
      actions={
        <Link
          href="/app/pipeline"
          className={buttonVariants({ variant: "outline" })}
        >
          <KanbanSquareIcon aria-hidden />
          Open pipeline
        </Link>
      }
    />
  );

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {header}
        <Alert variant="destructive" className="mt-8 px-4 py-3">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>Could not load your data</AlertTitle>
          <AlertDescription>{describeFirebaseError(error)}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // While a reset rewrites the sandbox, listeners briefly see partial data;
  // show the skeleton instead of flickering numbers.
  if (loading || busy) {
    return (
      <div aria-busy="true">
        <p role="status" className="sr-only">
          {busy ? "Updating your sandbox…" : "Loading dashboard…"}
        </p>
        <ContentSkeleton />
      </div>
    );
  }

  if (
    isSandboxEmpty({
      companies: companies.data,
      contacts: contacts.data,
      deals: deals.data,
      activities: activities.data,
      tasks: tasks.data,
    })
  ) {
    return <EmptySandbox header={header} />;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {header}
      <KpiCards
        pipeline={metrics.pipeline}
        wonThisMonth={metrics.wonThisMonth}
        winRate={metrics.winRate}
        tasks={metrics.tasks}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <RevenueChart data={metrics.revenue} />
        <SourceChart data={metrics.sources} />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="grid min-w-0 gap-4 lg:col-span-2">
          <StageChart data={metrics.stages} />
          <TasksDueSoon
            tasks={metrics.dueSoon}
            contactNames={contactNames}
            now={now}
          />
        </div>
        <RecentActivity
          activities={metrics.recent}
          contactNames={contactNames}
          now={now}
        />
      </div>
    </div>
  );
}

function EmptySandbox({ header }: { header: React.ReactNode }) {
  const resetDemoData = useResetDemoData();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {header}
      <div className="mt-8 flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <DatabaseIcon aria-hidden className="size-6 text-muted-foreground" />
        </span>
        <h2 className="mt-4 font-semibold">Your sandbox is empty</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          There are no companies, contacts, deals or tasks yet. Restore the demo
          data to see the dashboard in action.
        </p>
        <Button className="mt-6" onClick={resetDemoData}>
          Restore demo data
        </Button>
      </div>
    </div>
  );
}
