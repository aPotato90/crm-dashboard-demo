import { z } from "zod";

import { idSchema, requiredString } from "./common";
import { LIMITS } from "./limits";

export const ACTIVITY_TYPES = ["call", "email", "meeting", "note"] as const;

export const activityTypeSchema = z.enum(ACTIVITY_TYPES);
export type ActivityType = z.infer<typeof activityTypeSchema>;

/** Stored at `users/{uid}/activities/{activityId}`. */
export const activitySchema = z.strictObject({
  type: activityTypeSchema,
  contactId: idSchema,
  dealId: idSchema.nullable(),
  summary: requiredString(LIMITS.summaryMax),
  createdAt: z.date(),
});

export type ActivityData = z.infer<typeof activitySchema>;
export type Activity = ActivityData & { id: string };
