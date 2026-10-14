/**
 * Deterministic generator for the demo sandbox data.
 *
 * Pure TypeScript: no Firebase, no network, no external APIs. The same `seed`
 * and `now` always produce the same data. Every person, company, email and
 * phone number is fictional (`example.com` domains, `555-01xx` numbers).
 */
import type { ActivityData, ActivityType } from "./activity";
import type { WithId } from "./common";
import type { CompanyData, CompanySize } from "./company";
import type { ContactData, ContactSource, ContactStatus } from "./contact";
import { isClosedStage, type DealData, type DealStage } from "./deal";
import { STAGE_DEFAULT_PROBABILITY } from "./labels";
import type { TaskData } from "./task";

export type DemoData = {
  companies: WithId<CompanyData>[];
  contacts: WithId<ContactData>[];
  deals: WithId<DealData>[];
  activities: WithId<ActivityData>[];
  tasks: WithId<TaskData>[];
};

export type GenerateOptions = {
  /** Reference "today". All dates are placed relative to it. */
  now?: Date;
  /** PRNG seed; change it to get a different (but still stable) dataset. */
  seed?: number;
};

export const DEMO_DATA_SEED = 20_240_611;

export const DEMO_COUNTS = {
  companies: 12,
  contacts: 45,
  deals: 30,
  activities: 120,
  tasks: 15,
} as const;

/** How many deals land in each stage (sums to DEMO_COUNTS.deals). */
const DEALS_PER_STAGE: Record<DealStage, number> = {
  new: 4,
  qualified: 5,
  proposal: 5,
  negotiation: 4,
  won: 8,
  lost: 4,
};

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32): small, fast and fully deterministic.
// ---------------------------------------------------------------------------

export function createRng(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  return {
    /** Float in [0, 1). */
    next,
    /** Integer in [min, max], inclusive. */
    int(min: number, max: number) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)];
    },
    chance(probability: number) {
      return next() < probability;
    },
    /** Picks a key using relative weights. */
    weighted<K extends string>(weights: Record<K, number>): K {
      const entries = Object.entries(weights) as [K, number][];
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [key, weight] of entries) {
        roll -= weight;
        if (roll < 0) return key;
      }
      return entries[entries.length - 1][0];
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

type Rng = ReturnType<typeof createRng>;

// ---------------------------------------------------------------------------
// Fictional source material.
// ---------------------------------------------------------------------------

const COMPANY_SEEDS: {
  name: string;
  slug: string;
  industry: string;
  size: CompanySize;
}[] = [
  {
    name: "Bluepine Analytics",
    slug: "bluepine",
    industry: "Data & Analytics",
    size: "51-200",
  },
  {
    name: "Harborlight Logistics",
    slug: "harborlight",
    industry: "Logistics",
    size: "201-500",
  },
  {
    name: "Quillstone Legal Tech",
    slug: "quillstone",
    industry: "Legal Services",
    size: "11-50",
  },
  {
    name: "Meadowlark Health",
    slug: "meadowlark",
    industry: "Healthcare",
    size: "501-1000",
  },
  {
    name: "Ironbark Builders",
    slug: "ironbark",
    industry: "Construction",
    size: "201-500",
  },
  {
    name: "Lumenfold Studio",
    slug: "lumenfold",
    industry: "Media & Design",
    size: "11-50",
  },
  {
    name: "Tidewater Provisions",
    slug: "tidewater",
    industry: "Food & Beverage",
    size: "51-200",
  },
  {
    name: "Saltgrass Energy",
    slug: "saltgrass",
    industry: "Renewable Energy",
    size: "1000+",
  },
  {
    name: "Kestrelwing Finance",
    slug: "kestrelwing",
    industry: "Financial Services",
    size: "51-200",
  },
  {
    name: "Orchid Lane Retail",
    slug: "orchidlane",
    industry: "Retail",
    size: "501-1000",
  },
  {
    name: "Granitepeak Software",
    slug: "granitepeak",
    industry: "Software",
    size: "1-10",
  },
  {
    name: "Willowmere Education",
    slug: "willowmere",
    industry: "Education",
    size: "201-500",
  },
];

const FIRST_NAMES = [
  "Ada",
  "Bram",
  "Celia",
  "Dario",
  "Elin",
  "Farah",
  "Gideon",
  "Hana",
  "Idris",
  "Juno",
  "Kofi",
  "Lena",
  "Mateo",
  "Nia",
  "Oskar",
  "Priya",
  "Quinn",
  "Rosa",
  "Soren",
  "Talia",
  "Umar",
  "Vera",
  "Wren",
  "Xavi",
  "Yara",
  "Zane",
  "Amara",
  "Beck",
  "Cleo",
  "Desmond",
];

const LAST_NAMES = [
  "Ashdown",
  "Brightwater",
  "Calloway",
  "Delacroix",
  "Everhart",
  "Fairbrook",
  "Greystone",
  "Hollins",
  "Ivers",
  "Juniper",
  "Kingsley",
  "Larkspur",
  "Merriweather",
  "Northcott",
  "Oakridge",
  "Pemberton",
  "Quarry",
  "Redfern",
  "Silverton",
  "Thornbury",
  "Underwood",
  "Valemont",
  "Westbrook",
  "Yardley",
];

const JOB_TITLES = [
  "Head of Operations",
  "VP of Sales",
  "Procurement Manager",
  "Chief Technology Officer",
  "IT Director",
  "Marketing Lead",
  "Finance Manager",
  "Customer Success Lead",
  "Founder & CEO",
  "Operations Analyst",
  "Product Manager",
  "Revenue Operations Manager",
];

/** Fictional members of the demo sales team. */
const OWNERS = ["Jordan Ellis", "Priya Raman", "Marcus Lee", "Sofia Duarte"];

const TAGS = [
  "decision-maker",
  "champion",
  "budget-holder",
  "technical",
  "enterprise",
  "smb",
  "renewal",
  "upsell",
  "newsletter",
  "webinar",
];

const DEAL_PRODUCTS: { label: string; min: number; max: number }[] = [
  { label: "Annual platform license", min: 18_000, max: 120_000 },
  { label: "Team expansion", min: 6_000, max: 45_000 },
  { label: "Onboarding & training", min: 4_000, max: 20_000 },
  { label: "Enterprise rollout", min: 80_000, max: 240_000 },
  { label: "Analytics add-on", min: 5_000, max: 30_000 },
  { label: "Multi-year renewal", min: 40_000, max: 180_000 },
  { label: "Pilot program", min: 3_000, max: 12_000 },
  { label: "Premium support plan", min: 8_000, max: 36_000 },
];

const ACTIVITY_TEMPLATES: Record<ActivityType, readonly string[]> = {
  call: [
    "Discovery call with {name}: walked through current tooling and pain points.",
    "Follow-up call with {name} about rollout timeline.",
    "Quick check-in call with {name}; they are reviewing internally.",
    "Pricing call with {name}; asked for a volume discount.",
  ],
  email: [
    "Sent {name} the product overview deck and two case studies.",
    "Emailed {name} a recap of next steps and the proposal draft.",
    "Replied to {name}'s security questionnaire questions.",
    "Shared a calendar link with {name} for a product demo.",
  ],
  meeting: [
    "Product demo for {name} and their team (45 min).",
    "On-site workshop with {name} to map their sales process.",
    "Quarterly business review with {name}.",
    "Contract walkthrough meeting with {name} and their legal team.",
  ],
  note: [
    "{name} prefers async updates over email; avoid Monday calls.",
    "{name} mentioned budget approval happens at the end of the quarter.",
    "{name} is comparing us with two other vendors.",
    "{name} asked for an intro to an existing customer reference.",
  ],
};

const TASK_TEMPLATES = [
  "Send proposal to {name}",
  "Follow up with {name} on pricing",
  "Schedule demo with {name}",
  "Prepare QBR deck for {name}",
  "Confirm contract details with {name}",
  "Call {name} about renewal",
  "Share case study with {name}",
  "Book onboarding kickoff with {name}",
];

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function pad(n: number, width = 3) {
  return String(n).padStart(width, "0");
}

function daysAgo(now: Date, days: number) {
  return new Date(now.getTime() - days * DAY_MS);
}

/** Random moment in [from, to], rounded down to the minute. */
function between(rng: Rng, from: Date, to: Date) {
  const start = from.getTime();
  const end = Math.max(start, to.getTime());
  const time = start + rng.next() * (end - start);
  return new Date(Math.floor(time / 60_000) * 60_000);
}

function roundTo(value: number, step: number) {
  return Math.round(value / step) * step;
}

function maxDate(a: Date, b: Date) {
  return a.getTime() >= b.getTime() ? a : b;
}

function minDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}

// ---------------------------------------------------------------------------
// Generator.
// ---------------------------------------------------------------------------

export function generateDemoData(options: GenerateOptions = {}): DemoData {
  const now = options.now ?? new Date();
  const rng = createRng(options.seed ?? DEMO_DATA_SEED);
  const yearAgo = daysAgo(now, 365);

  // Companies were all created before the 12-month reporting window.
  const companies: WithId<CompanyData>[] = COMPANY_SEEDS.map((seed, i) => ({
    id: `company-${pad(i + 1)}`,
    name: seed.name,
    industry: seed.industry,
    size: seed.size,
    website: `https://${seed.slug}.example.com`,
    createdAt: between(rng, daysAgo(now, 540), daysAgo(now, 370)),
  }));

  // Contacts: unique fictional names, spread across companies.
  const namePairs = rng.shuffle(
    FIRST_NAMES.flatMap((first) => LAST_NAMES.map((last) => [first, last])),
  );
  const companyOrder = rng.shuffle(companies);
  const contacts: WithId<ContactData>[] = Array.from(
    { length: DEMO_COUNTS.contacts },
    (_, i) => {
      const [firstName, lastName] = namePairs[i];
      // Every company gets at least three contacts, the rest are random.
      const company =
        i < companies.length * 3
          ? companyOrder[i % companies.length]
          : rng.pick(companies);
      const slug = COMPANY_SEEDS[companies.indexOf(company)].slug;
      const createdAt = between(rng, yearAgo, daysAgo(now, 20));
      const tagCount = rng.int(0, 3);
      return {
        id: `contact-${pad(i + 1)}`,
        firstName,
        lastName,
        email: `${firstName}.${lastName}@${slug}.example.com`.toLowerCase(),
        // 555-0100 to 555-0199 are reserved for fictional use.
        phone: `+1 555-01${pad(i % 100, 2)}`,
        companyId: company.id,
        jobTitle: rng.pick(JOB_TITLES),
        status: rng.weighted<ContactStatus>({
          lead: 5,
          prospect: 3,
          customer: 0,
          inactive: 1,
        }),
        source: rng.weighted<ContactSource>({
          website: 4,
          referral: 3,
          linkedin: 3,
          event: 2,
          "cold-call": 1,
        }),
        ownerName: rng.pick(OWNERS),
        tags: rng.shuffle(TAGS).slice(0, tagCount).sort(),
        createdAt,
        // Replaced below by the latest activity date.
        lastContactedAt: createdAt,
      };
    },
  );

  // Deals: a fixed number per stage, dates spread over the last 12 months so
  // monthly charts have data in every month.
  const stages = (Object.keys(DEALS_PER_STAGE) as DealStage[]).flatMap(
    (stage) => Array.from({ length: DEALS_PER_STAGE[stage] }, () => stage),
  );
  const contactPool = rng.shuffle(contacts);
  const orderInStage = new Map<DealStage, number>();
  const deals: WithId<DealData>[] = stages.map((stage, i) => {
    const contact = contactPool[i % contactPool.length];
    const company = companies.find((c) => c.id === contact.companyId)!;
    const product = rng.pick(DEAL_PRODUCTS);
    const closed = isClosedStage(stage);
    const stageIndex = orderInStage.get(stage) ?? 0;
    orderInStage.set(stage, stageIndex + 1);

    let createdAt: Date;
    let closedAt: Date | null = null;
    let expectedCloseDate: Date;
    if (closed) {
      // Spread closed deals evenly across the year, oldest first.
      const slot = 365 / DEALS_PER_STAGE[stage];
      const age = 365 - slot * stageIndex - rng.int(0, Math.floor(slot / 2));
      createdAt = between(rng, daysAgo(now, age), daysAgo(now, age - 5));
      closedAt = minDate(
        new Date(createdAt.getTime() + rng.int(14, 75) * DAY_MS),
        daysAgo(now, 1),
      );
      expectedCloseDate = new Date(
        closedAt.getTime() + rng.int(-10, 10) * DAY_MS,
      );
    } else {
      // Open deals are younger; later stages have been around longer.
      const maxAge = { new: 30, qualified: 60, proposal: 90, negotiation: 120 }[
        stage as Exclude<DealStage, "won" | "lost">
      ];
      createdAt = between(rng, daysAgo(now, maxAge), daysAgo(now, 2));
      expectedCloseDate = new Date(now.getTime() + rng.int(7, 90) * DAY_MS);
    }

    // A contact can't have a deal before they were added to the CRM.
    if (contact.createdAt.getTime() > createdAt.getTime()) {
      contact.createdAt = daysAgo(createdAt, rng.int(3, 30));
      contact.lastContactedAt = contact.createdAt;
    }

    const probability = closed
      ? STAGE_DEFAULT_PROBABILITY[stage]
      : Math.min(
          95,
          Math.max(5, STAGE_DEFAULT_PROBABILITY[stage] + rng.int(-5, 5)),
        );

    return {
      id: `deal-${pad(i + 1)}`,
      title: `${company.name} — ${product.label}`,
      contactId: contact.id,
      companyId: company.id,
      value: roundTo(rng.int(product.min, product.max), 500),
      stage,
      probability,
      expectedCloseDate,
      closedAt,
      order: stageIndex * 1000,
      createdAt,
    };
  });

  // Contact status follows their deals: won => customer, open => prospect.
  for (const contact of contacts) {
    const own = deals.filter((d) => d.contactId === contact.id);
    if (own.some((d) => d.stage === "won")) contact.status = "customer";
    else if (own.some((d) => !isClosedStage(d.stage))) {
      contact.status = "prospect";
    }
  }

  // Activities: mostly tied to deals, the rest are general touchpoints.
  const activities: WithId<ActivityData>[] = [];
  for (let i = 0; i < DEMO_COUNTS.activities; i++) {
    const deal = rng.chance(0.65) ? rng.pick(deals) : null;
    const contact = deal
      ? contacts.find((c) => c.id === deal.contactId)!
      : rng.pick(contacts);
    const from = deal ? deal.createdAt : contact.createdAt;
    const to = deal?.closedAt ?? now;
    const type = rng.weighted<ActivityType>({
      email: 4,
      call: 3,
      meeting: 2,
      note: 2,
    });
    const createdAt = between(rng, from, minDate(to, now));
    activities.push({
      id: `activity-${pad(i + 1)}`,
      type,
      contactId: contact.id,
      dealId: deal?.id ?? null,
      summary: rng
        .pick(ACTIVITY_TEMPLATES[type])
        .replace("{name}", contact.firstName),
      createdAt,
    });
    contact.lastContactedAt = maxDate(contact.lastContactedAt, createdAt);
  }
  activities.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  activities.forEach((activity, i) => {
    activity.id = `activity-${pad(i + 1)}`;
  });

  // Tasks: a few overdue, most upcoming, linked to open deals where possible.
  const openDeals = deals.filter((d) => !isClosedStage(d.stage));
  const tasks: WithId<TaskData>[] = Array.from(
    { length: DEMO_COUNTS.tasks },
    (_, i) => {
      const deal =
        i < openDeals.length && rng.chance(0.8) ? openDeals[i] : null;
      const contact = deal
        ? contacts.find((c) => c.id === deal.contactId)!
        : rng.pick(contacts);
      // Due on the hour during (US) business hours, 6 days ago to 3 weeks out.
      const dueDate = new Date(now.getTime() + rng.int(-6, 21) * DAY_MS);
      dueDate.setUTCHours(rng.int(14, 21), 0, 0, 0);
      const overdue = dueDate.getTime() < now.getTime();
      const createdAt = between(
        rng,
        daysAgo(minDate(dueDate, now), 21),
        daysAgo(minDate(dueDate, now), 1),
      );
      return {
        id: `task-${pad(i + 1)}`,
        title: rng
          .pick(TASK_TEMPLATES)
          .replace("{name}", `${contact.firstName} ${contact.lastName}`),
        dueDate,
        done: overdue ? rng.chance(0.6) : rng.chance(0.15),
        contactId: contact.id,
        dealId: deal?.id ?? null,
        createdAt,
      };
    },
  );

  return { companies, contacts, deals, activities, tasks };
}
