/**
 * Field limits shared by the Zod schemas and mirrored in `firestore.rules`.
 * If you change a value here, update the matching rule.
 */
export const LIMITS = {
  /** Firestore document ids we generate or accept. */
  idMax: 128,
  /** Person and company names, job titles, deal titles, owner names. */
  nameMax: 120,
  /** Task titles. */
  titleMax: 200,
  /** Activity summaries. */
  summaryMax: 1000,
  emailMax: 254,
  phoneMax: 40,
  urlMax: 200,
  industryMax: 60,
  tagMax: 40,
  tagsMaxCount: 20,
  dealValueMin: 0,
  dealValueMax: 100_000_000,
  probabilityMin: 0,
  probabilityMax: 100,
} as const;
