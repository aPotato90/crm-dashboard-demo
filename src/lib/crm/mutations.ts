/**
 * Writes that touch several documents at once: cascade deletes (and their
 * Undo) and logging an activity. Everything goes through batched writes of at
 * most 500 operations, validated like the single-document repo helpers.
 */
import { doc, writeBatch, type WriteBatch } from "firebase/firestore";

import { requireDb } from "@/lib/firebase/client";

import { activitySchema, type ActivityData } from "./activity";
import type { CascadeDocument, CascadePlan, CascadeSnapshot } from "./cascade";
import { toFirestoreData } from "./convert";
import {
  activitiesRepo,
  companiesRepo,
  contactsRepo,
  dealsRepo,
  MAX_WRITES_PER_BATCH,
  sandboxDocRef,
  tasksRepo,
} from "./repo";

type Write = (batch: WriteBatch) => void;

async function commitInBatches(writes: Write[]): Promise<void> {
  const db = requireDb();
  for (let i = 0; i < writes.length; i += MAX_WRITES_PER_BATCH) {
    const batch = writeBatch(db);
    for (const write of writes.slice(i, i + MAX_WRITES_PER_BATCH)) write(batch);
    await batch.commit();
  }
}

/**
 * Applies a cascade plan: unlinks kept records first, then deletes children
 * before parents. Plans over 500 writes are split into several batches.
 */
export async function applyCascadeDelete(
  uid: string,
  plan: CascadePlan,
): Promise<void> {
  await commitInBatches([
    ...plan.unlinks.map<Write>(
      ({ collection, id }) =>
        (batch) =>
          batch.update(sandboxDocRef(uid, collection, id), { dealId: null }),
    ),
    ...plan.deletes.map<Write>(
      ({ collection, id }) =>
        (batch) =>
          batch.delete(sandboxDocRef(uid, collection, id)),
    ),
  ]);
}

function restoreWrite(uid: string, entry: CascadeDocument): Write {
  // The typed refs convert Dates back to Timestamps and drop `id`.
  switch (entry.collection) {
    case "companies":
      return (b) => b.set(companiesRepo.docRef(uid, entry.doc.id), entry.doc);
    case "contacts":
      return (b) => b.set(contactsRepo.docRef(uid, entry.doc.id), entry.doc);
    case "deals":
      return (b) => b.set(dealsRepo.docRef(uid, entry.doc.id), entry.doc);
    case "activities":
      return (b) => b.set(activitiesRepo.docRef(uid, entry.doc.id), entry.doc);
    case "tasks":
      return (b) => b.set(tasksRepo.docRef(uid, entry.doc.id), entry.doc);
  }
}

/** Undo for `applyCascadeDelete`: recreates parents first, then relinks. */
export async function restoreCascade(
  uid: string,
  snapshot: CascadeSnapshot,
): Promise<void> {
  const order = ["companies", "contacts", "deals", "activities", "tasks"];
  const documents = [...snapshot.documents].sort(
    (a, b) => order.indexOf(a.collection) - order.indexOf(b.collection),
  );
  await commitInBatches([
    ...documents.map((entry) => restoreWrite(uid, entry)),
    ...snapshot.unlinks.map<Write>(
      ({ collection, id, dealId }) =>
        (batch) =>
          batch.update(sandboxDocRef(uid, collection, id), { dealId }),
    ),
  ]);
}

/**
 * Logs an activity and moves the contact's `lastContactedAt` to the
 * activity's time, atomically. Returns the new activity id.
 */
export async function logActivity(
  uid: string,
  data: ActivityData,
): Promise<string> {
  const activity = activitySchema.parse(data);
  const ref = doc(activitiesRepo.collectionRef(uid));
  const batch = writeBatch(requireDb());
  batch.set(ref, { ...activity, id: ref.id });
  batch.update(
    sandboxDocRef(uid, "contacts", activity.contactId),
    toFirestoreData({ lastContactedAt: activity.createdAt }),
  );
  await batch.commit();
  return ref.id;
}
