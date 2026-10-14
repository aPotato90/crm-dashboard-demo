import { describe, expect, it } from "vitest";

import { groupTasks, taskGroupOf } from "./tasks";

// Wednesday 15 October 2026, 12:00 UTC (tests run with TZ=UTC).
const NOW = new Date("2026-10-15T12:00:00Z");
const task = (iso: string, done = false) => ({ dueDate: new Date(iso), done });

describe("taskGroupOf", () => {
  it("puts completed tasks in Completed whatever the date", () => {
    expect(taskGroupOf(task("2026-10-01T09:00:00Z", true), NOW)).toBe(
      "completed",
    );
    expect(taskGroupOf(task("2026-12-01T09:00:00Z", true), NOW)).toBe(
      "completed",
    );
  });

  it("marks open tasks past their due time as overdue, even earlier today", () => {
    expect(taskGroupOf(task("2026-10-15T09:00:00Z"), NOW)).toBe("overdue");
    expect(taskGroupOf(task("2026-10-02T09:00:00Z"), NOW)).toBe("overdue");
  });

  it("splits the rest into today, this week (to Sunday) and later", () => {
    expect(taskGroupOf(task("2026-10-15T17:00:00Z"), NOW)).toBe("today");
    expect(taskGroupOf(task("2026-10-15T23:59:59Z"), NOW)).toBe("today");
    expect(taskGroupOf(task("2026-10-16T00:00:00Z"), NOW)).toBe("thisWeek");
    expect(taskGroupOf(task("2026-10-18T23:00:00Z"), NOW)).toBe("thisWeek");
    expect(taskGroupOf(task("2026-10-19T00:00:00Z"), NOW)).toBe("later");
  });
});

describe("groupTasks", () => {
  it("groups and sorts tasks", () => {
    const tasks = [
      task("2026-10-20T09:00:00Z"),
      task("2026-10-10T09:00:00Z"),
      task("2026-10-14T09:00:00Z"),
      task("2026-10-16T09:00:00Z"),
      task("2026-10-15T15:00:00Z"),
      task("2026-10-01T09:00:00Z", true),
      task("2026-10-12T09:00:00Z", true),
    ];
    const groups = groupTasks(tasks, NOW);
    const days = (list: typeof tasks) =>
      list.map((t) => t.dueDate.toISOString().slice(5, 10));
    expect(days(groups.overdue)).toEqual(["10-10", "10-14"]);
    expect(days(groups.today)).toEqual(["10-15"]);
    expect(days(groups.thisWeek)).toEqual(["10-16"]);
    expect(days(groups.later)).toEqual(["10-20"]);
    // Most recently due completed task first.
    expect(days(groups.completed)).toEqual(["10-12", "10-01"]);
  });

  it("returns every group even when empty", () => {
    expect(Object.keys(groupTasks([], NOW))).toEqual([
      "overdue",
      "today",
      "thisWeek",
      "later",
      "completed",
    ]);
  });
});
