import { z } from "zod";

import { idSchema, requiredString } from "./common";
import { LIMITS } from "./limits";

/** Pipeline stages, in board order. */
export const DEAL_STAGES = [
  "new",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export const dealStageSchema = z.enum(DEAL_STAGES);
export type DealStage = z.infer<typeof dealStageSchema>;

/** Stages where the deal is finished and `closedAt` is set. */
export const CLOSED_DEAL_STAGES = [
  "won",
  "lost",
] as const satisfies readonly DealStage[];

export function isClosedStage(stage: DealStage): boolean {
  return (CLOSED_DEAL_STAGES as readonly DealStage[]).includes(stage);
}

/** Field-level shape of a deal (use for partial updates). */
export const dealFieldsSchema = z.strictObject({
  title: requiredString(LIMITS.nameMax),
  contactId: idSchema,
  companyId: idSchema,
  /** Deal value in whole or fractional USD. */
  value: z.number().min(LIMITS.dealValueMin).max(LIMITS.dealValueMax),
  stage: dealStageSchema,
  /** Win probability, 0 to 100 percent. */
  probability: z
    .number()
    .int()
    .min(LIMITS.probabilityMin)
    .max(LIMITS.probabilityMax),
  expectedCloseDate: z.date(),
  closedAt: z.date().nullable(),
  /** Sort key inside a stage column (ascending). */
  order: z.number(),
  createdAt: z.date(),
});

/** Stored at `users/{uid}/deals/{dealId}`. */
export const dealSchema = dealFieldsSchema.refine(
  (deal) => isClosedStage(deal.stage) === (deal.closedAt !== null),
  {
    message: "closedAt must be set exactly when the stage is won or lost",
    path: ["closedAt"],
  },
);

export type DealData = z.infer<typeof dealSchema>;
export type Deal = DealData & { id: string };
