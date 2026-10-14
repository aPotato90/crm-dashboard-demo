/**
 * Pure logic for the contacts table: URL query parsing, filtering, sorting and
 * pagination. The page keeps all of this state in the URL search params.
 */
import { z } from "zod";

import type { WithId } from "./common";
import {
  contactSourceSchema,
  contactStatusSchema,
  type ContactData,
} from "./contact";

export const CONTACTS_PAGE_SIZE = 25;

export const CONTACT_SORT_KEYS = [
  "name",
  "company",
  "lastContacted",
  "created",
] as const;
export type ContactSortKey = (typeof CONTACT_SORT_KEYS)[number];
export type SortDirection = "asc" | "desc";

/** Direction a column sorts in when it is first selected. */
export const DEFAULT_SORT_DIRECTION: Record<ContactSortKey, SortDirection> = {
  name: "asc",
  company: "asc",
  lastContacted: "desc",
  created: "desc",
};

const contactQuerySchema = z.object({
  q: z.string().max(200).catch(""),
  status: contactStatusSchema.or(z.literal("")).catch(""),
  source: contactSourceSchema.or(z.literal("")).catch(""),
  owner: z.string().max(120).catch(""),
  sort: z.enum(CONTACT_SORT_KEYS).catch("name"),
  dir: z.enum(["asc", "desc"]).catch("asc"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type ContactQuery = z.infer<typeof contactQuerySchema>;

export const DEFAULT_CONTACT_QUERY: ContactQuery = contactQuerySchema.parse({});

type ParamsLike = { get(name: string): string | null };

/** Reads the query from URL search params; invalid values fall back to defaults. */
export function parseContactQuery(params: ParamsLike): ContactQuery {
  const read = (key: string) => params.get(key) ?? undefined;
  return contactQuerySchema.parse({
    q: read("q"),
    status: read("status"),
    source: read("source"),
    owner: read("owner"),
    sort: read("sort"),
    dir: read("dir"),
    page: read("page"),
  });
}

/** Serialises a query, leaving out default values to keep URLs short. */
export function serializeContactQuery(query: ContactQuery): URLSearchParams {
  const params = new URLSearchParams();
  const q = query.q.trim();
  if (q) params.set("q", q);
  if (query.status) params.set("status", query.status);
  if (query.source) params.set("source", query.source);
  if (query.owner) params.set("owner", query.owner);
  if (query.sort !== "name" || query.dir !== "asc") {
    params.set("sort", query.sort);
    params.set("dir", query.dir);
  }
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

export type ContactRow = WithId<ContactData> & {
  fullName: string;
  companyName: string;
};

export function toContactRows(
  contacts: WithId<ContactData>[],
  companyNames: ReadonlyMap<string, string>,
): ContactRow[] {
  return contacts.map((contact) => ({
    ...contact,
    fullName: `${contact.firstName} ${contact.lastName}`,
    companyName: companyNames.get(contact.companyId) ?? "Unknown company",
  }));
}

/** Text search (name, email, company) plus status, source and owner filters. */
export function filterContacts(
  rows: ContactRow[],
  query: ContactQuery,
): ContactRow[] {
  const terms = query.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (query.status && row.status !== query.status) return false;
    if (query.source && row.source !== query.source) return false;
    if (query.owner && row.ownerName !== query.owner) return false;
    if (terms.length === 0) return true;
    const haystack =
      `${row.fullName} ${row.email} ${row.companyName}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

const collator = new Intl.Collator("en", { sensitivity: "base" });

/** Stable sort by the chosen column; ties fall back to name, then id. */
export function sortContacts(
  rows: ContactRow[],
  sort: ContactSortKey,
  dir: SortDirection,
): ContactRow[] {
  const sign = dir === "asc" ? 1 : -1;
  const primary = (a: ContactRow, b: ContactRow): number => {
    switch (sort) {
      case "name":
        return collator.compare(a.fullName, b.fullName);
      case "company":
        return collator.compare(a.companyName, b.companyName);
      case "lastContacted":
        return a.lastContactedAt.getTime() - b.lastContactedAt.getTime();
      case "created":
        return a.createdAt.getTime() - b.createdAt.getTime();
    }
  };
  return [...rows].sort(
    (a, b) =>
      sign * primary(a, b) ||
      collator.compare(a.fullName, b.fullName) ||
      a.id.localeCompare(b.id),
  );
}

export type Page<T> = {
  items: T[];
  /** The page actually shown (clamped to the last page). */
  page: number;
  pageCount: number;
  total: number;
  /** 1-based index of the first and last item shown (0 when empty). */
  start: number;
  end: number;
};

export function paginate<T>(
  items: T[],
  page: number,
  pageSize = CONTACTS_PAGE_SIZE,
): Page<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const offset = (current - 1) * pageSize;
  const pageItems = items.slice(offset, offset + pageSize);
  return {
    items: pageItems,
    page: current,
    pageCount,
    total,
    start: total === 0 ? 0 : offset + 1,
    end: offset + pageItems.length,
  };
}

/** Initials for an avatar: "Ada Ashdown" -> "AA". */
export function initials(firstName: string, lastName: string): string {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
}
