/**
 * Seeds and resets a visitor's private sandbox (`users/{uid}/...`).
 *
 * The data itself comes from the pure, deterministic generator in
 * `seed-generator.ts`; this module only writes it to Firestore.
 */
import {
  deleteDoc,
  getDocs,
  limit,
  query,
  writeBatch,
  type WriteBatch,
} from "firebase/firestore";

import { requireDb } from "@/lib/firebase/client";

import {
  activitiesRepo,
  companiesRepo,
  contactsRepo,
  dealsRepo,
  getSandboxState,
  sandboxCollectionRef,
  sandboxStateRef,
  SANDBOX_COLLECTIONS,
  setSandboxState,
  tasksRepo,
  type SandboxCollection,
} from "./repo";
import { generateDemoData } from "./seed-generator";

export {
  DEMO_COUNTS,
  DEMO_DATA_SEED,
  generateDemoData,
  type DemoData,
} from "./seed-generator";

/** Firestore allows at most 500 writes per batch. */
export const MAX_BATCH_WRITES = 500;

/** One queued write; applied to whichever batch it lands in. */
type Write = (batch: WriteBatch) => void;

/** Commits writes sequentially in batches of at most MAX_BATCH_WRITES. */
async function commitInBatches(writes: Write[]): Promise<void> {
  const db = requireDb();
  for (let i = 0; i < writes.length; i += MAX_BATCH_WRITES) {
    const batch = writeBatch(db);
    for (const write of writes.slice(i, i + MAX_BATCH_WRITES)) write(batch);
    await batch.commit();
  }
}

/** One write per generated document. Ids are deterministic. */
function buildSeedWrites(uid: string, now: Date): Write[] {
  const data = generateDemoData({ now });
  // The typed refs carry converters that drop `id` and store dates as
  // Firestore Timestamps.
  return [
    ...data.companies.map<Write>(
      (item) => (batch) => batch.set(companiesRepo.docRef(uid, item.id), item),
    ),
    ...data.contacts.map<Write>(
      (item) => (batch) => batch.set(contactsRepo.docRef(uid, item.id), item),
    ),
    ...data.deals.map<Write>(
      (item) => (batch) => batch.set(dealsRepo.docRef(uid, item.id), item),
    ),
    ...data.activities.map<Write>(
      (item) => (batch) => batch.set(activitiesRepo.docRef(uid, item.id), item),
    ),
    ...data.tasks.map<Write>(
      (item) => (batch) => batch.set(tasksRepo.docRef(uid, item.id), item),
    ),
  ];
}

// One in-flight operation per uid, so double effects (React Strict Mode) or
// repeated clicks never write the same sandbox concurrently from this tab.
const inFlight = new Map<string, Promise<boolean>>();

function once(uid: string, run: () => Promise<boolean>): Promise<boolean> {
  const existing = inFlight.get(uid);
  if (existing) return existing;
  const promise = run().finally(() => inFlight.delete(uid));
  inFlight.set(uid, promise);
  return promise;
}

async function writeDemoData(uid: string): Promise<void> {
  await commitInBatches(buildSeedWrites(uid, new Date()));
  // Mark as seeded only after every batch committed. If a batch fails, the
  // next call seeds again; deterministic ids make that an overwrite, not a
  // duplicate.
  await setSandboxState(uid, { seeded: true, seededAt: new Date() });
}

/**
 * Seeds the sandbox if it has not been seeded yet.
 * Idempotent: returns `false` (and writes nothing) when already seeded.
 */
export function seedDemoData(uid: string): Promise<boolean> {
  return once(uid, async () => {
    const state = await getSandboxState(uid);
    if (state?.seeded) return false;
    await writeDemoData(uid);
    return true;
  });
}

/** Deletes every document in one sandbox collection, in batches. */
async function clearCollection(
  uid: string,
  name: SandboxCollection,
): Promise<void> {
  const db = requireDb();
  const ref = sandboxCollectionRef(uid, name);
  // Read and delete page by page so large sandboxes never exceed a batch.
  for (;;) {
    const snapshot = await getDocs(query(ref, limit(MAX_BATCH_WRITES)));
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    for (const docSnapshot of snapshot.docs) batch.delete(docSnapshot.ref);
    await batch.commit();
    if (snapshot.size < MAX_BATCH_WRITES) return;
  }
}

/**
 * Deletes everything in the visitor's sandbox (including records they added)
 * and writes a fresh copy of the demo data.
 */
export function resetDemoData(uid: string): Promise<boolean> {
  return once(uid, async () => {
    // Flag first: if the reset is interrupted, the app reseeds on next entry.
    await setSandboxState(uid, { seeded: false, seededAt: null });
    for (const name of SANDBOX_COLLECTIONS) await clearCollection(uid, name);
    await writeDemoData(uid);
    return true;
  });
}

/**
 * Deletes everything in the visitor's sandbox, including `meta/state`.
 * Used when a visitor signs out, so anonymous sandboxes don't pile up.
 */
export function deleteSandbox(uid: string): Promise<boolean> {
  return once(uid, async () => {
    for (const name of SANDBOX_COLLECTIONS) await clearCollection(uid, name);
    await deleteDoc(sandboxStateRef(uid));
    return true;
  });
}
