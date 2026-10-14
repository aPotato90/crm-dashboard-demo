"use client";

import { differenceInCalendarDays, format } from "date-fns";
import { CircleAlertIcon } from "lucide-react";
import { useId } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { TaskData, WithId } from "@/lib/crm";
import { isTaskOverdue } from "@/lib/crm/metrics";
import { useToggleTask } from "@/components/tasks/task-item";
import { cn } from "@/lib/utils";

function dueLabel(due: Date, now: Date): string {
  const time = format(due, "h:mm a");
  const days = differenceInCalendarDays(due, now);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Tomorrow, ${time}`;
  if (days === -1) return `Yesterday, ${time}`;
  if (days < 0) return `${format(due, "EEE d MMM")} (${-days} days ago)`;
  return format(due, "EEE d MMM");
}

function TaskRow({
  task,
  contactName,
  now,
}: {
  task: WithId<TaskData>;
  contactName: string | null;
  now: Date;
}) {
  const id = useId();
  const overdue = isTaskOverdue(task, now);

  const toggleTask = useToggleTask();
  const toggle = (done: boolean) => toggleTask(task, done);

  return (
    <li className="flex items-start gap-3 py-2.5">
      <Checkbox
        id={id}
        checked={task.done}
        onCheckedChange={(checked) => toggle(checked === true)}
        className="mt-0.5"
        aria-describedby={`${id}-due`}
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className={cn(
            "block cursor-pointer text-sm font-medium",
            task.done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </label>
        <p
          id={`${id}-due`}
          className={cn(
            "mt-0.5 flex flex-wrap items-center gap-x-1 text-xs",
            overdue
              ? "font-medium text-red-700 dark:text-red-400"
              : "text-muted-foreground",
          )}
        >
          {overdue && <CircleAlertIcon aria-hidden className="size-3.5" />}
          {overdue && <span>Overdue ·</span>}
          <time dateTime={task.dueDate.toISOString()}>
            {dueLabel(task.dueDate, now)}
          </time>
          {contactName && (
            <span className="text-muted-foreground"> · {contactName}</span>
          )}
          {task.done && <span className="sr-only">, done</span>}
        </p>
      </div>
    </li>
  );
}

export function TasksDueSoon({
  tasks,
  contactNames,
  now,
}: {
  tasks: WithId<TaskData>[];
  contactNames: Map<string, string>;
  now: Date;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="font-semibold">
          <h2>Tasks due soon</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing due in the next two weeks.
          </p>
        ) : (
          <ul className="-my-2.5 divide-y">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                now={now}
                contactName={
                  task.contactId
                    ? (contactNames.get(task.contactId) ?? null)
                    : null
                }
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
