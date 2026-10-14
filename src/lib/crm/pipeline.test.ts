import { describe, expect, it } from "vitest";

import type { DealStage } from "./deal";
import {
  applyPatches,
  groupByStage,
  isDealOverdue,
  ORDER_STEP,
  planDealMove,
  stageChangePatch,
  type BoardDeal,
} from "./pipeline";

const NOW = new Date("2026-10-15T12:00:00Z");
const CLOSED = new Date("2026-10-01T00:00:00Z");

function card(
  id: string,
  stage: DealStage,
  order: number,
  extra: Partial<BoardDeal> = {},
): BoardDeal {
  const closed = stage === "won" || stage === "lost";
  return {
    id,
    stage,
    order,
    closedAt: closed ? CLOSED : null,
    probability: stage === "won" ? 100 : stage === "lost" ? 0 : 50,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    ...extra,
  };
}

const DEALS = [
  card("a", "new", 0),
  card("b", "new", 1000),
  card("c", "new", 2000),
  card("p", "proposal", 0),
  card("q", "proposal", 1000),
  card("w", "won", 0),
];

describe("groupByStage", () => {
  it("creates every column, sorted by order then createdAt", () => {
    const columns = groupByStage([
      card("y", "qualified", 500),
      card("x", "qualified", 500, { createdAt: new Date("2026-01-01") }),
      card("z", "qualified", 100),
    ]);
    expect(Object.keys(columns)).toEqual([
      "new",
      "qualified",
      "proposal",
      "negotiation",
      "won",
      "lost",
    ]);
    expect(columns.qualified.map((d) => d.id)).toEqual(["z", "x", "y"]);
    expect(columns.lost).toEqual([]);
  });
});

describe("planDealMove", () => {
  const columns = groupByStage(DEALS);

  it("writes only the cards whose order changes when reordering", () => {
    // Move "c" to the top of New: c=0, a=1000, b=2000.
    expect(planDealMove(columns, "c", "new", 0, NOW)).toEqual([
      { id: "c", patch: { order: 0 } },
      { id: "a", patch: { order: ORDER_STEP } },
      { id: "b", patch: { order: 2 * ORDER_STEP } },
    ]);
    // Swapping the last two only touches those two.
    expect(planDealMove(columns, "c", "new", 1, NOW)).toEqual([
      { id: "c", patch: { order: ORDER_STEP } },
      { id: "b", patch: { order: 2 * ORDER_STEP } },
    ]);
  });

  it("writes nothing when a card is dropped where it was", () => {
    expect(planDealMove(columns, "b", "new", 1, NOW)).toEqual([]);
  });

  it("moves across columns, renumbering only the target column", () => {
    expect(planDealMove(columns, "a", "proposal", 1, NOW)).toEqual([
      {
        id: "a",
        patch: { stage: "proposal", probability: 50, order: ORDER_STEP },
      },
      { id: "q", patch: { order: 2 * ORDER_STEP } },
    ]);
  });

  it("sets closedAt and probability 100 when a deal is won", () => {
    expect(planDealMove(columns, "p", "won", 0, NOW)).toEqual([
      { id: "p", patch: { stage: "won", probability: 100, closedAt: NOW } },
      { id: "w", patch: { order: ORDER_STEP } },
    ]);
  });

  it("sets closedAt and probability 0 when a deal is lost", () => {
    expect(planDealMove(columns, "q", "lost", 0, NOW)).toEqual([
      {
        id: "q",
        patch: { stage: "lost", probability: 0, closedAt: NOW, order: 0 },
      },
    ]);
  });

  it("clears closedAt when a closed deal moves back to an open stage", () => {
    expect(planDealMove(columns, "w", "negotiation", 0, NOW)).toEqual([
      {
        id: "w",
        patch: { stage: "negotiation", probability: 75, closedAt: null },
      },
    ]);
  });

  it("clamps the index and ignores unknown deals", () => {
    expect(planDealMove(columns, "a", "lost", 99, NOW)).toEqual([
      { id: "a", patch: { stage: "lost", probability: 0, closedAt: NOW } },
    ]);
    expect(planDealMove(columns, "nope", "new", 0, NOW)).toEqual([]);
  });
});

describe("stageChangePatch", () => {
  it("returns nothing when the stage is unchanged", () => {
    expect(stageChangePatch(card("a", "won", 0), "won", NOW)).toEqual({});
  });

  it("updates closedAt when moving between won and lost", () => {
    expect(stageChangePatch(card("a", "won", 0), "lost", NOW)).toEqual({
      stage: "lost",
      probability: 0,
      closedAt: NOW,
    });
  });
});

describe("applyPatches", () => {
  it("overlays pending patches without mutating the input", () => {
    const pending = new Map([["a", { stage: "won" as const, order: 5 }]]);
    const result = applyPatches(DEALS, pending);
    expect(result.find((d) => d.id === "a")).toMatchObject({
      stage: "won",
      order: 5,
    });
    expect(DEALS[0].stage).toBe("new");
    expect(applyPatches(DEALS, new Map())).toBe(DEALS);
  });
});

describe("isDealOverdue", () => {
  it("flags open deals with an expected close date before today", () => {
    const due = (iso: string, stage: DealStage = "proposal") => ({
      stage,
      expectedCloseDate: new Date(iso),
    });
    expect(isDealOverdue(due("2026-10-14T23:00:00Z"), NOW)).toBe(true);
    expect(isDealOverdue(due("2026-10-15T01:00:00Z"), NOW)).toBe(false);
    expect(isDealOverdue(due("2026-01-01T00:00:00Z", "won"), NOW)).toBe(false);
  });
});
