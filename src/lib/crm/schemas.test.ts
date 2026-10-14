import { describe, expect, it } from "vitest";

import {
  activitySchema,
  companySchema,
  contactSchema,
  dealFieldsSchema,
  dealSchema,
  LIMITS,
  sandboxStateSchema,
  taskSchema,
} from "./index";

const now = new Date("2026-06-15T12:00:00Z");

const company = {
  name: "Example Widgets",
  industry: "Manufacturing",
  size: "11-50",
  website: "https://widgets.example.com",
  createdAt: now,
};

const contact = {
  firstName: "Ada",
  lastName: "Example",
  email: "ada@widgets.example.com",
  phone: "+1 555-0100",
  companyId: "company-001",
  jobTitle: "CTO",
  status: "lead",
  source: "website",
  ownerName: "Jordan Ellis",
  tags: ["champion"],
  createdAt: now,
  lastContactedAt: now,
};

const deal = {
  title: "Example Widgets — Pilot",
  contactId: "contact-001",
  companyId: "company-001",
  value: 12_000,
  stage: "proposal",
  probability: 50,
  expectedCloseDate: now,
  closedAt: null,
  order: 0,
  createdAt: now,
};

const activity = {
  type: "call",
  contactId: "contact-001",
  dealId: null,
  summary: "Intro call.",
  createdAt: now,
};

const task = {
  title: "Send proposal",
  dueDate: now,
  done: false,
  contactId: null,
  dealId: null,
  createdAt: now,
};

describe("valid documents", () => {
  it.each([
    ["company", companySchema, company],
    ["contact", contactSchema, contact],
    ["deal", dealSchema, deal],
    ["activity", activitySchema, activity],
    ["task", taskSchema, task],
    ["sandbox state", sandboxStateSchema, { seeded: true, seededAt: now }],
  ] as const)("accepts a valid %s", (_, schema, value) => {
    expect(schema.safeParse(value).success).toBe(true);
  });
});

describe("companySchema", () => {
  it("rejects unknown fields", () => {
    expect(companySchema.safeParse({ ...company, extra: 1 }).success).toBe(
      false,
    );
  });

  it("rejects names over the limit and blank names", () => {
    const long = "x".repeat(LIMITS.nameMax + 1);
    expect(companySchema.safeParse({ ...company, name: long }).success).toBe(
      false,
    );
    expect(companySchema.safeParse({ ...company, name: "   " }).success).toBe(
      false,
    );
  });

  it("only accepts http(s) websites or an empty string", () => {
    const parse = (website: string) =>
      companySchema.safeParse({ ...company, website }).success;
    expect(parse("")).toBe(true);
    expect(parse("javascript:alert(1)")).toBe(false);
    expect(parse("not a url")).toBe(false);
  });

  it("rejects unknown sizes", () => {
    expect(companySchema.safeParse({ ...company, size: "huge" }).success).toBe(
      false,
    );
  });
});

describe("contactSchema", () => {
  it("rejects invalid emails, statuses and sources", () => {
    expect(contactSchema.safeParse({ ...contact, email: "nope" }).success).toBe(
      false,
    );
    expect(contactSchema.safeParse({ ...contact, status: "vip" }).success).toBe(
      false,
    );
    expect(contactSchema.safeParse({ ...contact, source: "tv" }).success).toBe(
      false,
    );
  });

  it("limits the number and length of tags", () => {
    const tooMany = Array.from(
      { length: LIMITS.tagsMaxCount + 1 },
      (_, i) => `t${i}`,
    );
    expect(contactSchema.safeParse({ ...contact, tags: tooMany }).success).toBe(
      false,
    );
    expect(
      contactSchema.safeParse({
        ...contact,
        tags: ["x".repeat(LIMITS.tagMax + 1)],
      }).success,
    ).toBe(false);
  });

  it("requires Date timestamps", () => {
    expect(
      contactSchema.safeParse({ ...contact, createdAt: now.toISOString() })
        .success,
    ).toBe(false);
  });
});

describe("dealSchema", () => {
  it("caps the deal value between 0 and 100,000,000", () => {
    const parse = (value: number) =>
      dealSchema.safeParse({ ...deal, value }).success;
    expect(parse(0)).toBe(true);
    expect(parse(100_000_000)).toBe(true);
    expect(parse(-1)).toBe(false);
    expect(parse(100_000_001)).toBe(false);
    expect(parse(Number.POSITIVE_INFINITY)).toBe(false);
    expect(parse(Number.NaN)).toBe(false);
  });

  it("requires an integer probability between 0 and 100", () => {
    const parse = (probability: number) =>
      dealSchema.safeParse({ ...deal, probability }).success;
    expect(parse(101)).toBe(false);
    expect(parse(-1)).toBe(false);
    expect(parse(33.3)).toBe(false);
  });

  it("requires closedAt exactly for won/lost deals", () => {
    const parse = (stage: string, closedAt: Date | null) =>
      dealSchema.safeParse({ ...deal, stage, closedAt }).success;
    expect(parse("won", now)).toBe(true);
    expect(parse("lost", now)).toBe(true);
    expect(parse("won", null)).toBe(false);
    expect(parse("proposal", now)).toBe(false);
  });

  it("allows partial updates through dealFieldsSchema", () => {
    expect(dealFieldsSchema.partial().safeParse({ order: 1500 }).success).toBe(
      true,
    );
    expect(
      dealFieldsSchema.partial().safeParse({ stage: "archived" }).success,
    ).toBe(false);
  });
});

describe("activitySchema and taskSchema", () => {
  it("limits summary length", () => {
    expect(
      activitySchema.safeParse({
        ...activity,
        summary: "x".repeat(LIMITS.summaryMax + 1),
      }).success,
    ).toBe(false);
  });

  it("rejects unknown activity types", () => {
    expect(activitySchema.safeParse({ ...activity, type: "sms" }).success).toBe(
      false,
    );
  });

  it("requires a boolean done flag", () => {
    expect(taskSchema.safeParse({ ...task, done: "yes" }).success).toBe(false);
  });
});
