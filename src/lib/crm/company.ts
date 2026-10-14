import { z } from "zod";

import { requiredString } from "./common";
import { LIMITS } from "./limits";

export const COMPANY_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
] as const;

export const companySizeSchema = z.enum(COMPANY_SIZES);
export type CompanySize = z.infer<typeof companySizeSchema>;

/** Stored at `users/{uid}/companies/{companyId}`. */
export const companySchema = z.strictObject({
  name: requiredString(LIMITS.nameMax),
  industry: requiredString(LIMITS.industryMax),
  size: companySizeSchema,
  website: z
    .url({ protocol: /^https?$/ })
    .max(LIMITS.urlMax)
    .or(z.literal("")),
  createdAt: z.date(),
});

export type CompanyData = z.infer<typeof companySchema>;
export type Company = CompanyData & { id: string };
