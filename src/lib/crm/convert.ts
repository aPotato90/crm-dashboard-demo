/**
 * Firestore <-> app model conversion. No Firebase app or client state here,
 * so tests (and the security-rules tests) can import it directly.
 */
import {
  Timestamp,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type { z } from "zod";

import type { WithId } from "./common";

// Date <-> Timestamp conversion covers top-level fields only; our models are
// flat.

/** Converts `Date` fields to Firestore `Timestamp`s for writing. */
export function toFirestoreData(data: Record<string, unknown>): DocumentData {
  const out: DocumentData = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = value instanceof Date ? Timestamp.fromDate(value) : value;
  }
  return out;
}

/** Converts Firestore `Timestamp` fields back to `Date`s after reading. */
export function fromFirestoreData(data: DocumentData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = value instanceof Timestamp ? value.toDate() : value;
  }
  return out;
}

/**
 * Builds a converter that strips/attaches the document id, converts dates and
 * validates documents with `schema` when they are read.
 */
export function createConverter<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
): FirestoreDataConverter<WithId<T>, DocumentData> {
  return {
    toFirestore(model) {
      // The id is the document key, not a stored field.
      const { id: _id, ...data } = model as Record<string, unknown>;
      return toFirestoreData(data);
    },
    fromFirestore(snapshot: QueryDocumentSnapshot) {
      const parsed = schema.safeParse(fromFirestoreData(snapshot.data()));
      if (!parsed.success) {
        throw new Error(
          `Invalid document at ${snapshot.ref.path}: ${parsed.error.message}`,
        );
      }
      return { ...parsed.data, id: snapshot.id };
    },
  };
}
