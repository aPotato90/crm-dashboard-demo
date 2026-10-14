import { describe, expect, it } from "vitest";

import {
  compare,
  isSandboxEmpty,
  isTaskOverdue,
  leadsBySource,
  openPipelineValue,
  openPipelineValueAt,
  openTasksDueThisWeek,
  pipelineByStage,
  pipelineValueTrend,
  recentActivities,
  revenueByMonth,
  tasksDueSoon,
  winRateBetween,
  winRateTrend,
  wonRevenueBetween,
  wonRevenueThisMonth,
} from "./metrics";
import { generateDemoData } from "./seed-generator";

// Wednesday, 15 October 2026, 12:00 UTC (tests run with TZ=UTC).
const NOW = new Date("2026-10-15T12:00:00Z");
const d = (iso: string) => new Date(iso);

type TestDeal = {
  value: number;
  stage: "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
  createdAt: Date;
  closedAt: Date | null;
};

const deal = (
  stage: TestDeal["stage"],
  value: number,
  createdAt: string,
  closedAt: string | null = null,
): TestDeal => ({
  stage,
  value,
  createdAt: d(createdAt),
  closedAt: closedAt ? d(closedAt) : null,
});

const DEALS: TestDeal[] = [
  deal("new", 10_000, "2026-10-10T00:00:00Z"),
  deal("proposal", 20_000, "2026-08-01T00:00:00Z"),
  deal("negotiation", 30_000, "2026-09-01T00:00:00Z"),
  // Closed this month.
  deal("won", 5_000, "2026-09-01T00:00:00Z", "2026-10-03T00:00:00Z"),
  deal("won", 7_000, "2026-09-01T00:00:00Z", "2026-10-14T00:00:00Z"),
  deal("lost", 9_000, "2026-09-01T00:00:00Z", "2026-10-05T00:00:00Z"),
  // Closed last month: one inside "month to date" (Sep 1-15), one after.
  deal("won", 11_000, "2026-08-01T00:00:00Z", "2026-09-10T00:00:00Z"),
  deal("won", 13_000, "2026-08-01T00:00:00Z", "2026-09-25T00:00:00Z"),
  // Closed in the previous 90-day window (Apr 18 - Jul 17).
  deal("lost", 1_000, "2026-04-01T00:00:00Z", "2026-06-01T00:00:00Z"),
  deal("won", 2_000, "2026-04-01T00:00:00Z", "2026-07-01T00:00:00Z"),
  // A year ago: outside every window.
  deal("won", 99_000, "2025-01-01T00:00:00Z", "2025-02-01T00:00:00Z"),
];

describe("compare", () => {
  it("computes relative change and handles a zero baseline", () => {
    expect(compare(120, 100)).toEqual({
      current: 120,
      previous: 100,
      change: 0.2,
    });
    expect(compare(5, 0).change).toBeNull();
  });
});

describe("pipeline value", () => {
  it("sums open deals only", () => {
    expect(openPipelineValue(DEALS)).toBe(60_000);
  });

  it("reconstructs the open pipeline at a past date", () => {
    // On Sep 15: proposal + negotiation open, the Oct-closed deals were open
    // too, the Sep 10 win had closed; the Sep 25 win was still open.
    expect(openPipelineValueAt(DEALS, d("2026-09-15T12:00:00Z"))).toBe(
      20_000 + 30_000 + 5_000 + 7_000 + 9_000 + 13_000,
    );
  });

  it("compares now with 30 days ago", () => {
    const trend = pipelineValueTrend(DEALS, NOW);
    expect(trend.current).toBe(60_000);
    expect(trend.previous).toBe(
      openPipelineValueAt(DEALS, d("2026-09-15T12:00:00Z")),
    );
    expect(trend.change).toBeCloseTo(60_000 / 84_000 - 1);
  });
});

describe("won revenue", () => {
  it("sums won deals closed in a range (end-exclusive)", () => {
    expect(
      wonRevenueBetween(
        DEALS,
        d("2026-10-01T00:00:00Z"),
        d("2026-10-14T00:00:00Z"),
      ),
    ).toBe(5_000);
  });

  it("compares month to date with the same days of last month", () => {
    const result = wonRevenueThisMonth(DEALS, NOW);
    expect(result.current).toBe(12_000);
    // Sep 1 - Sep 15 12:00 includes the Sep 10 win, not the Sep 25 one.
    expect(result.previous).toBe(11_000);
    expect(result.change).toBeCloseTo(1 / 11);
  });

  it("caps last month's window at its end (31st vs a 30-day month)", () => {
    const deals = [
      deal("won", 4_000, "2026-08-01T00:00:00Z", "2026-09-30T18:00:00Z"),
    ];
    expect(wonRevenueThisMonth(deals, d("2026-10-31T23:00:00Z")).previous).toBe(
      4_000,
    );
  });
});

describe("win rate", () => {
  it("is won / (won + lost) for deals closed in the window", () => {
    // Wins on Sep 10, Sep 25, Oct 3, Oct 14; one loss on Oct 5.
    expect(winRateBetween(DEALS, d("2026-07-17T12:00:00Z"), NOW)).toEqual({
      rate: 0.8,
      won: 4,
      lost: 1,
    });
  });

  it("is null when nothing closed", () => {
    expect(winRateBetween([], d("2026-01-01"), NOW).rate).toBeNull();
  });

  it("compares the last 90 days with the 90 days before", () => {
    const trend = winRateTrend(DEALS, NOW);
    expect(trend.current.rate).toBe(0.8);
    expect(trend.previous).toEqual({ rate: 0.5, won: 1, lost: 1 });
    expect(trend.changePoints).toBe(30);
  });
});

describe("tasks", () => {
  const task = (dueDate: string, done = false) => ({
    dueDate: d(dueDate),
    done,
  });
  const TASKS = [
    task("2026-10-12T09:00:00Z"), // Monday, this week, overdue
    task("2026-10-16T09:00:00Z"), // Friday, this week
    task("2026-10-18T22:00:00Z"), // Sunday night, this week
    task("2026-10-19T09:00:00Z"), // next Monday
    task("2026-10-14T09:00:00Z", true), // done, this week
    task("2026-10-01T09:00:00Z"), // old and open: overdue
    task("2026-09-01T09:00:00Z", true), // old and done
  ];

  it("counts open tasks due this week (Mon-Sun) and overdue ones", () => {
    expect(openTasksDueThisWeek(TASKS, NOW)).toEqual({
      dueThisWeek: 3,
      overdue: 2,
    });
  });

  it("lists tasks due soon in due-date order, keeping old open ones", () => {
    const list = tasksDueSoon(TASKS, NOW);
    expect(list.map((t) => t.dueDate.toISOString().slice(0, 10))).toEqual([
      "2026-10-01",
      "2026-10-12",
      "2026-10-14",
      "2026-10-16",
      "2026-10-18",
      "2026-10-19",
    ]);
    expect(tasksDueSoon(TASKS, NOW, { limit: 2 })).toHaveLength(2);
  });

  it("flags open tasks past their due time as overdue", () => {
    expect(isTaskOverdue(task("2026-10-15T11:00:00Z"), NOW)).toBe(true);
    expect(isTaskOverdue(task("2026-10-15T11:00:00Z", true), NOW)).toBe(false);
    expect(isTaskOverdue(task("2026-10-15T13:00:00Z"), NOW)).toBe(false);
  });
});

describe("chart series", () => {
  it("returns 12 calendar months of won revenue, oldest first", () => {
    const months = revenueByMonth(DEALS, NOW);
    expect(months).toHaveLength(12);
    expect(months[0]).toMatchObject({ key: "2025-11", label: "Nov" });
    expect(months[11]).toMatchObject({
      key: "2026-10",
      fullLabel: "October 2026",
      value: 12_000,
    });
    expect(months.find((m) => m.key === "2026-09")?.value).toBe(24_000);
    expect(months.find((m) => m.key === "2026-07")?.value).toBe(2_000);
    // The Feb 2025 win is older than the window.
    expect(months.reduce((s, m) => s + m.value, 0)).toBe(38_000);
  });

  it("summarises count and value per stage in pipeline order", () => {
    const stages = pipelineByStage(DEALS);
    expect(stages.map((s) => s.stage)).toEqual([
      "new",
      "qualified",
      "proposal",
      "negotiation",
      "won",
      "lost",
    ]);
    expect(stages[0]).toEqual({
      stage: "new",
      label: "New",
      count: 1,
      value: 10_000,
    });
    expect(stages[1]).toMatchObject({ count: 0, value: 0 });
    expect(stages[4]).toMatchObject({ count: 6, value: 137_000 });
    expect(pipelineByStage(DEALS, ["proposal"])).toHaveLength(1);
  });

  it("counts contacts per source in a fixed order with shares", () => {
    const sources = leadsBySource([
      { source: "referral" },
      { source: "website" },
      { source: "referral" },
      { source: "event" },
    ]);
    expect(sources.map((s) => s.source)).toEqual([
      "website",
      "referral",
      "linkedin",
      "event",
      "cold-call",
    ]);
    expect(sources[1]).toEqual({
      source: "referral",
      label: "Referral",
      count: 2,
      share: 0.5,
    });
    expect(sources[2].count).toBe(0);
    expect(leadsBySource([]).every((s) => s.share === 0)).toBe(true);
  });

  it("returns the most recent activities first", () => {
    const items = ["2026-10-01", "2026-10-10", "2026-10-05"].map((iso) => ({
      createdAt: d(iso),
    }));
    expect(
      recentActivities(items, 2).map((a) => a.createdAt.getDate()),
    ).toEqual([10, 5]);
  });
});

describe("with the seeded demo data", () => {
  const data = generateDemoData({ now: NOW });

  it("has an open pipeline equal to the sum of open deals", () => {
    const expected = data.deals
      .filter((x) => !["won", "lost"].includes(x.stage))
      .reduce((s, x) => s + x.value, 0);
    expect(openPipelineValue(data.deals)).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });

  it("puts every won deal in the 12-month revenue series", () => {
    const won = data.deals
      .filter((x) => x.stage === "won")
      .reduce((s, x) => s + x.value, 0);
    const series = revenueByMonth(data.deals, NOW);
    expect(series.reduce((s, m) => s + m.value, 0)).toBe(won);
    expect(series.filter((m) => m.value > 0).length).toBeGreaterThanOrEqual(6);
  });

  it("counts every contact exactly once by source", () => {
    expect(leadsBySource(data.contacts).reduce((s, x) => s + x.count, 0)).toBe(
      45,
    );
  });

  it("detects an empty sandbox", () => {
    expect(isSandboxEmpty(data)).toBe(false);
    expect(
      isSandboxEmpty({
        companies: [],
        contacts: [],
        deals: [],
        activities: [],
        tasks: [],
      }),
    ).toBe(true);
  });
});
