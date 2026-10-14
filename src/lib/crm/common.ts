import { z } from "zod";

import { LIMITS } from "./limits";

/** A Firestore document id that references another document. */
export const idSchema = z.string().min(1).max(LIMITS.idMax);

/** A required, non-blank string of at most `max` characters. */
export function requiredString(max: number) {
  return z
    .string()
    .max(max)
    .refine((value) => value.trim().length > 0, "Required");
}

/** Every stored document is returned with its Firestore id. */
export type WithId<T> = T & { id: string };
