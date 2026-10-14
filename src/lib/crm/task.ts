import { z } from "zod";

import { idSchema, requiredString } from "./common";
import { LIMITS } from "./limits";

/** Stored at `users/{uid}/tasks/{taskId}`. */
export const taskSchema = z.strictObject({
  title: requiredString(LIMITS.titleMax),
  dueDate: z.date(),
  done: z.boolean(),
  contactId: idSchema.nullable(),
  dealId: idSchema.nullable(),
  createdAt: z.date(),
});

export type TaskData = z.infer<typeof taskSchema>;
export type Task = TaskData & { id: string };
