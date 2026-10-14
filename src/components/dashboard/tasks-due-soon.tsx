"use client";

import { differenceInCalendarDays, format } from "date-fns";
import { CircleAlertIcon } from "lucide-react";
import { useId } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { TaskData, WithId } from "@/lib/crm";
import { isTaskOverdue } from "@/lib/crm/metrics";
import { tasksRepo } from "@/lib/crm/repo";
import { describeFirebaseError } from "@/lib/firebase/errors";
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
  uid,
  contactName,
  now,
}: {
  task: WithId<TaskData>;
  uid: string;
  contactName: string | null;
  now: Date;
}) {
  const id = useId();
  const overdue = isTaskOverdue(task, now);

  async function toggle(done: boolean) {
    try {
      // Firestore applies the write locally first (instant UI) and rolls it
      // back automatically if the server rejects it.
      await tasksRepo.update(uid, task.id, { done });
    } catch (error) {
      toast.error("Could not update the task", {
        description: describeFirebaseError(error),
      });
    }
  }

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
  uid,
  contactNames,
  now,
}: {
  tasks: WithId<TaskData>[];
  uid: string;
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
                uid={uid}
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
