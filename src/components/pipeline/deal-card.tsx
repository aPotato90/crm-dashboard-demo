"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format } from "date-fns";
import { CalendarIcon, CircleAlertIcon, GripVerticalIcon } from "lucide-react";

import type { DealData, WithId } from "@/lib/crm";
import { isClosedStage } from "@/lib/crm/deal";
import { formatCurrency } from "@/lib/crm/format";
import { isDealOverdue } from "@/lib/crm/pipeline";
import { cn } from "@/lib/utils";

export type BoardCard = WithId<DealData> & {
  companyName: string;
  contactName: string;
};

/** The visible card body, shared by the sortable card and the drag overlay. */
function CardBody({
  deal,
  now,
  handle,
  title,
}: {
  deal: BoardCard;
  now: Date;
  handle: React.ReactNode;
  title: React.ReactNode;
}) {
  const overdue = isDealOverdue(deal, now);
  const closed = isClosedStage(deal.stage);
  return (
    <div className="flex gap-1.5 p-3 pl-1.5">
      {handle}
      <div className="min-w-0 flex-1">
        {title}
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {deal.companyName} · {deal.contactName}
        </p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">
            {formatCurrency(deal.value)}
          </span>
          <span
            className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
            title="Win probability"
          >
            <span className="sr-only">Win probability </span>
            {deal.probability}%
          </span>
        </div>
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1 text-xs",
            overdue
              ? "font-medium text-red-700 dark:text-red-400"
              : "text-muted-foreground",
          )}
        >
          {overdue ? (
            <CircleAlertIcon aria-hidden className="size-3.5 shrink-0" />
          ) : (
            <CalendarIcon aria-hidden className="size-3.5 shrink-0" />
          )}
          {closed && deal.closedAt ? (
            <span>
              Closed{" "}
              <time dateTime={deal.closedAt.toISOString()}>
                {format(deal.closedAt, "d MMM yyyy")}
              </time>
            </span>
          ) : (
            <span>
              {overdue ? "Overdue · expected " : "Expected "}
              <time dateTime={deal.expectedCloseDate.toISOString()}>
                {format(deal.expectedCloseDate, "d MMM yyyy")}
              </time>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

const cardClass =
  "relative rounded-lg border bg-card text-card-foreground shadow-xs transition-shadow hover:shadow-sm";

/**
 * A draggable deal. Mouse and touch drags start anywhere on the card; the
 * keyboard drag starts from the grip button (Space or Enter). Clicking the
 * title, which covers the card, opens the deal for editing.
 */
export function SortableDealCard({
  deal,
  now,
  onOpen,
}: {
  deal: BoardCard;
  now: Date;
  onOpen: (deal: BoardCard) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id, data: { stage: deal.stage } });
  // Pointer listeners on the card, the keyboard listener on the handle only,
  // so Enter on the title opens the deal instead of starting a drag.
  const { onKeyDown, ...pointerListeners } = (listeners ?? {}) as Record<
    string,
    (event: React.SyntheticEvent) => void
  >;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        cardClass,
        "touch-manipulation select-none",
        isDragging && "opacity-40",
      )}
      {...pointerListeners}
    >
      <CardBody
        deal={deal}
        now={now}
        handle={
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            onKeyDown={onKeyDown}
            aria-label={`Move deal: ${deal.title}`}
            className="relative z-10 -my-1 flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
          >
            <GripVerticalIcon aria-hidden className="size-4" />
          </button>
        }
        title={
          <button
            type="button"
            onClick={() => onOpen(deal)}
            className="line-clamp-2 block w-full rounded-sm text-left text-sm font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {deal.title}
          </button>
        }
      />
    </li>
  );
}

/** Static copy of a card that follows the pointer while dragging. */
export function DealCardOverlay({ deal, now }: { deal: BoardCard; now: Date }) {
  return (
    <div
      className={cn(
        cardClass,
        "w-72 cursor-grabbing shadow-lg ring-2 ring-primary/40",
      )}
    >
      <CardBody
        deal={deal}
        now={now}
        handle={
          <span className="flex h-8 w-6 shrink-0 items-center justify-center text-muted-foreground">
            <GripVerticalIcon aria-hidden className="size-4" />
          </span>
        }
        title={<p className="line-clamp-2 text-sm font-medium">{deal.title}</p>}
      />
    </div>
  );
}
