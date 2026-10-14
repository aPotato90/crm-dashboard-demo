import type { ContactStatus, DealStage } from "@/lib/crm";
import { CONTACT_STATUS_LABELS, STAGE_LABELS } from "@/lib/crm/labels";
import { cn } from "@/lib/utils";

const base =
  "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap";

// Every badge shows its label as text, so colour is never the only cue.
const STATUS_STYLES: Record<ContactStatus, string> = {
  lead: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  prospect: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  customer:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  inactive: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: ContactStatus }) {
  return (
    <span className={cn(base, STATUS_STYLES[status])}>
      {CONTACT_STATUS_LABELS[status]}
    </span>
  );
}

const STAGE_STYLES: Record<DealStage, string> = {
  new: "bg-muted text-foreground",
  qualified: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  proposal:
    "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  negotiation:
    "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  won: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  lost: "bg-muted text-muted-foreground",
};

export function StageBadge({ stage }: { stage: DealStage }) {
  return (
    <span className={cn(base, STAGE_STYLES[stage])}>{STAGE_LABELS[stage]}</span>
  );
}

/** Avatar with initials (decorative; the name is always shown next to it). */
export function InitialsAvatar({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className,
      )}
    >
      {text}
    </span>
  );
}
