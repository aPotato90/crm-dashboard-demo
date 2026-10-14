/**
 * Typed access to a visitor's private sandbox in Firestore.
 *
 * Every document lives under `users/{uid}/...`. Components use these helpers
 * and never build Firestore paths themselves. Dates are stored as Firestore
 * Timestamps and returned as JavaScript `Date`s. Every document read is
 * validated against its Zod schema, and every write is validated before it is
 * sent (the security rules validate again on the server).
 */
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type Unsubscribe,
} from "firebase/firestore";
import type { z } from "zod";

import { requireDb } from "@/lib/firebase/client";

import { activitySchema, type ActivityData } from "./activity";
import type { WithId } from "./common";
import { createConverter, toFirestoreData } from "./convert";
import { companySchema, type CompanyData } from "./company";
import { contactSchema, type ContactData } from "./contact";
import { dealFieldsSchema, dealSchema, type DealData } from "./deal";
import { sandboxStateSchema, type SandboxState } from "./meta";
import { taskSchema, type TaskData } from "./task";

/** Sandbox collections, in the order they are seeded and cleared. */
export const SANDBOX_COLLECTIONS = [
  "companies",
  "contacts",
  "deals",
  "activities",
  "tasks",
] as const;

export type SandboxCollection = (typeof SANDBOX_COLLECTIONS)[number];

// ---------------------------------------------------------------------------
// Generic per-collection repository.
// ---------------------------------------------------------------------------

export type SubscribeOptions = {
  /** Only the newest `limit` documents. */
  limit?: number;
};

/** Firestore allows at most 500 writes per batch. */
export const MAX_WRITES_PER_BATCH = 500;

export type EntityRepo<T extends Record<string, unknown>> = {
  /** Typed collection reference for `users/{uid}/{name}`. */
  collectionRef(uid: string): CollectionReference<WithId<T>, DocumentData>;
  /** Typed document reference for `users/{uid}/{name}/{id}`. */
  docRef(uid: string, id: string): DocumentReference<WithId<T>, DocumentData>;
  /** All documents, newest first. */
  list(uid: string): Promise<WithId<T>[]>;
  get(uid: string, id: string): Promise<WithId<T> | null>;
  /** Validates and creates a document with a generated id; returns the id. */
  create(uid: string, data: T): Promise<string>;
  /** Validates and creates or replaces the document with the given id. */
  set(uid: string, id: string, data: T): Promise<void>;
  /** Validates and applies a partial update. */
  update(uid: string, id: string, patch: Partial<T>): Promise<void>;
  remove(uid: string, id: string): Promise<void>;
  count(uid: string): Promise<number>;
  /**
   * Validates and applies several partial updates in one batched write
   * (split into batches of 500 if needed).
   */
  updateMany(
    uid: string,
    updates: { id: string; patch: Partial<T> }[],
  ): Promise<void>;
  /** Live list, newest first. Returns the unsubscribe function. */
  subscribe(
    uid: string,
    onData: (items: WithId<T>[]) => void,
    onError?: (error: Error) => void,
    options?: SubscribeOptions,
  ): Unsubscribe;
};

function createEntityRepo<T extends Record<string, unknown>>(
  name: SandboxCollection,
  schema: z.ZodType<T>,
  patchSchema: z.ZodType<Partial<T>>,
): EntityRepo<T> {
  const converter = createConverter(schema);

  const collectionRef = (uid: string) =>
    collection(requireDb(), "users", uid, name).withConverter(converter);
  const docRef = (uid: string, id: string) =>
    doc(requireDb(), "users", uid, name, id).withConverter(converter);
  const newestFirst = (uid: string) =>
    query(collectionRef(uid), orderBy("createdAt", "desc"));

  return {
    collectionRef,
    docRef,
    async list(uid) {
      const snapshot = await getDocs(newestFirst(uid));
      return snapshot.docs.map((d) => d.data());
    },
    async get(uid, id) {
      const snapshot = await getDoc(docRef(uid, id));
      return snapshot.exists() ? snapshot.data() : null;
    },
    async create(uid, data) {
      const ref = doc(collectionRef(uid));
      await setDoc(ref, { ...schema.parse(data), id: ref.id });
      return ref.id;
    },
    async set(uid, id, data) {
      await setDoc(docRef(uid, id), { ...schema.parse(data), id });
    },
    async update(uid, id, patch) {
      const data = toFirestoreData(patchSchema.parse(patch));
      // Untyped ref: the converter only applies to full documents.
      await updateDoc(doc(requireDb(), "users", uid, name, id), data);
    },
    async remove(uid, id) {
      await deleteDoc(docRef(uid, id));
    },
    async count(uid) {
      const snapshot = await getCountFromServer(collectionRef(uid));
      return snapshot.data().count;
    },
    async updateMany(uid, updates) {
      const db = requireDb();
      const parsed = updates.map(({ id, patch }) => ({
        ref: doc(db, "users", uid, name, id),
        data: toFirestoreData(patchSchema.parse(patch)),
      }));
      for (let i = 0; i < parsed.length; i += MAX_WRITES_PER_BATCH) {
        const batch = writeBatch(db);
        for (const { ref, data } of parsed.slice(i, i + MAX_WRITES_PER_BATCH)) {
          batch.update(ref, data);
        }
        await batch.commit();
      }
    },
    subscribe(uid, onData, onError, options) {
      const base = newestFirst(uid);
      const q = options?.limit ? query(base, limit(options.limit)) : base;
      return onSnapshot(
        q,
        (snapshot) => {
          // Converters validate every document; report bad data as an error
          // instead of throwing inside the listener.
          let items: WithId<T>[];
          try {
            items = snapshot.docs.map((d) => d.data());
          } catch (error) {
            onError?.(
              error instanceof Error ? error : new Error(String(error)),
            );
            return;
          }
          onData(items);
        },
        (error) => onError?.(error),
      );
    },
  };
}

export const companiesRepo = createEntityRepo<CompanyData>(
  "companies",
  companySchema,
  companySchema.partial(),
);

export const contactsRepo = createEntityRepo<ContactData>(
  "contacts",
  contactSchema,
  contactSchema.partial(),
);

/**
 * Deals. When a partial update changes `stage` to or from won/lost, include
 * `closedAt` in the same update (the security rules enforce this).
 */
export const dealsRepo = createEntityRepo<DealData>(
  "deals",
  dealSchema,
  dealFieldsSchema.partial(),
);

export const activitiesRepo = createEntityRepo<ActivityData>(
  "activities",
  activitySchema,
  activitySchema.partial(),
);

export const tasksRepo = createEntityRepo<TaskData>(
  "tasks",
  taskSchema,
  taskSchema.partial(),
);

/** Untyped collection reference, for bulk maintenance in `seed.ts` only. */
export function sandboxCollectionRef(uid: string, name: SandboxCollection) {
  return collection(requireDb(), "users", uid, name);
}

// ---------------------------------------------------------------------------
// Sandbox metadata: users/{uid}/meta/state
// ---------------------------------------------------------------------------

const sandboxStateConverter = createConverter(sandboxStateSchema);

export function sandboxStateRef(uid: string) {
  return doc(requireDb(), "users", uid, "meta", "state").withConverter(
    sandboxStateConverter,
  );
}

/** Reads the sandbox state, or `null` if the visitor has never been seeded. */
export async function getSandboxState(
  uid: string,
): Promise<SandboxState | null> {
  const snapshot = await getDoc(sandboxStateRef(uid));
  if (!snapshot.exists()) return null;
  const { id: _id, ...state } = snapshot.data();
  return state;
}

export async function setSandboxState(
  uid: string,
  state: SandboxState,
): Promise<void> {
  await setDoc(sandboxStateRef(uid), {
    ...sandboxStateSchema.parse(state),
    id: "state",
  });
}
