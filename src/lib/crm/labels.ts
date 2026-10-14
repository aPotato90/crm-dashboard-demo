import type { ActivityType } from "./activity";
import type { ContactSource, ContactStatus } from "./contact";
import type { DealStage } from "./deal";

export const STAGE_LABELS: Record<DealStage, string> = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const SOURCE_LABELS: Record<ContactSource, string> = {
  website: "Website",
  referral: "Referral",
  linkedin: "LinkedIn",
  event: "Event",
  "cold-call": "Cold call",
};

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  lead: "Lead",
  prospect: "Prospect",
  customer: "Customer",
  inactive: "Inactive",
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
};

/** Default win probability (percent) when a deal enters a stage. */
export const STAGE_DEFAULT_PROBABILITY: Record<DealStage, number> = {
  new: 10,
  qualified: 25,
  proposal: 50,
  negotiation: 75,
  won: 100,
  lost: 0,
};
