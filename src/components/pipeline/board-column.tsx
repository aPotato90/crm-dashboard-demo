"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useId } from "react";

import type { DealStage } from "@/lib/crm";
import { formatCurrency, formatCurrencyCompact } from "@/lib/crm/format";
import { STAGE_LABELS } from "@/lib/crm/labels";
import { cn } from "@/lib/utils";

import { SortableDealCard, type BoardCard } from "./deal-card";

export const columnId = (stage: DealStage) => `column:${stage}`;

const STAGE_ACCENT: Record<DealStage, string> = {
  new: "bg-chart-ordinal-1",
  qualified: "bg-chart-ordinal-2",
  proposal: "bg-chart-ordinal-3",
  negotiation: "bg-chart-ordinal-4",
  won: "bg-emerald-600",
  lost: "bg-muted-foreground",
};

export function BoardColumn({
  stage,
  deals,
  now,
  onOpen,
  isDropTarget,
}: {
  stage: DealStage;
  deals: BoardCard[];
  now: Date;
  onOpen: (deal: BoardCard) => void;
  isDropTarget: boolean;
}) {
  const headingId = useId();
  const { setNodeRef } = useDroppable({ id: columnId(stage), data: { stage } });
  const total = deals.reduce((sum, deal) => sum + deal.value, 0);
  const label = STAGE_LABELS[stage];

  return (
    <section
      aria-labelledby={headingId}
      className="relative flex w-[17.5rem] shrink-0 snap-start flex-col rounded-xl bg-muted/50 sm:w-72"
    >
      <header className="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="flex items-center gap-2 text-sm font-semibold"
          >
            <span
              aria-hidden
              className={cn("size-2 rounded-full", STAGE_ACCENT[stage])}
            />
            {label}
            <span className="rounded-full bg-background px-1.5 text-xs font-medium text-muted-foreground tabular-nums">
              <span className="sr-only">, </span>
              {deals.length}
              <span className="sr-only">
                {" "}
                {deals.length === 1 ? "deal" : "deals"}
              </span>
            </span>
          </h2>
        </div>
        <p className="text-xs font-medium text-muted-foreground tabular-nums">
          <span aria-hidden>{formatCurrencyCompact(total)}</span>
          <span className="sr-only">Total {formatCurrency(total)}</span>
        </p>
      </header>
      <SortableContext
        id={columnId(stage)}
        items={deals.map((d) => d.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setNodeRef}
          aria-labelledby={headingId}
          className={cn(
            "flex min-h-28 flex-1 flex-col gap-2 rounded-b-xl p-2 transition-colors",
            isDropTarget && "bg-primary/5 ring-2 ring-primary/30 ring-inset",
          )}
        >
          {deals.map((deal) => (
            <SortableDealCard
              key={deal.id}
              deal={deal}
              now={now}
              onOpen={onOpen}
            />
          ))}
          {deals.length === 0 && (
            <li className="flex flex-1 items-center justify-center rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              No deals. Drop one here.
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}
