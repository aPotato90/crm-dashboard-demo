"use client";

import { CircleAlertIcon, ListChecksIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { ContentSkeleton } from "@/components/app/app-skeleton";
import { CascadeDeleteDialog } from "@/components/app/cascade-delete-dialog";
import { EmptyState } from "@/components/app/empty-state";
import { ListenerError } from "@/components/app/listener-error";
import { PageHeader } from "@/components/app/page-header";
import { useSandbox } from "@/components/app/sandbox-provider";
import { useCrmData } from "@/components/app/use-crm-data";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import type { TaskData, WithId } from "@/lib/crm";
import { groupTasks, TASK_GROUP_LABELS, TASK_GROUPS } from "@/lib/crm/tasks";
import { cn } from "@/lib/utils";

import { TaskDialog } from "./task-dialog";
import { TaskItem } from "./task-item";

type DialogState =
  | { kind: "create" }
  | { kind: "edit"; task: WithId<TaskData> }
  | { kind: "delete"; task: WithId<TaskData> }
  | null;

export function TasksPage() {
  const now = useNow();
  const { busy } = useSandbox();
  const data = useCrmData();
  const [dialog, setDialog] = useState<DialogState>(null);

  const groups = useMemo(() => groupTasks(data.tasks, now), [data.tasks, now]);
  const contacts = useMemo(
    () =>
      new Map(
        data.contacts.map((c) => [
          c.id,
          { id: c.id, name: `${c.firstName} ${c.lastName}` },
        ]),
      ),
    [data.contacts],
  );
  const dealTitles = useMemo(
    () => new Map(data.deals.map((d) => [d.id, d.title])),
    [data.deals],
  );
  const openCount = data.tasks.filter((t) => !t.done).length;

  let body: React.ReactNode;
  if (data.error) {
    body = <ListenerError error={data.error} onRetry={data.retry} />;
  } else if (data.loading || busy) {
    body = <ContentSkeleton bare />;
  } else if (data.tasks.length === 0) {
    body = (
      <EmptyState
        icon={ListChecksIcon}
        title="No tasks yet"
        action={
          <Button onClick={() => setDialog({ kind: "create" })}>
            <PlusIcon aria-hidden />
            New task
          </Button>
        }
      >
        Add a follow-up, or reset the demo data from the sidebar.
      </EmptyState>
    );
  } else {
    body = (
      <div className="space-y-6">
        {TASK_GROUPS.filter((group) => groups[group].length > 0).map(
          (group) => (
            <section
              key={group}
              aria-labelledby={`tasks-${group}`}
              className={cn(
                "rounded-xl border bg-card px-4 pt-3",
                group === "overdue" && "border-red-300 dark:border-red-900",
              )}
            >
              <h2
                id={`tasks-${group}`}
                className={cn(
                  "flex items-center gap-2 font-semibold",
                  group === "overdue" && "text-red-700 dark:text-red-400",
                )}
              >
                {group === "overdue" && (
                  <CircleAlertIcon aria-hidden className="size-4" />
                )}
                {TASK_GROUP_LABELS[group]}
                <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
                  {groups[group].length}
                  <span className="sr-only">
                    {" "}
                    {groups[group].length === 1 ? "task" : "tasks"}
                  </span>
                </span>
              </h2>
              <ul className="divide-y">
                {groups[group].map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    now={now}
                    contact={
                      task.contactId ? contacts.get(task.contactId) : null
                    }
                    dealTitle={task.dealId ? dealTitles.get(task.dealId) : null}
                    onEdit={(t) => setDialog({ kind: "edit", task: t })}
                    onDelete={(t) => setDialog({ kind: "delete", task: t })}
                  />
                ))}
              </ul>
            </section>
          ),
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Tasks"
        description={
          data.loading
            ? "Follow-ups, calls and to-dos for your team."
            : `${openCount} open · ${groups.overdue.length} overdue`
        }
        actions={
          <Button
            onClick={() => setDialog({ kind: "create" })}
            disabled={data.loading || busy}
          >
            <PlusIcon aria-hidden />
            New task
          </Button>
        }
      />
      <div className="mt-6">{body}</div>

      {(dialog?.kind === "create" || dialog?.kind === "edit") && (
        <TaskDialog
          task={dialog.kind === "edit" ? dialog.task : undefined}
          contacts={data.contacts}
          deals={data.deals}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "delete" && (
        <CascadeDeleteDialog
          target={{ kind: "task", id: dialog.task.id }}
          name={dialog.task.title}
          open
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </div>
  );
}
