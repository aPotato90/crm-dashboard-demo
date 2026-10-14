/**
 * Pure pipeline-board logic: grouping deals into columns and planning the
 * Firestore updates for a drag-and-drop move. No Firebase or React here.
 */
import { startOfDay } from "date-fns";

import type { WithId } from "./common";
import {
  DEAL_STAGES,
  isClosedStage,
  type DealData,
  type DealStage,
} from "./deal";
import { STAGE_DEFAULT_PROBABILITY } from "./labels";

/** Gap between consecutive `order` values inside a column. */
export const ORDER_STEP = 1000;

export type BoardDeal = Pick<
  WithId<DealData>,
  "id" | "stage" | "order" | "closedAt" | "probability" | "createdAt"
>;

export type DealPatch = Partial<
  Pick<DealData, "stage" | "order" | "closedAt" | "probability">
>;

export type DealUpdate = { id: string; patch: DealPatch };

export type Columns<T> = Record<DealStage, T[]>;

/** Column order: `order` ascending, then oldest first, then id. */
export function compareByOrder(a: BoardDeal, b: BoardDeal): number {
  return (
    a.order - b.order ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    a.id.localeCompare(b.id)
  );
}

/** Deals grouped by stage, each column sorted for display. */
export function groupByStage<T extends BoardDeal>(deals: T[]): Columns<T> {
  const columns = Object.fromEntries(
    DEAL_STAGES.map((stage) => [stage, [] as T[]]),
  ) as Columns<T>;
  for (const deal of deals) columns[deal.stage].push(deal);
  for (const stage of DEAL_STAGES) columns[stage].sort(compareByOrder);
  return columns;
}

/**
 * Stage-change side effects for a deal moving to `to`:
 * - probability follows the new stage's default (editable afterwards);
 * - into won/lost: closedAt = now;
 * - out of won/lost: closedAt cleared.
 */
export function stageChangePatch(
  deal: Pick<BoardDeal, "stage" | "closedAt">,
  to: DealStage,
  now: Date,
): DealPatch {
  if (deal.stage === to) return {};
  const patch: DealPatch = {
    stage: to,
    probability: STAGE_DEFAULT_PROBABILITY[to],
  };
  if (isClosedStage(to)) patch.closedAt = now;
  else if (deal.closedAt !== null) patch.closedAt = null;
  return patch;
}

/**
 * Plans the writes for moving `dealId` to position `toIndex` of `toStage`.
 * The target column is renumbered (0, 1000, 2000, ...) and only cards whose
 * stage or order actually changes are returned, ready for one batched write.
 */
export function planDealMove(
  columns: Columns<BoardDeal>,
  dealId: string,
  toStage: DealStage,
  toIndex: number,
  now: Date,
): DealUpdate[] {
  const deal = DEAL_STAGES.flatMap((s) => columns[s]).find(
    (d) => d.id === dealId,
  );
  if (!deal) return [];

  const target = columns[toStage].filter((d) => d.id !== dealId);
  const index = Math.max(0, Math.min(toIndex, target.length));
  target.splice(index, 0, deal);

  const updates: DealUpdate[] = [];
  target.forEach((card, i) => {
    const patch: DealPatch =
      card.id === dealId ? stageChangePatch(card, toStage, now) : {};
    const order = i * ORDER_STEP;
    if (card.order !== order) patch.order = order;
    if (Object.keys(patch).length > 0) updates.push({ id: card.id, patch });
  });
  return updates;
}

/** Applies pending patches on top of live data (optimistic UI). */
export function applyPatches<T extends { id: string }>(
  items: T[],
  pending: ReadonlyMap<string, Partial<T>>,
): T[] {
  if (pending.size === 0) return items;
  return items.map((item) => {
    const patch = pending.get(item.id);
    return patch ? { ...item, ...patch } : item;
  });
}

/** Open deals whose expected close date is before today. */
export function isDealOverdue(
  deal: Pick<DealData, "stage" | "expectedCloseDate">,
  now: Date,
): boolean {
  return (
    !isClosedStage(deal.stage) &&
    deal.expectedCloseDate.getTime() < startOfDay(now).getTime()
  );
}
