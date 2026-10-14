import { z } from "zod";

/** Stored at `users/{uid}/meta/state`. Tracks whether the sandbox is seeded. */
export const sandboxStateSchema = z.strictObject({
  seeded: z.boolean(),
  seededAt: z.date().nullable(),
});

export type SandboxState = z.infer<typeof sandboxStateSchema>;
