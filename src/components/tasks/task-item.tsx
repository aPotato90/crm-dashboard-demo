"use client";

import { differenceInCalendarDays, format } from "date-fns";
import { CircleAlertIcon, MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { toast } from "sonner";

import { useSandbox } from "@/components/app/sandbox-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TaskData, WithId } from "@/lib/crm";
import { isTaskOverdue } from "@/lib/crm/metrics";
import { tasksRepo } from "@/lib/crm/repo";
import { describeFirebaseError } from "@/lib/firebase/errors";
import { cn } from "@/lib/utils";

/** "Today, 9:00 AM", "Tomorrow, …", "Mon 19 Oct", "Fri 9 Oct (5 days ago)". */
export function dueLabel(due: Date, now: Date): string {
  const time = format(due, "h:mm a");
  const days = differenceInCalendarDays(due, now);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Tomorrow, ${time}`;
  if (days === -1) return `Yesterday, ${time}`;
  if (days < 0) return `${format(due, "EEE d MMM")} (${-days} days ago)`;
  return format(due, "EEE d MMM, h:mm a");
}

/**
 * Ticks a task done or undone. Firestore applies the write locally first, so
 * the checkbox updates instantly, and reverts it if the server rejects it.
 */
export function useToggleTask() {
  const { uid } = useSandbox();
  return async (task: WithId<TaskData>, done: boolean) => {
    try {
      await tasksRepo.update(uid, task.id, { done });
      toast.success(
        done ? `Completed “${task.title}”` : `Reopened “${task.title}”`,
        {
          action: {
            label: "Undo",
            onClick: () => void tasksRepo.update(uid, task.id, { done: !done }),
          },
        },
      );
    } catch (error) {
      toast.error("Couldn't update the task", {
        description: describeFirebaseError(error),
      });
    }
  };
}

export function TaskItem({
  task,
  now,
  contact,
  dealTitle,
  onEdit,
  onDelete,
}: {
  task: WithId<TaskData>;
  now: Date;
  contact?: { id: string; name: string } | null;
  dealTitle?: string | null;
  onEdit: (task: WithId<TaskData>) => void;
  onDelete: (task: WithId<TaskData>) => void;
}) {
  const id = useId();
  const toggle = useToggleTask();
  const overdue = isTaskOverdue(task, now);

  return (
    <li className="flex items-start gap-3 py-3">
      <Checkbox
        id={id}
        checked={task.done}
        onCheckedChange={(checked) => toggle(task, checked === true)}
        className="mt-0.5"
        aria-describedby={`${id}-meta`}
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
          id={`${id}-meta`}
          className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground"
        >
          {overdue && (
            <span className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-400">
              <CircleAlertIcon aria-hidden className="size-3.5" />
              Overdue
            </span>
          )}
          <span
            className={cn(
              overdue && "font-medium text-red-700 dark:text-red-400",
            )}
          >
            {overdue ? "· due " : "Due "}
            <time dateTime={task.dueDate.toISOString()}>
              {dueLabel(task.dueDate, now)}
            </time>
          </span>
          {task.done && <span>· Done</span>}
          {contact && (
            <span>
              ·{" "}
              <Link
                href={`/app/contacts/${contact.id}`}
                className="underline decoration-current/40 underline-offset-4 hover:text-foreground hover:decoration-current"
              >
                {contact.name}
              </Link>
            </span>
          )}
          {dealTitle && <span className="truncate">· {dealTitle}</span>}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for task ${task.title}`}
          >
            <MoreHorizontalIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onEdit(task)}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => onDelete(task)}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
