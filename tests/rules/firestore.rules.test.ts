/**
 * Exercises firestore.rules against the local Firestore emulator.
 * Run with `npm run test:rules` (needs Java 21+; no Firebase project or login).
 */
import { readFileSync } from "node:fs";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  planCascadeDelete,
  snapshotCascade,
  type CascadeCollection,
} from "@/lib/crm/cascade";
import { toFirestoreData } from "@/lib/crm/convert";
import { generateDemoData } from "@/lib/crm/seed-generator";

const ALICE = "alice-uid";
const BOB = "bob-uid";
const data = generateDemoData({ now: new Date("2026-06-15T12:00:00Z") });

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-pipelinehq",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

function dbFor(uid: string | null): Firestore {
  const context = uid
    ? env.authenticatedContext(uid)
    : env.unauthenticatedContext();
  return context.firestore() as unknown as Firestore;
}

/** Firestore-shaped copy of a generated document, without its id. */
function stored<T extends { id: string }>(item: T) {
  const { id: _id, ...rest } = item;
  return toFirestoreData(rest);
}

const company = stored(data.companies[0]);
const contact = stored(data.contacts[0]);
const openDeal = stored(data.deals.find((d) => d.closedAt === null)!);
const activity = stored(data.activities[0]);
const task = stored(data.tasks[0]);

async function seedAs(uid: string) {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore() as unknown as Firestore;
    await setDoc(doc(db, `users/${uid}/companies/c1`), company);
    await setDoc(doc(db, `users/${uid}/deals/d1`), openDeal);
  });
}

describe("access control", () => {
  it("denies unauthenticated reads and writes", async () => {
    await seedAs(ALICE);
    const db = dbFor(null);
    await assertFails(getDoc(doc(db, `users/${ALICE}/companies/c1`)));
    await assertFails(getDocs(collection(db, `users/${ALICE}/companies`)));
    await assertFails(setDoc(doc(db, `users/${ALICE}/companies/c2`), company));
  });

  it("lets the owner read their own sandbox", async () => {
    await seedAs(ALICE);
    const db = dbFor(ALICE);
    await assertSucceeds(getDoc(doc(db, `users/${ALICE}/companies/c1`)));
    await assertSucceeds(getDocs(collection(db, `users/${ALICE}/deals`)));
    await assertSucceeds(
      getCountFromServer(collection(db, `users/${ALICE}/deals`)),
    );
  });

  it("denies access to another visitor's sandbox", async () => {
    await seedAs(ALICE);
    const db = dbFor(BOB);
    await assertFails(getDoc(doc(db, `users/${ALICE}/companies/c1`)));
    await assertFails(getDocs(collection(db, `users/${ALICE}/companies`)));
    await assertFails(setDoc(doc(db, `users/${ALICE}/companies/c2`), company));
    await assertFails(deleteDoc(doc(db, `users/${ALICE}/companies/c1`)));
  });

  it("denies paths outside the known sandbox collections", async () => {
    const db = dbFor(ALICE);
    await assertFails(setDoc(doc(db, `users/${ALICE}`), { name: "x" }));
    await assertFails(getDoc(doc(db, `users/${ALICE}`)));
    await assertFails(setDoc(doc(db, `users/${ALICE}/secrets/s1`), { a: 1 }));
    await assertFails(setDoc(doc(db, `companies/c1`), company));
    await assertFails(getDocs(collection(db, "users")));
  });

  it("lets the owner delete their documents", async () => {
    await seedAs(ALICE);
    await assertSucceeds(
      deleteDoc(doc(dbFor(ALICE), `users/${ALICE}/companies/c1`)),
    );
  });
});

describe("seeding", () => {
  it("accepts the full generated dataset as one batched write", async () => {
    const db = dbFor(ALICE);
    const batch = writeBatch(db);
    const all = [
      ["companies", data.companies],
      ["contacts", data.contacts],
      ["deals", data.deals],
      ["activities", data.activities],
      ["tasks", data.tasks],
    ] as const;
    for (const [name, items] of all) {
      for (const item of items) {
        batch.set(doc(db, `users/${ALICE}/${name}/${item.id}`), stored(item));
      }
    }
    await assertSucceeds(batch.commit());
    await assertSucceeds(
      setDoc(doc(db, `users/${ALICE}/meta/state`), {
        seeded: true,
        seededAt: Timestamp.now(),
      }),
    );
  });

  it("only allows the meta/state document", async () => {
    const db = dbFor(ALICE);
    const state = { seeded: true, seededAt: null };
    await assertSucceeds(setDoc(doc(db, `users/${ALICE}/meta/state`), state));
    await assertFails(setDoc(doc(db, `users/${ALICE}/meta/other`), state));
    await assertFails(
      setDoc(doc(db, `users/${ALICE}/meta/state`), { seeded: "yes" }),
    );
  });
});

describe("validation", () => {
  const path = (name: string, id = "x1") => `users/${ALICE}/${name}/${id}`;

  it("accepts one valid document per collection", async () => {
    const db = dbFor(ALICE);
    await assertSucceeds(setDoc(doc(db, path("companies")), company));
    await assertSucceeds(setDoc(doc(db, path("contacts")), contact));
    await assertSucceeds(setDoc(doc(db, path("deals")), openDeal));
    await assertSucceeds(setDoc(doc(db, path("activities")), activity));
    await assertSucceeds(setDoc(doc(db, path("tasks")), task));
  });

  it("rejects unknown and missing fields", async () => {
    const db = dbFor(ALICE);
    await assertFails(
      setDoc(doc(db, path("companies")), { ...company, admin: true }),
    );
    const { website: _website, ...missing } = company;
    await assertFails(setDoc(doc(db, path("companies")), missing));
  });

  it("enforces string types and length limits", async () => {
    const db = dbFor(ALICE);
    await assertFails(
      setDoc(doc(db, path("companies")), { ...company, name: "x".repeat(121) }),
    );
    await assertFails(
      setDoc(doc(db, path("companies")), { ...company, name: " " }),
    );
    await assertFails(
      setDoc(doc(db, path("companies")), { ...company, name: 42 }),
    );
    await assertFails(
      setDoc(doc(db, path("activities")), {
        ...activity,
        summary: "x".repeat(1001),
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, path("activities")), {
        ...activity,
        summary: "x".repeat(1000),
      }),
    );
    await assertFails(
      setDoc(doc(db, path("companies")), {
        ...company,
        website: "javascript:alert(1)",
      }),
    );
  });

  it("enforces enums, emails and tags on contacts", async () => {
    const db = dbFor(ALICE);
    const put = (patch: Record<string, unknown>) =>
      setDoc(doc(db, path("contacts")), { ...contact, ...patch });
    await assertFails(put({ status: "vip" }));
    await assertFails(put({ source: "tv" }));
    await assertFails(put({ email: "not-an-email" }));
    await assertFails(
      put({ tags: Array.from({ length: 21 }, (_, i) => `t${i}`) }),
    );
    await assertFails(put({ tags: ["ok", 7] }));
    await assertFails(put({ tags: ["x".repeat(41)] }));
    await assertSucceeds(
      put({ tags: Array.from({ length: 20 }, (_, i) => `t${i}`) }),
    );
    await assertFails(put({ createdAt: "2026-01-01" }));
  });

  it("caps deal values and probabilities", async () => {
    const db = dbFor(ALICE);
    const put = (patch: Record<string, unknown>) =>
      setDoc(doc(db, path("deals")), { ...openDeal, ...patch });
    await assertSucceeds(put({ value: 0 }));
    await assertSucceeds(put({ value: 100_000_000 }));
    await assertFails(put({ value: 100_000_001 }));
    await assertFails(put({ value: -1 }));
    await assertFails(put({ value: "1000" }));
    await assertFails(put({ probability: 101 }));
    await assertFails(put({ probability: 50.5 }));
    await assertFails(put({ stage: "archived" }));
  });

  it("requires closedAt exactly when a deal is won or lost", async () => {
    const db = dbFor(ALICE);
    const ref = doc(db, path("deals"));
    await assertSucceeds(setDoc(ref, openDeal));
    // Partial updates are validated against the merged document.
    await assertFails(updateDoc(ref, { stage: "won" }));
    await assertSucceeds(
      updateDoc(ref, {
        stage: "won",
        probability: 100,
        closedAt: Timestamp.now(),
      }),
    );
    await assertFails(updateDoc(ref, { stage: "proposal" }));
    await assertSucceeds(updateDoc(ref, { stage: "proposal", closedAt: null }));
    await assertSucceeds(updateDoc(ref, { order: 1500 }));
    await assertFails(updateDoc(ref, { extra: "field" }));
  });

  it("validates tasks", async () => {
    const db = dbFor(ALICE);
    const put = (patch: Record<string, unknown>) =>
      setDoc(doc(db, path("tasks")), { ...task, ...patch });
    await assertFails(put({ done: "yes" }));
    await assertFails(put({ title: "x".repeat(201) }));
    await assertSucceeds(put({ contactId: null, dealId: null }));
  });
});

describe("pipeline and dashboard write patterns", () => {
  const dealPath = (id: string) => `users/${ALICE}/deals/${id}`;

  async function seedDeals(db: Firestore) {
    const open = data.deals.filter((d) => d.closedAt === null).slice(0, 3);
    const won = data.deals.find((d) => d.stage === "won")!;
    for (const item of [...open, won]) {
      await setDoc(doc(db, dealPath(item.id)), stored(item));
    }
    return { open, won };
  }

  it("accepts a batched reorder that only touches `order`", async () => {
    const db = dbFor(ALICE);
    const { open } = await seedDeals(db);
    const batch = writeBatch(db);
    open.forEach((item, i) =>
      batch.update(doc(db, dealPath(item.id)), { order: i * 1000 }),
    );
    await assertSucceeds(batch.commit());
  });

  it("accepts a batched cross-stage move into Won with closedAt", async () => {
    const db = dbFor(ALICE);
    const { open, won } = await seedDeals(db);
    const batch = writeBatch(db);
    batch.update(doc(db, dealPath(open[0].id)), {
      stage: "won",
      probability: 100,
      closedAt: Timestamp.now(),
      order: 0,
    });
    batch.update(doc(db, dealPath(won.id)), { order: 1000 });
    await assertSucceeds(batch.commit());
  });

  it("rejects the whole batch if one card moves to Won without closedAt", async () => {
    const db = dbFor(ALICE);
    const { open } = await seedDeals(db);
    const batch = writeBatch(db);
    batch.update(doc(db, dealPath(open[0].id)), { order: 5000 });
    batch.update(doc(db, dealPath(open[1].id)), { stage: "lost", order: 0 });
    await assertFails(batch.commit());
  });

  it("accepts moving a closed deal back to an open stage with closedAt cleared", async () => {
    const db = dbFor(ALICE);
    const { won } = await seedDeals(db);
    await assertFails(
      updateDoc(doc(db, dealPath(won.id)), {
        stage: "proposal",
        probability: 50,
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, dealPath(won.id)), {
        stage: "proposal",
        probability: 50,
        closedAt: null,
      }),
    );
  });

  it("accepts creating a deal with an auto id and deleting it", async () => {
    const db = dbFor(ALICE);
    const ref = doc(collection(db, `users/${ALICE}/deals`));
    await assertSucceeds(
      setDoc(ref, {
        ...openDeal,
        title: "New deal from the dialog",
        order: -1000,
      }),
    );
    await assertSucceeds(deleteDoc(ref));
  });

  it("accepts ticking a task done and undone, nothing else", async () => {
    const db = dbFor(ALICE);
    const ref = doc(db, `users/${ALICE}/tasks/t1`);
    await setDoc(ref, task);
    await assertSucceeds(updateDoc(ref, { done: true }));
    await assertSucceeds(updateDoc(ref, { done: false }));
    await assertFails(updateDoc(ref, { done: 1 }));
    await assertFails(updateDoc(ref, { priority: "high" }));
  });

  it("lets the owner delete the whole sandbox, including meta/state", async () => {
    const db = dbFor(ALICE);
    await seedDeals(db);
    await setDoc(doc(db, `users/${ALICE}/meta/state`), {
      seeded: true,
      seededAt: Timestamp.now(),
    });
    const deals = await getDocs(collection(db, `users/${ALICE}/deals`));
    const batch = writeBatch(db);
    deals.forEach((snapshot) => batch.delete(snapshot.ref));
    await assertSucceeds(batch.commit());
    await assertSucceeds(deleteDoc(doc(db, `users/${ALICE}/meta/state`)));
    await assertFails(deleteDoc(doc(dbFor(BOB), `users/${ALICE}/meta/state`)));
  });
});

describe("contacts, companies and activity write patterns", () => {
  const path = (collection: string, id: string) =>
    `users/${ALICE}/${collection}/${id}`;

  /** Writes the whole generated dataset as the owner (one batch). */
  async function seedAll(db: Firestore) {
    const batch = writeBatch(db);
    for (const [name, items] of Object.entries(data) as [
      CascadeCollection,
      { id: string }[],
    ][]) {
      for (const item of items)
        batch.set(doc(db, path(name, item.id)), stored(item));
    }
    await batch.commit();
  }

  it("logs an activity and updates lastContactedAt in one batch", async () => {
    const db = dbFor(ALICE);
    await seedAll(db);
    const target = data.contacts[0];
    const now = Timestamp.now();
    const batch = writeBatch(db);
    batch.set(doc(collection(db, `users/${ALICE}/activities`)), {
      type: "meeting",
      contactId: target.id,
      dealId: null,
      summary: "Logged from the contact page.",
      createdAt: now,
    });
    batch.update(doc(db, path("contacts", target.id)), {
      lastContactedAt: now,
    });
    await assertSucceeds(batch.commit());
    // A bad lastContactedAt type fails the whole batch.
    const bad = writeBatch(db);
    bad.set(doc(collection(db, `users/${ALICE}/activities`)), {
      type: "note",
      contactId: target.id,
      dealId: null,
      summary: "x",
      createdAt: now,
    });
    bad.update(doc(db, path("contacts", target.id)), {
      lastContactedAt: "today",
    });
    await assertFails(bad.commit());
  });

  it("applies a company cascade delete (unlinks then deletes) and restores it", async () => {
    const db = dbFor(ALICE);
    await seedAll(db);
    const plan = planCascadeDelete(
      { kind: "company", id: data.companies[0].id },
      data,
    );
    expect(plan.deletes.length).toBeGreaterThan(plan.counts.contacts);

    // Split into small batches to exercise multi-batch commits.
    const writes = [
      ...plan.unlinks.map(
        ({ collection: c, id }) =>
          (b: ReturnType<typeof writeBatch>) =>
            b.update(doc(db, path(c, id)), { dealId: null }),
      ),
      ...plan.deletes.map(
        ({ collection: c, id }) =>
          (b: ReturnType<typeof writeBatch>) =>
            b.delete(doc(db, path(c, id))),
      ),
    ];
    for (let i = 0; i < writes.length; i += 7) {
      const batch = writeBatch(db);
      writes.slice(i, i + 7).forEach((write) => write(batch));
      await assertSucceeds(batch.commit());
    }
    const left = await getDocs(collection(db, `users/${ALICE}/contacts`));
    expect(left.size).toBe(data.contacts.length - plan.counts.contacts);

    // Undo: recreate every document and restore the deal links.
    const snapshot = snapshotCascade(plan, data);
    const restore = writeBatch(db);
    for (const { collection: c, doc: item } of snapshot.documents) {
      restore.set(doc(db, path(c, item.id)), stored(item));
    }
    for (const { collection: c, id, dealId } of snapshot.unlinks) {
      restore.update(doc(db, path(c, id)), { dealId });
    }
    await assertSucceeds(restore.commit());
    const after = await getDocs(collection(db, `users/${ALICE}/contacts`));
    expect(after.size).toBe(data.contacts.length);
  });

  it("rejects a cascade into another visitor's sandbox", async () => {
    await seedAll(dbFor(ALICE));
    const bob = dbFor(BOB);
    const batch = writeBatch(bob);
    batch.delete(doc(bob, path("contacts", data.contacts[0].id)));
    await assertFails(batch.commit());
  });

  it("accepts valid contact edits and rejects invalid ones", async () => {
    const db = dbFor(ALICE);
    const ref = doc(db, path("contacts", "x1"));
    await setDoc(ref, contact);
    await assertSucceeds(
      updateDoc(ref, {
        firstName: "Ada",
        jobTitle: "Head of Data",
        status: "customer",
        tags: ["champion", "renewal"],
      }),
    );
    await assertFails(updateDoc(ref, { email: "nope" }));
    await assertFails(updateDoc(ref, { firstName: "" }));
    await assertFails(updateDoc(ref, { companyId: null }));
  });

  it("accepts valid company edits and rejects invalid ones", async () => {
    const db = dbFor(ALICE);
    const ref = doc(db, path("companies", "x1"));
    await setDoc(ref, company);
    await assertSucceeds(
      updateDoc(ref, { name: "Renamed Co", size: "51-200", website: "" }),
    );
    await assertFails(updateDoc(ref, { size: "huge" }));
    await assertFails(updateDoc(ref, { website: "ftp://files.example.com" }));
    await assertFails(updateDoc(ref, { name: "x".repeat(121) }));
  });
});
