/**
 * Pure planning for deletes that touch linked records. No Firebase here: the
 * repo applies a plan in batches and can restore it for Undo.
 *
 * Rules (the "cascade" approach):
 * - Deleting a company deletes its contacts and its deals.
 * - Deleting a contact deletes their deals, activities and tasks.
 * - Activities and tasks that only point at a deleted deal (their contact
 *   stays) are kept and unlinked (`dealId` set to null). Tasks with no
 *   contact that point at a deleted deal are deleted.
 */
import type { ActivityData } from "./activity";
import type { WithId } from "./common";
import type { CompanyData } from "./company";
import type { ContactData } from "./contact";
import type { DealData } from "./deal";
import type { TaskData } from "./task";

export type CascadeTarget =
  | { kind: "company"; id: string }
  | { kind: "contact"; id: string }
  | { kind: "deal"; id: string }
  | { kind: "task"; id: string }
  | { kind: "activity"; id: string };

export type CascadeData = {
  companies: WithId<CompanyData>[];
  contacts: WithId<ContactData>[];
  deals: WithId<DealData>[];
  activities: WithId<ActivityData>[];
  tasks: WithId<TaskData>[];
};

export type CascadeCollection = keyof CascadeData;

export type CascadePlan = {
  /** Documents to delete, children before parents. */
  deletes: { collection: CascadeCollection; id: string }[];
  /** Documents to keep but unlink from a deleted deal (`dealId: null`). */
  unlinks: { collection: "activities" | "tasks"; id: string }[];
  counts: {
    companies: number;
    contacts: number;
    deals: number;
    activities: number;
    tasks: number;
    unlinked: number;
  };
};

export function planCascadeDelete(
  target: CascadeTarget,
  data: CascadeData,
): CascadePlan {
  const companies = new Set<string>();
  const contacts = new Set<string>();
  const deals = new Set<string>();
  const activities = new Set<string>();
  const tasks = new Set<string>();

  switch (target.kind) {
    case "company":
      companies.add(target.id);
      break;
    case "contact":
      contacts.add(target.id);
      break;
    case "deal":
      deals.add(target.id);
      break;
    case "task":
      tasks.add(target.id);
      break;
    case "activity":
      activities.add(target.id);
      break;
  }

  for (const contact of data.contacts) {
    if (companies.has(contact.companyId)) contacts.add(contact.id);
  }
  for (const deal of data.deals) {
    if (contacts.has(deal.contactId) || companies.has(deal.companyId)) {
      deals.add(deal.id);
    }
  }

  const unlinks: CascadePlan["unlinks"] = [];
  for (const activity of data.activities) {
    if (contacts.has(activity.contactId)) activities.add(activity.id);
    else if (activity.dealId && deals.has(activity.dealId)) {
      unlinks.push({ collection: "activities", id: activity.id });
    }
  }
  for (const task of data.tasks) {
    if (tasks.has(task.id)) continue;
    const contactGone = task.contactId !== null && contacts.has(task.contactId);
    const dealGone = task.dealId !== null && deals.has(task.dealId);
    if (contactGone || (dealGone && task.contactId === null))
      tasks.add(task.id);
    else if (dealGone) unlinks.push({ collection: "tasks", id: task.id });
  }

  // Keep ids that actually exist (a stale target id deletes nothing).
  const existing = (collection: CascadeCollection, ids: Set<string>) =>
    data[collection]
      .filter((item) => ids.has(item.id))
      .map((item) => ({ collection, id: item.id }));

  const deletes = [
    ...existing("activities", activities),
    ...existing("tasks", tasks),
    ...existing("deals", deals),
    ...existing("contacts", contacts),
    ...existing("companies", companies),
  ];
  const count = (collection: CascadeCollection) =>
    deletes.filter((d) => d.collection === collection).length;

  return {
    deletes,
    unlinks,
    counts: {
      companies: count("companies"),
      contacts: count("contacts"),
      deals: count("deals"),
      activities: count("activities"),
      tasks: count("tasks"),
      unlinked: unlinks.length,
    },
  };
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Plain-language summary of what else a delete removes, for the confirm
 * dialog. Returns null when nothing else is affected.
 */
export function describeCascade(
  plan: CascadePlan,
  target: CascadeTarget["kind"],
): string | null {
  const parts: string[] = [];
  const { counts } = plan;
  if (target !== "contact" && counts.contacts > 0) {
    parts.push(plural(counts.contacts, "contact"));
  }
  if (target !== "deal" && counts.deals > 0) {
    parts.push(plural(counts.deals, "deal"));
  }
  if (target !== "activity" && counts.activities > 0) {
    parts.push(plural(counts.activities, "activity", "activities"));
  }
  if (target !== "task" && counts.tasks > 0) {
    parts.push(plural(counts.tasks, "task"));
  }
  const removed =
    parts.length === 0
      ? null
      : `This also deletes ${
          parts.length === 1
            ? parts[0]
            : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`
        } linked to it.`;
  const unlinked =
    counts.unlinked > 0
      ? `${plural(counts.unlinked, "other activity or task", "other activities and tasks")} will be kept but unlinked from the deleted deals.`
      : null;
  return [removed, unlinked].filter(Boolean).join(" ") || null;
}

/** One deleted document, kept in memory so a delete can be undone. */
export type CascadeDocument = {
  [K in CascadeCollection]: { collection: K; doc: CascadeData[K][number] };
}[CascadeCollection];

export type CascadeSnapshot = {
  documents: CascadeDocument[];
  /** Unlinked activities/tasks and the deal they pointed at before. */
  unlinks: { collection: "activities" | "tasks"; id: string; dealId: string }[];
};

/** Captures everything a plan removes or changes, for Undo. */
export function snapshotCascade(
  plan: CascadePlan,
  data: CascadeData,
): CascadeSnapshot {
  const find = <K extends CascadeCollection>(collection: K, id: string) =>
    (data[collection] as CascadeData[K][number][]).find(
      (item) => item.id === id,
    );

  const documents: CascadeDocument[] = [];
  for (const { collection, id } of plan.deletes) {
    const doc = find(collection, id);
    if (doc) documents.push({ collection, doc } as CascadeDocument);
  }
  const unlinks: CascadeSnapshot["unlinks"] = [];
  for (const { collection, id } of plan.unlinks) {
    const dealId = find(collection, id)?.dealId;
    if (dealId) unlinks.push({ collection, id, dealId });
  }
  return { documents, unlinks };
}
