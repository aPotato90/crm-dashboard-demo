import { describe, expect, it } from "vitest";

import {
  CONTACTS_PAGE_SIZE,
  DEFAULT_CONTACT_QUERY,
  filterContacts,
  initials,
  paginate,
  parseContactQuery,
  serializeContactQuery,
  sortContacts,
  toContactRows,
  type ContactRow,
} from "./contacts-table";
import { generateDemoData } from "./seed-generator";

const NOW = new Date("2026-10-15T12:00:00Z");
const data = generateDemoData({ now: NOW });
const companyNames = new Map(data.companies.map((c) => [c.id, c.name]));
const rows = toContactRows(data.contacts, companyNames);

const params = (init: string) => new URLSearchParams(init);

describe("parseContactQuery / serializeContactQuery", () => {
  it("returns defaults for an empty URL", () => {
    expect(parseContactQuery(params(""))).toEqual(DEFAULT_CONTACT_QUERY);
    expect(DEFAULT_CONTACT_QUERY).toMatchObject({
      sort: "name",
      dir: "asc",
      page: 1,
    });
  });

  it("reads valid values and ignores invalid ones", () => {
    expect(
      parseContactQuery(
        params(
          "q=ada&status=customer&source=referral&owner=Priya+Raman&sort=created&dir=desc&page=3",
        ),
      ),
    ).toEqual({
      q: "ada",
      status: "customer",
      source: "referral",
      owner: "Priya Raman",
      sort: "created",
      dir: "desc",
      page: 3,
    });
    expect(
      parseContactQuery(
        params("status=vip&source=tv&sort=email&dir=up&page=-2"),
      ),
    ).toEqual(DEFAULT_CONTACT_QUERY);
    expect(parseContactQuery(params("page=abc")).page).toBe(1);
  });

  it("round-trips and leaves defaults out of the URL", () => {
    expect(serializeContactQuery(DEFAULT_CONTACT_QUERY).toString()).toBe("");
    const query = {
      ...DEFAULT_CONTACT_QUERY,
      q: "  bluepine ",
      status: "lead" as const,
      page: 2,
    };
    const url = serializeContactQuery(query).toString();
    expect(url).toBe("q=bluepine&status=lead&page=2");
    expect(parseContactQuery(params(url))).toEqual({ ...query, q: "bluepine" });
  });
});

describe("filterContacts", () => {
  const query = (patch: Partial<typeof DEFAULT_CONTACT_QUERY>) => ({
    ...DEFAULT_CONTACT_QUERY,
    ...patch,
  });

  it("searches name, email and company, all terms must match", () => {
    const sample = rows[0];
    expect(
      filterContacts(rows, query({ q: sample.firstName.toUpperCase() })),
    ).toContain(sample);
    expect(filterContacts(rows, query({ q: sample.email }))).toEqual([sample]);
    const byCompany = filterContacts(rows, query({ q: sample.companyName }));
    expect(byCompany.every((r) => r.companyName === sample.companyName)).toBe(
      true,
    );
    expect(
      filterContacts(
        rows,
        query({ q: `${sample.firstName} ${sample.companyName}` }),
      ),
    ).toContain(sample);
    expect(filterContacts(rows, query({ q: "zzz-no-match" }))).toEqual([]);
  });

  it("filters by status, source and owner together", () => {
    const filtered = filterContacts(
      rows,
      query({
        status: "customer",
        source: rows[0].source,
        owner: rows[0].ownerName,
      }),
    );
    for (const row of filtered) {
      expect(row).toMatchObject({
        status: "customer",
        source: rows[0].source,
        ownerName: rows[0].ownerName,
      });
    }
    expect(filterContacts(rows, query({ status: "customer" })).length).toBe(
      rows.filter((r) => r.status === "customer").length,
    );
  });
});

describe("sortContacts", () => {
  const row = (
    id: string,
    fullName: string,
    companyName: string,
    days: number,
  ): ContactRow =>
    ({
      ...rows[0],
      id,
      fullName,
      companyName,
      lastContactedAt: new Date(NOW.getTime() - days * 864e5),
      createdAt: new Date(NOW.getTime() - days * 2 * 864e5),
    }) as ContactRow;
  const sample = [
    row("1", "bea Zed", "Acme", 3),
    row("2", "Ann Young", "Beta", 1),
    row("3", "Cy Xu", "Acme", 2),
  ];
  const names = (list: ContactRow[]) => list.map((r) => r.fullName);

  it("sorts by name case-insensitively", () => {
    expect(names(sortContacts(sample, "name", "asc"))).toEqual([
      "Ann Young",
      "bea Zed",
      "Cy Xu",
    ]);
    expect(names(sortContacts(sample, "name", "desc"))).toEqual([
      "Cy Xu",
      "bea Zed",
      "Ann Young",
    ]);
  });

  it("sorts by company with name as the tie-breaker", () => {
    expect(names(sortContacts(sample, "company", "asc"))).toEqual([
      "bea Zed",
      "Cy Xu",
      "Ann Young",
    ]);
  });

  it("sorts by last contacted and created dates", () => {
    expect(names(sortContacts(sample, "lastContacted", "desc"))).toEqual([
      "Ann Young",
      "Cy Xu",
      "bea Zed",
    ]);
    expect(names(sortContacts(sample, "created", "asc"))).toEqual([
      "bea Zed",
      "Cy Xu",
      "Ann Young",
    ]);
  });

  it("does not mutate the input", () => {
    const copy = [...sample];
    sortContacts(sample, "name", "desc");
    expect(sample).toEqual(copy);
  });
});

describe("paginate", () => {
  it("splits into pages of 25 and reports the visible range", () => {
    const page1 = paginate(rows, 1);
    expect(page1).toMatchObject({
      page: 1,
      pageCount: 2,
      total: 45,
      start: 1,
      end: 25,
    });
    expect(page1.items).toHaveLength(CONTACTS_PAGE_SIZE);
    const page2 = paginate(rows, 2);
    expect(page2).toMatchObject({ page: 2, start: 26, end: 45 });
    expect(page2.items).toHaveLength(20);
  });

  it("clamps out-of-range pages", () => {
    expect(paginate(rows, 9).page).toBe(2);
    expect(paginate(rows, 0).page).toBe(1);
    expect(paginate([], 3)).toEqual({
      items: [],
      page: 1,
      pageCount: 1,
      total: 0,
      start: 0,
      end: 0,
    });
  });
});

describe("initials", () => {
  it("uses the first letter of each name", () => {
    expect(initials("ada", " Lovelace")).toBe("AL");
  });
});
