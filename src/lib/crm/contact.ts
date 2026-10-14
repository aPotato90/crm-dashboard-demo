import { z } from "zod";

import { idSchema, requiredString } from "./common";
import { LIMITS } from "./limits";

export const CONTACT_STATUSES = [
  "lead",
  "prospect",
  "customer",
  "inactive",
] as const;

export const CONTACT_SOURCES = [
  "website",
  "referral",
  "linkedin",
  "event",
  "cold-call",
] as const;

export const contactStatusSchema = z.enum(CONTACT_STATUSES);
export type ContactStatus = z.infer<typeof contactStatusSchema>;

export const contactSourceSchema = z.enum(CONTACT_SOURCES);
export type ContactSource = z.infer<typeof contactSourceSchema>;

/** Stored at `users/{uid}/contacts/{contactId}`. */
export const contactSchema = z.strictObject({
  firstName: requiredString(LIMITS.nameMax),
  lastName: requiredString(LIMITS.nameMax),
  email: z.email().max(LIMITS.emailMax),
  phone: z.string().max(LIMITS.phoneMax),
  companyId: idSchema,
  jobTitle: z.string().max(LIMITS.nameMax),
  status: contactStatusSchema,
  source: contactSourceSchema,
  ownerName: requiredString(LIMITS.nameMax),
  tags: z.array(requiredString(LIMITS.tagMax)).max(LIMITS.tagsMaxCount),
  createdAt: z.date(),
  lastContactedAt: z.date(),
});

export type ContactData = z.infer<typeof contactSchema>;
export type Contact = ContactData & { id: string };
