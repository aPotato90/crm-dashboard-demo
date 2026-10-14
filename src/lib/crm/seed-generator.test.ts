import { describe, expect, it } from "vitest";

import {
  activitySchema,
  companySchema,
  contactSchema,
  DEAL_STAGES,
  dealSchema,
  isClosedStage,
  taskSchema,
} from "./index";
import { createRng, DEMO_COUNTS, generateDemoData } from "./seed-generator";

const NOW = new Date("2026-06-15T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const data = generateDemoData({ now: NOW });

describe("createRng", () => {
  it("is deterministic for a given seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
    expect(seqA.every((n) => n >= 0 && n < 1)).toBe(true);
  });

  it("produces different sequences for different seeds", () => {
    expect(createRng(1).next()).not.toEqual(createRng(2).next());
  });
});

describe("generateDemoData", () => {
  it("is deterministic for the same `now` and seed", () => {
    expect(generateDemoData({ now: NOW })).toEqual(data);
  });

  it("generates the expected number of documents", () => {
    expect(data.companies).toHaveLength(DEMO_COUNTS.companies);
    expect(data.contacts).toHaveLength(DEMO_COUNTS.contacts);
    expect(data.deals).toHaveLength(DEMO_COUNTS.deals);
    expect(data.activities).toHaveLength(DEMO_COUNTS.activities);
    expect(data.tasks).toHaveLength(DEMO_COUNTS.tasks);
    expect(DEMO_COUNTS).toEqual({
      companies: 12,
      contacts: 45,
      deals: 30,
      activities: 120,
      tasks: 15,
    });
  });

  it("uses unique ids in every collection", () => {
    for (const items of Object.values(data)) {
      const ids = items.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("produces documents that pass their schemas", () => {
    const check = (
      schema: { safeParse: (v: unknown) => { success: boolean } },
      items: { id: string }[],
    ) => {
      for (const { id, ...doc } of items) {
        const result = schema.safeParse(doc);
        expect(result, id).toMatchObject({ success: true });
      }
    };
    check(companySchema, data.companies);
    check(contactSchema, data.contacts);
    check(dealSchema, data.deals);
    check(activitySchema, data.activities);
    check(taskSchema, data.tasks);
  });

  it("links every contact to an existing company", () => {
    const companyIds = new Set(data.companies.map((c) => c.id));
    for (const contact of data.contacts) {
      expect(companyIds.has(contact.companyId), contact.id).toBe(true);
    }
  });

  it("links every deal to an existing contact and company", () => {
    const companyIds = new Set(data.companies.map((c) => c.id));
    const contacts = new Map(data.contacts.map((c) => [c.id, c]));
    for (const deal of data.deals) {
      expect(contacts.has(deal.contactId), deal.id).toBe(true);
      expect(companyIds.has(deal.companyId), deal.id).toBe(true);
      // The deal's company is the contact's company.
      expect(contacts.get(deal.contactId)?.companyId).toBe(deal.companyId);
    }
  });

  it("links activities and tasks to existing contacts and deals", () => {
    const contactIds = new Set(data.contacts.map((c) => c.id));
    const dealIds = new Set(data.deals.map((d) => d.id));
    for (const item of [...data.activities, ...data.tasks]) {
      if (item.contactId !== null) {
        expect(contactIds.has(item.contactId), item.id).toBe(true);
      }
      if (item.dealId !== null) {
        expect(dealIds.has(item.dealId), item.id).toBe(true);
      }
    }
  });

  it("spreads deals across every stage", () => {
    for (const stage of DEAL_STAGES) {
      expect(
        data.deals.filter((d) => d.stage === stage).length,
        stage,
      ).toBeGreaterThan(0);
    }
  });

  it("sets closedAt only for won/lost deals, within the last 12 months", () => {
    const yearAgo = NOW.getTime() - 366 * DAY_MS;
    for (const deal of data.deals) {
      if (isClosedStage(deal.stage)) {
        expect(deal.closedAt, deal.id).not.toBeNull();
        expect(deal.closedAt!.getTime()).toBeGreaterThan(yearAgo);
        expect(deal.closedAt!.getTime()).toBeLessThanOrEqual(NOW.getTime());
        expect(deal.closedAt!.getTime()).toBeGreaterThan(
          deal.createdAt.getTime(),
        );
      } else {
        expect(deal.closedAt, deal.id).toBeNull();
      }
      expect(deal.createdAt.getTime()).toBeGreaterThan(yearAgo);
    }
  });

  it("has mostly future close dates for open deals, with a few overdue", () => {
    const open = data.deals.filter((d) => !isClosedStage(d.stage));
    const overdue = open.filter(
      (d) => d.expectedCloseDate.getTime() < NOW.getTime(),
    );
    expect(overdue).toHaveLength(2);
    expect(open.length - overdue.length).toBe(16);
  });

  it("spreads won deals over at least 6 different months", () => {
    const months = new Set(
      data.deals
        .filter((d) => d.stage === "won")
        .map((d) => d.closedAt!.toISOString().slice(0, 7)),
    );
    expect(months.size).toBeGreaterThanOrEqual(6);
  });

  it("uses realistic deal values and stage-appropriate probabilities", () => {
    for (const deal of data.deals) {
      expect(deal.value).toBeGreaterThanOrEqual(1000);
      expect(deal.value).toBeLessThanOrEqual(250_000);
      if (deal.stage === "won") expect(deal.probability).toBe(100);
      if (deal.stage === "lost") expect(deal.probability).toBe(0);
    }
  });

  it("keeps dates in a consistent order", () => {
    const contacts = new Map(data.contacts.map((c) => [c.id, c]));
    for (const deal of data.deals) {
      const contact = contacts.get(deal.contactId)!;
      expect(contact.createdAt.getTime()).toBeLessThanOrEqual(
        deal.createdAt.getTime(),
      );
    }
    for (const activity of data.activities) {
      const contact = contacts.get(activity.contactId)!;
      expect(activity.createdAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
      expect(activity.createdAt.getTime()).toBeGreaterThanOrEqual(
        contact.createdAt.getTime(),
      );
      expect(contact.lastContactedAt.getTime()).toBeGreaterThanOrEqual(
        activity.createdAt.getTime(),
      );
    }
  });

  it("only uses fictional contact details", () => {
    for (const contact of data.contacts) {
      expect(contact.email).toMatch(/@[a-z]+\.example\.com$/);
      expect(contact.phone).toMatch(/^\+1 555-01\d\d$/);
    }
    for (const company of data.companies) {
      expect(company.website).toMatch(/^https:\/\/[a-z]+\.example\.com$/);
    }
  });

  it("marks contacts with a won deal as customers", () => {
    const wonContactIds = new Set(
      data.deals.filter((d) => d.stage === "won").map((d) => d.contactId),
    );
    for (const contact of data.contacts) {
      if (wonContactIds.has(contact.id))
        expect(contact.status).toBe("customer");
    }
  });
});
