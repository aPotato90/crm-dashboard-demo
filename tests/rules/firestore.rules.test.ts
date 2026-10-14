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
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

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
