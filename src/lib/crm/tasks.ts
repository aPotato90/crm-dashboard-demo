/** Pure grouping of tasks for the Tasks page. */
import { addDays, endOfWeek, startOfDay } from "date-fns";

import type { TaskData } from "./task";

export const TASK_GROUPS = [
  "overdue",
  "today",
  "thisWeek",
  "later",
  "completed",
] as const;
export type TaskGroup = (typeof TASK_GROUPS)[number];

export const TASK_GROUP_LABELS: Record<TaskGroup, string> = {
  overdue: "Overdue",
  today: "Today",
  thisWeek: "This week",
  later: "Later",
  completed: "Completed",
};

type Task = Pick<TaskData, "dueDate" | "done">;

/** Which group a task belongs to at `now` (weeks run Monday to Sunday). */
export function taskGroupOf(task: Task, now: Date): TaskGroup {
  if (task.done) return "completed";
  const due = task.dueDate.getTime();
  if (due < now.getTime()) return "overdue";
  if (due < addDays(startOfDay(now), 1).getTime()) return "today";
  if (due <= endOfWeek(now, { weekStartsOn: 1 }).getTime()) return "thisWeek";
  return "later";
}

/**
 * Tasks grouped for display. Open groups are sorted by due date (soonest
 * first); completed tasks show the most recently due first.
 */
export function groupTasks<T extends Task>(
  tasks: T[],
  now: Date,
): Record<TaskGroup, T[]> {
  const groups = Object.fromEntries(
    TASK_GROUPS.map((group) => [group, [] as T[]]),
  ) as Record<TaskGroup, T[]>;
  for (const task of tasks) groups[taskGroupOf(task, now)].push(task);
  for (const group of TASK_GROUPS) {
    const sign = group === "completed" ? -1 : 1;
    groups[group].sort(
      (a, b) => sign * (a.dueDate.getTime() - b.dueDate.getTime()),
    );
  }
  return groups;
}
