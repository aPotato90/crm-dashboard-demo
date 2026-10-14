import { describe, expect, it } from "vitest";

import {
  dealValueByStage,
  displayWebsite,
  filterCompanies,
  industriesOf,
  toCompanyRows,
} from "./companies-list";
import { generateDemoData } from "./seed-generator";

const data = generateDemoData({ now: new Date("2026-10-15T12:00:00Z") });
const rows = toCompanyRows(data.companies, data.contacts, data.deals);

describe("toCompanyRows", () => {
  it("counts contacts and sums deal values per company", () => {
    expect(rows.reduce((s, r) => s + r.contactCount, 0)).toBe(45);
    expect(rows.reduce((s, r) => s + r.dealCount, 0)).toBe(30);
    expect(rows.reduce((s, r) => s + r.totalDealValue, 0)).toBe(
      data.deals.reduce((s, d) => s + d.value, 0),
    );
    expect(rows.every((r) => r.contactCount >= 3)).toBe(true);
  });
});

describe("filterCompanies", () => {
  it("searches name, industry and website and sorts by name", () => {
    expect(
      filterCompanies(rows, { q: "bluepine", industry: "" }).map((r) => r.name),
    ).toEqual(["Bluepine Analytics"]);
    expect(
      filterCompanies(rows, { q: "HEALTH", industry: "" }).map((r) => r.name),
    ).toEqual(["Meadowlark Health"]);
    const all = filterCompanies(rows, { q: "", industry: "" }).map(
      (r) => r.name,
    );
    expect(all).toEqual([...all].sort((a, b) => a.localeCompare(b)));
  });

  it("filters by industry", () => {
    expect(
      filterCompanies(rows, { q: "", industry: "Software" }).map((r) => r.name),
    ).toEqual(["Granitepeak Software"]);
  });
});

describe("helpers", () => {
  it("lists distinct industries in order", () => {
    const industries = industriesOf(data.companies);
    expect(industries).toHaveLength(12);
    expect(industries).toEqual(
      [...industries].sort((a, b) => a.localeCompare(b)),
    );
  });

  it("sums deal value per stage for every stage", () => {
    const stages = dealValueByStage([
      { stage: "won", value: 10 },
      { stage: "won", value: 5 },
      { stage: "new", value: 1 },
    ]);
    expect(stages).toHaveLength(6);
    expect(stages.find((s) => s.stage === "won")).toEqual({
      stage: "won",
      label: "Won",
      value: 15,
      count: 2,
    });
    expect(stages.find((s) => s.stage === "lost")?.value).toBe(0);
  });

  it("shows websites without the scheme", () => {
    expect(displayWebsite("https://bluepine.example.com/")).toBe(
      "bluepine.example.com",
    );
  });
});
