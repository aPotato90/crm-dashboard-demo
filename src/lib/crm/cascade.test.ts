import { describe, expect, it } from "vitest";

import {
  describeCascade,
  planCascadeDelete,
  snapshotCascade,
  type CascadeData,
} from "./cascade";
import { generateDemoData } from "./seed-generator";

const at = new Date("2026-10-01T00:00:00Z");

// A small hand-built graph:
// company c1: contacts p1, p2; company c2: contact p3
// deal d1 (p1/c1), d2 (p3 but company c1), d3 (p3/c2)
const DATA: CascadeData = {
  companies: [
    {
      id: "c1",
      name: "One",
      industry: "X",
      size: "1-10",
      website: "",
      createdAt: at,
    },
    {
      id: "c2",
      name: "Two",
      industry: "X",
      size: "1-10",
      website: "",
      createdAt: at,
    },
  ],
  contacts: ["p1:c1", "p2:c1", "p3:c2"].map((pair) => {
    const [id, companyId] = pair.split(":");
    return {
      id,
      companyId,
      firstName: id,
      lastName: "Test",
      email: `${id}@example.com`,
      phone: "",
      jobTitle: "",
      status: "lead" as const,
      source: "website" as const,
      ownerName: "Owner",
      tags: [],
      createdAt: at,
      lastContactedAt: at,
    };
  }),
  deals: [
    ["d1", "p1", "c1"],
    ["d2", "p3", "c1"],
    ["d3", "p3", "c2"],
  ].map(([id, contactId, companyId]) => ({
    id,
    contactId,
    companyId,
    title: id,
    value: 1000,
    stage: "new" as const,
    probability: 10,
    expectedCloseDate: at,
    closedAt: null,
    order: 0,
    createdAt: at,
  })),
  activities: [
    ["a1", "p1", null],
    ["a2", "p3", "d2"], // p3 survives a c1 delete, but d2 goes: unlink
    ["a3", "p3", "d3"],
  ].map(([id, contactId, dealId]) => ({
    id: id!,
    contactId: contactId!,
    dealId,
    type: "call" as const,
    summary: "s",
    createdAt: at,
  })),
  tasks: [
    ["t1", "p2", null],
    ["t2", "p3", "d2"], // unlink on c1 delete
    ["t3", null, "d2"], // no contact, deal gone: delete
    ["t4", null, null],
  ].map(([id, contactId, dealId]) => ({
    id: id!,
    contactId,
    dealId,
    title: id!,
    dueDate: at,
    done: false,
    createdAt: at,
  })),
};

const ids = (plan: ReturnType<typeof planCascadeDelete>, collection: string) =>
  plan.deletes.filter((d) => d.collection === collection).map((d) => d.id);

describe("planCascadeDelete", () => {
  it("deletes a contact with their deals, activities and tasks", () => {
    const plan = planCascadeDelete({ kind: "contact", id: "p1" }, DATA);
    expect(ids(plan, "contacts")).toEqual(["p1"]);
    expect(ids(plan, "deals")).toEqual(["d1"]);
    expect(ids(plan, "activities")).toEqual(["a1"]);
    expect(ids(plan, "tasks")).toEqual([]);
    expect(plan.unlinks).toEqual([]);
    expect(plan.counts).toEqual({
      companies: 0,
      contacts: 1,
      deals: 1,
      activities: 1,
      tasks: 0,
      unlinked: 0,
    });
  });

  it("deletes a company with its contacts and deals, unlinking survivors", () => {
    const plan = planCascadeDelete({ kind: "company", id: "c1" }, DATA);
    expect(ids(plan, "companies")).toEqual(["c1"]);
    expect(ids(plan, "contacts")).toEqual(["p1", "p2"]);
    // d2 belongs to company c1 even though its contact p3 is elsewhere.
    expect(ids(plan, "deals")).toEqual(["d1", "d2"]);
    expect(ids(plan, "activities")).toEqual(["a1"]);
    expect(ids(plan, "tasks")).toEqual(["t1", "t3"]);
    expect(plan.unlinks).toEqual([
      { collection: "activities", id: "a2" },
      { collection: "tasks", id: "t2" },
    ]);
  });

  it("orders deletes children first, parents last", () => {
    const plan = planCascadeDelete({ kind: "company", id: "c1" }, DATA);
    const order = plan.deletes.map((d) => d.collection);
    expect(order.indexOf("companies")).toBe(order.length - 1);
    expect(order.lastIndexOf("activities")).toBeLessThan(
      order.indexOf("deals"),
    );
    expect(order.lastIndexOf("deals")).toBeLessThan(order.indexOf("contacts"));
  });

  it("unlinks (not deletes) activities and tasks of a deleted deal", () => {
    const plan = planCascadeDelete({ kind: "deal", id: "d2" }, DATA);
    expect(plan.deletes).toEqual([
      { collection: "tasks", id: "t3" },
      { collection: "deals", id: "d2" },
    ]);
    expect(plan.unlinks.map((u) => u.id)).toEqual(["a2", "t2"]);
  });

  it("deletes a single task or activity on its own", () => {
    expect(planCascadeDelete({ kind: "task", id: "t4" }, DATA).deletes).toEqual(
      [{ collection: "tasks", id: "t4" }],
    );
    expect(
      planCascadeDelete({ kind: "activity", id: "a3" }, DATA).deletes,
    ).toEqual([{ collection: "activities", id: "a3" }]);
  });

  it("plans nothing for an unknown id", () => {
    const plan = planCascadeDelete({ kind: "contact", id: "nope" }, DATA);
    expect(plan.deletes).toEqual([]);
    expect(plan.unlinks).toEqual([]);
  });

  it("handles a full seeded company in one plan", () => {
    const data = generateDemoData({ now: new Date("2026-10-15T12:00:00Z") });
    const company = data.companies[0];
    const plan = planCascadeDelete({ kind: "company", id: company.id }, data);
    const contacts = data.contacts.filter((c) => c.companyId === company.id);
    expect(plan.counts.contacts).toBe(contacts.length);
    // Every activity of those contacts is in the plan.
    const contactIds = new Set(contacts.map((c) => c.id));
    expect(plan.counts.activities).toBe(
      data.activities.filter((a) => contactIds.has(a.contactId)).length,
    );
  });
});

describe("describeCascade", () => {
  it("summarises linked records for the confirm dialog", () => {
    const plan = planCascadeDelete({ kind: "contact", id: "p1" }, DATA);
    expect(describeCascade(plan, "contact")).toBe(
      "This also deletes 1 deal and 1 activity linked to it.",
    );
    const company = planCascadeDelete({ kind: "company", id: "c1" }, DATA);
    expect(describeCascade(company, "company")).toBe(
      "This also deletes 2 contacts, 2 deals, 1 activity and 2 tasks linked to it. 2 other activities and tasks will be kept but unlinked from the deleted deals.",
    );
    expect(
      describeCascade(
        planCascadeDelete({ kind: "task", id: "t4" }, DATA),
        "task",
      ),
    ).toBeNull();
  });
});

describe("snapshotCascade", () => {
  it("keeps every deleted document and the previous deal links", () => {
    const plan = planCascadeDelete({ kind: "company", id: "c1" }, DATA);
    const snapshot = snapshotCascade(plan, DATA);
    expect(snapshot.documents).toHaveLength(plan.deletes.length);
    expect(
      snapshot.documents.find((d) => d.collection === "companies")?.doc,
    ).toBe(DATA.companies[0]);
    expect(snapshot.unlinks).toEqual([
      { collection: "activities", id: "a2", dealId: "d2" },
      { collection: "tasks", id: "t2", dealId: "d2" },
    ]);
  });
});
